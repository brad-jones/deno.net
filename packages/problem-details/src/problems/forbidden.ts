import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Forbidden" scenarios.
 *
 * This problem occurs when the requested resource (and/or operation combination)
 * is not authorized for the requesting client (and or authorization context).
 * Your client application tried to perform an operation on a resource that it's
 * not authorized to perform in the given context.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/forbidden
 */
export class ForbiddenProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/forbidden",
      title: "Forbidden",
      detail: "The resource could not be returned as the requestor is not authorized",
      status: 403,
      ...problem,
    });
  }
}
