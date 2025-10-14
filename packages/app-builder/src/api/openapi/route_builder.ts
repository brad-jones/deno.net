import * as yaml from "@std/yaml";
import { accepts } from "@hono/hono/accepts";
import { createDocument } from "zod-openapi";
import { OpenApiUiBuilder } from "./ui_builder.ts";
import type { OpenApiRequestContext } from "./types.ts";
import type {
  CreateDocumentOptions,
  ZodOpenApiObject,
  ZodOpenApiOperationObject,
  ZodOpenApiPathItemObject,
} from "zod-openapi";
import type { IContainer } from "@brad-jones/deno-net-container";
import { IRoute } from "../types.ts";
import type { RouteBuilder } from "../route_builder.ts";

/**
 * Configuration options for OpenAPI document generation and customization.
 * Used to control how OpenAPI documents are built and what additional metadata is included.
 */
export interface OpenAPIDocsOptions {
  /**
   * Partial OpenAPI document properties to merge with the generated document.
   * These overrides allow customization of the final OpenAPI specification.
   * Common overrides include info, servers, security, and components sections.
   *
   * @example
   * ```typescript
   * {
   *   docOverrides: {
   *     info: {
   *       title: "My API",
   *       version: "1.0.0",
   *       description: "A comprehensive API for managing resources",
   *       contact: { email: "support@example.com" },
   *       license: { name: "MIT", url: "https://opensource.org/licenses/MIT" }
   *     },
   *     servers: [
   *       { url: "https://api.example.com", description: "Production server" },
   *       { url: "https://staging-api.example.com", description: "Staging server" }
   *     ],
   *     security: [{ bearerAuth: [] }],
   *     components: {
   *       securitySchemes: {
   *         bearerAuth: {
   *           type: "http",
   *           scheme: "bearer",
   *           bearerFormat: "JWT"
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  docOverrides?: Partial<ZodOpenApiObject>;

  /**
   * Options to pass directly to the zod-openapi createDocument function.
   * These options control the low-level document generation behavior.
   *
   * @see {@link https://github.com/asteasolutions/zod-to-openapi} zod-openapi documentation
   *
   * @example
   * ```typescript
   * {
   *   zodOpenApiOptions: {
   *     // Control how Zod schemas are transformed to OpenAPI schemas
   *     strict: true,
   *     // Additional transformation options as supported by zod-openapi
   *   }
   * }
   * ```
   */
  zodOpenApiOptions?: CreateDocumentOptions;
}

/**
 * A specialized route builder for OpenAPI-compliant routes with schema validation and documentation.
 * Works in conjunction with the main RouteBuilder to provide OpenAPI-specific functionality.
 */
export class OpenApiRouteBuilder {
  /**
   * Creates a new OpenApiRouteBuilder instance.
   *
   * @param routeBuilder - The parent RouteBuilder instance that owns this OpenAPI builder
   */
  constructor(private services: IContainer, private routeBuilder: RouteBuilder) {}

  /**
   * Hono uses the form /foo/:bar (amoungst other regex syntax),
   * where as OpenAPI expects /foo/{bar} so this converts the Hono path
   * to something an OpenAPI spec will be happy with.
   *
   * @internal
   * @credit https://github.com/paolostyle/hono-zod-openapi/blob/06fb5cfb72f061c63f294ff75828a4fa6b442da8/src/createOpenApiDocument.ts#L173
   */
  #normalizePathParams(path: string): string {
    return path.replace(/:([a-zA-Z0-9-_]+)\??(\{.*?\})?/g, "{$1}");
  }

  /**
   * Maps a GET request with OpenAPI specification and type-safe handler.
   *
   * @template OpenApi - The OpenAPI operation object type extending ZodOpenApiOperationObject
   * @param path - The URL path pattern for the route
   * @param openApiOperation - The OpenAPI operation specification with Zod schemas
   * @param openApiHandler - The type-safe handler function for the OpenAPI route
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Get a specific user by ID
   * r.openapi.mapGet(
   *   "/users/{id}",
   *   {
   *     requestParams: {
   *       path: z.object({ id: z.string().uuid() }),
   *       query: z.object({ include: z.array(z.string()).optional() }),
   *     },
   *     responses: {
   *       200: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({
   *               id: z.string(),
   *               name: z.string(),
   *               email: z.string(),
   *               createdAt: z.string()
   *             }),
   *           },
   *         },
   *       },
   *       404: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({ error: z.string() }),
   *           },
   *         },
   *       },
   *     },
   *   },
   *   (ctx, db = inject(Database)) => {
   *     return ctx.response(200, db.users.findById(ctx.pathParams.id));
   *   }
   * );
   * ```
   */
  mapGet<OpenApi extends ZodOpenApiOperationObject>(
    path: string,
    openApiOperation: OpenApi,
    openApiHandler: (ctx: OpenApiRequestContext<OpenApi>) => Promise<Response> | Response,
  ): this {
    this.services.addSingleton(IRoute, {
      useValue: {
        method: "get",
        path,
        openApiPath: this.#normalizePathParams(path),
        openApiOperation,
        openApiHandler,
      },
    });
    return this;
  }

  /**
   * Maps a POST request with OpenAPI specification and type-safe handler.
   *
   * @template OpenApi - The OpenAPI operation object type extending ZodOpenApiOperationObject
   * @param path - The URL path pattern for the route
   * @param openApiOperation - The OpenAPI operation specification with Zod schemas
   * @param openApiHandler - The type-safe handler function for the OpenAPI route
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * r.openapi.mapPost(
   *   "/users",
   *   {
   *     requestBody: {
   *       content: {
   *         "application/json": {
   *           schema: z.object({
   *             name: z.string(),
   *             email: z.string().email()
   *           }),
   *         },
   *       },
   *     },
   *     responses: {
   *       201: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({ id: z.number(), created: z.boolean() }),
   *           },
   *         },
   *       },
   *     },
   *   },
   *   (ctx) => ctx.response(201, { id: 1, created: true })
   * );
   * ```
   */
  mapPost<OpenApi extends ZodOpenApiOperationObject>(
    path: string,
    openApiOperation: OpenApi,
    openApiHandler: (ctx: OpenApiRequestContext<OpenApi>) => Promise<Response> | Response,
  ): this {
    this.services.addSingleton(IRoute, {
      useValue: {
        method: "post",
        path,
        openApiPath: this.#normalizePathParams(path),
        openApiOperation,
        openApiHandler,
      },
    });
    return this;
  }

  /**
   * Maps a PUT request with OpenAPI specification and type-safe handler.
   *
   * @template OpenApi - The OpenAPI operation object type extending ZodOpenApiOperationObject
   * @param path - The URL path pattern for the route
   * @param openApiOperation - The OpenAPI operation specification with Zod schemas
   * @param openApiHandler - The type-safe handler function for the OpenAPI route
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * r.openapi.mapPut(
   *   "/users/{id}",
   *   {
   *     requestParams: {
   *       path: z.object({ id: z.string().uuid() }),
   *     },
   *     requestBody: {
   *       content: {
   *         "application/json": {
   *           schema: z.object({
   *             name: z.string(),
   *             email: z.string().email(),
   *             role: z.enum(["admin", "user"])
   *           }),
   *         },
   *       },
   *     },
   *     responses: {
   *       200: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({ id: z.string(), updated: z.boolean() }),
   *           },
   *         },
   *       },
   *     },
   *   },
   *   (ctx) => ctx.response(200, { id: ctx.pathParams.id, updated: true })
   * );
   * ```
   */
  mapPut<OpenApi extends ZodOpenApiOperationObject>(
    path: string,
    openApiOperation: OpenApi,
    openApiHandler: (ctx: OpenApiRequestContext<OpenApi>) => Promise<Response> | Response,
  ): this {
    this.services.addSingleton(IRoute, {
      useValue: {
        method: "put",
        path,
        openApiPath: this.#normalizePathParams(path),
        openApiOperation,
        openApiHandler,
      },
    });
    return this;
  }

  /**
   * Maps a PATCH request with OpenAPI specification and type-safe handler.
   *
   * @template OpenApi - The OpenAPI operation object type extending ZodOpenApiOperationObject
   * @param path - The URL path pattern for the route
   * @param openApiOperation - The OpenAPI operation specification with Zod schemas
   * @param openApiHandler - The type-safe handler function for the OpenAPI route
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * r.openapi.mapPatch(
   *   "/users/{id}",
   *   {
   *     requestParams: {
   *       path: z.object({ id: z.string().uuid() }),
   *     },
   *     requestBody: {
   *       content: {
   *         "application/json": {
   *           schema: z.object({
   *             name: z.string().optional(),
   *             email: z.string().email().optional(),
   *             active: z.boolean().optional()
   *           }),
   *         },
   *       },
   *     },
   *     responses: {
   *       200: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({ id: z.string(), modified: z.string() }),
   *           },
   *         },
   *       },
   *     },
   *   },
   *   (ctx) => ctx.response(200, { id: ctx.pathParams.id, modified: new Date().toISOString() })
   * );
   * ```
   */
  mapPatch<OpenApi extends ZodOpenApiOperationObject>(
    path: string,
    openApiOperation: OpenApi,
    openApiHandler: (ctx: OpenApiRequestContext<OpenApi>) => Promise<Response> | Response,
  ): this {
    this.services.addSingleton(IRoute, {
      useValue: {
        method: "patch",
        path,
        openApiPath: this.#normalizePathParams(path),
        openApiOperation,
        openApiHandler,
      },
    });
    return this;
  }

  /**
   * Maps a DELETE request with OpenAPI specification and type-safe handler.
   *
   * @template OpenApi - The OpenAPI operation object type extending ZodOpenApiOperationObject
   * @param path - The URL path pattern for the route
   * @param openApiOperation - The OpenAPI operation specification with Zod schemas
   * @param openApiHandler - The type-safe handler function for the OpenAPI route
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * r.openapi.mapDelete(
   *   "/users/{id}",
   *   {
   *     requestParams: {
   *       path: z.object({ id: z.string().uuid() }),
   *       query: z.object({ confirm: z.boolean().default(false) }),
   *     },
   *     responses: {
   *       200: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({ id: z.string(), deleted: z.boolean() }),
   *           },
   *         },
   *       },
   *       400: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({ error: z.string() }),
   *           },
   *         },
   *       },
   *     },
   *   },
   *   (ctx) => {
   *     if (!ctx.queryParams.confirm) {
   *       return ctx.response(400, { error: "Confirmation required" });
   *     }
   *     return ctx.response(200, { id: ctx.pathParams.id, deleted: true });
   *   }
   * );
   * ```
   */
  mapDelete<OpenApi extends ZodOpenApiOperationObject>(
    path: string,
    openApiOperation: OpenApi,
    openApiHandler: (ctx: OpenApiRequestContext<OpenApi>) => Promise<Response> | Response,
  ): this {
    this.services.addSingleton(IRoute, {
      useValue: {
        method: "delete",
        path,
        openApiPath: this.#normalizePathParams(path),
        openApiOperation,
        openApiHandler,
      },
    });
    return this;
  }

  /**
   * Maps all HTTP methods with OpenAPI specification and type-safe handler.
   *
   * @template OpenApi - The OpenAPI operation object type extending ZodOpenApiOperationObject
   * @param path - The URL path pattern for the route
   * @param openApiOperation - The OpenAPI operation specification with Zod schemas
   * @param openApiHandler - The type-safe handler function for the OpenAPI route
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * r.openapi.mapAll(
   *   "/debug/{resource}",
   *   {
   *     requestParams: {
   *       path: z.object({ resource: z.string() }),
   *       header: z.object({ "X-Debug-Mode": z.boolean() }),
   *     },
   *     responses: {
   *       200: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({
   *               method: z.string(),
   *               resource: z.string(),
   *               debugMode: z.boolean()
   *             }),
   *           },
   *         },
   *       },
   *     },
   *   },
   *   (ctx) => ctx.response(200, {
   *     method: ctx.request.method,
   *     resource: ctx.pathParams.resource,
   *     debugMode: ctx.headers["X-Debug-Mode"]
   *   })
   * );
   * ```
   */
  mapAll<OpenApi extends ZodOpenApiOperationObject>(
    path: string,
    openApiOperation: OpenApi,
    openApiHandler: (ctx: OpenApiRequestContext<OpenApi>) => Promise<Response> | Response,
  ): this {
    this.services.addSingleton(IRoute, {
      useValue: {
        allMethods: true,
        path,
        openApiPath: this.#normalizePathParams(path),
        openApiOperation,
        openApiHandler,
      },
    });
    return this;
  }

  /**
   * Maps custom HTTP method(s) with OpenAPI specification and type-safe handler.
   *
   * @template OpenApi - The OpenAPI operation object type extending ZodOpenApiOperationObject
   * @param method - The custom HTTP method or array of methods
   * @param path - The URL path pattern for the route
   * @param openApiOperation - The OpenAPI operation specification with Zod schemas
   * @param openApiHandler - The type-safe handler function for the OpenAPI route
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Single custom method
   * r.openapi.mapCustom(
   *   "LOCK",
   *   "/resources/{id}",
   *   {
   *     requestParams: {
   *       path: z.object({ id: z.string().uuid() }),
   *       header: z.object({ "X-Lock-Timeout": z.number().optional() }),
   *     },
   *     responses: {
   *       200: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({
   *               resourceId: z.string(),
   *               locked: z.boolean(),
   *               timeout: z.number().optional()
   *             }),
   *           },
   *         },
   *       },
   *     },
   *   },
   *   (ctx) => ctx.response(200, {
   *     resourceId: ctx.pathParams.id,
   *     locked: true,
   *     timeout: ctx.headers["X-Lock-Timeout"]
   *   })
   * );
   *
   * // Multiple custom methods
   * r.openapi.mapCustom(
   *   ["LOCK", "UNLOCK"],
   *   "/resources/{id}",
   *   {
   *     requestParams: {
   *       path: z.object({ id: z.string().uuid() }),
   *     },
   *     responses: {
   *       200: {
   *         content: {
   *           "application/json": {
   *             schema: z.object({ resourceId: z.string(), action: z.string() }),
   *           },
   *         },
   *       },
   *     },
   *   },
   *   (ctx) => ctx.response(200, {
   *     resourceId: ctx.pathParams.id,
   *     action: ctx.request.method.toLowerCase()
   *   })
   * );
   * ```
   */
  mapCustom<OpenApi extends ZodOpenApiOperationObject>(
    method: string | string[],
    path: string,
    openApiOperation: OpenApi,
    openApiHandler: (ctx: OpenApiRequestContext<OpenApi>) => Promise<Response> | Response,
  ): this {
    this.services.addSingleton(IRoute, {
      useValue: {
        customMethod: method,
        path,
        openApiPath: this.#normalizePathParams(path),
        openApiOperation,
        openApiHandler,
      },
    });
    return this;
  }

  /**
   * Builds an OpenAPI document from all registered OpenAPI routes.
   * Groups routes by path and handles multiple HTTP methods on the same path.
   *
   * @param options - Optional configuration for document generation
   * @param options.docOverrides - Partial OpenAPI document overrides to merge with the generated document
   * @param options.zodOpenApiOptions - Options to pass to the zod-openapi createDocument function
   * @returns The generated OpenAPI document as returned by the zod-openapi createDocument function
   *
   * @example
   * ```typescript
   * const doc = builder.buildDoc({
   *   docOverrides: {
   *     info: {
   *       title: "My API",
   *       version: "1.0.0",
   *       description: "A sample API built with Deno and Hono"
   *     },
   *     servers: [{ url: "https://api.example.com" }]
   *   }
   * });
   * ```
   */
  buildDoc(options?: OpenAPIDocsOptions): ReturnType<typeof createDocument> {
    const openApiRoutes = this.services.getServices(IRoute).filter((_) => _.openApiOperation);

    // Group routes by path to handle multiple HTTP methods on the same path
    const pathGroups = new Map<string, IRoute[]>();
    for (const route of openApiRoutes) {
      const openApiPath = route.openApiPath!;
      if (!pathGroups.has(openApiPath)) {
        pathGroups.set(openApiPath, []);
      }
      pathGroups.get(openApiPath)!.push(route);
    }

    // Build the paths object with proper HTTP method mapping
    const paths = Object.fromEntries(
      Array.from(pathGroups.entries()).map(([openApiPath, routes]) => {
        const pathItem: ZodOpenApiPathItemObject = {};

        for (const route of routes) {
          const operation = route.openApiOperation!;

          if (route.method) {
            // Standard HTTP methods
            pathItem[route.method] = operation;
          } else if (route.allMethods) {
            // All methods - add to all standard HTTP methods
            pathItem.get = operation;
            pathItem.post = operation;
            pathItem.put = operation;
            pathItem.patch = operation;
            pathItem.delete = operation;
            pathItem.head = operation;
            pathItem.options = operation;
          } else if (route.customMethod) {
            const methods = Array.isArray(route.customMethod) ? route.customMethod : [route.customMethod];
            for (const method of methods) {
              // deno-lint-ignore no-explicit-any
              pathItem[method as any] = operation;
            }
          }
        }

        return [openApiPath, pathItem];
      }),
    );

    return createDocument({
      openapi: "3.1.1",
      info: {
        title: "Api Specification",
        version: "0.0.0",
      },
      paths,
      ...options?.docOverrides ?? {},
    }, options?.zodOpenApiOptions);
  }

  #docOptions?: OpenAPIDocsOptions;

  /**
   * The stored document options, or undefined if none have been set.
   */
  get docOptions() {
    return this.#docOptions;
  }

  /**
   * Sets document transformation options that will be applied when building the OpenAPI document.
   *
   * @param options - The document transformation options to store
   * @param options.docOverrides - Partial OpenAPI document overrides to merge with generated documents
   * @param options.zodOpenApiOptions - Options to pass to the zod-openapi createDocument function
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.routes.openapi
   *   .transformDoc({
   *     docOverrides: {
   *       info: {
   *         title: "My API",
   *         version: "2.0.0",
   *         contact: { email: "support@example.com" }
   *       }
   *     }
   *   })
   *   .writeDoc("openapi.json")
   *   .mapDoc("/docs");
   * ```
   */
  transformDoc(options: OpenAPIDocsOptions): this {
    this.#docOptions = options;
    return this;
  }

  #docPath?: { path: string; options?: OpenAPIDocsOptions };

  /**
   * The stored document path configuration, or undefined if none has been set.
   */
  get docPath() {
    return this.#docPath;
  }

  /**
   * Configures a file path where the OpenAPI document should be written.
   * The file will be written when the main build() method is called.
   *
   * @param path - The file path where the OpenAPI document should be written.
   *               Supports both JSON & YAML formats, detected by file extension.
   *
   * @param options - These options will override those set by `transformDoc`.
   * @param options.docOverrides - Partial OpenAPI document overrides to merge with the generated document
   * @param options.zodOpenApiOptions - Options to pass to the zod-openapi createDocument function
   * @returns This OpenApiRouteBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.writeDoc("./docs/openapi.json", {
   *   docOverrides: {
   *     info: { title: "My API", version: "1.0.0" }
   *   }
   * });
   * ```
   */
  writeDoc(path: string, options?: OpenAPIDocsOptions): this {
    this.#docPath = { path, options };
    return this;
  }

  /**
   * Maps a route that serves the OpenAPI document in both JSON and YAML formats.
   * Creates a GET route that responds with the OpenAPI specification document,
   * automatically detecting the preferred format based on Accept headers or file extension.
   *
   * @param path - The base path for the documentation route (without file extension)
   * @param options - These options will override those set by `transformDoc`.
   * @param options.docOverrides - Partial OpenAPI document overrides to merge with the generated document
   * @param options.zodOpenApiOptions - Options to pass to the zod-openapi createDocument function
   * @returns An OpenApiUiBuilder instance for adding OpenAPI UI middleware.
   *
   * @example
   * ```typescript
   * // Creates routes at /docs/openapi.json and /docs/openapi.yaml
   * // Also supports content negotiation via Accept headers
   * const uiBuilder = builder.mapDoc("/docs/openapi", {
   *   docOverrides: {
   *     info: {
   *       title: "My API",
   *       version: "1.0.0",
   *       description: "API documentation"
   *     }
   *   }
   * });
   *
   * // Chain with UI builder to add Swagger UI
   * // Scalar & others supported, checkout the OpenApiUiBuilder
   * uiBuilder.mapSwaggerUi("/docs");
   * ```
   */
  mapDoc(path: string, options?: OpenAPIDocsOptions): OpenApiUiBuilder {
    this.routeBuilder.mapGet(`${path}.*`, (ctx) => {
      const document = this.buildDoc({
        docOverrides: { servers: [{ url: new URL(ctx.req.url).origin }] },
        ...(options ?? this.docOptions),
      });

      // deno-lint-ignore no-explicit-any
      const acceptsResult = accepts(ctx as any, {
        header: "Accept",
        default: "application/openapi+json",
        supports: [
          "application/json",
          "application/openapi+json",
          "application/yaml",
          "application/openapi+yaml",
          "application/x-yaml",
          "text/x-yaml",
          "text/yaml",
        ],
      });

      if (ctx.req.path.endsWith(".yaml") || ctx.req.path.endsWith(".yml") || acceptsResult.includes("yaml")) {
        ctx.header("Content-Type", "application/openapi+yaml");
        return ctx.body(yaml.stringify(document));
      }

      ctx.header("Content-Type", "application/openapi+json");
      return ctx.body(JSON.stringify(document, null, "  "));
    });

    return new OpenApiUiBuilder(this.routeBuilder, `${path}.json`);
  }
}
