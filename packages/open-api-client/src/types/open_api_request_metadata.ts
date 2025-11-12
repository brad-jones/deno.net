import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { OpenAPIParameterMetadata } from "./open_api_parameter_metadata.ts";

/**
 * Metadata describing an OpenAPI operation/endpoint including its path, method, parameters, and validation schemas.
 *
 * This interface contains all the information needed to execute an OpenAPI-compliant HTTP request,
 * including the path template, HTTP method, parameter definitions, and optional validation schemas
 * for both request and response payloads.
 *
 * @property path - The path template with parameter placeholders (e.g., "/users/{id}/posts/{postId}")
 * @property method - The HTTP method (e.g., "get", "post", "put", "delete", "patch")
 * @property parameters - Optional array of parameter metadata describing path, query, header, and cookie parameters
 * @property requestSchema - Optional Standard Schema for validating the request payload before sending
 * @property responseSchema - Optional map of Standard Schemas for validating responses by status code, with optional "default" fallback
 *
 * @example
 * ```ts
 * // Simple GET request with path parameter
 * const getUser: OpenAPIRequestMetadata = {
 *   path: "/users/{id}",
 *   method: "get",
 *   parameters: [
 *     { name: "id", location: "path", style: "simple", explode: false }
 *   ]
 * };
 *
 * // POST request with body validation
 * const createUser: OpenAPIRequestMetadata = {
 *   path: "/users",
 *   method: "post",
 *   requestSchema: UserCreateSchema, // StandardSchemaV1 instance
 *   responseSchema: {
 *     201: UserResponseSchema,
 *     400: ErrorResponseSchema,
 *     default: GenericErrorSchema
 *   }
 * };
 *
 * // Complex GET with multiple parameter types
 * const searchPosts: OpenAPIRequestMetadata = {
 *   path: "/posts",
 *   method: "get",
 *   parameters: [
 *     { name: "q", location: "query", style: "form", explode: true },
 *     { name: "tags", location: "query", style: "form", explode: true },
 *     { name: "X-API-Key", location: "header", style: "simple", explode: false },
 *     { name: "session", location: "cookie", style: "form", explode: false }
 *   ],
 *   responseSchema: {
 *     200: PostListResponseSchema,
 *     default: ErrorResponseSchema
 *   }
 * };
 * ```
 */
export interface OpenAPIRequestMetadata {
  path: string;
  method: string;
  parameters?: OpenAPIParameterMetadata[];
  requestSchema?: StandardSchemaV1;
  responseSchema?: Partial<Record<number | "default", StandardSchemaV1>>;
}
