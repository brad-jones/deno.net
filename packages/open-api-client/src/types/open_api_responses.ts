import type { OpenAPIResponse } from "./open_api_response.ts";

/**
 * Generates a union type of all possible OpenAPIResponse types for an operation.
 *
 * This utility type transforms a record of response definitions (indexed by HTTP status code
 * or the special "default" key) into a discriminated union of OpenAPIResponse types. This
 * enables type-safe handling of different response scenarios based on status codes, allowing
 * TypeScript to narrow the response body and headers types when checking the status.
 *
 * The special "default" key is used to represent any HTTP status code that is not explicitly
 * defined in the responses object. When present, it will be transformed to use `Exclude<number, ...>`
 * as the status type, excluding all explicitly defined status codes. This allows proper type
 * narrowing in switch statements and conditional checks.
 *
 * @template TResponses - A record mapping HTTP status codes (or "default") to their body and headers types
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
 *
 * @example
 * ```ts
 * // Using the "default" response for catch-all cases
 * type ApiResponses = OpenAPIResponses<{
 *   200: { body: { success: true } };
 *   400: { body: { error: string } };
 *   default: { body: { message: string } };
 * }>;
 *
 * function handleApiResponse(response: ApiResponses) {
 *   switch (response.status) {
 *     case 200:
 *       console.log("Success!");
 *       break;
 *     case 400:
 *       console.error(`Bad request: ${response.body.error}`);
 *       break;
 *     default:
 *       // Handles any other status code (401, 403, 500, etc.)
 *       // TypeScript properly narrows to the default response body type
 *       console.log(`Unexpected response: ${response.body.message}`);
 *       break;
 *   }
 * }
 * ```
 */
export type OpenAPIResponses<
  TResponses extends
    & Record<number, { body?: unknown; headers?: Record<string, unknown> }>
    & Partial<
      Record<"default", { body?: unknown; headers?: Record<string, unknown> }>
    >,
> = {
  [K in keyof TResponses]: K extends number
    ? TResponses[K] extends { body: infer TBody; headers: infer THeaders } ? OpenAPIResponse<K, TBody, THeaders>
    : TResponses[K] extends { body: infer TBody } ? OpenAPIResponse<K, TBody, Record<string, string>>
    : never
    : K extends "default"
      ? TResponses[K] extends { body: infer TBody; headers: infer THeaders }
        ? OpenAPIResponse<"default", TBody, THeaders>
      : TResponses[K] extends { body: infer TBody } ? OpenAPIResponse<"default", TBody, Record<string, string>>
      : never
    : never;
}[keyof TResponses];
