/**
 * Represents an HTTP response from an OpenAPI request with typed status, body, and headers.
 *
 * @template TStatus - The HTTP status code type
 * @template TBody - The type of the parsed response body
 * @template THeaders - The type of the response headers object
 * @template TIsDefault - Whether this response matches the OpenAPI "default" response definition
 *
 * @property status - The HTTP status code of the response
 * @property isDefault - True if this response matched the "default" response definition, false otherwise
 * @property headers - The response headers as a key-value record
 * @property body - The parsed response body (e.g., parsed JSON)
 * @property raw - The original Response object from the fetch API for advanced access
 * @property is - Type predicate method for narrowing based on status code
 *
 * @example
 * ```ts
 * // Using is() for type narrowing
 * if (response.is(200)) {
 *   console.log(response.body.name); // Type-safe access to 200 body
 * }
 *
 * // Using is() in switch with true
 * switch (true) {
 *   case response.is(200):
 *     console.log(response.body.name);
 *     break;
 *   case response.is(404):
 *     console.error(response.body.error);
 *     break;
 *   case response.isDefault:
 *     console.log(response.body.defaultMessage);
 *     break;
 * }
 *
 * // Alternative: Check isDefault first, then use switch on status
 * if (!response.isDefault) {
 *   switch (response.status) {
 *     case 200:
 *       console.log(response.body.name);
 *       break;
 *     case 404:
 *       console.error(response.body.error);
 *       break;
 *   }
 * } else {
 *   console.log(response.body.defaultMessage);
 * }
 * ```
 */
export interface OpenAPIResponse<
  TStatus extends number = number,
  TBody = unknown,
  THeaders = Record<string, string>,
  TIsDefault extends boolean = false,
> {
  /**
   * The HTTP status code of the response.
   *
   * @example
   * ```ts
   * if (response.status === 200) {
   *   console.log("Success!");
   * }
   * ```
   */
  status: TStatus;

  /**
   * Indicates whether this response matched the OpenAPI "default" response definition.
   *
   * When `true`, the response matched a "default" catch-all response specification
   * rather than an explicitly defined status code. The `status` property will still
   * contain the actual HTTP status code received.
   *
   * @example
   * ```ts
   * if (response.isDefault) {
   *   console.log(`Unexpected status ${response.status}`);
   * } else {
   *   console.log("Expected response");
   * }
   * ```
   */
  isDefault: TIsDefault;

  /**
   * The response headers as a key-value record.
   *
   * Contains only the headers explicitly defined in the OpenAPI specification
   * for this response. This often does not include all headers sent by the server.
   * To access all headers, use the `raw` Response object.
   *
   * The exact type depends on what headers are defined in the OpenAPI
   * specification for this response.
   *
   * @example
   * ```ts
   * // Access validated headers from the spec
   * console.log(response.headers["Content-Type"]);
   * console.log(response.headers["X-Request-ID"]);
   *
   * // Access all headers via raw response
   * response.raw.headers.forEach((value, key) => {
   *   console.log(`${key}: ${value}`);
   * });
   * ```
   */
  headers: THeaders;

  /**
   * The parsed response body.
   *
   * The exact type depends on the response status code and the OpenAPI
   * specification. TypeScript will narrow this type based on status code
   * checks or the `is()` method.
   *
   * @example
   * ```ts
   * if (response.is(200)) {
   *   console.log(response.body.user); // Typed for 200 response
   * } else if (response.is(404)) {
   *   console.error(response.body.error); // Typed for 404 response
   * }
   * ```
   */
  body: TBody;

  /**
   * The original Response object from the Fetch API.
   *
   * Provides access to the raw response for advanced use cases like
   * streaming, accessing response metadata, or cloning the response.
   *
   * @example
   * ```ts
   * console.log(response.raw.ok);
   * console.log(response.raw.statusText);
   * const clone = response.raw.clone();
   * ```
   */
  raw: Response;

  /**
   * Type predicate to check if the response has a specific status code.
   *
   * This method narrows the response type to the specific status code variant,
   * enabling type-safe access to the corresponding body and headers.
   * Automatically excludes default responses (isDefault === false).
   *
   * @template S - The specific status code to check for
   * @template R - The union type of all possible responses
   * @param statusCode - The HTTP status code to match
   * @returns True if the response matches the status code and is not a default response
   *
   * @example
   * ```ts
   * // Simple if statement
   * if (response.is(200)) {
   *   console.log(response.body.user); // Typed as 200 response body
   * }
   *
   * // Switch statement with true
   * switch (true) {
   *   case response.is(200):
   *     console.log(response.body.success);
   *     break;
   *   case response.is(404):
   *     console.error(response.body.error);
   *     break;
   * }
   * ```
   */
  is<S extends number, R extends OpenAPIResponse<number, unknown, unknown, boolean>>(
    this: R,
    statusCode: S,
  ): this is Extract<R, OpenAPIResponse<S, unknown, unknown, false>>;
}
