import { expect } from "@std/expect";
import { FunctionalClientGenerator, type OpenAPISpec } from "../src/mod.ts";

Deno.test("FunctionalClientGenerator - infer parameter schema from example", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "Parameter Inference Test",
      version: "1.0.0",
    },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          summary: "Get users with parameter examples",
          parameters: [
            {
              name: "limit",
              in: "query",
              description: "Maximum number of users to return",
              example: 10,
              // No schema provided - should infer integer from example
            },
            {
              name: "status",
              in: "query",
              description: "Filter by status",
              examples: {
                active: {
                  value: "active",
                },
                inactive: {
                  value: "inactive",
                },
              },
              // No schema provided - should infer string from examples
            },
            {
              name: "verified",
              in: "query",
              description: "Filter by verification status",
              example: true,
              // No schema provided - should infer boolean from example
            },
          ],
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  // Response with example but no schema
                  example: {
                    users: [
                      {
                        id: 1,
                        name: "John Doe",
                        verified: true,
                      },
                    ],
                    total: 1,
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

  // Check that integer parameter type was inferred
  expect(output).toContain("limit?: number");

  // Check that string parameter type was inferred
  expect(output).toContain("status?: string");

  // Check that boolean parameter type was inferred
  expect(output).toContain("verified?: boolean");

  // Check that response schema was inferred from example
  expect(output).toContain("users: {");
  expect(output).toContain("id: number");
  expect(output).toContain("name: string");
  expect(output).toContain("verified: boolean");
  expect(output).toContain("total: number");

  // Check Zod schemas were also generated correctly
  expect(output).toContain("limit: z.number().int().optional()");
  expect(output).toContain("status: z.string().optional()");
  expect(output).toContain("verified: z.boolean().optional()");

  // Check Zod response schema
  expect(output).toContain("z.object({");
  expect(output).toContain("users: z.array(z.object({");
  expect(output).toContain("id: z.number().int()");
  expect(output).toContain("name: z.string()");
  expect(output).toContain("total: z.number().int()");
});

Deno.test("FunctionalClientGenerator - prefer explicit schema over example", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "Schema Priority Test",
      version: "1.0.0",
    },
    paths: {
      "/items/{id}": {
        get: {
          operationId: "getItem",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
              example: 123, // Should be ignored - schema takes precedence
            },
          ],
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                      },
                    },
                  },
                  example: {
                    id: 999, // Should be ignored - schema exists
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

  // Should use the schema type (string), not the example type (number)
  expect(output).toContain("id: string");
  expect(output).toContain("id: z.string()");

  // Should not contain number types inferred from examples
  expect(output).not.toContain("id: number");
  expect(output).not.toContain("id: z.number()");
});
