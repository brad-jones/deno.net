import { expect } from "@std/expect";
import { FunctionalClientGenerator, type OpenAPISpec } from "../src/mod.ts";

Deno.test("FunctionalClientGenerator - generate response headers with schemas", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "Response Headers Test",
      version: "1.0.0",
    },
    paths: {
      "/data": {
        get: {
          operationId: "getData",
          summary: "Get data with response headers",
          responses: {
            "200": {
              description: "Success",
              headers: {
                "X-RateLimit-Limit": {
                  description: "Request limit per hour",
                  schema: {
                    type: "integer",
                  },
                },
                "X-RateLimit-Remaining": {
                  description: "Remaining requests",
                  schema: {
                    type: "integer",
                  },
                },
                "X-Request-Id": {
                  description: "Unique request ID",
                  required: true,
                  schema: {
                    type: "string",
                    format: "uuid",
                  },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const generator = new FunctionalClientGenerator({
    validateRequests: true,
    validateResponses: true,
    fmtResult: false,
  });
  const output = await generator.generate(spec);

  // Check TypeScript types for response headers
  expect(output).toContain("headers: {");
  expect(output).toContain('"X-RateLimit-Limit"?: number');
  expect(output).toContain('"X-RateLimit-Remaining"?: number');
  expect(output).toContain('"X-Request-Id": string'); // Required, no ?

  // Check Zod schemas for response headers
  expect(output).toContain("headers: z.object({");
  expect(output).toContain('"X-RateLimit-Limit": z.number().int().optional()');
  expect(output).toContain(
    '"X-RateLimit-Remaining": z.number().int().optional()',
  );
  expect(output).toContain('"X-Request-Id": z.string()'); // Required, no .optional()
});

Deno.test("FunctionalClientGenerator - infer response headers from examples", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "Response Headers Inference Test",
      version: "1.0.0",
    },
    paths: {
      "/items": {
        get: {
          operationId: "getItems",
          responses: {
            "200": {
              description: "Success",
              headers: {
                "X-Total-Count": {
                  description: "Total number of items",
                  example: 42, // Should infer as integer
                },
                "X-Page-Number": {
                  description: "Current page",
                  examples: {
                    firstPage: {
                      value: 1,
                    },
                  }, // Should infer as integer
                },
                "X-API-Version": {
                  description: "API version",
                  example: "v2.0", // Should infer as string
                },
              },
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const generator = new FunctionalClientGenerator({
    validateRequests: true,
    validateResponses: true,
    fmtResult: false,
  });
  const output = await generator.generate(spec);

  // Check inferred TypeScript types
  expect(output).toContain('"X-Total-Count"?: number');
  expect(output).toContain('"X-Page-Number"?: number');
  expect(output).toContain('"X-API-Version"?: string');

  // Check inferred Zod schemas
  expect(output).toContain('"X-Total-Count": z.number().int().optional()');
  expect(output).toContain('"X-Page-Number": z.number().int().optional()');
  expect(output).toContain('"X-API-Version": z.string().optional()');
});

Deno.test("FunctionalClientGenerator - response without headers", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "No Headers Test",
      version: "1.0.0",
    },
    paths: {
      "/simple": {
        get: {
          operationId: "getSimple",
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const generator = new FunctionalClientGenerator({
    validateRequests: true,
    validateResponses: true,
    fmtResult: false,
  });
  const output = await generator.generate(spec);

  // Should only have body, no headers
  expect(output).toContain("body: {");
  expect(output).toContain("message?: string");

  // Should not contain headers field when there are no headers
  const responseTypeMatch = output.match(/200: \{[\s\S]*?\}/);
  expect(responseTypeMatch).toBeTruthy();
  if (responseTypeMatch) {
    expect(responseTypeMatch[0]).not.toContain("headers:");
  }
});
