import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Invalid Body Property Format" scenarios.
 *
 * This problem occurs when the request body contains a malformed property.
 * Your client issued a request that contained a malformed body property. Please
 * review your request and compare against the shared API definition. Consider
 * validating your request against the published schema prior to sending to the server.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/invalid-body-property-format
 */
export class InvalidBodyPropertyFormatProblem extends ProblemDetails {
  constructor(
    propertyName: string,
    expectedFormat: string,
    additionalProblem?: Partial<z.input<typeof ProblemDetailsSchema>>,
  ) {
    super({
      type: "https://problems-registry.smartbear.com/invalid-body-property-format",
      title: "Invalid Body Property Format",
      detail: `The request body property '${propertyName}' is malformed. Expected format: ${expectedFormat}.`,
      status: 400,
      instance: `#/${propertyName}`,
      ...additionalProblem,
    });
  }
}
