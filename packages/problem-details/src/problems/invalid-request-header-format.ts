import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Invalid Request Header Format" scenarios.
 *
 * This problem occurs when the request contains a malformed request header.
 * Your client issued a request that contained a malformed request header. Please
 * review your request parameters and compare against the shared API definition when
 * applicable. Consider validating your headers against the published schema or
 * API definition metadata prior to sending to the server.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/invalid-request-header-format
 */
export class InvalidRequestHeaderFormatProblem extends ProblemDetails {
  constructor(
    headerName: string,
    expectedFormat: string,
    additionalProblem?: Partial<z.input<typeof ProblemDetailsSchema>>,
  ) {
    super({
      type: "https://problems-registry.smartbear.com/invalid-request-header-format",
      title: "Invalid Request Header Format",
      detail: `The request header '${headerName}' is malformed. Expected format: ${expectedFormat}.`,
      status: 400,
      instance: `#/headers/${headerName}`,
      ...additionalProblem,
    });
  }
}
