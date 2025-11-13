/**
 * Represents an HTTP response from an OpenAPI request with typed status, body, and headers.
 *
 * This generic interface provides a structured representation of HTTP responses with support
 * for type-safe status codes, response bodies, and headers. It includes both the parsed
 * response data and access to the raw Response object for advanced use cases.
 *
 * @template TStatus - The HTTP status code type, defaults to `number` but can be narrowed to specific codes (e.g., `200 | 404`)
 * @template TBody - The type of the parsed response body, defaults to `unknown`
 * @template THeaders - The type of the response headers object, defaults to `Record<string, string>`
 * @template TIsDefault - Whether this response matches the OpenAPI "default" response definition
 *
 * @property status - The HTTP status code of the response
 * @property isDefault - True if this response matched the "default" response definition, false otherwise
 * @property headers - The response headers as a key-value record
 * @property body - The parsed response body (e.g., parsed JSON)
 * @property raw - The original Response object from the fetch API for advanced access
 *
 * @example
 * ```ts
 * // Basic response with default types
 * const response: OpenAPIResponse = {
 *   status: 200,
 *   isDefault: false,
 *   headers: { "content-type": "application/json" },
 *   body: { id: 123, name: "John" },
 *   raw: originalResponse
 * };
 *
 * // Typed response with specific status and body
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * const userResponse: OpenAPIResponse<200, User> = {
 *   status: 200,
 *   isDefault: false,
 *   headers: { "content-type": "application/json" },
 *   body: {
 *     id: 123,
 *     name: "John Doe",
 *     email: "john@example.com"
 *   },
 *   raw: originalResponse
 * };
 *
 * // Union type for multiple possible responses including default
 * type UserOrError =
 *   | OpenAPIResponse<200, User, Record<string, string>, false>
 *   | OpenAPIResponse<404, { error: string }, Record<string, string>, false>
 *   | OpenAPIResponse<number, { message: string }, Record<string, string>, true>;
 *
 * function handleResponse(response: UserOrError) {
 *   if (response.isDefault) {
 *     // TypeScript knows this is the default response
 *     console.log(response.body.message);
 *     return;
 *   }
 *
 *   switch (response.status) {
 *     case 200:
 *       console.log(response.body.name); // Type-safe access
 *       break;
 *     case 404:
 *       console.error(response.body.error);
 *       break;
 *   }
 * }
 *
 * // Access raw response for streaming or advanced features
 * const streamResponse: OpenAPIResponse = await fetch(...);
 * const reader = streamResponse.raw.body?.getReader();
 * ```
 */
export interface OpenAPIResponse<
  TStatus extends number = number,
  TBody = unknown,
  THeaders = Record<string, string>,
  TIsDefault extends boolean = false,
> {
  status: TStatus;
  isDefault: TIsDefault;
  headers: THeaders;
  body: TBody;
  raw: Response;
}
