// deno-lint-ignore-file no-explicit-any

import { expandGlob } from "@std/fs";
import { importModule } from "@brad-jones/jsr-dynamic-imports";
import { OpenApiRouteBuilder } from "./openapi/openapi_route_builder.ts";
import type { HttpContext } from "@brad-jones/deno-net-http-context";
import { type IContainer, Type } from "@brad-jones/deno-net-container";

/**
 * IoC injection token for retrieving the list of mapped routes.
 */
export const IRoute: Type<IRoute> = new Type<IRoute>("IRoute");

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
  /** Standard HTTP handler function */
  httpHandler: (ctx: HttpContext<Path>, ...args: unknown[]) => Promise<Response> | Response;
  /** Optional metadata to attach to the route, usually for the purposes of documentation eg: OpenAPI. */
  metadata?: unknown;
}

/**
 * A function that configures routes using a RouteBuilder instance.
 *
 * @param r - The RouteBuilder instance to configure routes with
 *
 * @example
 * ```typescript
 * // routes/hello.ts
 * export default ((r: RouteBuilder) => {
 *   r.mapGet("/hello/:name", (ctx) => ctx.json({ message: `Hello ${ctx.params.name}` }));
 *   r.mapPost("/users", (ctx) => ctx.json({ id: 1, created: true }));
 * }) satisfies RouteModule;
 * ```
 */
export type RouteModule = (r: RouteBuilder, c: IContainer) => void;

/**
 * A builder class for configuring HTTP routes with support for standard and OpenAPI handlers.
 * Provides fluent API methods for mapping different HTTP methods to route handlers.
 */
export class RouteBuilder {
  /** OpenAPI-specific route builder instance */
  readonly openapi: OpenApiRouteBuilder;

  constructor(private services: IContainer) {
    this.openapi = new OpenApiRouteBuilder(this.services, this);
  }

  /**
   * Maps a GET request to the specified path with the provided handler.
   *
   * @template Path - The URL path pattern type
   * @param path - The URL path pattern for the route
   * @param httpHandler - The handler function to execute for GET requests
   * @returns This RouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Simple GET route
   * r.mapGet("/hello", (ctx) => ctx.json({ message: "Hello World" }));
   *
   * // GET route with path parameters
   * r.mapGet("/hello/:name", (ctx) => ctx.json({ message: `Hello ${ctx.params.name}` }));
   *
   * // GET route with dependency injection
   * r.mapGet("/ping", (ctx, pingService = inject(IPingPong)) => ctx.json(pingService.ping()));
   * ```
   */
  mapGet<Path extends string = any>(
    path: Path,
    httpHandler: (ctx: HttpContext<Path>) => Promise<Response> | Response,
    metadata?: unknown,
  ): this {
    this.services.addSingleton(IRoute, { useValue: { method: "get", path, httpHandler, metadata } });
    return this;
  }

  /**
   * Maps a POST request to the specified path with the provided handler.
   *
   * @template Path - The URL path pattern type
   * @param path - The URL path pattern for the route
   * @param httpHandler - The handler function to execute for POST requests
   * @returns This RouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Simple POST route
   * r.mapPost("/users", (ctx) => ctx.json({ id: 1, created: true }));
   *
   * // POST route with JSON body parsing
   * r.mapPost("/users", (ctx, userData = fromJson({ schema: z.object({ name: z.string() }) })) =>
   *   ctx.json({ id: 1, name: userData.name })
   * );
   * ```
   */
  mapPost<Path extends string = any>(
    path: string,
    httpHandler: (ctx: HttpContext<Path>) => Promise<Response> | Response,
    metadata?: unknown,
  ): this {
    this.services.addSingleton(IRoute, { useValue: { method: "post", path, httpHandler, metadata } });
    return this;
  }

  /**
   * Maps a PUT request to the specified path with the provided handler.
   *
   * @template Path - The URL path pattern type
   * @param path - The URL path pattern for the route
   * @param httpHandler - The handler function to execute for PUT requests
   * @returns This RouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Update a user resource
   * r.mapPut("/users/:id", (ctx, userData = fromJson({ schema: z.object({ name: z.string(), email: z.string() }) })) => {
   *   return ctx.json({ id: ctx.params.id, ...userData, updated: true });
   * });
   *
   * // Replace entire resource
   * r.mapPut("/config", (ctx, config = fromJson({ schema: configSchema })) => {
   *   return ctx.json({ message: "Configuration updated", config });
   * });
   * ```
   */
  mapPut<Path extends string = any>(
    path: string,
    httpHandler: (ctx: HttpContext<Path>) => Promise<Response> | Response,
    metadata?: unknown,
  ): this {
    this.services.addSingleton(IRoute, { useValue: { method: "put", path, httpHandler, metadata } });
    return this;
  }

  /**
   * Maps a PATCH request to the specified path with the provided handler.
   *
   * @template Path - The URL path pattern type
   * @param path - The URL path pattern for the route
   * @param httpHandler - The handler function to execute for PATCH requests
   * @returns This RouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Partial update of a user
   * r.mapPatch("/users/:id", (ctx, updates = fromJson({ schema: z.object({ name: z.string().optional(), email: z.string().optional() }) })) => {
   *   return ctx.json({ id: ctx.params.id, ...updates, modified: new Date().toISOString() });
   * });
   *
   * // Toggle user status
   * r.mapPatch("/users/:id/status", (ctx) => {
   *   return ctx.json({ id: ctx.params.id, active: !previousStatus });
   * });
   * ```
   */
  mapPatch<Path extends string = any>(
    path: string,
    httpHandler: (ctx: HttpContext<Path>) => Promise<Response> | Response,
    metadata?: unknown,
  ): this {
    this.services.addSingleton(IRoute, { useValue: { method: "patch", path, httpHandler, metadata } });
    return this;
  }

  /**
   * Maps a DELETE request to the specified path with the provided handler.
   *
   * @template Path - The URL path pattern type
   * @param path - The URL path pattern for the route
   * @param httpHandler - The handler function to execute for DELETE requests
   * @returns This RouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Delete a specific user
   * r.mapDelete("/users/:id", (ctx) => {
   *   return ctx.json({ id: ctx.params.id, deleted: true });
   * });
   *
   * // Soft delete with confirmation
   * r.mapDelete("/users/:id", (ctx, confirm = fromQuery("confirm", { schema: z.boolean() })) => {
   *   if (!confirm) {
   *     return ctx.json({ error: "Confirmation required" }, { status: 400 });
   *   }
   *   return ctx.json({ id: ctx.params.id, deleted: true });
   * });
   * ```
   */
  mapDelete<Path extends string = any>(
    path: string,
    httpHandler: (ctx: HttpContext<Path>) => Promise<Response> | Response,
    metadata?: unknown,
  ): this {
    this.services.addSingleton(IRoute, { useValue: { method: "delete", path, httpHandler, metadata } });
    return this;
  }

  /**
   * Maps all HTTP methods to the specified path with the provided handler.
   *
   * @template Path - The URL path pattern type
   * @param path - The URL path pattern for the route
   * @param httpHandler - The handler function to execute for all HTTP methods
   * @returns This RouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Handle all HTTP methods (GET, POST, PUT, DELETE, etc.) on the same route
   * r.mapAll("/api/catch-all", (ctx) => {
   *   return ctx.json({
   *     method: ctx.request.method,
   *     message: "Handled by catch-all route"
   *   });
   * });
   * ```
   */
  mapAll<Path extends string = any>(
    path: string,
    httpHandler: (ctx: HttpContext<Path>) => Promise<Response> | Response,
    metadata?: unknown,
  ): this {
    this.services.addSingleton(IRoute, { useValue: { allMethods: true, path, httpHandler, metadata } });
    return this;
  }

  /**
   * Maps custom HTTP method(s) to the specified path with the provided handler.
   *
   * @template Path - The URL path pattern type
   * @param method - The custom HTTP method or array of methods
   * @param path - The URL path pattern for the route
   * @param httpHandler - The handler function to execute for the custom method(s)
   * @returns This RouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Handle a custom HTTP method
   * r.mapCustom("LOCK", "/resources/:id", (ctx) => {
   *   return ctx.json({ locked: true, resourceId: ctx.params.id });
   * });
   *
   * // Handle multiple custom methods
   * r.mapCustom(["LOCK", "UNLOCK"], "/resources/:id", (ctx) => {
   *   const isLocking = ctx.request.method === "LOCK";
   *   return ctx.json({ locked: isLocking, resourceId: ctx.params.id });
   * });
   * ```
   */
  mapCustom<Path extends string = any>(
    method: string | string[],
    path: string,
    httpHandler: (ctx: HttpContext<Path>) => Promise<Response> | Response,
    metadata?: unknown,
  ): this {
    this.services.addSingleton(IRoute, { useValue: { customMethod: method, path, httpHandler, metadata } });
    return this;
  }

  /**
   * @example
   * ```ts
   * function fooModule(options: OptionsType) {
   *   return (routes: RouteBuilder) => {
   *     routes.mapGet("/foo", (ctx) => ctx.text("bar"));
   *     routes.mapGet("/bar", (ctx) => ctx.text("123"));
   *     routes.mapGet(`/baz/${options.bar}`, (ctx) => ctx.text("dfghdfsh"));
   *   };
   * }
   *
   * builder.routes.mapModule(fooModule({bar: "blah some config values"}));
   * ```
   */
  mapModule(module: RouteModule): this {
    module(this, this.services);
    return this;
  }

  /**
   * Dynamically loads and adds multiple route modules from files matching a glob pattern.
   *
   * @param glob - A glob pattern to match module files
   * @returns A Promise that resolves when all modules have been loaded and added
   *
   * @example
   * ```typescript
   * await builder.mapModules("./routes/**\/*.ts");
   * ```
   *
   * @example
   * Where a route module might look like this.
   * ```typescript
   * import { RouteModule } from "@brad-jones/deno-net-app-builder";
   *
   * export default ((r, c) => {
   *
   *   r.mapGet("/hello/:name", (ctx) => ctx.json({ message: `${ctx.path.param("name")}` }));
   *
   *   // You also have access to the IoC Container
   *   // should you wish to register any other services.
   *   c.addTransient(IFoo, Foo);
   *   c.addSingleton(IBar, Bar);
   *
   * }) satisfies RouteModule;
   * ```
   */
  mapModules(glob: string): this {
    this.#asyncJobs.push(async () => {
      for await (const entry of expandGlob(glob)) {
        if (entry.isFile) {
          const module = await importModule(entry.path);
          this.mapModule(module["default"] as RouteModule);
        }
      }
    });
    return this;
  }

  #asyncJobs: (() => Promise<void>)[] = [];

  async build(): Promise<void> {
    await Promise.all(this.#asyncJobs.map((_) => _()));
  }
}
