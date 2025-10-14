// deno-lint-ignore-file no-explicit-any

import type { JSONValue } from "@hono/hono/utils/types";
import type { ZodOpenApiOperationObject } from "zod-openapi";
import type { ContentfulStatusCode } from "@hono/hono/utils/http-status";
import type { HttpContext, ResponseHeaders } from "@brad-jones/deno-net-http-context";

/**
 * Type-safe request context for OpenAPI operations.
 *
 * This class provides strongly-typed access to all aspects of an OpenAPI request,
 * including path parameters, query parameters, headers, cookies, and request body.
 * It also provides a type-safe response method that ensures the response matches
 * the OpenAPI specification.
 *
 * @template OpenApi - The Zod OpenAPI operation object type
 *
 * @example
 * ```typescript
 * // Define an OpenAPI operation
 * const getUserOperation = {
 *   parameters: [
 *     { in: "path", name: "id", schema: z.string() },
 *     { in: "query", name: "include", schema: z.array(z.string()).optional() }
 *   ],
 *   responses: {
 *     200: {
 *       content: { "application/json": { schema: UserSchema } }
 *     }
 *   }
 * } satisfies ZodOpenApiOperationObject;
 *
 * // Use the context
 * function handleGetUser(ctx: OpenApiRequestContext<typeof getUserOperation>) {
 *   const { id } = ctx.pathParams; // string
 *   const { include } = ctx.queryParams; // string[] | undefined
 *
 *   return ctx.response(200, userData);
 * }
 * ```
 */
export class OpenApiRequestContext<OpenApi extends ZodOpenApiOperationObject = any> {
  /**
   * Creates a new OpenAPI request context.
   *
   * @param httpContext - The underlying HTTP context
   * @param pathParams - Extracted and typed path parameters
   * @param queryParams - Extracted and typed query parameters
   * @param headers - Extracted and typed request headers
   * @param cookies - Extracted and typed request cookies
   * @param body - Extracted and typed request body
   */
  constructor(
    public readonly httpContext: HttpContext,
    public readonly pathParams: ExtractPathParameters<OpenApi>,
    public readonly queryParams: ExtractQueryParameters<OpenApi>,
    public readonly headers: ExtractRequestHeaders<OpenApi>,
    public readonly cookies: ExtractRequestCookies<OpenApi>,
    public readonly body: ExtractRequestBody<OpenApi>,
  ) {}

  /**
   * Creates a type-safe JSON response that matches the OpenAPI specification.
   *
   * This method ensures that the status code, headers, and response body all
   * conform to the types defined in the OpenAPI operation. The method signature
   * dynamically adjusts based on whether the response defines headers.
   *
   * @template StatusCode - The HTTP status code (must be defined in the OpenAPI responses)
   * @template Headers - The response headers type for the given status code
   * @template Payload - The response body type for the given status code
   * @template Args - Dynamically typed arguments based on whether headers are required
   *
   * @param status - The HTTP status code
   * @param args - Either [body] or [headers, body] depending on the OpenAPI specification
   * @returns A Response object or Promise<Response>
   *
   * @example
   * ```typescript
   * // For a response without headers
   * return ctx.response(200, userData);
   *
   * // For a response with headers
   * return ctx.response(201, { "Location": "/users/123" }, userData);
   * ```
   */
  response<
    StatusCode extends ExtractStatusCodes<OpenApi>,
    Headers extends ExtractResponseHeaders<OpenApi, StatusCode>,
    Payload extends ExtractResponseBody<OpenApi, StatusCode>,
    Args extends HasHeaders<OpenApi, StatusCode> extends true ? [headers: Headers, body: Payload] : [body: Payload],
  >(status: StatusCode, ...args: Args): Promise<Response> | Response {
    const headers = args.length === 2 ? args[0] : undefined;
    const body = args.length === 1 ? args[0] : args[1];
    return this.httpContext.json(body!, status, headers!);
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Combines two parameter type objects using intersection types.
 *
 * @template T1 - First parameter type object
 * @template T2 - Second parameter type object
 *
 * @internal
 */
type CombineParameterTypes<T1, T2> = T1 & T2;

/**
 * Type guard that ensures T is a valid ZodOpenApiOperationObject.
 * Returns never if T is not a valid operation, otherwise returns T.
 *
 * @template T - Type to validate as an OpenAPI operation
 *
 * @internal
 */
type IsOperation<T> = T extends ZodOpenApiOperationObject ? T : never;

/**
 * Extracts the output type from a Zod schema, falling back to the schema type itself.
 * This handles both Zod schemas (which have an _output property) and plain types.
 *
 * @template T - The schema type to extract output from
 *
 * @internal
 */
type SchemaOutput<T> = T extends { _output: infer Output } ? Output : T;

// ============================================================================
// Parameter Extraction Types
// ============================================================================

/**
 * Determines if a response for a given status code has headers defined.
 *
 * @template T - The OpenAPI operation type
 * @template S - The status code to check
 *
 * @internal
 */
type HasHeaders<T, S> = ResponseForStatus<T, S> extends { headers?: unknown } ? true : false;

/**
 * Extracts request parameters by key from the requestParams object.
 * This handles parameters defined in the top-level requestParams field.
 *
 * @template T - The OpenAPI operation type
 * @template Key - The parameter key to extract (e.g., "path", "query", "header", "cookie")
 *
 * @internal
 */
type ExtractRequestParamsByKey<T, Key extends string> = T extends IsOperation<T>
  ? T["requestParams"] extends Record<Key, infer Schema> ? SchemaOutput<Schema>
  : Record<string, unknown>
  : Record<string, unknown>;

/**
 * Extracts parameters by their location from the parameters array.
 * This handles parameters defined in the OpenAPI parameters array format.
 *
 * @template T - The OpenAPI operation type
 * @template Location - The parameter location ("path", "query", "header", "cookie")
 *
 * @internal
 */
type ExtractParametersByLocation<T, Location extends string> = T extends IsOperation<T>
  ? T["parameters"] extends readonly unknown[] ? {
      [
        K in keyof T["parameters"] as T["parameters"][K] extends { in: Location; name: infer Name }
          ? Name extends string ? Name : never
          : never
      ]: T["parameters"][K] extends { schema: infer Schema } ? SchemaOutput<Schema> : unknown;
    }
  : Record<string, unknown>
  : Record<string, unknown>;

// ============================================================================
// Response Extraction Types
// ============================================================================

/**
 * Extracts the responses record from an OpenAPI operation.
 * Returns the responses object if it exists, otherwise never.
 *
 * @template T - The OpenAPI operation type
 *
 * @internal
 */
type ResponsesRecord<T> = T extends IsOperation<T>
  ? T["responses"] extends Record<string, unknown> ? T["responses"] : never
  : never;

/**
 * Extracts a specific response definition for a given status code.
 *
 * @template T - The OpenAPI operation type
 * @template S - The status code to extract the response for
 *
 * @internal
 */
type ResponseForStatus<T, S> = ResponsesRecord<T> extends never ? never
  : S extends keyof ResponsesRecord<T> ? ResponsesRecord<T>[S]
  : never;

/**
 * Extracts all valid status codes from an OpenAPI operation's responses.
 * Ensures the status codes are valid HTTP status codes.
 *
 * @template T - The OpenAPI operation type
 *
 * @internal
 */
type ExtractStatusCodes<T> = ResponsesRecord<T> extends Record<infer K, unknown>
  ? K extends string ? K extends `${infer Code}` ? Code extends ContentfulStatusCode ? Code
      : ContentfulStatusCode
    : ContentfulStatusCode
  : ContentfulStatusCode
  : ContentfulStatusCode;

/**
 * Extracts the response headers type for a specific status code.
 * Falls back to the default ResponseHeaders type if no headers are defined.
 *
 * @template T - The OpenAPI operation type
 * @template S - The status code to extract headers for
 *
 * @internal
 */
type ExtractResponseHeaders<T, S> = ResponseForStatus<T, S> extends {
  headers?: infer Schema;
} ? SchemaOutput<Schema>
  : ResponseHeaders;

/**
 * Extracts the response body type for a specific status code.
 * Looks for JSON content and extracts the schema, falling back to JSONValue.
 *
 * @template T - The OpenAPI operation type
 * @template S - The status code to extract the body type for
 *
 * @internal
 */
type ExtractResponseBody<T, S> = ResponseForStatus<T, S> extends {
  content?: { "application/json"?: { schema: infer Schema } };
} ? SchemaOutput<Schema>
  : JSONValue;

// ============================================================================
// Main Parameter Extraction Types
// ============================================================================

/**
 * Extracts all path parameters from an OpenAPI operation.
 * Combines parameters from both the parameters array and requestParams object.
 *
 * @template T - The OpenAPI operation type
 *
 * @example
 * ```typescript
 * // For an operation with path parameters
 * type UserPathParams = ExtractPathParameters<{
 *   parameters: [{ in: "path", name: "userId", schema: z.string() }]
 * }>; // { userId: string }
 * ```
 *
 * @internal
 */
type ExtractPathParameters<T> = CombineParameterTypes<
  ExtractParametersByLocation<T, "path">,
  ExtractRequestParamsByKey<T, "path">
>;

/**
 * Extracts all query parameters from an OpenAPI operation.
 * Combines parameters from both the parameters array and requestParams object.
 *
 * @template T - The OpenAPI operation type
 *
 * @example
 * ```typescript
 * // For an operation with query parameters
 * type SearchQueryParams = ExtractQueryParameters<{
 *   parameters: [
 *     { in: "query", name: "q", schema: z.string() },
 *     { in: "query", name: "limit", schema: z.number().optional() }
 *   ]
 * }>; // { q: string; limit?: number }
 * ```
 *
 * @internal
 */
type ExtractQueryParameters<T> = CombineParameterTypes<
  ExtractParametersByLocation<T, "query">,
  ExtractRequestParamsByKey<T, "query">
>;

/**
 * Extracts all request headers from an OpenAPI operation.
 * Combines parameters from both the parameters array and requestParams object.
 *
 * @template T - The OpenAPI operation type
 *
 * @example
 * ```typescript
 * // For an operation with header parameters
 * type AuthHeaders = ExtractRequestHeaders<{
 *   parameters: [{ in: "header", name: "Authorization", schema: z.string() }]
 * }>; // { Authorization: string }
 * ```
 *
 * @internal
 */
type ExtractRequestHeaders<T> = CombineParameterTypes<
  ExtractParametersByLocation<T, "header">,
  ExtractRequestParamsByKey<T, "header">
>;

/**
 * Extracts all request cookies from an OpenAPI operation.
 * Combines parameters from both the parameters array and requestParams object.
 *
 * @template T - The OpenAPI operation type
 *
 * @example
 * ```typescript
 * // For an operation with cookie parameters
 * type SessionCookies = ExtractRequestCookies<{
 *   parameters: [{ in: "cookie", name: "sessionId", schema: z.string() }]
 * }>; // { sessionId: string }
 * ```
 *
 * @internal
 */
type ExtractRequestCookies<T> = CombineParameterTypes<
  ExtractParametersByLocation<T, "cookie">,
  ExtractRequestParamsByKey<T, "cookie">
>;

/**
 * Extracts the request body type from an OpenAPI operation.
 * Looks specifically for JSON content and extracts the schema type.
 *
 * @template T - The OpenAPI operation type
 *
 * @example
 * ```typescript
 * // For an operation with a request body
 * type CreateUserBody = ExtractRequestBody<{
 *   requestBody: {
 *     content: { "application/json": { schema: UserCreateSchema } }
 *   }
 * }>; // Inferred from UserCreateSchema
 * ```
 *
 * @internal
 */
type ExtractRequestBody<T> = T extends IsOperation<T> ? T["requestBody"] extends {
    content?: { "application/json"?: { schema: infer Schema } };
  } ? SchemaOutput<Schema>
  : never
  : never;
