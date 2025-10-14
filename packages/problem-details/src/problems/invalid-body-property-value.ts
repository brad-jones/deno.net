import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Invalid Body Property Value" scenarios.
 *
 * This problem occurs when the request body contains an invalid property value.
 * Your client issued a request that contained an invalid body property value.
 * Please review your request and compare against the shared API definition where
 * applicable. Consider validating your request against the published schema prior to
 * sending to the server.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/invalid-body-property-value
 */
export class InvalidBodyPropertyValueProblem extends ProblemDetails {
  constructor(
    propertyName: string,
    invalidValue: unknown,
    validValues?: string[],
    additionalProblem?: Partial<z.input<typeof ProblemDetailsSchema>>,
  ) {
    const validValuesText = validValues ? ` Valid values are: ${validValues.join(", ")}.` : "";
    super({
      type: "https://problems-registry.smartbear.com/invalid-body-property-value",
      title: "Invalid Body Property Value",
      detail: `The request body property '${propertyName}' has an invalid value '${invalidValue}'.${validValuesText}`,
      status: 400,
      instance: `#/${propertyName}`,
      ...additionalProblem,
    });
  }
}
