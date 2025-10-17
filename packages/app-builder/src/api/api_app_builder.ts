import * as yaml from "@std/yaml";
import { IRoute } from "./types.ts";
import type { ZodType } from "@zod/zod";
import ky, { type KyInstance } from "ky";
import { getPort } from "@openjs/port-free";
import { AppBuilder } from "../app_builder.ts";
import { type Context, Hono } from "@hono/hono";
import { RouteBuilder } from "./route_builder.ts";
import { OpenApiRequestContext } from "./openapi/types.ts";
import { HttpContext } from "@brad-jones/deno-net-http-context";
import type { IContainer } from "@brad-jones/deno-net-container";
import { IMiddleware, MiddlewareBuilder } from "@brad-jones/deno-net-middleware";
import type { ZodOpenApiOperationObject as OpenApiOperation, ZodOpenApiResponseObject } from "zod-openapi";
import { ProblemDetails, ServerErrorProblem, ValidationProblem } from "@brad-jones/deno-net-problem-details";

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
   * Validates OpenAPI request data against the operation schema.
   *
   * Extracts and validates path parameters, query parameters, headers, cookies, and request body
   * according to the OpenAPI operation specification. Uses Zod schema validation with proper
   * error handling following the same pattern as model binders.
   *
   * @param ctx - The Hono context containing the HTTP request
   * @param operation - The OpenAPI operation definition with request schemas
   * @returns Promise resolving to validated request data
   * @throws ValidationProblem with RFC9457 Problem Details format if validation fails
   */
  protected async validateOpenApiRequest(ctx: Context<HonoCtx>, operation: OpenApiOperation): Promise<OpenApiData> {
    const result = {
      pathParams: {},
      queryParams: {},
      headers: {},
      cookies: {},
      body: undefined,
    };

    // Validate path parameters
    // deno-lint-ignore no-explicit-any
    const pathSchema = operation.requestParams?.path as any as ZodType;
    if (pathSchema && "safeParse" in pathSchema) {
      const pathResult = pathSchema.safeParse(ctx.req.param());
      if (!pathResult.success) {
        throw new ValidationProblem({
          instance: `#/request/path`,
          issues: pathResult.error.issues,
        });
      }
      result.pathParams = pathResult.data ?? {};
    }

    // Validate query parameters
    // deno-lint-ignore no-explicit-any
    const querySchema = operation.requestParams?.query as any as ZodType;
    if (querySchema && "safeParse" in querySchema) {
      const queryResult = querySchema.safeParse(ctx.req.query());
      if (!queryResult.success) {
        throw new ValidationProblem({
          instance: `#/request/query`,
          issues: queryResult.error.issues,
        });
      }
      result.queryParams = queryResult.data ?? {};
    }

    // Validate headers
    // deno-lint-ignore no-explicit-any
    const headerSchema = operation.requestParams?.header as any as ZodType;
    if (headerSchema && "safeParse" in headerSchema) {
      const headerResult = headerSchema.safeParse(ctx.req.header());
      if (!headerResult.success) {
        throw new ValidationProblem({
          instance: `#/request/headers`,
          issues: headerResult.error.issues,
        });
      }
      result.headers = headerResult.data ?? {};
    }

    // Validate cookies
    // deno-lint-ignore no-explicit-any
    const cookieSchema = operation.requestParams?.cookie as any as ZodType;
    if (cookieSchema && "safeParse" in cookieSchema) {
      const cookieData: Record<string, unknown> = {};
      const cookieHeader = ctx.req.header("Cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").map((c) => c.trim().split("="));
        for (const [key, value] of cookies) {
          if (key && value) {
            cookieData[key] = decodeURIComponent(value);
          }
        }
      }
      const cookieResult = cookieSchema.safeParse(cookieData);
      if (!cookieResult.success) {
        throw new ValidationProblem({
          instance: `#/request/cookies`,
          issues: cookieResult.error.issues,
        });
      }
      result.cookies = cookieResult.data ?? {};
    }

    // Validate request body
    // deno-lint-ignore no-explicit-any
    const bodySchema = operation.requestBody?.content["application/json"]?.schema as any as ZodType;
    if (bodySchema && "safeParse" in bodySchema) {
      try {
        const bodyResult = bodySchema.safeParse(await ctx.req.json());
        if (!bodyResult.success) {
          throw new ValidationProblem({
            instance: `#/request/body`,
            issues: bodyResult.error.issues,
          });
        }
        // deno-lint-ignore no-explicit-any
        result.body = bodyResult.data as any;
      } catch (error) {
        if (error instanceof ValidationProblem) throw error;

        if (error instanceof SyntaxError) {
          throw new ValidationProblem({
            instance: "#/request/body",
            issues: [{
              code: "invalid_type",
              expected: "object",
              received: "unknown",
              path: [],
              message: error.message,
            }],
          });
        }

        throw new ServerErrorProblem({
          detail: "Unexpected validation error.",
          instance: "#/request/body",
        });
      }
    }

    return result;
  }

  /**
   * Validates OpenAPI response data against the operation schema.
   *
   * Ensures that the response status code, headers, and body conform to the OpenAPI
   * specification. This helps catch programming errors where handlers return data
   * that doesn't match the documented API contract.
   *
   * @param response - The Response object to validate
   * @param operation - The OpenAPI operation definition with response schemas
   * @param statusCode - The HTTP status code to validate against
   * @returns The original response if validation passes
   * @throws ServerErrorProblem (500) if response doesn't match OpenAPI specification
   */
  protected async validateOpenApiResponse(response: Response, operation: OpenApiOperation): Promise<Response> {
    // deno-lint-ignore no-explicit-any
    const responseSpec = (operation.responses as any)[response.status] as ZodOpenApiResponseObject;
    if (!responseSpec) {
      throw new ServerErrorProblem({
        detail: "The response status code is not found in the OpenAPI specification.",
        instance: `#/response/status-code=${response.status}`,
      });
    }

    // Validate response headers if specified
    // deno-lint-ignore no-explicit-any
    const headersSpec = responseSpec?.headers as any as ZodType;
    if (headersSpec && "safeParse" in headersSpec) {
      const headerData = Object.fromEntries(Array.from(response.headers.entries()));
      const headerResult = headersSpec.safeParse(headerData);
      if (!headerResult.success) {
        throw new ServerErrorProblem({
          detail: "Response headers do not match OpenAPI specification",
          instance: `#/response/headers`,
          issues: headerResult.error.issues,
        });
      }
    }

    // Validate response body if specified
    // deno-lint-ignore no-explicit-any
    const contentSpec = responseSpec.content?.["application/json"]?.schema as any as ZodType;
    if (contentSpec && "safeParse" in contentSpec) {
      const responseClone = response.clone();
      try {
        const bodyData = await responseClone.json();
        const bodyResult = contentSpec.safeParse(bodyData);
        if (!bodyResult.success) {
          throw new ServerErrorProblem({
            detail: "Response body does not match OpenAPI specification",
            instance: `#/response/body`,
            issues: bodyResult.error.issues,
          });
        }
      } catch (error) {
        if (error instanceof ServerErrorProblem) throw error;

        if (error instanceof SyntaxError) {
          throw new ServerErrorProblem({
            instance: "#/response/body",
            issues: [{
              code: "invalid_type",
              expected: "object",
              received: "unknown",
              path: [],
              message: error.message,
            }],
          });
        }

        throw new ServerErrorProblem({
          detail: "Unexpected validation error.",
          instance: "#/response/body",
        });
      }
    }

    return response;
  }

  /**
   * Creates a validated OpenApiRequestContext from the HTTP context and operation.
   *
   * This method orchestrates the validation process and constructs a type-safe
   * OpenApiRequestContext with all validated request data properly typed according
   * to the OpenAPI specification.
   *
   * @param ctx - The Hono context containing the HTTP request
   * @param operation - The OpenAPI operation definition with schemas
   * @returns Promise resolving to a validated and type-safe OpenApiRequestContext
   * @throws ValidationProblem if request validation fails
   */
  protected async createOpenApiContext(ctx: Context, operation: OpenApiOperation): Promise<OpenApiRequestContext> {
    const validatedData = await this.validateOpenApiRequest(ctx, operation);

    return new OpenApiRequestContext(
      ctx as HttpContext,
      validatedData.pathParams,
      validatedData.queryParams,
      validatedData.headers,
      validatedData.cookies,
      validatedData.body,
    );
  }

  /**
   * Handles OpenAPI route execution with full request/response validation.
   *
   * This is the main orchestration method that:
   * 1. Validates the incoming request against OpenAPI schemas
   * 2. Creates a type-safe OpenApiRequestContext
   * 3. Executes the route handler with dependency injection
   * 4. Validates the response against OpenAPI schemas
   *
   * @param ctx - The Hono context with dependency injection container
   * @param routeManifest - The route configuration with OpenAPI operation and handler
   * @returns Promise resolving to the validated HTTP response
   * @throws ValidationProblem for request validation errors (400-level)
   * @throws ServerErrorProblem for response validation errors (500-level)
   */
  protected async handleOpenApiRoute(ctx: Context<HonoCtx>, routeManifest: IRoute): Promise<Response> {
    const openApiContext = await this.createOpenApiContext(ctx, routeManifest.openApiOperation!);
    const response = await ctx.var.services.callFunc(routeManifest.openApiHandler!, openApiContext);
    return await this.validateOpenApiResponse(response, routeManifest.openApiOperation!);
  }

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
          if (r.httpHandler) {
            return await ctx.var.services.callFunc(r.httpHandler, ctx);
          }

          if (r.openApiHandler && r.openApiOperation) {
            return await this.handleOpenApiRoute(ctx, r);
          }

          throw new Error(`handler not set`);
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

/**
 * @internal
 */
interface OpenApiData {
  pathParams: Record<string, unknown>;
  queryParams: Record<string, unknown>;
  headers: Record<string, unknown>;
  cookies: Record<string, unknown>;
  // deno-lint-ignore no-explicit-any
  body: any;
}
