import { expect } from "@std/expect";
import { FunctionalClientGenerator, type OpenAPISpec } from "../src/mod.ts";

Deno.test("edge-cases: empty paths object", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.1.1",
    info: { title: "Empty", version: "1.0.0" },
    paths: {},
  };

  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(spec);

  // Verify new API pattern (no global config)
  expect(generatedCode).toContain("export function createClient");
  expect(generatedCode).not.toContain("setGlobalConfig");
  // Should not have any operation functions
});

Deno.test("edge-cases: all HTTP methods", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.1.1",
    info: { title: "AllMethods", version: "1.0.0" },
    paths: {
      "/resource": {
        get: { responses: { "200": { description: "OK" } } },
        post: { responses: { "201": { description: "Created" } } },
        put: { responses: { "200": { description: "OK" } } },
        patch: { responses: { "200": { description: "OK" } } },
        delete: { responses: { "204": { description: "No Content" } } },
        head: { responses: { "200": { description: "OK" } } },
        options: { responses: { "200": { description: "OK" } } },
      },
    },
  };

  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(spec);

  expect(generatedCode).toContain("export const getResource");
  expect(generatedCode).toContain("export const postResource");
  expect(generatedCode).toContain("export const putResource");
  expect(generatedCode).toContain("export const patchResource");
  expect(generatedCode).toContain("export const deleteResource");
  expect(generatedCode).toContain("export const headResource");
  expect(generatedCode).toContain("export const optionsResource");
});

Deno.test("edge-cases: deeply nested object types", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.1.1",
    info: { title: "Nested", version: "1.0.0" },
    paths: {
      "/data": {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    level1: {
                      type: "object",
                      properties: {
                        level2: {
                          type: "object",
                          properties: {
                            level3: {
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
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };

  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(spec);

  expect(generatedCode).toContain("level1");
  expect(generatedCode).toContain("level2");
  expect(generatedCode).toContain("level3");
});

Deno.test("edge-cases: response with no content", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.1.1",
    info: { title: "NoContent", version: "1.0.0" },
    paths: {
      "/action": {
        post: {
          responses: {
            "204": {
              description: "No Content",
            },
          },
        },
      },
    },
  };

  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(spec);

  expect(generatedCode).toContain("export const postAction");
  // Should handle missing content gracefully
});

Deno.test("edge-cases: complex refs and components", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.1.1",
    info: { title: "Refs", version: "1.0.0" },
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/users": {
        get: {
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(spec);

  expect(generatedCode).toContain("export const getUsers");
  // Should generate standalone User type definition
  expect(generatedCode).toContain("export type User");
  expect(generatedCode).toContain("id");
  expect(generatedCode).toContain("name");
  // Should reference User type in response, not inline it
  expect(generatedCode).toMatch(/body:\s*User\[\]/);
});

Deno.test("edge-cases: component schemas with nested references", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.1.1",
    info: { title: "NestedRefs", version: "1.0.0" },
    components: {
      schemas: {
        Address: {
          type: "object",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            address: { $ref: "#/components/schemas/Address" },
          },
        },
      },
    },
    paths: {
      "/users": {
        get: {
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
      },
    },
  };

  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(spec);

  // Should generate both types as exports
  expect(generatedCode).toContain("export type Address");
  expect(generatedCode).toContain("export type User");
  expect(generatedCode).toContain("street");
  expect(generatedCode).toContain("city");
  // Note: In operations, refs are inlined for simplicity, but component schemas are still exported
});
