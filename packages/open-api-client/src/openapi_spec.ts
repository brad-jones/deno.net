import { z } from "@zod/zod";

export const OpenAPIInfoSchema = z.object({
  title: z.string(),
  version: z.string(),
  description: z.string().optional(),
});

export const OpenAPIServerSchema = z.object({
  url: z.string(),
  description: z.string().optional(),
});

export const OpenAPIParameterSchema = z.object({
  name: z.string(),
  in: z.enum(["query", "header", "path", "cookie"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
});

export const OpenAPIRequestBodySchema = z.object({
  description: z.string().optional(),
  content: z.record(
    z.string(),
    z.object({
      schema: z.record(z.string(), z.unknown()),
    }),
  ),
  required: z.boolean().optional(),
});

export const OpenAPIResponseSchema = z.object({
  description: z.string().optional(),
  content: z.record(
    z.string(),
    z.object({
      schema: z.record(z.string(), z.unknown()),
    }),
  ).optional(),
});

export const OpenAPIOperationSchema = z.object({
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  operationId: z.string().optional(),
  parameters: z.array(OpenAPIParameterSchema).optional(),
  requestBody: OpenAPIRequestBodySchema.optional(),
  responses: z.record(z.string(), OpenAPIResponseSchema),
});

export const OpenAPIPathItemSchema = z.object({
  get: OpenAPIOperationSchema.optional(),
  post: OpenAPIOperationSchema.optional(),
  put: OpenAPIOperationSchema.optional(),
  delete: OpenAPIOperationSchema.optional(),
  patch: OpenAPIOperationSchema.optional(),
  head: OpenAPIOperationSchema.optional(),
  options: OpenAPIOperationSchema.optional(),
  trace: OpenAPIOperationSchema.optional(),
});

export const OpenAPISpec = z.object({
  openapi: z.string().regex(/^3\.[01]\.\d+$/), // Matches 3.0.x or 3.1.x
  info: OpenAPIInfoSchema,
  servers: z.array(OpenAPIServerSchema).optional(),
  paths: z.record(z.string(), OpenAPIPathItemSchema),
  components: z.object({
    schemas: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

export type OpenAPISpec = z.infer<typeof OpenAPISpec>;
