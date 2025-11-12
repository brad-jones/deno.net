import { expect } from "@std/expect";
import { FunctionalClientGenerator } from "./functional_client_generator.ts";
import type { OpenAPISpec } from "./types/mod.ts";

Deno.test("FunctionalClientGenerator - generates basic functional client", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

  expect(result).toContain("export const getUsers");
  expect(result).toContain("openAPIFetch");
  expect(result).toContain("Get all users");
  expect(result).toContain("export function createClient");
});

Deno.test("FunctionalClientGenerator - includes import statements", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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
  expect(result).toContain("createCustomClient");
  expect(result).toContain("OpenAPIClientConfig");
  expect(result).toContain("OpenAPIResponses");
  expect(result).toContain("@brad-jones/open-api-client");
});

Deno.test("FunctionalClientGenerator - includes Zod import when validation enabled", async () => {
  const generator = new FunctionalClientGenerator({
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

Deno.test("FunctionalClientGenerator - does not include Zod import when validation disabled", async () => {
  const generator = new FunctionalClientGenerator({
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

Deno.test("FunctionalClientGenerator - uses custom import specifiers", async () => {
  const generator = new FunctionalClientGenerator({
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

Deno.test("FunctionalClientGenerator - generates functions for multiple HTTP methods", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

  expect(result).toContain("export const getUsers");
  expect(result).toContain("export const postUsers");
  expect(result).toContain("export const putUsers");
  expect(result).toContain("export const deleteUsers");
});

Deno.test("FunctionalClientGenerator - uses operationId when available", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users/{id}": {
        get: {
          operationId: "getUserById",
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

  expect(result).toContain("export const getUserById");
});

Deno.test("FunctionalClientGenerator - generates camelCase operation names from path and method", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/user-profiles": {
        get: {
          responses: { "200": { description: "Success" } },
        },
      },
      "/admin/settings": {
        post: {
          responses: { "201": { description: "Created" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("export const getUserProfiles");
  expect(result).toContain("export const postAdminSettings");
});

Deno.test("FunctionalClientGenerator - generates operation name from path with parameters", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users/{userId}/posts/{postId}": {
        get: {
          parameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              schema: { type: "string" as const },
            },
            {
              name: "postId",
              in: "path",
              required: true,
              schema: { type: "string" as const },
            },
          ],
          responses: { "200": { description: "Success" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  // The camelCase function will convert this - check for the actual output
  expect(result).toContain("export const getUsersUseridPostsPostid");
});

Deno.test("FunctionalClientGenerator - generates createClient function", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          responses: { "200": { description: "Success" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("export function createClient");
  expect(result).toContain("OpenAPIClientConfig");
  expect(result).toContain("createCustomClient");
  expect(result).toContain("getUsers");
});

Deno.test("FunctionalClientGenerator - createClient function includes all operations", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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
      },
      "/posts": {
        get: {
          responses: { "200": { description: "Success" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("getUsers");
  expect(result).toContain("postUsers");
  expect(result).toContain("getPosts");
  // Check they're in the createClient call
  expect(result).toMatch(
    /createCustomClient\(config,\s*\{[^}]*getUsers[^}]*\}/,
  );
});

Deno.test("FunctionalClientGenerator - exports createCustomClient", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          responses: { "200": { description: "Success" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("export { createCustomClient }");
});

Deno.test("FunctionalClientGenerator - generates function with config parameter", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
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

  expect(result).toContain("config: OpenAPIClientConfig");
});

Deno.test("FunctionalClientGenerator - generates function with path parameters", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

Deno.test("FunctionalClientGenerator - generates function with query parameters", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

Deno.test("FunctionalClientGenerator - generates function with request body", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

Deno.test("FunctionalClientGenerator - generates response types", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

Deno.test("FunctionalClientGenerator - includes component schemas", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

Deno.test("FunctionalClientGenerator - generates Zod schemas for component schemas when validation enabled", async () => {
  const generator = new FunctionalClientGenerator({
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

Deno.test("FunctionalClientGenerator - handles operations without parameters", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

  expect(result).toContain("export const getHealth");
  expect(result).toContain("config: OpenAPIClientConfig");
  expect(result).toContain("Promise<OpenAPIResponses");
});

Deno.test("FunctionalClientGenerator - handles all supported HTTP methods", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

  expect(result).toContain("export const getResource");
  expect(result).toContain("export const postResource");
  expect(result).toContain("export const putResource");
  expect(result).toContain("export const patchResource");
  expect(result).toContain("export const deleteResource");
  expect(result).toContain("export const headResource");
  expect(result).toContain("export const optionsResource");
  expect(result).toContain("export const traceResource");
});

Deno.test("FunctionalClientGenerator - passes config to openAPIFetch", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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
  expect(result).toContain("config");
});

Deno.test("FunctionalClientGenerator - includes auto-generated comment", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

Deno.test("FunctionalClientGenerator - includes deno-lint-ignore comment", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

Deno.test("FunctionalClientGenerator - generates JSDoc for operations", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          summary: "Get all users",
          description: "Retrieves a list of all users in the system",
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("Get all users");
  expect(result).toContain("Retrieves a list of all users");
});

Deno.test("FunctionalClientGenerator - generates valid TypeScript when formatted", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: true });
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
  expect(result).toContain("export const getUsersId");
  expect(result).toContain("export function createClient");
});

Deno.test("FunctionalClientGenerator - includes request parameter when operation has request", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

Deno.test("FunctionalClientGenerator - handles empty paths object", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const result = await generator.generate(spec);

  expect(result).toContain("export function createClient");
  expect(result).toContain("createCustomClient");
});

Deno.test("FunctionalClientGenerator - creates JSDoc with tree-shaking hint", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
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

  expect(result).toContain("tree-shaking");
  expect(result).toContain("createCustomClient");
});

Deno.test("FunctionalClientGenerator - handles special characters in paths", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/api/v1/user-profiles/{id}": {
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

  // Should convert to valid camelCase function name
  expect(result).toContain("export const getApiV1UserProfilesId");
});

Deno.test("FunctionalClientGenerator - generates multiple operations for same path", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "listUsers",
          responses: { "200": { description: "Success" } },
        },
        post: {
          operationId: "createUser",
          responses: { "201": { description: "Created" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  expect(result).toContain("export const listUsers");
  expect(result).toContain("export const createUser");
});

Deno.test("FunctionalClientGenerator - handles operationId with special characters", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "get-user-list",
          responses: { "200": { description: "Success" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  // Should convert to camelCase
  expect(result).toContain("export const getUserList");
});

Deno.test("FunctionalClientGenerator - handles snake_case operationId", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "get_user_list",
          responses: { "200": { description: "Success" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  // Should convert to camelCase
  expect(result).toContain("export const getUserList");
});

Deno.test("FunctionalClientGenerator - handles PascalCase operationId", async () => {
  const generator = new FunctionalClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "GetUserList",
          responses: { "200": { description: "Success" } },
        },
      },
    },
  };

  const result = await generator.generate(spec);

  // Should convert to camelCase
  expect(result).toContain("export const getUserList");
});
