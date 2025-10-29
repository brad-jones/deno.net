import type { z, ZodType } from "@zod/zod";

export interface OpenAPIRequest {
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface OpenAPIResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body?: T;
}

export type OpenAPIResponses<TResponseSchema extends Record<number, ZodType>> = {
  [K in keyof TResponseSchema]: { status: K; body: z.output<TResponseSchema[K]> };
}[keyof TResponseSchema];

export interface OpenAPISchema<TResponseSchema extends Record<number, ZodType>> {
  request?: ZodType<OpenAPIRequest>;
  response: TResponseSchema;
}

export class InvalidJsonResponse extends Error {
  constructor(
    public readonly status: number,
    public readonly headers: Record<string, string>,
    public readonly body: Uint8Array,
    public readonly jsonError: SyntaxError,
  ) {
    super(`Received a JSON response with status ${status} that could not be parsed because ${jsonError.message}`);
  }
}

export class InvalidResponse extends Error {
  constructor(
    public readonly status: number,
    public readonly headers: Record<string, string>,
    public readonly body: Uint8Array,
  ) {
    super(`Received a response with status ${status} that could not be parsed.`);
  }
}
