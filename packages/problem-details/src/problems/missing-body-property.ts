import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Missing Body Property" scenarios.
 *
 * This problem occurs when the request sent to the API is missing an expected body
 * property. Your client issued a request that omitted an expected body property.
 * Please review and consider validating your request against the published schema
 * prior to sending across the wire.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/missing-body-property
 */
export class MissingBodyPropertyProblem extends ProblemDetails {
  constructor(
    propertyName: string,
    additionalProblem?: Partial<z.input<typeof ProblemDetailsSchema>>,
  ) {
    super({
      type: "https://problems-registry.smartbear.com/missing-body-property",
      title: "Missing Body Property",
      detail: `The request body is missing the required property '${propertyName}'.`,
      status: 400,
      instance: `#/${propertyName}`,
      ...additionalProblem,
    });
  }
}
