import type { OpenAPIResponse } from "./open_api_response.ts";

/**
 * Type helper to extract the default response type from a union of OpenAPIResponse types.
 * This follows the same logic as the runtime implementation:
 * 1. Status 200 if defined
 * 2. The "default" response if 200 is not defined but "default" is
 * 3. Union of all response body types if neither 200 nor "default" are defined
 *
 * **Note on Edge Case:**
 * When neither 200 nor "default" responses are defined in the OpenAPI spec,
 * TypeScript cannot determine which specific response type to use at compile time.
 * In this case, the type will be a union of all possible response bodies.
 * You may need to manually narrow the type or explicitly specify the status code
 * when calling `.body(statusCode)` to get proper type narrowing.
 *
 * @template TResponse - The union type of all possible OpenAPIResponse types
 */
type DefaultResponseBody<TResponse extends OpenAPIResponse<number, unknown, unknown, boolean>> =
  // First check if 200 exists
  Extract<TResponse, OpenAPIResponse<200, unknown, unknown, false>> extends never
    // If 200 doesn't exist, check for "default"
    ? Extract<TResponse, OpenAPIResponse<number, unknown, unknown, true>> extends never
      // If neither 200 nor "default" exist, return union of all response body types
      ? TResponse extends OpenAPIResponse<number, infer Body, unknown, boolean> ? Body : never
      // If "default" exists, return its body type
    : Extract<TResponse, OpenAPIResponse<number, unknown, unknown, true>>["body"]
    // If 200 exists, return its body type
    : Extract<TResponse, OpenAPIResponse<200, unknown, unknown, false>>["body"];

/**
 * A Promise-like object that wraps an OpenAPIResponse promise and provides
 * a shortcut `body()` method for directly accessing the response body.
 *
 * This type extends the Promise interface to add the `body()` method while
 * maintaining full Promise compatibility through PromiseLike.
 *
 * @template TResponse - The union type of all possible OpenAPIResponse types
 */
export interface OpenAPIResponsePromise<
  TResponse extends OpenAPIResponse<number, unknown, unknown, boolean>,
> extends PromiseLike<TResponse> {
  /**
   * Shortcut method to directly access the response body for an expected status code.
   *
   * This method simplifies the common pattern of checking the response status and
   * accessing the body. If the response status matches the expected status code,
   * the body is returned. Otherwise, a ResponseError is thrown.
   *
   * **Default Status Selection:**
   *
   * If no status code is provided, the method will select the default in this order:
   * 1. Status 200 if defined in the response schema
   * 2. The "default" response if 200 is not defined but "default" is
   * 3. The first defined response if neither 200 nor "default" are defined
   *
   * **Type Narrowing:**
   *
   * When calling with an explicit status code, TypeScript will narrow the return type
   * to that specific response's body type. When calling without arguments, TypeScript
   * will infer the type based on the default status selection above.
   *
   * **Edge Case:**
   *
   * If your API specification defines neither a 200 nor a "default" response,
   * calling `.body()` without arguments will return a union type of all possible
   * response bodies. In this scenario, you should either:
   * - Call `.body(statusCode)` with an explicit status code for proper type narrowing
   * - Use type guards or type assertions to narrow the union type
   * - Use the traditional `.is(statusCode)` pattern for response handling
   *
   * @template S - The specific status code to expect
   * @param statusCode - The HTTP status code to expect (optional, defaults based on selection logic)
   * @returns A promise that resolves to the typed response body
   * @throws {ResponseError} When the actual response status doesn't match the expected status
   *
   * @example
   * ```ts
   * // Expect 200 response explicitly
   * try {
   *   const body = await client["/users/{id}"].get({ path: { id: 123 } }).body(200);
   *   console.log(body.name); // Typed as 200 response body
   * } catch (e) {
   *   if (e instanceof ResponseError) {
   *     console.error(`Unexpected status: ${e.response.status}`);
   *   }
   * }
   *
   * // Use default status (200, or "default", or first defined)
   * try {
   *   const body = await client["/users/{id}"].get({ path: { id: 123 } }).body();
   *   console.log(body.name); // Typed based on default status selection
   * } catch (e) {
   *   if (e instanceof ResponseError) {
   *     console.error(e.message);
   *   }
   * }
   * ```
   */
  // Overload for when no status code is provided - returns the default response body type
  body(): Promise<DefaultResponseBody<TResponse>>;

  // Overload for when a specific status code is provided
  body<S extends number | "default">(
    statusCode: S,
  ): Promise<
    S extends number ? Extract<TResponse, OpenAPIResponse<S, unknown, unknown, false>>["body"]
      : Extract<TResponse, OpenAPIResponse<number, unknown, unknown, true>>["body"]
  >;
}
