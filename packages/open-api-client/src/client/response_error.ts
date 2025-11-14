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
