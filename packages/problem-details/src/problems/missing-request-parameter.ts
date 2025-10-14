import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Missing Request Parameter" scenarios.
 *
 * This problem occurs when the request sent to the API is missing a query or path
 * parameter. Your client issued a request that omitted an expected query or path parameter.
 * Please review and consider validating your request against the published schema
 * prior to sending to the API endpoint.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/missing-request-parameter
 */
export class MissingRequestParameterProblem extends ProblemDetails {
  constructor(
    parameterName: string,
    parameterType: "query" | "path" = "query",
    additionalProblem?: Partial<z.input<typeof ProblemDetailsSchema>>,
  ) {
    super({
      type: "https://problems-registry.smartbear.com/missing-request-parameter",
      title: "Missing Request Parameter",
      detail: `The request is missing the required ${parameterType} parameter '${parameterName}'.`,
      status: 400,
      instance: `#/${parameterType}Parameters/${parameterName}`,
      ...additionalProblem,
    });
  }
}
