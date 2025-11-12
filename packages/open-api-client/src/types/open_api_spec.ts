import { z } from "@zod/zod";

/**
 * TypeScript type representing an OpenAPI Schema Object.
 *
 * This type supports both OpenAPI 3.0 and 3.1 schema definitions, which are based on
 * JSON Schema with OpenAPI-specific extensions. It can represent either a reference
 * to another schema ($ref) or a complete schema definition with validation rules,
 * type information, and composition keywords.
 *
 * Supports:
 * - All JSON Schema validation keywords (type, format, pattern, min/max, etc.)
 * - Composition keywords (allOf, oneOf, anyOf, not)
 * - OpenAPI 3.0 nullable property and OpenAPI 3.1 array types for null handling
 * - Object schemas with properties and additionalProperties
 * - Array schemas with items
 * - Vendor extensions (x-* properties)
 *
 * @example
 * ```ts
 * // Reference schema
 * const refSchema: OpenAPISchemaObjectSchema = {
 *   $ref: "#/components/schemas/User"
 * };
 *
 * // String schema with validation
 * const stringSchema: OpenAPISchemaObjectSchema = {
 *   type: "string",
 *   minLength: 3,
 *   maxLength: 50,
 *   pattern: "^[a-zA-Z]+$"
 * };
 *
 * // Object schema
 * const objectSchema: OpenAPISchemaObjectSchema = {
 *   type: "object",
 *   properties: {
 *     id: { type: "integer" },
 *     name: { type: "string" }
 *   },
 *   required: ["id"]
 * };
 *
 * // Union with oneOf
 * const unionSchema: OpenAPISchemaObjectSchema = {
 *   oneOf: [
 *     { type: "string" },
 *     { type: "number" }
 *   ]
 * };
 * ```
 */
export type OpenAPISchemaObjectSchema =
  | { $ref: string; nullable?: boolean }
  | {
    // JSON Schema Core properties
    // OpenAPI 3.1 allows array of types (e.g., ["string", "null"] for nullable)
    type?:
      | "string"
      | "number"
      | "integer"
      | "boolean"
      | "array"
      | "object"
      | "null"
      | (
        | "string"
        | "number"
        | "integer"
        | "boolean"
        | "array"
        | "object"
        | "null"
      )[];
    format?: string;
    title?: string;
    description?: string;
    default?: unknown;
    example?: unknown; // OpenAPI 3.0 (deprecated in 3.1)
    examples?: unknown[]; // JSON Schema / OpenAPI 3.1

    // Validation keywords
    // Some real-world specs incorrectly use strings for numeric constraints
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number | boolean;
    minimum?: number;
    exclusiveMinimum?: number | boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    enum?: unknown[];

    // Object properties
    properties?: Record<string, OpenAPISchemaObjectSchema>;
    additionalProperties?: boolean | OpenAPISchemaObjectSchema;

    // Array properties
    items?: OpenAPISchemaObjectSchema;

    // Composition keywords
    allOf?: OpenAPISchemaObjectSchema[];
    oneOf?: OpenAPISchemaObjectSchema[];
    anyOf?: OpenAPISchemaObjectSchema[];
    not?: OpenAPISchemaObjectSchema;

    // OpenAPI-specific properties
    nullable?: boolean; // OpenAPI 3.0 (use type: null in 3.1)
    discriminator?: {
      propertyName: string;
      mapping?: Record<string, string>;
    };
    readOnly?: boolean;
    writeOnly?: boolean;
    xml?: {
      name?: string;
      namespace?: string;
      prefix?: string;
      attribute?: boolean;
      wrapped?: boolean;
    };
    externalDocs?: {
      description?: string;
      url: string;
    };
    deprecated?: boolean;

    // Allow additional properties for vendor extensions (x-*)
    [key: string]: unknown;
  };

/**
 * Zod schema for validating OpenAPI Schema Objects.
 *
 * This Zod schema validates OpenAPI Schema Object definitions for both OpenAPI 3.0
 * and 3.1. It uses z.lazy() for recursive schema definitions and z.coerce for
 * forgiving parsing of numeric constraints that may be incorrectly specified as
 * strings in some real-world specifications.
 *
 * @example
 * ```ts
 * const schema = {
 *   type: "object",
 *   properties: {
 *     name: { type: "string", minLength: 1 }
 *   },
 *   required: ["name"]
 * };
 *
 * const validated = OpenAPISchemaObjectSchema.parse(schema);
 * ```
 */
export const OpenAPISchemaObjectSchema: z.ZodType<OpenAPISchemaObjectSchema> = z
  .lazy(() =>
    z.union([
      // Reference object
      z.object({ $ref: z.string(), nullable: z.boolean().optional() }),
      // Schema object with common JSON Schema and OpenAPI properties
      z.looseObject({
        // JSON Schema Core properties
        // OpenAPI 3.1 allows array of types (e.g., ["string", "null"] for nullable)
        type: z.union([
          z.enum([
            "string",
            "number",
            "integer",
            "boolean",
            "array",
            "object",
            "null",
          ]),
          z.array(z.enum([
            "string",
            "number",
            "integer",
            "boolean",
            "array",
            "object",
            "null",
          ])),
        ]).optional(),
        format: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        default: z.unknown().optional(),
        example: z.unknown().optional(), // OpenAPI 3.0 (deprecated in 3.1, use examples instead)
        examples: z.array(z.unknown()).optional(), // JSON Schema / OpenAPI 3.1

        // Validation keywords
        // Some real-world specs incorrectly use strings for numeric constraints
        multipleOf: z.coerce.number().optional(),
        maximum: z.coerce.number().optional(),
        exclusiveMaximum: z.union([z.coerce.number(), z.boolean()]).optional(),
        minimum: z.coerce.number().optional(),
        exclusiveMinimum: z.union([z.coerce.number(), z.boolean()]).optional(),
        maxLength: z.coerce.number().optional(),
        minLength: z.coerce.number().optional(),
        pattern: z.string().optional(),
        maxItems: z.coerce.number().optional(),
        minItems: z.coerce.number().optional(),
        uniqueItems: z.coerce.boolean().optional(),
        maxProperties: z.coerce.number().optional(),
        minProperties: z.coerce.number().optional(),
        required: z.array(z.string()).optional(),
        enum: z.array(z.unknown()).optional(),

        // Object properties
        properties: z.record(
          z.string(),
          z.lazy(() => OpenAPISchemaObjectSchema),
        ).optional(),
        additionalProperties: z.union([
          z.boolean(),
          z.lazy(() => OpenAPISchemaObjectSchema),
        ]).optional(),

        // Array properties
        items: z.lazy(() => OpenAPISchemaObjectSchema).optional(),

        // Composition keywords
        allOf: z.array(z.lazy(() => OpenAPISchemaObjectSchema)).optional(),
        oneOf: z.array(z.lazy(() => OpenAPISchemaObjectSchema)).optional(),
        anyOf: z.array(z.lazy(() => OpenAPISchemaObjectSchema)).optional(),
        not: z.lazy(() => OpenAPISchemaObjectSchema).optional(),

        // OpenAPI-specific properties
        nullable: z.coerce.boolean().optional(), // OpenAPI 3.0 (use type: null in 3.1)
        discriminator: z.object({
          propertyName: z.string(),
          mapping: z.record(z.string(), z.string()).optional(),
        }).optional(),
        readOnly: z.coerce.boolean().optional(),
        writeOnly: z.coerce.boolean().optional(),
        xml: z.object({
          name: z.string().optional(),
          namespace: z.string().optional(),
          prefix: z.string().optional(),
          attribute: z.coerce.boolean().optional(),
          wrapped: z.coerce.boolean().optional(),
        }).optional(),
        externalDocs: z.object({
          description: z.string().optional(),
          url: z.string(),
        }).optional(),
        deprecated: z.coerce.boolean().optional(),
      }),
    ])
  );

/**
 * Zod schema for validating OpenAPI Info Objects.
 *
 * The Info Object provides metadata about the API including title, version, and
 * optional description.
 *
 * @example
 * ```ts
 * const info = OpenAPIInfoSchema.parse({
 *   title: "My API",
 *   version: "1.0.0",
 *   description: "A sample API"
 * });
 * ```
 */
export const OpenAPIInfoSchema = z.object({
  title: z.string(),
  version: z.string(),
  description: z.string().optional(),
});

/**
 * Zod schema for validating OpenAPI Server Objects.
 *
 * Server Objects specify the base URLs for API endpoints. Multiple servers can be
 * defined to support different environments (production, staging, etc.).
 *
 * @example
 * ```ts
 * const server = OpenAPIServerSchema.parse({
 *   url: "https://api.example.com/v1",
 *   description: "Production server"
 * });
 * ```
 */
export const OpenAPIServerSchema = z.object({
  url: z.string(),
  description: z.string().optional(),
});

/**
 * Zod schema for validating OpenAPI Parameter Objects.
 *
 * Parameter Objects describe a single operation parameter, which can be in the path,
 * query, header, or cookie. Can be either a reference ($ref) or a full parameter
 * definition with schema, style, and explode settings.
 *
 * @example
 * ```ts
 * const pathParam = OpenAPIParameterSchema.parse({
 *   name: "userId",
 *   in: "path",
 *   required: true,
 *   schema: { type: "integer" }
 * });
 *
 * const queryParam = OpenAPIParameterSchema.parse({
 *   name: "filter",
 *   in: "query",
 *   schema: { type: "string" },
 *   style: "form",
 *   explode: true
 * });
 * ```
 */
export const OpenAPIParameterSchema = z.union([
  z.looseObject({
    $ref: z.string(),
  }),
  z.looseObject({
    name: z.string(),
    in: z.enum(["query", "header", "path", "cookie"]),
    description: z.string().optional(),
    required: z.coerce.boolean().optional(),
    schema: OpenAPISchemaObjectSchema.optional(),
    example: z.unknown().optional(),
    examples: z.record(z.string(), z.unknown()).optional(),
    style: z.enum([
      "matrix",
      "label",
      "form",
      "simple",
      "spaceDelimited",
      "pipeDelimited",
      "deepObject",
    ]).optional(),
    explode: z.coerce.boolean().optional(),
  }),
]);

/**
 * Zod schema for validating OpenAPI Request Body Objects.
 *
 * Request Body Objects describe the request body for an operation, including the
 * content types supported and their schemas. Can be either a reference ($ref) or
 * a full request body definition.
 *
 * @example
 * ```ts
 * const requestBody = OpenAPIRequestBodySchema.parse({
 *   required: true,
 *   content: {
 *     "application/json": {
 *       schema: {
 *         type: "object",
 *         properties: {
 *           name: { type: "string" }
 *         }
 *       }
 *     }
 *   }
 * });
 * ```
 */
export const OpenAPIRequestBodySchema = z.union([
  z.looseObject({
    $ref: z.string(),
  }),
  z.looseObject({
    description: z.string().optional(),
    content: z.record(
      z.string(),
      z.object({
        schema: OpenAPISchemaObjectSchema.optional(),
        example: z.unknown().optional(),
        examples: z.record(z.string(), z.unknown()).optional(),
      }),
    ),
    required: z.coerce.boolean().optional(),
  }),
]);

/**
 * Zod schema for validating OpenAPI Response Objects.
 *
 * Response Objects describe a single response from an API operation, including the
 * content types, schemas, and headers. Can be either a reference ($ref) or a full
 * response definition.
 *
 * @example
 * ```ts
 * const response = OpenAPIResponseSchema.parse({
 *   description: "Successful response",
 *   content: {
 *     "application/json": {
 *       schema: {
 *         type: "object",
 *         properties: {
 *           id: { type: "integer" },
 *           name: { type: "string" }
 *         }
 *       }
 *     }
 *   },
 *   headers: {
 *     "X-Rate-Limit": {
 *       schema: { type: "integer" }
 *     }
 *   }
 * });
 * ```
 */
export const OpenAPIResponseSchema = z.union([
  z.looseObject({
    $ref: z.string(),
  }),
  z.looseObject({
    description: z.string().optional(),
    content: z.record(
      z.string(),
      z.object({
        schema: OpenAPISchemaObjectSchema.optional(),
        example: z.unknown().optional(),
        examples: z.record(z.string(), z.unknown()).optional(),
      }),
    ).optional(),
    headers: z.record(
      z.string(),
      z.object({
        description: z.string().optional(),
        required: z.coerce.boolean().optional(),
        schema: OpenAPISchemaObjectSchema.optional(),
        example: z.unknown().optional(),
        examples: z.record(z.string(), z.unknown()).optional(),
      }),
    ).optional(),
  }),
]);

/**
 * Zod schema for validating OpenAPI Security Scheme Objects.
 *
 * Security Scheme Objects define security mechanisms that can be used by operations.
 * Supports API keys, HTTP authentication, OAuth2, OpenID Connect, and mutual TLS.
 * Can be either a reference ($ref) or a full security scheme definition.
 *
 * @example
 * ```ts
 * // API Key authentication
 * const apiKeyScheme = OpenAPISecuritySchemeSchema.parse({
 *   type: "apiKey",
 *   name: "X-API-Key",
 *   in: "header"
 * });
 *
 * // HTTP Bearer authentication
 * const bearerScheme = OpenAPISecuritySchemeSchema.parse({
 *   type: "http",
 *   scheme: "bearer",
 *   bearerFormat: "JWT"
 * });
 *
 * // OAuth2 authentication
 * const oauth2Scheme = OpenAPISecuritySchemeSchema.parse({
 *   type: "oauth2",
 *   flows: {
 *     authorizationCode: {
 *       authorizationUrl: "https://example.com/oauth/authorize",
 *       tokenUrl: "https://example.com/oauth/token",
 *       scopes: {
 *         "read:users": "Read user data",
 *         "write:users": "Modify user data"
 *       }
 *     }
 *   }
 * });
 * ```
 */
// Security Scheme Object for components
export const OpenAPISecuritySchemeSchema = z.union([
  z.looseObject({
    $ref: z.string(),
  }),
  z.looseObject({
    type: z.enum(["apiKey", "http", "oauth2", "openIdConnect", "mutualTLS"]),
    description: z.string().optional(),
    // apiKey specific
    name: z.string().optional(), // required when type is apiKey
    in: z.enum(["query", "header", "cookie"]).optional(), // required when type is apiKey
    // http specific
    scheme: z.string().optional(), // required when type is http
    bearerFormat: z.string().optional(),
    // oauth2 specific
    flows: z.looseObject({
      implicit: z.object({
        authorizationUrl: z.string(),
        refreshUrl: z.string().optional(),
        scopes: z.record(z.string(), z.string()),
      }).optional(),
      password: z.object({
        tokenUrl: z.string(),
        refreshUrl: z.string().optional(),
        scopes: z.record(z.string(), z.string()),
      }).optional(),
      clientCredentials: z.object({
        tokenUrl: z.string(),
        refreshUrl: z.string().optional(),
        scopes: z.record(z.string(), z.string()),
      }).optional(),
      authorizationCode: z.object({
        authorizationUrl: z.string(),
        tokenUrl: z.string(),
        refreshUrl: z.string().optional(),
        scopes: z.record(z.string(), z.string()),
      }).optional(),
    }).optional(), // required when type is oauth2
    // openIdConnect specific
    openIdConnectUrl: z.string().optional(), // required when type is openIdConnect
  }),
]);

/**
 * Zod schema for validating OpenAPI Operation Objects.
 *
 * Operation Objects describe a single API operation on a path, including parameters,
 * request body, responses, tags, and other metadata. Each HTTP method (GET, POST, etc.)
 * on a path is represented by an Operation Object.
 *
 * @example
 * ```ts
 * const operation = OpenAPIOperationSchema.parse({
 *   summary: "Get user by ID",
 *   operationId: "getUserById",
 *   tags: ["users"],
 *   parameters: [
 *     {
 *       name: "id",
 *       in: "path",
 *       required: true,
 *       schema: { type: "integer" }
 *     }
 *   ],
 *   responses: {
 *     "200": {
 *       description: "User found",
 *       content: {
 *         "application/json": {
 *           schema: { $ref: "#/components/schemas/User" }
 *         }
 *       }
 *     },
 *     "404": {
 *       description: "User not found"
 *     }
 *   }
 * });
 * ```
 */
export const OpenAPIOperationSchema = z.looseObject({
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  operationId: z.string().optional(),
  parameters: z.array(OpenAPIParameterSchema).optional(),
  requestBody: OpenAPIRequestBodySchema.optional(),
  responses: z.record(z.string(), OpenAPIResponseSchema),
});

/**
 * Zod schema for validating OpenAPI Path Item Objects.
 *
 * Path Item Objects describe the operations available on a single path. Each path
 * can have multiple HTTP methods (get, post, put, delete, etc.) and optional
 * path-level parameters that apply to all operations.
 *
 * @example
 * ```ts
 * const pathItem = OpenAPIPathItemSchema.parse({
 *   parameters: [
 *     {
 *       name: "version",
 *       in: "header",
 *       schema: { type: "string" }
 *     }
 *   ],
 *   get: {
 *     summary: "List users",
 *     responses: {
 *       "200": {
 *         description: "Success",
 *         content: {
 *           "application/json": {
 *             schema: {
 *               type: "array",
 *               items: { $ref: "#/components/schemas/User" }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   post: {
 *     summary: "Create user",
 *     requestBody: {
 *       content: {
 *         "application/json": {
 *           schema: { $ref: "#/components/schemas/User" }
 *         }
 *       }
 *     },
 *     responses: {
 *       "201": { description: "Created" }
 *     }
 *   }
 * });
 * ```
 */
export const OpenAPIPathItemSchema = z.looseObject({
  parameters: z.array(OpenAPIParameterSchema).optional(), // Path-level parameters
  get: OpenAPIOperationSchema.optional(),
  post: OpenAPIOperationSchema.optional(),
  put: OpenAPIOperationSchema.optional(),
  delete: OpenAPIOperationSchema.optional(),
  patch: OpenAPIOperationSchema.optional(),
  head: OpenAPIOperationSchema.optional(),
  options: OpenAPIOperationSchema.optional(),
  trace: OpenAPIOperationSchema.optional(),
});

/**
 * Zod schema for validating complete OpenAPI Specification documents.
 *
 * This schema validates entire OpenAPI 3.0.x and 3.1.x specification documents,
 * including all paths, operations, components, and metadata. Use this to validate
 * OpenAPI specification files before processing them.
 *
 * @example
 * ```ts
 * const spec = OpenAPISpec.parse({
 *   openapi: "3.1.0",
 *   info: {
 *     title: "My API",
 *     version: "1.0.0"
 *   },
 *   paths: {
 *     "/users": {
 *       get: {
 *         responses: {
 *           "200": {
 *             description: "Success",
 *             content: {
 *               "application/json": {
 *                 schema: {
 *                   type: "array",
 *                   items: { $ref: "#/components/schemas/User" }
 *                 }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   components: {
 *     schemas: {
 *       User: {
 *         type: "object",
 *         properties: {
 *           id: { type: "integer" },
 *           name: { type: "string" }
 *         },
 *         required: ["id", "name"]
 *       }
 *     }
 *   }
 * });
 * ```
 */
export const OpenAPISpec = z.looseObject({
  openapi: z.string().regex(/^3\.[01]\.\d+$/), // Matches 3.0.x or 3.1.x
  info: OpenAPIInfoSchema,
  servers: z.array(OpenAPIServerSchema).optional(),
  paths: z.record(z.string(), OpenAPIPathItemSchema),
  components: z.looseObject({
    schemas: z.record(z.string(), OpenAPISchemaObjectSchema).optional(),
    parameters: z.record(z.string(), OpenAPIParameterSchema).optional(),
    requestBodies: z.record(z.string(), OpenAPIRequestBodySchema).optional(),
    responses: z.record(z.string(), OpenAPIResponseSchema).optional(),
    securitySchemes: z.record(z.string(), OpenAPISecuritySchemeSchema)
      .optional(),
  }).optional(),
});

/**
 * TypeScript type inferred from the OpenAPISpec Zod schema.
 *
 * Represents a complete, validated OpenAPI specification document. Use this type
 * for type-safe access to OpenAPI specification data after validation.
 *
 * @example
 * ```ts
 * async function loadSpec(url: string): Promise<OpenAPISpec> {
 *   const response = await fetch(url);
 *   const data = await response.json();
 *   return OpenAPISpec.parse(data);
 * }
 *
 * const spec = await loadSpec("https://api.example.com/openapi.json");
 * console.log(spec.info.title);
 * console.log(spec.paths["/users"].get?.summary);
 * ```
 */
export type OpenAPISpec = z.infer<typeof OpenAPISpec>;
