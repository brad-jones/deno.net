import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "License Expired" scenarios.
 *
 * This problem occurs when the license associated with the client has expired thus
 * rendering the service unavailable. The license associated with your client/organization
 * has expired. Please contact your SmartBear account manager or representative.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/license-expired
 */
export class LicenseExpiredProblem extends ProblemDetails {
  constructor(problem?: Partial<z.input<typeof ProblemDetailsSchema>>) {
    super({
      type: "https://problems-registry.smartbear.com/license-expired",
      title: "License Expired",
      detail:
        "The service is unavailable as the license associated with your client or organization has expired. Please contact your SmartBear account manager or representative",
      status: 503,
      ...problem,
    });
  }
}
