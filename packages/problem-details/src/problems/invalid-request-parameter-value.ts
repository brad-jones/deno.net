import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Invalid Request Parameter Value" scenarios.
 *
 * This problem occurs when the request contains an invalid query or path parameter
 * value. Your client issued a request that contained an invalid query or path parameter
 * value. Please review your request and compare against the shared API definition
 * where applicable. Consider validating your request against the published schema
 * prior to sending to the server.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/invalid-request-parameter-value
 */
export class InvalidRequestParameterValueProblem extends ProblemDetails {
  constructor(
    parameterName: string,
    parameterType: "query" | "path",
    invalidValue: unknown,
    validValues?: string[],
    additionalProblem?: Partial<z.input<typeof ProblemDetailsSchema>>,
  ) {
    const validValuesText = validValues ? ` Valid values are: ${validValues.join(", ")}.` : "";
    super({
      type: "https://problems-registry.smartbear.com/invalid-request-parameter-value",
      title: "Invalid Request Parameter Value",
      detail:
        `The ${parameterType} parameter '${parameterName}' has an invalid value '${invalidValue}'.${validValuesText}`,
      status: 400,
      instance: `#/${parameterType}Parameters/${parameterName}`,
      ...additionalProblem,
    });
  }
}
