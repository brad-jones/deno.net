import type { ZodType } from "@zod/zod";
import {
  InvalidJsonResponse,
  InvalidResponse,
  type OpenAPIRequest,
  type OpenAPIResponses,
  type OpenAPISchema,
} from "./types.ts";

export * from "./types.ts";

export interface BaseClientOptions {
  baseUrl?: string;
  customFetch?: typeof fetch;
  validateRequests?: boolean;
  validateResponses?: boolean;
  additionalHeaders?: Record<string, string>;
}

export abstract class BaseClient {
  protected readonly fetch: typeof fetch;
  protected readonly validateRequests: boolean;
  protected readonly validateResponses: boolean;

  constructor(private options?: BaseClientOptions) {
    this.fetch = this.options?.customFetch ?? globalThis.fetch.bind(globalThis);
    this.validateRequests = this.options?.validateRequests ?? true;
    this.validateResponses = this.options?.validateResponses ?? false;
  }

  protected async sendRequest<TResponseSchema extends Record<number, ZodType>>(
    path: string,
    method: string,
    schema: OpenAPISchema<TResponseSchema>,
    request?: unknown,
  ): Promise<OpenAPIResponses<TResponseSchema>> {
    // Validate the request context
    const validatedRequest = this.validateRequests ? schema?.request?.parse(request) : request as OpenAPIRequest;

    // Replace path parameters
    let url = path;
    if (validatedRequest?.params) {
      for (const [key, value] of Object.entries(validatedRequest.params)) {
        url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
      }
    }

    // Add query parameters
    if (validatedRequest?.query) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(validatedRequest.query)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    // Build headers object with normalized lowercase names
    const requestHeaders = this.normalizeHeaders({
      ...this.options?.additionalHeaders,
      ...validatedRequest?.headers,
    });
    if (validatedRequest?.body && !requestHeaders["content-type"]) {
      requestHeaders["content-type"] = "application/json";
    }

    // Make the request
    const response = await this.fetch(`${this.options?.baseUrl ?? ""}${url}`, {
      method: method.toUpperCase(),
      headers: requestHeaders,
      body: validatedRequest?.body ? JSON.stringify(validatedRequest.body) : undefined,
    });

    // Read the response
    const responseBodyBytes = await response.bytes();
    const responseHeaders = this.normalizeHeaders(response.headers);
    const contentType = responseHeaders["content-type"];

    // Parse the response body based on content type
    let responseBody: unknown;
    if (responseBodyBytes.length === 0) {
      responseBody = null;
    } else if (contentType?.includes("application/json") || contentType?.includes("+json")) {
      try {
        responseBody = JSON.parse(new TextDecoder().decode(responseBodyBytes));
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new InvalidJsonResponse(
            response.status,
            responseHeaders,
            responseBodyBytes,
            e,
          );
        }
        throw e;
      }
    } else {
      throw new InvalidResponse(
        response.status,
        responseHeaders,
        responseBodyBytes,
      );
    }

    // Return the validated response
    const resCtx = { status: response.status, headers: responseHeaders, body: responseBody };
    if (this.validateResponses && schema.response[response.status]) {
      resCtx.body = schema.response[response.status].parse(resCtx.body);
    }
    return resCtx as OpenAPIResponses<TResponseSchema>;
  }

  protected normalizeHeaders(headers: Headers | Record<string, string> | undefined): Record<string, string> {
    if (!headers) return {};
    const normalized: Record<string, string> = {};

    if ("get" in headers) {
      for (const [key, value] of headers as Headers) {
        normalized[key.toLowerCase()] = value;
      }
    } else {
      for (const [key, value] of Object.entries(headers)) {
        normalized[key.toLowerCase()] = value;
      }
    }

    return normalized;
  }
}
