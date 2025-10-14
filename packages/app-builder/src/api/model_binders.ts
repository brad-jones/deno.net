// deno-lint-ignore-file no-explicit-any

import type * as z from "@zod/zod";
import { getCookie } from "@hono/hono/cookie";
import { inject } from "@brad-jones/deno-net-container";
import type { RequestHeader } from "@hono/hono/utils/headers";
import { ValidationProblem } from "@brad-jones/deno-net-problem-details";
import { HttpContext } from "@brad-jones/deno-net-http-context";

/**
 * Each model binder (aka: fromX method) accepts an
 * optional Zod schema to validate the input.
 */
export interface ZodValidator<T extends z.ZodType = any> {
  /**
   * The Zod schema.
   */
  schema: T;

  /**
   * An optional factory function that given a Zod validation error object, returns an error response.
   * If this is not given, a 400 Bad Request with a Problem Details (RFC9457) body will be generated.
   *
   * TODO: Provide some kind of global way to override this generation. Probably using our IoC Container :)
   */
  errorResponseFactory?: (e: z.ZodSafeParseResult<z.output<T>>) => Response;
}

/**
 * Extracts a path parameter from the current HTTP request URL.
 *
 * This function retrieves the value of a named path parameter from the request URL.
 * Path parameters are defined in route patterns (e.g., `/users/:id` where `id` is the parameter).
 *
 * @param pathParameter - The name of the path parameter to extract
 * @param validator - Optional Zod validator to validate and transform the parameter value
 * @returns The path parameter value as a string, or the validated/transformed value if a validator is provided
 *
 * @example
 * ```typescript
 * // Basic usage in a mapped route
 * builder.routes.mapGet("/users/:id", (ctx, userId = fromPath("id")) =>
 *   ctx.json({ user: db.users.findById(userId) })
 * );
 *
 * // With validation and transformation
 * builder.routes.mapGet("/users/:id", (ctx, userId = fromPath("id", {
 *   schema: z.string().uuid("Invalid user ID format")
 * })) => ctx.json({ user: db.users.findById(userId) }));
 *
 * // Multiple path parameters
 * builder.routes.mapGet("/users/:userId/posts/:postId", (
 *   ctx,
 *   userId = fromPath("userId"),
 *   postId = fromPath("postId", { schema: z.string().cuid() })
 * ) => ctx.json({ post: db.posts.findByUserAndId(userId, postId) }));
 * ```
 */
export function fromPath(pathParameter: string): string;
export function fromPath<T extends z.ZodType>(pathParameter: string, validator: ZodValidator<T>): z.output<T>;
export function fromPath(pathParameter: string, validator?: ZodValidator): unknown {
  let value = inject(HttpContext).req.param(pathParameter);

  if (validator) {
    value = validate(pathParameter, value, validator);
  }

  return value;
}

/**
 * Extracts a single query string parameter from the current HTTP request.
 *
 * This function retrieves the value of a named query string parameter from the request URL.
 * If the parameter is not present, returns an empty string.
 *
 * @param queryStringKey - The name of the query string parameter to extract
 * @param validator - Optional Zod validator to validate and transform the parameter value
 * @returns The query parameter value as a string (empty string if not present), or the validated/transformed value if a validator is provided
 *
 * @example
 * ```typescript
 * // Basic usage for pagination
 * builder.routes.mapGet("/users", (
 *   ctx,
 *   page = fromQuery("page"),
 *   limit = fromQuery("limit")
 * ) => ctx.json({ users: db.users.paginate(page, limit) }));
 *
 * // With validation and transformation
 * builder.routes.mapGet("/users", (
 *   ctx,
 *   page = fromQuery("page", {
 *     schema: z.string().transform(Number).pipe(z.number().min(1).default(1))
 *   }),
 *   limit = fromQuery("limit", {
 *     schema: z.string().transform(Number).pipe(z.number().min(1).max(100).default(10))
 *   })
 * ) => ctx.json({ users: db.users.paginate(page, limit) }));
 *
 * // Search endpoint with optional query
 * builder.routes.mapGet("/search", (
 *   ctx,
 *   q = fromQuery("q"),
 *   category = fromQuery("category")
 * ) => ctx.json({ results: searchService.search(q, category) }));
 * ```
 */
export function fromQuery(queryStringKey: string): string;
export function fromQuery<T extends z.ZodType>(queryStringKey: string, validator: ZodValidator<T>): z.output<T>;
export function fromQuery(queryStringKey: string, validator?: ZodValidator): unknown {
  let value = inject(HttpContext).req.query(queryStringKey);

  if (validator) {
    value = validate(queryStringKey, value, validator);
  }

  return value ?? "";
}

/**
 * Extracts multiple values for a query string parameter from the current HTTP request.
 *
 * This function retrieves all values for a named query string parameter that appears multiple times in the URL.
 * Useful for handling array-like query parameters (e.g., `?tags=red&tags=blue&tags=green`).
 * If the parameter is not present, returns an empty array.
 *
 * @param queryStringKey - The name of the query string parameter to extract multiple values for
 * @param validator - Optional Zod validator to validate and transform the parameter values array
 * @returns An array of query parameter values (empty array if not present), or the validated/transformed value if a validator is provided
 *
 * @example
 * ```typescript
 * // Basic usage for filtering by multiple tags
 * builder.routes.mapGet("/posts", (
 *   ctx,
 *   tags = fromQueries("tags")
 * ) => ctx.json({ posts: db.posts.findByTags(tags) }));
 *
 * // With validation and limits
 * builder.routes.mapGet("/products", (
 *   ctx,
 *   categories = fromQueries("category", {
 *     schema: z.array(z.string().min(1)).max(5, "Too many categories selected")
 *   }),
 *   features = fromQueries("feature", {
 *     schema: z.array(z.enum(["new", "sale", "featured"]))
 *   })
 * ) => ctx.json({ products: db.products.filter(categories, features) }));
 *
 * // Multiple selection filters
 * builder.routes.mapGet("/events", (
 *   ctx,
 *   types = fromQueries("type"),
 *   locations = fromQueries("location")
 * ) => ctx.json({ events: eventService.findByFilters(types, locations) }));
 * ```
 */
export function fromQueries(queryStringKey: string): string[];
export function fromQueries<T extends z.ZodType>(queryStringKey: string, validator: ZodValidator<T>): z.output<T>;
export function fromQueries(queryStringKey: string, validator?: ZodValidator): unknown {
  let value = inject(HttpContext).req.queries(queryStringKey);

  if (validator) {
    value = validate(queryStringKey, value, validator);
  }

  return value ?? [];
}

/**
 * Extracts a header value from the current HTTP request.
 *
 * This function retrieves the value of a named HTTP header from the request.
 * Header names are case-insensitive. If the header is not present, returns an empty string.
 *
 * @param headerKey - The name of the HTTP header to extract (can be a string or a RequestHeader type)
 * @param validator - Optional Zod validator to validate and transform the header value
 * @returns The header value as a string (empty string if not present), or the validated/transformed value if a validator is provided
 *
 * @example
 * ```typescript
 * // API key authentication
 * builder.routes.mapGet("/protected", (
 *   ctx,
 *   apiKey = fromHeader("X-API-Key", {
 *     schema: z.string().min(1, "API key is required")
 *   })
 * ) => {
 *   if (!authService.validateApiKey(apiKey)) {
 *     return ctx.json({ error: "Invalid API key" }, 401);
 *   }
 *   return ctx.json({ data: "Protected resource" });
 * });
 *
 * // Content negotiation
 * builder.routes.mapPost("/data", (
 *   ctx,
 *   contentType = fromHeader("Content-Type", {
 *     schema: z.enum(["application/json", "application/xml"])
 *   }),
 *   userAgent = fromHeader("User-Agent")
 * ) => {
 *   analytics.track(userAgent);
 *   return processData(contentType);
 * });
 *
 * // Custom authorization header
 * builder.routes.mapDelete("/users/:id", (
 *   ctx,
 *   userId = fromPath("id"),
 *   authToken = fromHeader("Authorization", {
 *     schema: z.string().regex(/^Bearer .+/, "Invalid authorization format")
 *   })
 * ) => userService.delete(userId, authToken));
 * ```
 */
export function fromHeader(headerKey: string): string;
export function fromHeader(headerKey: RequestHeader): string;
export function fromHeader<T extends z.ZodType>(headerKey: string, validator: ZodValidator<T>): z.output<T>;
export function fromHeader<T extends z.ZodType>(headerKey: RequestHeader, validator: ZodValidator<T>): z.output<T>;
export function fromHeader(headerKey: string, validator?: ZodValidator): unknown {
  let value = inject(HttpContext).req.header(headerKey);

  if (validator) {
    value = validate(headerKey, value, validator);
  }

  return value ?? "";
}

/**
 * Extracts a cookie value from the current HTTP request.
 *
 * This function retrieves the value of a named cookie from the request headers.
 * If the cookie is not present, returns an empty string.
 *
 * @param cookieKey - The name of the cookie to extract
 * @param validator - Optional Zod validator to validate and transform the cookie value
 * @returns The cookie value as a string (empty string if not present), or the validated/transformed value if a validator is provided
 *
 * @example
 * ```typescript
 * // Session-based authentication
 * builder.routes.mapGet("/profile", (
 *   ctx,
 *   sessionId = fromCookie("session_id", {
 *     schema: z.string().min(1, "Session required")
 *   })
 * ) => {
 *   const user = sessionService.getUser(sessionId);
 *   return ctx.json({ profile: user });
 * });
 *
 * // Theme preference from cookies
 * builder.routes.mapGet("/dashboard", (
 *   ctx,
 *   theme = fromCookie("theme", {
 *     schema: z.enum(["light", "dark"]).default("light")
 *   }),
 *   language = fromCookie("lang", {
 *     schema: z.string().length(2).default("en")
 *   })
 * ) => ctx.json({
 *   dashboard: dashboardService.getForUser(theme, language)
 * }));
 *
 * // Shopping cart cookie
 * builder.routes.mapGet("/cart", (
 *   ctx,
 *   cartId = fromCookie("cart_id")
 * ) => ctx.json({ items: cartService.getItems(cartId) }));
 * ```
 */
export function fromCookie(cookieKey: string): string;
export function fromCookie<T extends z.ZodType>(cookieKey: string, validator: ZodValidator<T>): z.output<T>;
export function fromCookie(cookieKey: string, validator?: ZodValidator): unknown {
  let value = getCookie(inject(HttpContext) as any, cookieKey);

  if (validator) {
    value = validate(cookieKey, value, validator);
  }

  return value ?? "";
}

/**
 * Extracts a form field value from the current HTTP request body.
 *
 * This function parses the request body as form data (application/x-www-form-urlencoded or multipart/form-data)
 * and retrieves the value of a named form field. If the field is not present, returns an empty string.
 * This is an async function as it needs to read and parse the request body.
 *
 * @param formBodyKey - The name of the form field to extract
 * @param validator - Optional Zod validator to validate and transform the form field value
 * @returns A Promise that resolves to the form field value as a string (empty string if not present), or the validated/transformed value if a validator is provided
 *
 * @example
 * ```typescript
 * // User registration form
 * builder.routes.mapPost("/register", async (
 *   ctx,
 *   username = await fromForm("username", {
 *     schema: z.string().min(3).max(50)
 *   }),
 *   email = await fromForm("email", {
 *     schema: z.string().email("Invalid email format")
 *   }),
 *   password = await fromForm("password", {
 *     schema: z.string().min(8, "Password must be at least 8 characters")
 *   })
 * ) => {
 *   const user = await userService.create({ username, email, password });
 *   return ctx.json({ user });
 * });
 *
 * // File upload with form data
 * builder.routes.mapPost("/upload", async (
 *   ctx,
 *   title = await fromForm("title"),
 *   description = await fromForm("description"),
 *   file = await fromForm("file", {
 *     schema: z.instanceof(File, "File is required")
 *   })
 * ) => {
 *   const uploadResult = await fileService.upload(file, { title, description });
 *   return ctx.json({ upload: uploadResult });
 * });
 *
 * // Contact form submission
 * builder.routes.mapPost("/contact", async (
 *   ctx,
 *   name = await fromForm("name", { schema: z.string().min(1) }),
 *   email = await fromForm("email", { schema: z.string().email() }),
 *   message = await fromForm("message", { schema: z.string().min(10) })
 * ) => {
 *   await contactService.submit({ name, email, message });
 *   return ctx.json({ success: true });
 * });
 * ```
 */
export function fromForm(formBodyKey: string): Promise<string>;
export function fromForm<T extends z.ZodType>(formBodyKey: string, validator: ZodValidator<T>): Promise<z.output<T>>;
export function fromForm(formBodyKey: string, validator?: ZodValidator): Promise<unknown> {
  return (async () => {
    const data = await inject(HttpContext).req.formData();
    let value = data.get(formBodyKey)?.valueOf();

    if (validator) {
      value = validate(formBodyKey, value, validator);
    }

    return value ?? "";
  })();
}

/**
 * Extracts and parses the JSON body from the current HTTP request.
 *
 * This function reads the request body and parses it as JSON. The request must have a
 * Content-Type of application/json. This is an async function as it needs to read the request body.
 * Without a validator, returns the raw parsed JSON (any type).
 *
 * @param validator - Optional Zod validator to validate and transform the JSON payload
 * @returns A Promise that resolves to the parsed JSON object, or the validated/transformed value if a validator is provided
 *
 * @example
 * ```typescript
 * // Create user with JSON payload
 * builder.routes.mapPost("/users", async (
 *   ctx,
 *   userData = await fromJson({
 *     schema: z.object({
 *       name: z.string().min(1),
 *       email: z.string().email(),
 *       age: z.number().min(0).optional(),
 *       preferences: z.object({
 *         theme: z.enum(["light", "dark"]).default("light"),
 *         notifications: z.boolean().default(true)
 *       }).optional()
 *     })
 *   })
 * ) => {
 *   const user = await userService.create(userData);
 *   return ctx.json({ user }, 201);
 * });
 *
 * // Bulk operations with array payload
 * builder.routes.mapPost("/users/bulk", async (
 *   ctx,
 *   users = await fromJson({
 *     schema: z.array(z.object({
 *       name: z.string(),
 *       email: z.string().email()
 *     })).min(1).max(100, "Cannot process more than 100 users at once")
 *   })
 * ) => {
 *   const results = await userService.createBulk(users);
 *   return ctx.json({ created: results });
 * });
 *
 * // Update product with partial data
 * builder.routes.mapPatch("/products/:id", async (
 *   ctx,
 *   productId = fromPath("id"),
 *   updates = await fromJson({
 *     schema: z.object({
 *       name: z.string().optional(),
 *       price: z.number().positive().optional(),
 *       tags: z.array(z.string()).optional()
 *     })
 *   })
 * ) => {
 *   const product = await productService.update(productId, updates);
 *   return ctx.json({ product });
 * });
 * ```
 */
export function fromJson(): Promise<unknown>;
export function fromJson<T extends z.ZodType>(validator: ZodValidator<T>): Promise<z.output<T>>;
export function fromJson(validator?: ZodValidator): Promise<unknown> {
  return (async () => {
    let value = await inject(HttpContext).req.json();

    if (validator) {
      value = validate("body", value, validator);
    }

    return value;
  })();
}

/**
 * @internal
 */
function validate<T extends z.ZodType>(key: string, value: unknown, validator: ZodValidator<T>): z.output<T> {
  const result = validator.schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  if (validator.errorResponseFactory) {
    throw validator.errorResponseFactory(result);
  }

  throw new ValidationProblem({ instance: `#/${key}=${value}`, issues: result.error.issues });
}
