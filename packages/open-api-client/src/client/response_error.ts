import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { OpenAPIRequest } from "../types/mod.ts";

/**
 * Error thrown when request validation fails according to the schema.
 *
 * This error provides strongly typed access to validation issues from the
 * StandardSchema validation result. It is thrown when the request data does
 * not conform to the expected schema for the API endpoint.
 *
 * @example
 * ```ts
 * try {
 *   const response = await client["/users"].post({
 *     body: { name: "", email: "invalid" } // Invalid data
 *   });
 * } catch (e) {
 *   if (e instanceof InvalidRequestError) {
 *     console.error(e.message); // "Request validation failed: ..."
 *     // Access strongly typed validation issues
 *     for (const issue of e.issues) {
 *       console.error(`Error at ${issue.path?.join(".")}: ${issue.message}`);
 *     }
 *   }
 * }
 * ```
 */
export class InvalidRequestError extends Error {
  /**
   * The request object that failed validation.
   */
  readonly request: OpenAPIRequest;

  /**
   * The validation issues from the StandardSchema validation result.
   *
   * Provides strongly typed access to all validation errors that occurred,
   * including the error messages and the paths to the invalid properties.
   */
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;

  /**
   * Creates a new InvalidRequestError.
   *
   * @param request - The request object that failed validation
   * @param issues - The validation issues from the StandardSchema validation result
   */
  constructor(
    request: OpenAPIRequest,
    issues: ReadonlyArray<StandardSchemaV1.Issue>,
  ) {
    super(`Request validation failed: ${JSON.stringify(issues)}`);
    this.name = "InvalidRequestError";
    this.request = request;
    this.issues = issues;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidRequestError);
    }
  }
}

/**
 * Error thrown when attempting to access a response body for a status code that doesn't match
 * the actual response status.
 *
 * This error is thrown by the `body()` shortcut method when the response status does not match
 * the expected status code. It provides access to both the actual response and a descriptive
 * error message.
 *
 * @example
 * ```ts
 * try {
 *   const body = await client["/users/{id}"].get({ path: { id: 123 } }).body(200);
 *   console.log(body.name); // Only reached if status is 200
 * } catch (e) {
 *   if (e instanceof ResponseError) {
 *     console.error(e.message); // "Expected response status 200 but received 404"
 *     console.error(await e.response.text()); // Access raw response
 *   }
 * }
 * ```
 */
export class ResponseError extends Error {
  /**
   * The raw Response object from the fetch API.
   *
   * Provides access to the actual response that was received, allowing
   * the caller to inspect the status, headers, and body if needed.
   */
  readonly response: Response;

  /**
   * Creates a new ResponseError.
   *
   * @param message - A descriptive error message
   * @param response - The raw Response object from the fetch call
   */
  constructor(message: string, response: Response) {
    super(message);
    this.name = "ResponseError";
    this.response = response;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ResponseError);
    }
  }
}

/**
 * Error thrown when response validation fails according to the schema.
 *
 * This error extends ResponseError and provides strongly typed access to validation issues
 * from the StandardSchema validation result. It is thrown when the response body does not
 * conform to the expected schema for the given status code.
 *
 * @example
 * ```ts
 * try {
 *   const response = await client["/users/{id}"].get({ path: { id: 123 } });
 * } catch (e) {
 *   if (e instanceof InvalidResponseError) {
 *     console.error(e.message); // "Response validation failed: ..."
 *     // Access strongly typed validation issues
 *     for (const issue of e.issues) {
 *       console.error(`Error at ${issue.path?.join(".")}: ${issue.message}`);
 *     }
 *     console.error(await e.response.text()); // Access raw response
 *   }
 * }
 * ```
 */
export class InvalidResponseError extends ResponseError {
  /**
   * The validation issues from the StandardSchema validation result.
   *
   * Provides strongly typed access to all validation errors that occurred,
   * including the error messages and the paths to the invalid properties.
   */
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;

  /**
   * Creates a new InvalidResponseError.
   *
   * @param response - The raw Response object from the fetch call
   * @param issues - The validation issues from the StandardSchema validation result
   */
  constructor(
    response: Response,
    issues: ReadonlyArray<StandardSchemaV1.Issue>,
  ) {
    super(`Response validation failed: ${JSON.stringify(issues)}`, response);
    this.name = "InvalidResponseError";
    this.issues = issues;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidResponseError);
    }
  }
}
