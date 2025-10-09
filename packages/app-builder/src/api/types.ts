import type { BaseMime } from "@hono/hono/utils/mime";
import type { JSONValue } from "@hono/hono/utils/types";
import type { BodyData, ParseBodyOptions } from "@hono/hono/utils/body";
import type { RequestHeader, ResponseHeader } from "@hono/hono/utils/headers";
import type { ContentfulStatusCode, RedirectStatusCode, StatusCode } from "@hono/hono/utils/http-status";

/**
 * The next layer of middleware in a HTTP application.
 */
export type Next = () => Promise<void>;

/**
 * Data type can be a string, ArrayBuffer, Uint8Array (buffer), or ReadableStream.
 */
export type Data = string | ArrayBuffer | ReadableStream | Uint8Array<ArrayBuffer>;

/**
 * Interface representing a renderer for content.
 *
 * @param content The content to be rendered, which can be either a string or a Promise resolving to a string.
 * @returns The response after rendering the content, which can be either a Response or a Promise resolving to a Response.
 */
export type Renderer = (content: string | Promise<string>) => Response | Promise<Response>;

/**
 * Headers to set on a response.
 */
export type HeaderRecord =
  | Record<"Content-Type", BaseMime>
  | Record<ResponseHeader, string | string[]>
  | Record<string, string | string[]>;

/**
 * Interface for the execution context in a web worker or similar environment.
 */
export interface ExecutionContext<T> {
  /**
   * Extends the lifetime of the event callback until the promise is settled.
   *
   * @param promise - A promise to wait for.
   */
  waitUntil(promise: Promise<unknown>): void;

  /**
   * Allows the event to be passed through to subsequent event listeners.
   */
  passThroughOnException(): void;

  /**
   * For compatibility with Wrangler 4.x.
   */
  props: T;
}

export interface WrappedRequest {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see https://hono.dev/docs/api/request#raw
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw: Request;

  /**
   * `.path` can get the pathname of the request.
   *
   * @see https://hono.dev/docs/api/request#path
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path: string;

  /**
   * `.req.param()` gets the path parameters.
   *
   * @see {@link https://hono.dev/docs/api/routing#path-parameter}
   *
   * @example
   * ```ts
   * const name = c.req.param('name')
   * // or all parameters at once
   * const { id, comment_id } = c.req.param()
   * ```
   */
  param(key: string): string | undefined;

  /**
   * `.query()` can get querystring parameters.
   *
   * @see {@link https://hono.dev/docs/api/request#query}
   *
   * @example
   * ```ts
   * // Query params
   * app.get('/search', (c) => {
   *   const query = c.req.query('q')
   * })
   *
   * // Get all params at once
   * app.get('/search', (c) => {
   *   const { q, limit, offset } = c.req.query()
   * })
   * ```
   */
  query(key: string): string | undefined;
  query(): Record<string, string>;

  /**
   * `.queries()` can get multiple querystring parameter values, e.g. /search?tags=A&tags=B
   *
   * @see {@link https://hono.dev/docs/api/request#queries}
   *
   * @example
   * ```ts
   * app.get('/search', (c) => {
   *   // tags will be string[]
   *   const tags = c.req.queries('tags')
   * })
   * ```
   */
  queries(key: string): string[] | undefined;
  queries(): Record<string, string[]>;

  /**
   * `.header()` can get the request header value.
   *
   * @see {@link https://hono.dev/docs/api/request#header}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const userAgent = c.req.header('User-Agent')
   * })
   * ```
   */
  header(name: RequestHeader): string | undefined;
  header(name: string): string | undefined;
  header(): Record<RequestHeader | string, string>;

  /**
   * `.parseBody()` can parse Request body of type `multipart/form-data` or `application/x-www-form-urlencoded`
   *
   * @see {@link https://hono.dev/docs/api/request#parsebody}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.parseBody()
   * })
   * ```
   */
  parseBody<Options extends Partial<ParseBodyOptions>, T extends BodyData<Options>>(options?: Options): Promise<T>;
  parseBody<T extends BodyData>(options?: Partial<ParseBodyOptions>): Promise<T>;

  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json<T>(): Promise<T>;

  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text(): Promise<string>;

  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer(): Promise<ArrayBuffer>;

  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob(): Promise<Blob>;

  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData(): Promise<FormData>;

  /**
   * Gets validated data from the request.
   *
   * @param target - The target of the validation.
   * @returns The validated data.
   *
   * @see https://hono.dev/docs/api/request#valid
   */
  valid<T1, T2>(target: T1): T2;

  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  url: string;

  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  method: string;
}

export interface HttpContext {
  /**
   * The current request object.
   *
   * @see https://hono.dev/docs/api/context#req
   * @also https://hono.dev/docs/api/request
   */
  req: WrappedRequest;

  /**
   * The current response object.
   *
   * @see https://hono.dev/docs/api/context#res
   */
  res: Response;

  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see https://hono.dev/docs/api/context#error
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error: Error | undefined;

  /**
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   *
   * @see https://hono.dev/docs/api/context#executionctx
   */
  executionCtx: ExecutionContext<unknown>;

  /**
   * `.render()` can create a response within a layout.
   *
   * @see https://hono.dev/docs/api/context#render-setrenderer
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render(content: string | Promise<string>): Response | Promise<Response>;

  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see https://hono.dev/docs/api/context#render-setrenderer
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
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
   */
  setRenderer(renderer: Renderer): void;

  /**
   * `.header()` can set headers.
   *
   * @see https://hono.dev/docs/api/context#header
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header(name: "Content-Type", value?: BaseMime, options?: { append?: boolean }): void;
  header(name: ResponseHeader, value?: string, options?: { append?: boolean }): void;
  header(name: string, value?: string, options?: { append?: boolean }): void;

  /**
   * You can set an HTTP status code with c.status().
   * The default is 200. You don't have to use c.status() if the code is 200.
   *
   * @param status A status code to set on the response.
   *
   * @see https://hono.dev/docs/api/context#status
   */
  status(status: StatusCode): void;

  /**
   * `.set()` can set the value specified by the key.
   *
   * @see https://hono.dev/docs/api/context#set-get
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set<T>(key: string, value: T): void;

  /**
   * `.get()` can use the value specified by the key.
   *
   * @see https://hono.dev/docs/api/context#set-get
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get<T>(key: string): T;

  /**
   * `.var` can access the value of a variable.
   *
   * @see https://hono.dev/docs/api/context#var
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  var: Record<string, unknown>;

  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see https://hono.dev/docs/api/context#body
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body<T extends Data>(data: T, status?: ContentfulStatusCode, headers?: HeaderRecord): Promise<Response> | Response;

  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see https://hono.dev/docs/api/context#text
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text(data: string, status?: ContentfulStatusCode, headers?: HeaderRecord): Promise<Response> | Response;

  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see https://hono.dev/docs/api/context#json
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json<T extends JSONValue>(
    object: T,
    status?: ContentfulStatusCode,
    headers?: HeaderRecord,
  ): Promise<Response> | Response;

  /**
   * `.html()` can render HTML as `Content-Type:text/html`.
   *
   * @see https://hono.dev/docs/api/context#html
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.html('<h1>Hello! Hono!</h1>')
   * })
   * ```
   */
  html(
    data: string | Promise<string>,
    status?: ContentfulStatusCode,
    headers?: HeaderRecord,
  ): Promise<Response> | Response;

  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see https://hono.dev/docs/api/context#redirect
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect<T extends RedirectStatusCode = 302>(location: string | URL, status?: T): Response;

  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see https://hono.dev/docs/api/context#notfound
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound(): Response | Promise<Response>;
}
