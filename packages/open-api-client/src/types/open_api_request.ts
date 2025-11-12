import type { OpenAPIParameter } from "./open_api_parameter.ts";

/**
 * Represents the data for an OpenAPI HTTP request including parameters and body.
 *
 * This interface organizes all the data needed to make an HTTP request according to OpenAPI
 * specifications. Parameters are grouped by their location (path, query, headers, cookies),
 * and the request body is provided separately. All fields are optional since not every request
 * uses all parameter types.
 *
 * @property path - Path parameters to be substituted into the URL path template (e.g., `{ id: 123 }` for `/users/{id}`)
 * @property query - Query parameters to be serialized into the query string (e.g., `{ search: "term", limit: 10 }`)
 * @property headers - HTTP headers to be included in the request (e.g., `{ "Authorization": "Bearer token" }`)
 * @property cookies - Cookie parameters to be serialized into the Cookie header (e.g., `{ sessionId: "abc123" }`)
 * @property body - The request body payload, typically a JSON-serializable object
 *
 * @example
 * ```ts
 * // GET request with path and query parameters
 * const getUserPosts: OpenAPIRequest = {
 *   path: { userId: 123 },
 *   query: { status: "published", limit: 10 }
 * };
 *
 * // POST request with headers and body
 * const createUser: OpenAPIRequest = {
 *   headers: { "Authorization": "Bearer token123" },
 *   body: {
 *     name: "John Doe",
 *     email: "john@example.com",
 *     role: "admin"
 *   }
 * };
 *
 * // Complex request with all parameter types
 * const complexRequest: OpenAPIRequest = {
 *   path: { organizationId: "org-123", projectId: "proj-456" },
 *   query: {
 *     include: ["members", "settings"],
 *     sortBy: "name"
 *   },
 *   headers: {
 *     "Authorization": "Bearer token123",
 *     "X-Request-ID": "req-789"
 *   },
 *   cookies: {
 *     sessionId: "session-abc",
 *     preferences: "dark-mode"
 *   },
 *   body: {
 *     action: "update",
 *     data: { name: "New Project Name" }
 *   }
 * };
 * ```
 */
export interface OpenAPIRequest {
  path?: Record<string, OpenAPIParameter>;
  query?: Record<string, OpenAPIParameter>;
  headers?: Record<string, OpenAPIParameter>;
  cookies?: Record<string, OpenAPIParameter>;
  body?: unknown;
}
