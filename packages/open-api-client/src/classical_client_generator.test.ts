import { expect } from "@std/expect";
import { ClassicalClientGenerator } from "./classical_client_generator.ts";
import type { OpenAPISpec } from "./types/mod.ts";

Deno.test("ClassicalClientGenerator - generates basic client class", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          summary: "Get all users",
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "array" as const,
                    items: { type: "string" as const },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("export class ApiClient");
  expect(result).toContain('readonly "/users"');
  expect(result).toContain("get:");
  expect(result).toContain("openAPIFetch");
  expect(result).toContain("Get all users");
});

Deno.test("ClassicalClientGenerator - includes import statements", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("import {");
  expect(result).toContain("openAPIFetch");
  expect(result).toContain("OpenAPIClientConfig");
  expect(result).toContain("OpenAPIResponses");
  expect(result).toContain("@brad-jones/open-api-client");
});

Deno.test("ClassicalClientGenerator - includes Zod import when validation enabled", async () => {
  const generator = new ClassicalClientGenerator({
    validateRequests: true,
    fmtResult: false,
  });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("import { z } from");
});

Deno.test("ClassicalClientGenerator - does not include Zod import when validation disabled", async () => {
  const generator = new ClassicalClientGenerator({
    validateRequests: false,
    validateResponses: false,
    fmtResult: false,
  });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).not.toContain("import { z }");
});

Deno.test("ClassicalClientGenerator - uses custom import specifiers", async () => {
  const generator = new ClassicalClientGenerator({
    importSpecifiers: {
      zod: "my-custom-zod",
      client: "my-custom-client",
    },
    validateRequests: true,
    fmtResult: false,
  });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain('import { z } from "my-custom-zod"');
  expect(result).toContain('from "my-custom-client"');
});

Deno.test("ClassicalClientGenerator - generates multiple HTTP methods", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          responses: { "200": { description: "Success" } },
        },
        post: {
          responses: { "201": { description: "Created" } },
        },
        put: {
          responses: { "200": { description: "Updated" } },
        },
        delete: {
          responses: { "204": { description: "Deleted" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("get:");
  expect(result).toContain("post:");
  expect(result).toContain("put:");
  expect(result).toContain("delete:");
});

Deno.test("ClassicalClientGenerator - orders methods in standard HTTP order", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        delete: {
          responses: { "204": { description: "Deleted" } },
        },
        get: {
          responses: { "200": { description: "Success" } },
        },
        post: {
          responses: { "201": { description: "Created" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  const getIndex = result.indexOf("get:");
  const postIndex = result.indexOf("post:");
  const deleteIndex = result.indexOf("delete:");

  // Verify GET comes before POST comes before DELETE
  expect(getIndex).toBeLessThan(postIndex);
  expect(postIndex).toBeLessThan(deleteIndex);
});

Deno.test("ClassicalClientGenerator - generates path-based structure", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          responses: { "200": { description: "Success" } },
        },
      },
      "/posts": {
        get: {
          responses: { "200": { description: "Success" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain('readonly "/users"');
  expect(result).toContain('readonly "/posts"');
});

Deno.test("ClassicalClientGenerator - sorts paths alphabetically", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/zebra": {
        get: { responses: { "200": { description: "Success" } } },
      },
      "/alpha": {
        get: { responses: { "200": { description: "Success" } } },
      },
      "/beta": {
        get: { responses: { "200": { description: "Success" } } },
      },
    },
  };

  const result = await generator.generate(spec);

  const alphaIndex = result.indexOf('readonly "/alpha"');
  const betaIndex = result.indexOf('readonly "/beta"');
  const zebraIndex = result.indexOf('readonly "/zebra"');

  expect(alphaIndex).toBeLessThan(betaIndex);
  expect(betaIndex).toBeLessThan(zebraIndex);
});

Deno.test("ClassicalClientGenerator - generates method with path parameters", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users/{id}": {
        get: {
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" as const },
            },
          ],
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: { type: "object" as const },
                },
              },
            },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("request:");
  expect(result).toContain("path:");
  expect(result).toContain("id");
});

Deno.test("ClassicalClientGenerator - generates method with query parameters", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          parameters: [
            {
              name: "filter",
              in: "query",
              required: false,
              schema: { type: "string" as const },
            },
          ],
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("query");
  expect(result).toContain("filter");
});

Deno.test("ClassicalClientGenerator - generates method with request body", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        post: {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    name: { type: "string" as const },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Created" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("body:");
  expect(result).toContain("name");
});

Deno.test("ClassicalClientGenerator - generates response types", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object" as const,
                    properties: {
                      id: { type: "string" as const },
                      name: { type: "string" as const },
                    },
                  },
                },
              },
            },
            "404": {
              description: "Not found",
            },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("OpenAPIResponses");
  expect(result).toContain("200");
  expect(result).toContain("404");
});

Deno.test("ClassicalClientGenerator - includes component schemas", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    components: {
      schemas: {
        User: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const },
            name: { type: "string" as const },
          },
        },
      },
    },
    paths: {
      "/users": {
        get: {
          responses: {
            "200": {
              description: "Success",
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

  const result = await generator.generate(spec);

  expect(result).toContain("export type User");
  expect(result).toContain("id");
  expect(result).toContain("name");
});

Deno.test("ClassicalClientGenerator - generates Zod schemas for component schemas when validation enabled", async () => {
  const generator = new ClassicalClientGenerator({
    validateRequests: true,
    fmtResult: false,
  });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    components: {
      schemas: {
        User: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
          },
        },
      },
    },
    paths: {
      "/users": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("export const UserSchema");
  expect(result).toContain("z.ZodType<User>");
});

Deno.test("ClassicalClientGenerator - generates constructor with config parameter", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("constructor");
  expect(result).toContain("OpenAPIClientConfig");
  expect(result).toContain("private readonly config");
});

Deno.test("ClassicalClientGenerator - generates class JSDoc", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("/**");
  expect(result).toContain("API Client class");
  expect(result).toContain("path-based access");
});

Deno.test("ClassicalClientGenerator - handles operations without parameters", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": { description: "OK" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("get: ()");
  expect(result).toContain("Promise<OpenAPIResponses");
});

Deno.test("ClassicalClientGenerator - handles all supported HTTP methods", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/resource": {
        get: { responses: { "200": { description: "OK" } } },
        post: { responses: { "201": { description: "Created" } } },
        put: { responses: { "200": { description: "Updated" } } },
        patch: { responses: { "200": { description: "Patched" } } },
        delete: { responses: { "204": { description: "Deleted" } } },
        head: { responses: { "200": { description: "OK" } } },
        options: { responses: { "200": { description: "OK" } } },
        trace: { responses: { "200": { description: "OK" } } },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("get:");
  expect(result).toContain("post:");
  expect(result).toContain("put:");
  expect(result).toContain("patch:");
  expect(result).toContain("delete:");
  expect(result).toContain("head:");
  expect(result).toContain("options:");
  expect(result).toContain("trace:");
});

Deno.test("ClassicalClientGenerator - passes this.config to openAPIFetch", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("openAPIFetch(");
  expect(result).toContain("this.config");
});

Deno.test("ClassicalClientGenerator - includes auto-generated comment", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("// This file was auto-generated");
  expect(result).toContain("@brad-jones/open-api-client");
});

Deno.test("ClassicalClientGenerator - includes deno-lint-ignore comment", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("// deno-lint-ignore-file no-explicit-any");
});

Deno.test("ClassicalClientGenerator - generates valid TypeScript when formatted", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: true });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users/{id}": {
        get: {
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" as const },
            },
          ],
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object" as const,
                    properties: {
                      name: { type: "string" as const },
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

  const result = await generator.generate(spec);

  // Basic structure checks - formatted code should still have these
  expect(result).toContain("export class ApiClient");
  expect(result).toContain('readonly "/users/{id}"');
  expect(result).toContain("get:");
});

Deno.test("ClassicalClientGenerator - includes request parameter when method has request", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users/{id}": {
        get: {
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" as const },
            },
          ],
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  // Should pass 'request' to openAPIFetch
  expect(result).toContain("request");
  expect(result).toContain("openAPIFetch(");
});

Deno.test("ClassicalClientGenerator - handles empty paths object", async () => {
  const generator = new ClassicalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const result = await generator.generate(spec);

  expect(result).toContain("export class ApiClient");
  expect(result).toContain("constructor");
});
