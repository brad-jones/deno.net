import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Server Error" scenarios.
 *
 * This problem occurs when the server encounters an unexpected condition that
 * prevents it from fulfilling the request. Your client application did everything correct.
 * Unfortunately our API encountered a condition that resulted in this problem.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/server-error
 */
export class ServerErrorProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/server-error",
      title: "Server Error",
      detail: "The server encountered an unexpected error",
      status: 500,
      ...problem,
    });
  }
}
