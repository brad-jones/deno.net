import * as yaml from "@std/yaml";
import ky, { type KyInstance } from "ky";
import { getPort } from "@openjs/port-free";
import { AppBuilder } from "../app_builder.ts";
import { type Context, Hono } from "@hono/hono";
import { IRoute, RouteBuilder } from "./route_builder.ts";
import { HttpContext } from "@brad-jones/deno-net-http-context";
import type { IContainer } from "@brad-jones/deno-net-container";
import { ProblemDetails } from "@brad-jones/deno-net-problem-details";
import { IMiddleware, MiddlewareBuilder } from "@brad-jones/deno-net-middleware";

/**
 * A builder designed for backend HTTP APIs.
 *
 * The current implementation builds a Hono app.
 * @see https://hono.dev/
 */
export class ApiAppBuilder extends AppBuilder<Deno.ServeDefaultExport> {
  /**
   * Add middleware to your HTTP Api.
   *
   * TODO, write our own documentation but for now, refer to the Hono docs.
   * @see https://hono.dev/docs/guides/middleware
   */
  readonly middleware: MiddlewareBuilder = new MiddlewareBuilder(this.services);

  /**
   * Add routes (aka: endpoints) to your HTTP Api.
   *
   * TODO, write our own documentation but for now, refer to the Hono docs.
   * @see https://hono.dev/docs/api/routing
   */
  readonly routes: RouteBuilder = new RouteBuilder(this.services);

  /**
   * Using all the options configured against the builder,
   * this method finally constructs the application.
   *
   * @returns A ready to serve HTTP application.
   *
   * @example
   * ```typescript
   * const builder = new ApiAppBuilder();
   * builder.routes.mapGet("/ping", (ctx) => ctx.json({ ping: "pong" }));
   * export default builder.build() satisfies Deno.ServeDefaultExport;
   * ```
   *
   * Then execute with `deno serve`.
   * @see https://docs.deno.com/runtime/reference/cli/serve
   */
  override async build(): Promise<Deno.ServeDefaultExport> {
    await this.initLogging({ reset: true });

    const app = new Hono<HonoCtx>();

    app.use(
      async (ctx, next) => {
        const childContainer = this.services.createChild();
        childContainer.addScoped(HttpContext, { useValue: ctx });
        ctx.set("services", childContainer);
        await next();
        await childContainer[Symbol.asyncDispose]();
      },
    );

    for (const m of this.services.getServices(IMiddleware)) {
      app.use((ctx, next) => ctx.var.services.getService(m).invokeAsync(ctx, next));
    }

    for (const r of this.services.getServices(IRoute)) {
      const routeHandler = async (ctx: Context<HonoCtx>) => {
        try {
          return await ctx.var.services.callFunc(r.httpHandler, ctx);
        } catch (e) {
          if (e instanceof Response) return e;
          if (e instanceof ProblemDetails) return e.toResponse();
          throw e;
        }
      };

      if (r.method) {
        app[r.method](r.path, routeHandler);
        continue;
      }

      if (r.allMethods) {
        app.all(r.path, routeHandler);
        continue;
      }

      if (r.customMethod) {
        // deno-lint-ignore no-explicit-any
        app.on(r.customMethod, r.path as any, routeHandler);
      }
    }

    if (this.routes.openapi.docPath) {
      const filePath = this.routes.openapi.docPath.path;
      const docOptions = this.routes.openapi.docPath.options ?? this.routes.openapi.docOptions;
      const document = this.routes.openapi.buildDoc(docOptions);
      const serialized = filePath.endsWith(".json") ? JSON.stringify(document, null, "  ") : yaml.stringify(document);
      Deno.writeTextFileSync(filePath, serialized);
    }

    return app;
  }

  /**
   * Instead of using `deno serve`, you can start the server programmatically.
   *
   * @example
   * ```typescript
   * const builder = new ApiAppBuilder();
   * builder.routes.mapGet("/ping", (ctx) => ctx.json({ ping: "pong" }));
   * await builder.run({ port: 80 });
   * ```
   *
   * Then execute with `deno run`.
   * @see https://docs.deno.com/runtime/reference/cli/run
   *
   * A reference to the server & a pre configured client is also returned,
   * this can be useful for testing.
   *
   * @example
   * `main.ts`
   * ```typescript
   * export const builder = new ApiAppBuilder();
   * builder.services.addTransient(iFoo, Foo);
   * builder.routes.mapGet("/ping", (ctx) => ctx.json({ ping: "pong" }));
   * export default builder.build() satisfies Deno.ServeDefaultExport;
   * ```
   *
   * @example
   * `tests.ts`
   * ```typescript
   * import { builder } from "./main.ts";
   *
   * Deno.test("MyTest", async () => {
   *   builder.services.addTransient(iFoo, MockedFoo);
   *   const { server, client } = await builder.run();
   *   const result = await client.get("ping", { throwHttpErrors: false });
   *   expect(result.status).toBe(200);
   *   expect(await result.json()).toMatchObject({ ping: "pong" });
   *   await server.shutdown();
   * });
   * ```
   */
  async run(
    options?:
      | Deno.ServeTcpOptions
      | (Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem),
  ): Promise<{ server: Deno.HttpServer<Deno.NetAddr>; client: KyInstance } & AsyncDisposable> {
    options ??= { port: await getPort({ random: true, min: 3001 }) };
    const server = Deno.serve(options, (await this.build()).fetch);
    const client = ky.create({
      prefixUrl: `${"cert" in options ? "https" : "http"}://${server.addr.hostname}:${server.addr.port}`,
    });
    return {
      server,
      client,
      [Symbol.asyncDispose]: async (): Promise<void> => {
        await server.shutdown();
        await this.services[Symbol.asyncDispose]();
      },
    };
  }
}

/**
 * @internal
 */
type HonoCtx = { Variables: { services: IContainer } };
