// deno-lint-ignore-file no-explicit-any

import { Type } from "@brad-jones/deno-net-container";
import type { OpenApiRequestContext } from "./openapi/types.ts";
import type { ZodOpenApiOperationObject } from "zod-openapi";
import type { HttpContext } from "@brad-jones/deno-net-http-context";

/**
 * IoC injection token for retrieving the list of mapped routes.
 *
 * @example
 * ```typescript
 * class OpenApiMiddleware implements IMiddleware {
 *   constructor(private routes = inject(RouteManifest, { multi: true })) {}
 *
 *   invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
 *     const hasOpenAPIRoutes = this.routes.manifests.filter(_ => _.openApiHandler).length > 0;
 *     if (hasOpenAPIRoutes && ctx.req.path === "/openapi.json") {
 *        return ctx.json(this.buildOpenApiSpec(this.routes));
 *     }
 *     await next();
 *   }
 * }
 * ```
 */
export const IRoute = new Type<IRoute>("IRoute");

/**
 * Represents a route configuration manifest that defines how HTTP requests are handled.
 *
 * @template Path - The URL path pattern type, extends string
 */
export interface IRoute<Path extends string = any> {
  /** HTTP method for the route (GET, POST, PUT, PATCH, DELETE) */
  method?: "get" | "post" | "put" | "patch" | "delete";
  /** Whether this route handles all HTTP methods */
  allMethods?: boolean;
  /** Custom HTTP method(s) for non-standard methods */
  customMethod?: string | string[];
  /** The URL path pattern for the route */
  path: Path;
  /** Hono expects /foo/:bar, where as OpenAPI expects /foo/{bar} */
  openApiPath?: string;
  /** OpenAPI operation specification for the route */
  openApiOperation?: ZodOpenApiOperationObject;
  /** Standard HTTP handler function */
  httpHandler?: (ctx: HttpContext<Path>, ...args: unknown[]) => Promise<Response> | Response;
  /** OpenAPI-specific handler function */
  openApiHandler?: (ctx: OpenApiRequestContext) => Promise<Response> | Response;
}
