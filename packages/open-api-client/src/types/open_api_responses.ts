import type { OpenAPIResponse } from "./open_api_response.ts";

/**
 * Generates a union type of all possible OpenAPIResponse types for an operation.
 *
 * This utility type transforms a record of response definitions (indexed by HTTP status code)
 * into a discriminated union of OpenAPIResponse types. This enables type-safe handling of
 * different response scenarios based on status codes, allowing TypeScript to narrow the
 * response body and headers types when checking the status.
 *
 * @template TResponses - A record mapping HTTP status codes to their body and headers types
 *
 * @example
 * ```ts
 * // Define possible responses for a user fetch operation
 * type GetUserResponses = OpenAPIResponses<{
 *   200: { body: { id: number; name: string; email: string } };
 *   404: { body: { error: string; message: string } };
 *   500: { body: { error: string } };
 * }>;
 *
 * // Result is a union type:
 * // | OpenAPIResponse<200, { id: number; name: string; email: string }>
 * // | OpenAPIResponse<404, { error: string; message: string }>
 * // | OpenAPIResponse<500, { error: string }>
 *
 * function handleUserResponse(response: GetUserResponses) {
 *   if (response.status === 200) {
 *     // TypeScript knows response.body has id, name, email
 *     console.log(`User: ${response.body.name}`);
 *   } else if (response.status === 404) {
 *     // TypeScript knows response.body has error and message
 *     console.error(`Not found: ${response.body.message}`);
 *   } else {
 *     // TypeScript knows response.body has error
 *     console.error(`Server error: ${response.body.error}`);
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // With custom headers
 * type CreateUserResponses = OpenAPIResponses<{
 *   201: {
 *     body: { id: number; name: string };
 *     headers: { "X-Request-ID": string; "Location": string };
 *   };
 *   400: {
 *     body: { errors: string[] };
 *   };
 * }>;
 *
 * function handleCreateResponse(response: CreateUserResponses) {
 *   if (response.status === 201) {
 *     // Access typed body and headers
 *     console.log(`Created user ${response.body.id}`);
 *     console.log(`Location: ${response.headers.Location}`);
 *   } else {
 *     // 400 response has default Record<string, string> headers
 *     console.error(`Validation errors: ${response.body.errors.join(", ")}`);
 *   }
 * }
 * ```
 */
export type OpenAPIResponses<
  TResponses extends Record<
    number,
    { body?: unknown; headers?: Record<string, unknown> }
  >,
> = {
  [K in keyof TResponses]: K extends number
    ? TResponses[K] extends { body: infer TBody; headers: infer THeaders } ? OpenAPIResponse<K, TBody, THeaders>
    : TResponses[K] extends { body: infer TBody } ? OpenAPIResponse<K, TBody, Record<string, string>>
    : never
    : never;
}[keyof TResponses];
