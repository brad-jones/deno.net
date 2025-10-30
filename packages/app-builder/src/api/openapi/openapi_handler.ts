import type { ZodType } from "@zod/zod";
import { OpenApiRequestContext } from "./types.ts";
import type { HttpContext } from "@brad-jones/deno-net-http-context";
import { type IContainer, Type } from "@brad-jones/deno-net-container";
import type { ZodOpenApiOperationObject, ZodOpenApiResponseObject } from "zod-openapi";
import { ServerErrorProblem, ValidationProblem } from "@brad-jones/deno-net-problem-details";

/**
 * Token for dependency injection of IOpenApiHandler implementations.
 */
export const IOpenApiHandler = new Type<IOpenApiHandler>("IOpenApiHandler");

/**
 * Interface defining the contract for OpenAPI request handlers.
 *
 * Implementations should validate requests against OpenAPI schemas,
 * execute route handlers with dependency injection, and validate responses.
 */
export interface IOpenApiHandler {
  /**
   * Handles an OpenAPI route request with validation and dependency injection.
   *
   * @param ctx - The HTTP context containing request data and services
   * @param options - Configuration options including OpenAPI operation and handler
   * @returns Promise resolving to the HTTP response
   * @throws ValidationProblem for request validation errors
   * @throws ServerErrorProblem for response validation errors or handler execution issues
   */
  handle(ctx: HttpContext, options: OpenApiHandlerOptions): Promise<Response> | Response;
}

/**
 * Configuration options for OpenAPI request handling.
 *
 * Contains the OpenAPI operation definition and the actual route handler function
 * that will be executed after request validation succeeds.
 */
export interface OpenApiHandlerOptions {
  /**
   * The OpenAPI operation definition containing request/response schemas.
   * Used for validating incoming requests and outgoing responses against the API specification.
   */
  openApiOperation?: ZodOpenApiOperationObject;

  /**
   * The actual route handler function to execute after request validation.
   * Receives a validated OpenApiRequestContext with type-safe request data.
   *
   * @param ctx - Validated and type-safe request context
   * @returns Promise resolving to HTTP response or direct Response object
   */
  openApiHandler?: (ctx: OpenApiRequestContext) => Promise<Response> | Response;
}

/**
 * Default implementation of IOpenApiHandler providing full OpenAPI request/response validation.
 *
 * This class orchestrates the complete OpenAPI request lifecycle:
 * - Validates incoming requests against OpenAPI schemas (path params, query, headers, cookies, body)
 * - Creates type-safe request contexts for route handlers
 * - Executes route handlers with dependency injection
 * - Validates outgoing responses against OpenAPI schemas
 * - Provides detailed error reporting using RFC9457 Problem Details format
 *
 * @example
 * ```typescript
 * const handler = new OpenApiHandler();
 *
 * // Register with DI container
 * container.add(Scope.Singleton, IOpenApiHandler, { useValue: handler });
 *
 * // Use in route registration
 * const response = await handler.handle(ctx, {
 *   openApiOperation: myApiOperation,
 *   openApiHandler: (ctx) => Response.json({ message: "Hello" })
 * });
 * ```
 */
export class OpenApiHandler implements IOpenApiHandler {
  /**
   * Handles OpenAPI route execution with full request/response validation.
   *
   * This is the main orchestration method that:
   * 1. Validates the incoming request against OpenAPI schemas
   * 2. Creates a type-safe OpenApiRequestContext
   * 3. Executes the route handler with dependency injection
   * 4. Validates the response against OpenAPI schemas
   *
   * @param ctx - The Hono context with dependency injection container
   * @param routeManifest - The route configuration with OpenAPI operation and handler
   * @returns Promise resolving to the validated HTTP response
   * @throws ValidationProblem for request validation errors (400-level)
   * @throws ServerErrorProblem for response validation errors (500-level)
   */
  async handle(ctx: HttpContext, options: OpenApiHandlerOptions): Promise<Response> {
    const openApiContext = await this.createOpenApiCtx(ctx, options.openApiOperation!);
    const response = await ctx.get<IContainer>("services").callFunc(options.openApiHandler!, openApiContext);
    return await this.validateOpenApiResponse(response, options.openApiOperation!);
  }

  /**
   * Creates a validated OpenApiRequestContext from the HTTP context and operation.
   *
   * This method orchestrates the validation process and constructs a type-safe
   * OpenApiRequestContext with all validated request data properly typed according
   * to the OpenAPI specification.
   *
   * @param ctx - The Hono context containing the HTTP request
   * @param operation - The OpenAPI operation definition with schemas
   * @returns Promise resolving to a validated and type-safe OpenApiRequestContext
   * @throws ValidationProblem if request validation fails
   */
  protected async createOpenApiCtx(ctx: HttpContext, op: ZodOpenApiOperationObject): Promise<OpenApiRequestContext> {
    const validatedData = await this.validateOpenApiRequest(ctx, op);

    return new OpenApiRequestContext(
      ctx,
      validatedData.pathParams,
      validatedData.queryParams,
      validatedData.headers,
      validatedData.cookies,
      validatedData.body,
    );
  }

  /**
   * Validates OpenAPI request data against the operation schema.
   *
   * Extracts and validates path parameters, query parameters, headers, cookies, and request body
   * according to the OpenAPI operation specification. Uses Zod schema validation with proper
   * error handling following the same pattern as model binders.
   *
   * @param ctx - The Hono context containing the HTTP request
   * @param operation - The OpenAPI operation definition with request schemas
   * @returns Promise resolving to validated request data
   * @throws ValidationProblem with RFC9457 Problem Details format if validation fails
   */
  protected async validateOpenApiRequest(ctx: HttpContext, op: ZodOpenApiOperationObject): Promise<OpenApiData> {
    const result = {
      pathParams: {},
      queryParams: {},
      headers: {},
      cookies: {},
      body: undefined,
    };

    // Validate path parameters
    // deno-lint-ignore no-explicit-any
    const pathSchema = op.requestParams?.path as any as ZodType;
    if (pathSchema && "safeParse" in pathSchema) {
      const pathResult = pathSchema.safeParse(ctx.req.param());
      if (!pathResult.success) {
        throw new ValidationProblem({
          instance: `#/request/path`,
          issues: pathResult.error.issues,
        });
      }
      result.pathParams = pathResult.data ?? {};
    }

    // Validate query parameters
    // deno-lint-ignore no-explicit-any
    const querySchema = op.requestParams?.query as any as ZodType;
    if (querySchema && "safeParse" in querySchema) {
      const queryResult = querySchema.safeParse(ctx.req.query());
      if (!queryResult.success) {
        throw new ValidationProblem({
          instance: `#/request/query`,
          issues: queryResult.error.issues,
        });
      }
      result.queryParams = queryResult.data ?? {};
    }

    // Validate headers
    // deno-lint-ignore no-explicit-any
    const headerSchema = op.requestParams?.header as any as ZodType;
    if (headerSchema && "safeParse" in headerSchema) {
      const headerResult = headerSchema.safeParse(ctx.req.header());
      if (!headerResult.success) {
        throw new ValidationProblem({
          instance: `#/request/headers`,
          issues: headerResult.error.issues,
        });
      }
      result.headers = headerResult.data ?? {};
    }

    // Validate cookies
    // deno-lint-ignore no-explicit-any
    const cookieSchema = op.requestParams?.cookie as any as ZodType;
    if (cookieSchema && "safeParse" in cookieSchema) {
      const cookieData: Record<string, unknown> = {};
      const cookieHeader = ctx.req.header("Cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").map((c) => c.trim().split("="));
        for (const [key, value] of cookies) {
          if (key && value) {
            cookieData[key] = decodeURIComponent(value);
          }
        }
      }
      const cookieResult = cookieSchema.safeParse(cookieData);
      if (!cookieResult.success) {
        throw new ValidationProblem({
          instance: `#/request/cookies`,
          issues: cookieResult.error.issues,
        });
      }
      result.cookies = cookieResult.data ?? {};
    }

    // Validate request body
    // deno-lint-ignore no-explicit-any
    const bodySchema = op.requestBody?.content["application/json"]?.schema as any as ZodType;
    if (bodySchema && "safeParse" in bodySchema) {
      try {
        const bodyResult = bodySchema.safeParse(await ctx.req.raw.clone().json());
        if (!bodyResult.success) {
          throw new ValidationProblem({
            instance: `#/request/body`,
            issues: bodyResult.error.issues,
          });
        }
        // deno-lint-ignore no-explicit-any
        result.body = bodyResult.data as any;
      } catch (error) {
        if (error instanceof ValidationProblem) throw error;

        if (error instanceof SyntaxError) {
          throw new ValidationProblem({
            instance: "#/request/body",
            issues: [{
              code: "invalid_type",
              expected: "object",
              received: "unknown",
              path: [],
              message: error.message,
            }],
          });
        }

        throw new ServerErrorProblem({
          detail: "Unexpected validation error.",
          instance: "#/request/body",
        });
      }
    }

    return result;
  }

  /**
   * Validates OpenAPI response data against the operation schema.
   *
   * Ensures that the response status code, headers, and body conform to the OpenAPI
   * specification. This helps catch programming errors where handlers return data
   * that doesn't match the documented API contract.
   *
   * @param response - The Response object to validate
   * @param operation - The OpenAPI operation definition with response schemas
   * @param statusCode - The HTTP status code to validate against
   * @returns The original response if validation passes
   * @throws ServerErrorProblem (500) if response doesn't match OpenAPI specification
   */
  protected async validateOpenApiResponse(response: Response, op: ZodOpenApiOperationObject): Promise<Response> {
    // deno-lint-ignore no-explicit-any
    const responseSpec = (op.responses as any)[response.status] as ZodOpenApiResponseObject;
    if (!responseSpec) {
      throw new ServerErrorProblem({
        detail: "The response status code is not found in the OpenAPI specification.",
        instance: `#/response/status-code=${response.status}`,
      });
    }

    // Validate response headers if specified
    // deno-lint-ignore no-explicit-any
    const headersSpec = responseSpec?.headers as any as ZodType;
    if (headersSpec && "safeParse" in headersSpec) {
      const headerData = Object.fromEntries(Array.from(response.headers.entries()));
      const headerResult = headersSpec.safeParse(headerData);
      if (!headerResult.success) {
        throw new ServerErrorProblem({
          detail: "Response headers do not match OpenAPI specification",
          instance: `#/response/headers`,
          issues: headerResult.error.issues,
        });
      }
    }

    // Validate response body if specified
    // deno-lint-ignore no-explicit-any
    const contentSpec = responseSpec.content?.["application/json"]?.schema as any as ZodType;
    if (contentSpec && "safeParse" in contentSpec) {
      const responseClone = response.clone();
      try {
        const bodyData = await responseClone.json();
        const bodyResult = contentSpec.safeParse(bodyData);
        if (!bodyResult.success) {
          throw new ServerErrorProblem({
            detail: "Response body does not match OpenAPI specification",
            instance: `#/response/body`,
            issues: bodyResult.error.issues,
          });
        }
      } catch (error) {
        if (error instanceof ServerErrorProblem) throw error;

        if (error instanceof SyntaxError) {
          throw new ServerErrorProblem({
            instance: "#/response/body",
            issues: [{
              code: "invalid_type",
              expected: "object",
              received: "unknown",
              path: [],
              message: error.message,
            }],
          });
        }

        throw new ServerErrorProblem({
          detail: "Unexpected validation error.",
          instance: "#/response/body",
        });
      }
    }

    return response;
  }
}

/**
 * Internal interface defining the structure of validated OpenAPI request data.
 *
 * Contains all the different types of request data that can be validated
 * according to OpenAPI specifications, with each field representing
 * a different part of the HTTP request.
 *
 * @internal
 */
interface OpenApiData {
  /** Validated path parameters extracted from the URL route */
  pathParams: Record<string, unknown>;

  /** Validated query string parameters */
  queryParams: Record<string, unknown>;

  /** Validated HTTP headers */
  headers: Record<string, unknown>;

  /** Validated HTTP cookies */
  cookies: Record<string, unknown>;

  /** Validated request body (typically JSON) */
  // deno-lint-ignore no-explicit-any
  body: any;
}
