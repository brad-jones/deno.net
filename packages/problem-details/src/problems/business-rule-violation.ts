import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Business Rule Violation" scenarios.
 *
 * This problem occurs when the request is deemed invalid as it fails to meet
 * business rule expectations. Your client issued a request that failed business rule validation.
 * Please review your request to determine if you can remain within appropriate business rules.
 * Consider validating your request against available metadata (e.g. schemas) prior
 * to sending to the server.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/business-rule-violation
 */
export class BusinessRuleViolationProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/business-rule-violation",
      title: "Business Rule Violation",
      detail: "The request body is invalid and not meeting business rules.",
      status: 422,
      ...problem,
    });
  }
}
