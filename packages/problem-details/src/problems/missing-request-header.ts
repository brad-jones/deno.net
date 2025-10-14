import type { z } from "@zod/zod";
import { ProblemDetails, type ProblemDetailsSchema } from "../base.ts";

/**
 * Problem class for "Missing Request Header" scenarios.
 *
 * This problem occurs when the request sent to the API is missing an expected
 * request header. Your client issued a request that omitted an expected request header.
 * Please review and consider validating your request against the published schema
 * prior to sending across the wire.
 *
 * This problem is generally not meant to be used for end-user input validation, but for
 * client developer convenience.
 *
 * @see https://problems-registry.smartbear.com/missing-request-header
 */
export class MissingRequestHeaderProblem extends ProblemDetails {
  constructor(
    headerName: string,
    additionalProblem?: Partial<z.input<typeof ProblemDetailsSchema>>,
  ) {
    super({
      type: "https://problems-registry.smartbear.com/missing-request-header",
      title: "Missing Request Header",
      detail: `The request is missing the required HTTP header '${headerName}'.`,
      status: 400,
      instance: `#/headers/${headerName}`,
      ...additionalProblem,
    });
  }
}
