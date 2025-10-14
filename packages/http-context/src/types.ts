// deno-lint-ignore-file no-explicit-any

import type { BaseMime } from "@hono/hono/utils/mime";
import { Type } from "@brad-jones/deno-net-container";
import type { BodyData, ParseBodyOptions } from "@hono/hono/utils/body";
import type { Simplify, UnionToIntersection } from "@hono/hono/utils/types";
import type { RequestHeader, ResponseHeader } from "@hono/hono/utils/headers";
import type { ParamKeys, ParamKeyToRecord, RemoveQuestion } from "@hono/hono/types";
import type { ContentfulStatusCode, RedirectStatusCode, StatusCode } from "@hono/hono/utils/http-status";

/**
 * Injection token for use with `@brad-jones/deno-net-container`.
 */
export const HttpContext: Type<HttpContext> = new Type<HttpContext>("HttpContext");

/**
 * HTTP context interface providing request and response handling capabilities.
 *
 * This interface is inspired by and based on Hono's Context API design,
 * adapted for use within our application framework.
 *
 * Not every last feature has been adopted & this is on purpose.
 * Should one day Hono not be the hottest HTTP framework for TypeScript
 * it will be easier to swap in some other underlying HTTP router if we
 * don't have to adapt all the hono specific features.
 *
 * @see https://github.com/honojs/hono/blob/main/src/context.ts
 */
export interface HttpContext<Path extends string = any> {
  /**
   * The current request object containing all request-related data and methods.
   *
   * @see https://hono.dev/docs/api/context#req
   * @see https://hono.dev/docs/api/request
   */
  req: ExtendedRequest<Path>;

  /**
   * The current response object representing the HTTP response.
   *
   * @see https://hono.dev/docs/api/context#res
   */
  res: Response;

  /**
   * Contains any error thrown during request processing.
   * Available for error handling middleware to inspect and act upon.
   *
   * @example
   * ```ts
   * app.use('*', async (ctx, next) => {
   *   await next()
   *   if (ctx.error) {
   *     // Handle the error appropriately
   *   }
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#error
   */
  error: Error | undefined;

  /**
   * Renders content using the configured renderer, typically within a layout template.
   * The renderer must be set using `setRenderer()` before calling this method.
   *
   * @example
   * ```ts
   * app.get('/', (ctx) => {
   *   return ctx.render('Hello World!')
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#render-setrenderer
   */
  render(content: string | Promise<string>): Response | Promise<Response>;

  /**
   * Configures a custom renderer function for template rendering.
   * This is typically called in middleware to establish a layout or templating system.
   *
   * @example
   * ```tsx
   * app.use('*', async (ctx, next) => {
   *   ctx.setRenderer((content) => {
   *     return ctx.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#render-setrenderer
   */
  setRenderer(renderer: Renderer): void;

  /**
   * Sets HTTP response headers. Can be called multiple times to set different headers.
   * Use the `append` option to add multiple values for the same header name.
   *
   * @example
   * ```ts
   * app.get('/welcome', (ctx) => {
   *   // Set response headers
   *   ctx.header('X-Message', 'Hello!')
   *   ctx.header('Content-Type', 'text/plain')
   *
   *   return ctx.body('Thank you for visiting')
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#header
   */
  header(name: "Content-Type", value?: BaseMime, options?: { append?: boolean }): void;
  header(name: ResponseHeader, value?: string, options?: { append?: boolean }): void;
  header(name: string, value?: string, options?: { append?: boolean }): void;

  /**
   * Sets the HTTP status code for the response.
   * Defaults to 200 (OK) if not explicitly set.
   *
   * @param status The HTTP status code to set on the response.
   *
   * @see https://hono.dev/docs/api/context#status
   */
  status(status: StatusCode): void;

  /**
   * Stores a value in the context that can be retrieved later in the request lifecycle.
   * Useful for passing data between middleware and route handlers.
   *
   * @example
   * ```ts
   * app.use('*', async (ctx, next) => {
   *   ctx.set('message', 'Welcome to our API!')
   *   await next()
   * })
   * ```
   * @see https://hono.dev/docs/api/context#set-get
   */
  set<T>(key: string, value: T): void;

  /**
   * Retrieves a value from the context that was previously stored using `set()`.
   * Returns the stored value or undefined if the key doesn't exist.
   *
   * @example
   * ```ts
   * app.get('/', (ctx) => {
   *   const message = ctx.get('message')
   *   return ctx.text(`The message is "${message}"`)
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#set-get
   */
  get<T>(key: string): T;

  /**
   * Creates an HTTP response with the specified body data.
   * Optionally set status code and headers inline, or use `status()` and `header()` methods.
   *
   * @example
   * ```ts
   * app.get('/welcome', (ctx) => {
   *   // Set headers and status
   *   ctx.header('X-Message', 'Hello!')
   *   ctx.status(201)
   *
   *   // Return response with body
   *   return ctx.body('Thank you for visiting')
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#body
   */
  body<T extends Data>(data: T, status?: ContentfulStatusCode, headers?: ResponseHeaders): Promise<Response> | Response;

  /**
   * Creates a text response with `Content-Type: text/plain`.
   * Optionally specify status code and additional headers.
   *
   * @example
   * ```ts
   * app.get('/say', (ctx) => {
   *   return ctx.text('Hello World!')
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#text
   */
  text(data: string, status?: ContentfulStatusCode, headers?: ResponseHeaders): Promise<Response> | Response;

  /**
   * Creates a JSON response with `Content-Type: application/json`.
   * Automatically serializes the provided object to JSON.
   *
   * @example
   * ```ts
   * app.get('/api', (ctx) => {
   *   return ctx.json({ message: 'Hello World!' })
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#json
   */
  json<T>(
    object: T,
    status?: ContentfulStatusCode,
    headers?: ResponseHeaders,
  ): Promise<Response> | Response;

  /**
   * Creates an HTML response with `Content-Type: text/html`.
   * Accepts either a string or a Promise resolving to a string.
   *
   * @example
   * ```ts
   * app.get('/page', (ctx) => {
   *   return ctx.html('<h1>Welcome to our site!</h1>')
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#html
   */
  html(
    data: string | Promise<string>,
    status?: ContentfulStatusCode,
    headers?: ResponseHeaders,
  ): Promise<Response> | Response;

  /**
   * Creates a redirect response to the specified location.
   * Default status code is 302 (Found) for temporary redirects.
   *
   * @example
   * ```ts
   * app.get('/redirect', (ctx) => {
   *   return ctx.redirect('/')
   * })
   * app.get('/permanent-redirect', (ctx) => {
   *   return ctx.redirect('/', 301)
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#redirect
   */
  redirect<T extends RedirectStatusCode = 302>(location: string | URL, status?: T): Response;

  /**
   * Creates a 404 Not Found response.
   * Useful for indicating that the requested resource does not exist.
   *
   * @example
   * ```ts
   * app.get('/maybe-exists', (ctx) => {
   *   return ctx.notFound()
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/context#notfound
   */
  notFound(): Response | Promise<Response>;
}

export interface ExtendedRequest<Path extends string = any> {
  /**
   * Access to the underlying native Request object.
   * Useful for accessing platform-specific properties or methods.
   *
   * @example
   * ```ts
   * // Access platform-specific properties
   * app.post('/', async (ctx) => {
   *   const contentLength = ctx.req.raw.headers.get('content-length')
   *   // ...
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#raw
   */
  raw: Request;

  /**
   * The complete URL of the current request including protocol, host, and path.
   *
   * @example
   * ```ts
   * app.get('/about/me', (ctx) => {
   *   const url = ctx.req.url // `http://localhost:8000/about/me`
   *   // ...
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#url
   */
  url: string;

  /**
   * The HTTP method of the current request (GET, POST, PUT, DELETE, etc.).
   *
   * @example
   * ```ts
   * app.get('/about/me', (ctx) => {
   *   const method = ctx.req.method // `GET`
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#method
   */
  method: string;

  /**
   * The pathname portion of the request URL, excluding query parameters.
   *
   * @example
   * ```ts
   * app.get('/about/me', (ctx) => {
   *   const pathname = ctx.req.path // `/about/me`
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#path
   */
  path: string;

  /**
   * Extracts path parameters from the current route.
   * Can retrieve a specific parameter by key or all parameters as an object.
   *
   * @example
   * ```ts
   * const name = ctx.req.param('name')
   * // or all parameters at once
   * const { id, comment_id } = ctx.req.param()
   * ```
   *
   * @see https://hono.dev/docs/api/routing#path-parameter
   */
  param<P2 extends ParamKeys<Path> = ParamKeys<Path>>(key: P2 extends `${infer _}?` ? never : P2): string;
  param<P2 extends RemoveQuestion<ParamKeys<Path>> = RemoveQuestion<ParamKeys<Path>>>(key: P2): string | undefined;
  param<P2 extends string = Path>(): Simplify<UnionToIntersection<ParamKeyToRecord<ParamKeys<P2>>>>;
  param(key: string): string | undefined;

  /**
   * Retrieves query string parameters from the URL.
   * Can get a specific parameter by key or all parameters as an object.
   *
   * @example
   * ```ts
   * // Single query parameter
   * app.get('/search', (ctx) => {
   *   const query = ctx.req.query('q')
   * })
   *
   * // All query parameters at once
   * app.get('/search', (ctx) => {
   *   const { q, limit, offset } = ctx.req.query()
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#query
   */
  query(key: string): string | undefined;
  query(): Record<string, string>;

  /**
   * Retrieves multiple values for query string parameters that appear more than once.
   * Useful for handling array-like query parameters (e.g., /search?tags=A&tags=B).
   *
   * @example
   * ```ts
   * app.get('/search', (ctx) => {
   *   // tags will be string[]
   *   const tags = ctx.req.queries('tags')
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#queries
   */
  queries(key: string): string[] | undefined;
  queries(): Record<string, string[]>;

  /**
   * Retrieves HTTP request header values.
   * Can get a specific header by name or all headers as an object.
   *
   * @example
   * ```ts
   * app.get('/', (ctx) => {
   *   const userAgent = ctx.req.header('User-Agent')
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#header
   */
  header(name: RequestHeader): string | undefined;
  header(name: string): string | undefined;
  header(): Record<RequestHeader | string, string>;

  /**
   * Parses request body for form data submissions.
   * Supports both `multipart/form-data` and `application/x-www-form-urlencoded` content types.
   *
   * @example
   * ```ts
   * app.post('/submit', async (ctx) => {
   *   const body = await ctx.req.parseBody()
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#parsebody
   */
  parseBody<Options extends Partial<ParseBodyOptions>, T extends BodyData<Options>>(options?: Options): Promise<T>;
  parseBody<T extends BodyData>(options?: Partial<ParseBodyOptions>): Promise<T>;

  /**
   * Parses the request body as JSON.
   * Expects the content type to be `application/json`.
   *
   * @example
   * ```ts
   * app.post('/api/data', async (ctx) => {
   *   const body = await ctx.req.json()
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#json
   */
  json<T>(): Promise<T>;

  /**
   * Parses the request body as plain text.
   * Works with any text-based content type.
   *
   * @example
   * ```ts
   * app.post('/webhook', async (ctx) => {
   *   const body = await ctx.req.text()
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#text
   */
  text(): Promise<string>;

  /**
   * Parses the request body as an ArrayBuffer.
   * Useful for handling binary data such as images or files.
   *
   * @example
   * ```ts
   * app.post('/upload', async (ctx) => {
   *   const body = await ctx.req.arrayBuffer()
   * })
   * ```
   *
   * @see https://hono.dev/docs/api/request#arraybuffer
   */
  arrayBuffer(): Promise<ArrayBuffer>;

  /**
   * Parses the request body as a Blob object.
   * Useful for handling file uploads and binary data with metadata.
   *
   * @example
   * ```ts
   * app.post('/file', async (ctx) => {
   *   const body = await ctx.req.blob();
   * });
   * ```
   *
   * @see https://hono.dev/docs/api/request#blob
   */
  blob(): Promise<Blob>;

  /**
   * Parses the request body as FormData.
   * Ideal for handling multipart form submissions including file uploads.
   *
   * @example
   * ```ts
   * app.post('/form', async (ctx) => {
   *   const body = await ctx.req.formData();
   * });
   * ```
   *
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData(): Promise<FormData>;
}

/**
 * The next layer of middleware in a HTTP application.
 */
export type Next = () => Promise<void>;

/**
 * Data type can be a string, ArrayBuffer, Uint8Array (buffer), or ReadableStream.
 */
export type Data = string | ArrayBuffer | ReadableStream | Uint8Array<ArrayBuffer>;

/**
 * Headers to set on a response.
 */
export type ResponseHeaders =
  | Record<"Content-Type", BaseMime>
  | Record<ResponseHeader, string | string[]>
  | Record<string, string | string[]>;

/**
 * Interface representing a renderer for content.
 *
 * @param content The content to be rendered, which can be either a string or a Promise resolving to a string.
 * @returns The response after rendering the content, which can be either a Response or a Promise resolving to a Response.
 */
export type Renderer = (content: string | Promise<string>) => Response | Promise<Response>;
