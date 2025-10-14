import { z } from "@zod/zod";

/**
 * Zod Schema for the Problem Details type, described by RFC9457.
 *
 * @see https://www.rfc-editor.org/info/rfc9457
 * @also https://datatracker.ietf.org/doc/html/rfc7807
 * @also https://swagger.io/blog/problem-details-rfc9457-doing-api-errors-well
 */
export const ProblemDetailsSchema = z.looseObject({
  type: z.url(),
  title: z.string(),
  detail: z.string(),
  status: z.number(),
  instance: z.string().optional(),
});

/**
 * Base class for RFC 9457 Problem Details responses.
 *
 * This class represents a "problem detail" as a way to carry machine-readable
 * details of errors in HTTP response content to avoid the need to define new
 * error response formats for HTTP APIs.
 *
 * Problem Details provides a standard format for error responses that includes:
 * - `type`: A URI reference that identifies the problem type
 * - `title`: A short, human-readable summary of the problem type
 * - `detail`: A human-readable explanation specific to this occurrence
 * - `status`: The HTTP status code for this occurrence of the problem
 * - `instance`: A URI reference that identifies the specific occurrence
 *
 * @example
 * ```typescript
 * const problem = new ProblemDetails({
 *   type: "https://example.com/problems/out-of-credit",
 *   title: "You do not have enough credit.",
 *   detail: "Your current balance is 30, but that costs 50.",
 *   status: 403,
 *   instance: "/account/12345/msgs/abc"
 * });
 * ```
 *
 * @see https://www.rfc-editor.org/info/rfc9457
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 * @also https://swagger.io/blog/problem-details-rfc9457-doing-api-errors-well
 */
export class ProblemDetails {
  /** The validated problem details object conforming to RFC 9457 */
  readonly problem: z.output<typeof ProblemDetailsSchema>;

  /**
   * Creates a new Problem Details instance.
   *
   * @param problem - The problem details object to validate and store
   * @throws {z.ZodError} When the problem object doesn't conform to the RFC 9457 schema
   */
  constructor(problem: z.input<typeof ProblemDetailsSchema>) {
    this.problem = ProblemDetailsSchema.parse(problem);
  }

  /**
   * Converts the problem details to a JSON-serializable object.
   *
   * This method is automatically called when the object is passed to
   * `JSON.stringify()` or when used in HTTP response serialization.
   *
   * @returns The problem details as a plain object suitable for JSON serialization
   */
  toJSON() {
    return this.problem;
  }

  /**
   * Creates an HTTP Response object with the problem details as JSON body.
   *
   * This method creates a proper HTTP Response with:
   * - Status code from the problem details
   * - Content-Type set to "application/problem+json" as per RFC 9457
   * - JSON body containing the problem details
   * - Optional additional headers
   *
   * @param additionalHeaders - Optional headers to include in the response
   * @returns A Response object ready to be returned from HTTP handlers
   *
   * @example
   * ```typescript
   * const problem = new ValidationProblem();
   * const response = problem.toResponse();
   * // Returns Response with status 400 and proper content-type
   *
   * // With additional headers
   * const response = problem.toResponse({
   *   "X-Request-ID": "abc123"
   * });
   * ```
   */
  toResponse(additionalHeaders?: HeadersInit): Response {
    const headers = new Headers(additionalHeaders);
    headers.set("Content-Type", "application/problem+json");

    return new Response(JSON.stringify(this.toJSON()), {
      status: this.problem.status,
      headers,
    });
  }
}
