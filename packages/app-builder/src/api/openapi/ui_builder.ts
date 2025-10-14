import { html } from "@hono/hono/html";
import type { RouteBuilder } from "../route_builder.ts";
import type { HttpContext } from "@brad-jones/deno-net-http-context";

/**
 * Configuration options for Swagger UI rendering.
 */
export interface SwaggerUiOptions {
  /**
   * The version of Swagger UI to use from unpkg.com.
   * If not specified, the latest version will be used.
   *
   * @example "4.15.5"
   */
  version?: string;
}

/**
 * Configuration options for Scalar UI rendering.
 */
export interface ScalarUiOptions {
  /**
   * The version of Scalar API Reference to use from jsdelivr.net.
   * If not specified, the latest version will be used.
   *
   * @example "1.24.0"
   */
  version?: string;
}

/**
 * A handler function factory for creating OpenAPI UI routes.
 * Takes a document path and returns a handler function that can be used with route builders.
 *
 * @param documentPath - The path to the OpenAPI document on this server.
 * @returns A handler function that renders the UI for the given document path
 *
 * @example
 * ```typescript
 * const customHandler: OpenAPIUiHandler = (docPath) => (ctx) => {
 *   return ctx.html(`<div>Custom UI for ${docPath}</div>`);
 * };
 *
 * builder.mapUi("/custom-docs", customHandler);
 * ```
 */
export type OpenAPIUiHandler = (documentPath: string) => (ctx: HttpContext) => Promise<Response> | Response;

/**
 * A builder class for creating OpenAPI documentation UI routes.
 * Provides methods to easily add Swagger UI, Scalar UI, or custom UI implementations
 * that render OpenAPI documentation in a web interface.
 */
export class OpenApiUiBuilder {
  /**
   * Helper method to format CDN asset versions.
   * Converts a version string to the format expected by CDN URLs.
   *
   * @private
   * @param version - The version string to format
   * @returns The formatted version string with '@' prefix, or empty string if no version
   */
  #assetVersion = (version?: string) => version ? `@${version}` : "";

  /**
   * Creates a new OpenApiUiBuilder instance.
   *
   * @param routeBuilder - The parent RouteBuilder instance to register UI routes with
   * @param documentPath - The path where the OpenAPI document is served (e.g., "/api-docs.json")
   */
  constructor(private routeBuilder: RouteBuilder, private documentPath: string) {}

  /**
   * Maps a custom OpenAPI UI handler to the specified path.
   * Allows you to create custom documentation interfaces using your own handler logic.
   *
   * @param path - The URL path where the UI should be served
   * @param handler - A custom handler function that receives the document path and returns a route handler
   * @returns This OpenApiUiBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const customHandler: OpenAPIUiHandler = (docPath) => (ctx) => {
   *   return ctx.html(`
   *     <html>
   *       <body>
   *         <h1>My Custom API Docs</h1>
   *         <iframe src="/external-docs?spec=${docPath}"></iframe>
   *       </body>
   *     </html>
   *   `);
   * };
   *
   * builder.mapUi("/custom-docs", customHandler);
   * ```
   */
  mapUi(path: string, handler: OpenAPIUiHandler): this {
    this.routeBuilder.mapGet(path, handler(this.documentPath));
    return this;
  }

  /**
   * Maps a Swagger UI interface to the specified path.
   * Creates a fully functional Swagger UI that loads your OpenAPI specification,
   * allowing users to explore and test API endpoints interactively.
   *
   * @param path - The URL path where Swagger UI should be served
   * @param options - Optional configuration for Swagger UI
   * @param options.version - Specific version of Swagger UI to load from unpkg.com
   * @returns This OpenApiUiBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Use latest version of Swagger UI
   * builder.mapSwaggerUi("/docs");
   *
   * // Use specific version of Swagger UI
   * builder.mapSwaggerUi("/docs", { version: "4.15.5" });
   *
   * // Chain multiple UI implementations
   * builder
   *   .mapSwaggerUi("/swagger")
   *   .mapScalarUi("/scalar");
   * ```
   */
  mapSwaggerUi(path: string, options?: SwaggerUiOptions): this {
    const v = this.#assetVersion(options?.version);
    this.routeBuilder.mapGet(path, (ctx) =>
      ctx.html(html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>SwaggerUI</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist${v}/swagger-ui.css" />
          </head>
          <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist${v}/swagger-ui-bundle.js" crossorigin></script>
            <script>
              window.onload = () => {
                window.ui = SwaggerUIBundle({
                  url: '${this.documentPath}',
                  dom_id: '#swagger-ui',
                });
              };
            </script>
          </body>
        </html>
      `));
    return this;
  }

  /**
   * Maps a Scalar UI interface to the specified path.
   * Creates a modern, beautiful API documentation interface using Scalar's API Reference.
   * Scalar provides a clean, responsive design with excellent developer experience.
   *
   * @param path - The URL path where Scalar UI should be served
   * @param options - Optional configuration for Scalar UI
   * @param options.version - Specific version of Scalar API Reference to load from jsdelivr.net
   * @returns This OpenApiUiBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Use latest version of Scalar UI
   * builder.mapScalarUi("/docs");
   *
   * // Use specific version of Scalar UI
   * builder.mapScalarUi("/docs", { version: "1.24.0" });
   *
   * // Serve both Swagger and Scalar on different paths
   * builder
   *   .mapSwaggerUi("/swagger-docs")
   *   .mapScalarUi("/scalar-docs");
   * ```
   */
  mapScalarUi(path: string, options?: ScalarUiOptions): this {
    const v = this.#assetVersion(options?.version);
    this.routeBuilder.mapGet(path, (ctx) =>
      ctx.html(html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Scalar API Reference</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body>
            <div id="app"></div>
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference${v}"></script>
            <script>
              Scalar.createApiReference('#app', {
                url: '${this.documentPath}'
              })
            </script>
          </body>
        </html>
      `));
    return this;
  }
}
