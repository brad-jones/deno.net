import type { OpenAPIRequest, OpenAPIRequestMetadata, OpenAPIResponse, OpenAPIResponsePromise } from "../types/mod.ts";
import { OpenAPIClientConfig } from "./config.ts";
import { InvalidRequestError, InvalidResponseError, ResponseError } from "./response_error.ts";
import { serializeCookies, serializeHeaders, serializePath, serializeQuery } from "./serializers/mod.ts";

/**
 * Executes an HTTP request according to OpenAPI specification with built-in validation and serialization.
 *
 * This is the core function that handles the complete lifecycle of an OpenAPI-compliant HTTP request:
 * 1. Validates the client configuration
 * 2. Validates the request payload (if schema is provided)
 * 3. Serializes path, query, header, and cookie parameters according to OpenAPI styles
 * 4. Sends the HTTP request
 * 5. Parses the response
 * 6. Validates the response (if schema is provided)
 *
 * Currently supports `application/json` content type for request and response bodies.
 *
 * @param config - The client configuration containing base URL, default headers, and optional custom fetch implementation
 * @param metadata - The OpenAPI request metadata including method, path template, parameter definitions, and validation schemas
 * @param request - Optional request data containing path parameters, query parameters, headers, cookies, and body
 * @returns A promise that resolves to an OpenAPIResponse containing status, headers, body, and raw response
 *
 * @throws {Error} If the client configuration is invalid
 * @throws {Error} If request validation fails (when requestSchema is provided)
 * @throws {Error} If response validation fails (when responseSchema is provided)
 * @throws {Error} If parameter serialization encounters unsupported styles or invalid values
 *
 * @example
 * ```ts
 * // Basic GET request with path parameter
 * const config = { baseUrl: "https://api.example.com" };
 * const metadata = {
 *   method: "get",
 *   path: "/users/{id}",
 *   parameters: [
 *     { name: "id", location: "path", style: "simple" }
 *   ]
 * };
 * const response = await openAPIFetch(config, metadata, { path: { id: 123 } });
 * // Sends: GET https://api.example.com/users/123
 *
 * // Handle response with type narrowing
 * if (response.is(200)) {
 *   console.log(response.body.user); // Typed as 200 response body
 * }
 * ```
 *
 * @example
 * ```ts
 * // POST request with body and headers
 * const config = { baseUrl: "https://api.example.com" };
 * const metadata = {
 *   method: "post",
 *   path: "/users",
 *   parameters: [
 *     { name: "Authorization", location: "header", style: "simple" }
 *   ]
 * };
 * const response = await openAPIFetch(config, metadata, {
 *   headers: { Authorization: "Bearer token123" },
 *   body: { name: "John", email: "john@example.com" }
 * });
 * // Sends: POST https://api.example.com/users with JSON body
 * ```
 *
 * @example
 * ```ts
 * // Request with query parameters
 * const config = { baseUrl: "https://api.example.com" };
 * const metadata = {
 *   method: "get",
 *   path: "/search",
 *   parameters: [
 *     { name: "q", location: "query", style: "form", explode: true },
 *     { name: "tags", location: "query", style: "form", explode: true }
 *   ]
 * };
 * const response = await openAPIFetch(config, metadata, {
 *   query: { q: "test", tags: ["js", "deno"] }
 * });
 * // Sends: GET https://api.example.com/search?q=test&tags=js&tags=deno
 * ```
 */
export function openAPIFetch<
  TResponse extends OpenAPIResponse<number, unknown, Record<string, string>, boolean>,
>(
  config: OpenAPIClientConfig,
  metadata: OpenAPIRequestMetadata,
  request?: OpenAPIRequest,
): OpenAPIResponsePromise<TResponse> {
  // The actual fetch implementation
  const responsePromise = (async (): Promise<TResponse> => {
    // 1. Validate the global client config using Zod
    const validatedConfig = OpenAPIClientConfig.parse(config);

    // 2. Request validation, using whatever schema we are given (optional)
    if (metadata.requestSchema && request) {
      const result = await metadata.requestSchema["~standard"].validate(request);
      if (result.issues) {
        throw new InvalidRequestError(request, result.issues);
      }
    }

    // 3. Build the complete final URL
    let baseUrl = validatedConfig.baseUrl instanceof URL ? validatedConfig.baseUrl.toString() : validatedConfig.baseUrl;

    // Remove trailing slash from baseUrl to avoid double slashes
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const completePath = serializePath(request?.path, metadata);
    const queryString = serializeQuery(request?.query, metadata);
    const finalUrl = `${baseUrl}${completePath}${queryString}`;

    // 4. Build the headers object
    const headers = serializeHeaders(request?.headers, metadata);

    // Default headers have lower priority
    if (validatedConfig.headers) {
      for (const [key, value] of Object.entries(validatedConfig.headers)) {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      }
    }

    // Set content type if not set
    // TODO: Support content types other than JSON
    if (request?.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Add the cookie header
    const cookieHeader = serializeCookies(request?.cookies, metadata);
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    // 5. Serialize the main body
    // TODO: Support content types other than JSON
    let body: string | undefined;
    if (request?.body !== undefined) {
      body = JSON.stringify(request.body);
    }

    // 6. Send the request
    const response = await (validatedConfig.fetch ?? globalThis.fetch)(finalUrl, {
      method: metadata.method.toUpperCase(),
      headers,
      body,
    });

    // Clone the response early on so that we can be sure we
    // return a raw response object without locked readers.
    const clonedResponse = response.clone();

    // 7. Parse response
    let responseBody: unknown;
    const contentType = response.headers.get("Content-Type") ?? response.headers.get("content-type");
    if (contentType?.includes("application/json") || contentType?.includes("+json")) {
      try {
        responseBody = await response.json();
      } catch (error) {
        throw new ResponseError(
          `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
          clonedResponse,
        );
      }
    } else {
      // TODO: Support content types other than JSON
      responseBody = await response.text();
    }

    const responseHeaders: Record<string, string> = {};
    for (const [k, v] of response.headers) responseHeaders[k] = v;

    const responseObject = {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
      raw: clonedResponse,
    };

    // 8. Response validation and determine if this is a default response
    let isDefault = false;
    if (metadata.responseSchema) {
      let schema = metadata.responseSchema[response.status];
      if (!schema && metadata.responseSchema["default"]) {
        schema = metadata.responseSchema["default"];
        isDefault = true;
      }
      if (schema) {
        const result = await schema["~standard"].validate(responseObject);
        if (result.issues) {
          throw new InvalidResponseError(clonedResponse, result.issues);
        }
      }
    }

    return {
      ...responseObject,
      isDefault,
      is<S extends number, R extends OpenAPIResponse<number, unknown, unknown, boolean>>(
        statusCode: S,
      ): this is Extract<R, OpenAPIResponse<S, unknown, unknown, false>> {
        return responseObject.status === statusCode && !isDefault;
      },
    } as TResponse;
  })();

  /**
   * Determines the default status code to use when body() is called without arguments.
   * Priority: 200 > "default" > first defined response
   */
  function getDefaultStatusCode(): number | "default" | undefined {
    if (!metadata.responseSchema) {
      return 200; // Assume 200 if no schema
    }

    const statuses = Object.keys(metadata.responseSchema);

    // First priority: 200 if defined
    if (statuses.includes("200")) {
      return 200;
    }

    // Second priority: "default" if defined
    if (statuses.includes("default")) {
      return "default";
    }

    // Third priority: first defined status (excluding "default")
    const numericStatuses = statuses
      .filter((s) => s !== "default")
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n));

    if (numericStatuses.length > 0) {
      return numericStatuses[0];
    }

    return undefined;
  }

  // Create the body() shortcut function
  async function body<S extends number | "default">(
    statusCode?: S,
  ): Promise<unknown> {
    const response = await responsePromise;

    // Determine the expected status code
    const expectedStatus = statusCode ?? getDefaultStatusCode();

    if (expectedStatus === undefined) {
      throw new ResponseError(
        "Cannot determine default status code: no response schema defined",
        response.raw,
      );
    }

    // Check if the response matches the expected status
    if (expectedStatus === "default") {
      if (!response.isDefault) {
        throw new ResponseError(
          `Expected default response but received status ${response.status}`,
          response.raw,
        );
      }
      return response.body;
    }

    // For numeric status codes
    if (response.status !== expectedStatus || response.isDefault) {
      throw new ResponseError(
        `Expected response status ${expectedStatus} but received ${response.status}${
          response.isDefault ? " (default response)" : ""
        }`,
        response.raw,
      );
    }

    return response.body;
  }

  // Return a PromiseLike object with the body() method
  return {
    then: responsePromise.then.bind(responsePromise),
    body,
  } as OpenAPIResponsePromise<TResponse>;
}
