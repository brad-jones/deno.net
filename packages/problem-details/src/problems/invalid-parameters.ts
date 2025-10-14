import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Invalid Parameters" scenarios.
 *
 * This problem occurs when a client request contains invalid or malformed
 * parameters causing the server to reject the request. Your client application issued a request
 * to an API that contains invalid or malformed parameters.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/invalid-parameters
 */
export class InvalidParametersProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/invalid-parameters",
      title: "Invalid Parameters",
      detail: "The request contained invalid, or malformed parameters (path or header or query)",
      status: 400,
      ...problem,
    });
  }
}
