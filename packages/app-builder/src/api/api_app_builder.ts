import { Hono } from "@hono/hono";
import ky, { type KyInstance } from "ky";
import { getPort } from "@openjs/port-free";
import { AppBuilder } from "../app_builder.ts";
import { RouteBuilder } from "./route_builder.ts";
import { MiddlewareBuilder } from "./middleware_builder.ts";
import type { IContainer } from "@brad-jones/deno-net-container";

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
  readonly middleware = new MiddlewareBuilder();

  /**
   * Add routes (aka: endpoints) to your HTTP Api.
   *
   * TODO, write our own documentation but for now, refer to the Hono docs.
   * @see https://hono.dev/docs/api/routing
   */
  readonly routes = new RouteBuilder();

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
  build(): Deno.ServeDefaultExport {
    const app = new Hono<{ Variables: { services: IContainer } }>();

    app.use(
      async (ctx, next) => {
        ctx.set("services", this.services.createChild());
        await next();
      },
    );

    for (const m of this.middleware.middleware) {
      app.use((ctx, next) => ctx.var.services.callFunc(m.handler, ctx, next));
    }

    for (const r of this.routes.routes) {
      if (r.method) {
        app[r.method](r.path, (ctx) => ctx.var.services.callFunc(r.handler, ctx));
        continue;
      }

      if (r.allMethods) {
        app.all(r.path, (ctx) => ctx.var.services.callFunc(r.handler, ctx));
        continue;
      }

      if (r.customMethod) {
        // deno-lint-ignore no-explicit-any
        app.on(r.customMethod, r.path as any, (ctx) => ctx.var.services.callFunc(r.handler, ctx));
      }
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
  ): Promise<{ server: Deno.HttpServer<Deno.NetAddr>; client: KyInstance }> {
    options ??= { port: await getPort({ random: true, min: 3001 }) };
    const server = Deno.serve(options, this.build().fetch);
    const client = ky.create({
      prefixUrl: `${"cert" in options ? "https" : "http"}://${server.addr.hostname}:${server.addr.port}`,
    });
    return { server, client };
  }
}
