/**
 * Represents an HTTP response from an OpenAPI request with typed status, body, and headers.
 *
 * This generic interface provides a structured representation of HTTP responses with support
 * for type-safe status codes, response bodies, and headers. It includes both the parsed
 * response data and access to the raw Response object for advanced use cases.
 *
 * @template TStatus - The HTTP status code type, defaults to `number` but can be narrowed to specific codes (e.g., `200 | 404`) or the special `"default"` literal
 * @template TBody - The type of the parsed response body, defaults to `unknown`
 * @template THeaders - The type of the response headers object, defaults to `Record<string, string>`
 *
 * @property status - The HTTP status code of the response, or the literal "default" for catch-all responses
 * @property headers - The response headers as a key-value record
 * @property body - The parsed response body (e.g., parsed JSON)
 * @property raw - The original Response object from the fetch API for advanced access
 *
 * @example
 * ```ts
 * // Basic response with default types
 * const response: OpenAPIResponse = {
 *   status: 200,
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
 *   | OpenAPIResponse<200, User>
 *   | OpenAPIResponse<404, { error: string }>
 *   | OpenAPIResponse<"default", { message: string }>;
 *
 * function handleResponse(response: UserOrError) {
 *   switch (response.status) {
 *     case 200:
 *       console.log(response.body.name); // Type-safe access
 *       break;
 *     case 404:
 *       console.error(response.body.error);
 *       break;
 *     case "default":
 *       console.log(response.body.message);
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
  TStatus extends number | "default" = number,
  TBody = unknown,
  THeaders = Record<string, string>,
> {
  status: TStatus;
  headers: THeaders;
  body: TBody;
  raw: Response;
}
