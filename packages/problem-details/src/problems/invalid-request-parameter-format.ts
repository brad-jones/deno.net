import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Invalid Request Parameter Format" scenarios.
 *
 * This problem occurs when the request contains a malformed query or path
 * parameter. Your client issued a request that contained a malformed query or path parameter.
 * Please review your request parameters and compare against the shared API
 * definition. Consider validating your parameters against the published schema prior to sending to
 * the server.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/invalid-request-parameter-format
 */
export class InvalidRequestParameterFormatProblem extends ProblemDetails {
  constructor(
    parameterName: string,
    parameterType: "query" | "path",
    expectedFormat: string,
    additionalProblem?: Partial<z.input<typeof ProblemDetailsSchema>>,
  ) {
    super({
      type: "https://problems-registry.smartbear.com/invalid-request-parameter-format",
      title: "Invalid Request Parameter Format",
      detail: `The ${parameterType} parameter '${parameterName}' is malformed. Expected format: ${expectedFormat}.`,
      status: 400,
      instance: `#/${parameterType}Parameters/${parameterName}`,
      ...additionalProblem,
    });
  }
}
