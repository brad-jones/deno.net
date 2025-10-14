import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Already Exists" scenarios.
 *
 * This problem occurs when the resource being created is found to already exist on
 * the server. Your client application tried to create a resource that already exists.
 * Perhaps review your client logic to determine if a user should be able to send such a request.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/already-exists
 */
export class AlreadyExistsProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/already-exists",
      title: "Already Exists",
      detail: "The resource being created already exists.",
      status: 409,
      ...problem,
    });
  }
}
