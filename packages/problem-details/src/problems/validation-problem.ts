import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Validation Error" scenarios.
 *
 * This problem occurs when the request is invalid and deemed unprocessable.
 * The request failed validation checks and cannot be processed as submitted.
 * Please review your request data against the published schema and ensure
 * all required fields are present and properly formatted.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/validation-error
 */
export class ValidationProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/validation-error",
      title: "Validation Error",
      detail: "The request is not valid.",
      status: 400,
      ...problem,
    });
  }
}
