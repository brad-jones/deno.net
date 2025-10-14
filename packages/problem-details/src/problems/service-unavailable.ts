import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Service Unavailable" scenarios.
 *
 * This problem occurs when the service requested is currently unavailable and the
 * server is not ready to handle the request. Your client application did everything correct.
 * Unfortunately our API is currently unavailable.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/service-unavailable
 */
export class ServiceUnavailableProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/service-unavailable",
      title: "Service Unavailable",
      detail: "The service is currently unavailable",
      status: 503,
      ...problem,
    });
  }
}
