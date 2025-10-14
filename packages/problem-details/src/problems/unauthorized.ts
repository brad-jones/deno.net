import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Unauthorized" scenarios.
 *
 * This problem occurs when the requested resource could not be returned as the
 * client request lacked valid authentication credentials. Your client application issued a request
 * to a protected resource without supplying the required auth details.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/unauthorized
 */
export class UnauthorizedProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/unauthorized",
      title: "Unauthorized",
      detail: "Access token not set or invalid, and the requested resource could not be returned",
      status: 401,
      ...problem,
    });
  }
}
