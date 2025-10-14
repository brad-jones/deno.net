import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Bad Request" scenarios.
 *
 * The server cannot or will not process the request due to something that is
 * perceived to be a client error (for example, malformed request syntax, invalid
 * request message framing, or deceptive request routing). Your client application initiated a request that is malformed.
 * Please review your client request against the defined semantics for the API.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/bad-request
 */
export class BadRequestProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/bad-request",
      title: "Bad Request",
      detail: "The request is invalid or malformed",
      status: 400,
      ...problem,
    });
  }
}
