import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Not Found" scenarios.
 *
 * This problem occurs when the requested resource could not be found.
 * Your client application tried to access a resource that does not exist (or could
 * not be found). Please review how your users initiated such a request.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/not-found
 */
export class NotFoundProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/not-found",
      title: "Not Found",
      detail: "The requested resource was not found",
      status: 404,
      ...problem,
    });
  }
}
