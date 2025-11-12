import { DenoBundler } from "@brad-jones/deno-net-bundler";
import { encodeHex } from "@std/encoding";
import { expect } from "@std/expect";
import { dirname } from "@std/path/dirname";
import { FunctionalClientGenerator, type OpenAPISpec } from "../src/mod.ts";

/**
 * Test OpenAPI spec with multiple operations to verify tree-shaking
 */
const multiOperationSpec: OpenAPISpec = {
  openapi: "3.0.0",
  info: {
    title: "Tree Shaking Test API",
    version: "1.0.0",
  },
  paths: {
    "/users": {
      get: {
        operationId: "listUsers",
        summary: "List all users",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "createUser",
        summary: "Create a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/{id}": {
      get: {
        operationId: "getUser",
        summary: "Get a user by ID",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" },
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
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        operationId: "updateUser",
        summary: "Update a user",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        operationId: "deleteUser",
        summary: "Delete a user",
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": {
            description: "No Content",
          },
        },
      },
    },
    "/products": {
      get: {
        operationId: "listProducts",
        summary: "List all products",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      price: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/orders": {
      get: {
        operationId: "listOrders",
        summary: "List all orders",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      userId: { type: "string" },
                      total: { type: "number" },
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

Deno.test("tree-shaking: createCustomClient with single operation excludes others", async () => {
  // Generate client code
  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(multiOperationSpec);

  // Verify all operations are present in generated code
  expect(generatedCode).toContain("export const listUsers");
  expect(generatedCode).toContain("export const createUser");
  expect(generatedCode).toContain("export const getUser");
  expect(generatedCode).toContain("export const updateUser");
  expect(generatedCode).toContain("export const deleteUser");
  expect(generatedCode).toContain("export const listProducts");
  expect(generatedCode).toContain("export const listOrders");

  // Write generated client to temp file
  const hash = encodeHex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(generatedCode + "client"),
    ),
  );
  const clientFile = `${import.meta.dirname}/tmp/tree-shaking-client-${hash}.ts`;
  await Deno.mkdir(dirname(clientFile), { recursive: true });
  await Deno.writeTextFile(clientFile, generatedCode);

  // Create a consumer file that only imports and uses a single operation
  const consumerCode = `
import { createCustomClient, getUser } from "${clientFile}";

const config = {
  baseUrl: "https://api.example.com",
};

// Create custom client with only getUser operation
const client = createCustomClient(config, {
  getUser,
});

// Export for verification
export const myClient = client;
export type MyClientType = typeof client;
`;

  const consumerFile = `${import.meta.dirname}/tmp/tree-shaking-consumer-${hash}.ts`;
  await Deno.writeTextFile(consumerFile, consumerCode);

  // Bundle the consumer file
  const denoBundler = new DenoBundler();
  const bundle = await denoBundler.fromFile(consumerFile);

  // Verify the bundle contains the used operation
  expect(bundle.srcCode).toContain("getUser");

  // With createCustomClient, unused operations should be tree-shaken
  expect(bundle.srcCode).not.toContain("listUsers");
  expect(bundle.srcCode).not.toContain("createUser");
  expect(bundle.srcCode).not.toContain("updateUser");
  expect(bundle.srcCode).not.toContain("deleteUser");
  expect(bundle.srcCode).not.toContain("listProducts");
  expect(bundle.srcCode).not.toContain("listOrders");

  // Verify createCustomClient is included (as it's imported and used)
  expect(bundle.srcCode).toContain("createCustomClient");

  // Note: createClient will also be included since createCustomClient calls it internally,
  // but that's a small price to pay for the convenience wrapper
});

Deno.test("tree-shaking: createCustomClient with multiple operations excludes unused", async () => {
  // Generate client code
  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(multiOperationSpec);

  // Write generated client to temp file
  const hash = encodeHex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(generatedCode + "multi"),
    ),
  );
  const clientFile = `${import.meta.dirname}/tmp/tree-shaking-multi-${hash}.ts`;
  await Deno.mkdir(dirname(clientFile), { recursive: true });
  await Deno.writeTextFile(clientFile, generatedCode);

  // Create a consumer file that imports multiple but not all operations
  const consumerCode = `
import { createCustomClient, getUser, updateUser } from "${clientFile}";

const config = {
  baseUrl: "https://api.example.com",
};

// Create custom client with only selected operations
const client = createCustomClient(config, {
  getUser,
  updateUser,
});

export const myClient = client;
`;

  const consumerFile = `${import.meta.dirname}/tmp/tree-shaking-multi-consumer-${hash}.ts`;
  await Deno.writeTextFile(consumerFile, consumerCode);

  // Bundle the consumer file
  const denoBundler = new DenoBundler();
  const bundle = await denoBundler.fromFile(consumerFile);

  // Verify the bundle contains the used operations
  expect(bundle.srcCode).toContain("getUser");
  expect(bundle.srcCode).toContain("updateUser");

  // With createCustomClient, unused operations should be tree-shaken
  expect(bundle.srcCode).not.toContain("listUsers");
  expect(bundle.srcCode).not.toContain("createUser");
  expect(bundle.srcCode).not.toContain("deleteUser");
  expect(bundle.srcCode).not.toContain("listProducts");
  expect(bundle.srcCode).not.toContain("listOrders");
});

Deno.test("tree-shaking: createClient with all operations includes everything", async () => {
  // Generate client code
  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(multiOperationSpec);

  // Write generated client to temp file
  const hash = encodeHex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(generatedCode + "all"),
    ),
  );
  const clientFile = `${import.meta.dirname}/tmp/tree-shaking-all-${hash}.ts`;
  await Deno.mkdir(dirname(clientFile), { recursive: true });
  await Deno.writeTextFile(clientFile, generatedCode);

  // Create a consumer file that uses createClient with no operations (all operations)
  const consumerCode = `
import { createClient } from "${clientFile}";

const config = {
  baseUrl: "https://api.example.com",
};

// Create client with all operations (default behavior)
const client = createClient(config);

export const myClient = client;
`;

  const consumerFile = `${import.meta.dirname}/tmp/tree-shaking-all-consumer-${hash}.ts`;
  await Deno.writeTextFile(consumerFile, consumerCode);

  // Bundle the consumer file
  const denoBundler = new DenoBundler();
  const bundle = await denoBundler.fromFile(consumerFile);

  // Verify the bundle contains ALL operations
  // When using createClient() without specifying operations, all should be included
  expect(bundle.srcCode).toContain("listUsers");
  expect(bundle.srcCode).toContain("createUser");
  expect(bundle.srcCode).toContain("getUser");
  expect(bundle.srcCode).toContain("updateUser");
  expect(bundle.srcCode).toContain("deleteUser");
  expect(bundle.srcCode).toContain("listProducts");
  expect(bundle.srcCode).toContain("listOrders");
});

Deno.test("tree-shaking: direct operation call without createClient", async () => {
  // Generate client code
  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(multiOperationSpec);

  // Write generated client to temp file
  const hash = encodeHex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(generatedCode + "direct"),
    ),
  );
  const clientFile = `${import.meta.dirname}/tmp/tree-shaking-direct-${hash}.ts`;
  await Deno.mkdir(dirname(clientFile), { recursive: true });
  await Deno.writeTextFile(clientFile, generatedCode);

  // Create a consumer file that calls operation directly without createClient
  const consumerCode = `
import { getUser } from "${clientFile}";

const config = {
  baseUrl: "https://api.example.com",
};

// Call operation directly
export async function fetchUser(id: string) {
  return await getUser(config, { path: { id } });
}
`;

  const consumerFile = `${import.meta.dirname}/tmp/tree-shaking-direct-consumer-${hash}.ts`;
  await Deno.writeTextFile(consumerFile, consumerCode);

  // Bundle the consumer file
  const denoBundler = new DenoBundler();
  const bundle = await denoBundler.fromFile(consumerFile);

  // Verify the bundle contains the used operation
  expect(bundle.srcCode).toContain("getUser");

  // Verify the bundle does NOT contain createClient (not imported)
  expect(bundle.srcCode).not.toContain("createClient");

  // Verify the bundle does NOT contain unused operations
  expect(bundle.srcCode).not.toContain("listUsers");
  expect(bundle.srcCode).not.toContain("createUser");
  expect(bundle.srcCode).not.toContain("updateUser");
  expect(bundle.srcCode).not.toContain("deleteUser");
  expect(bundle.srcCode).not.toContain("listProducts");
  expect(bundle.srcCode).not.toContain("listOrders");
});

Deno.test("tree-shaking: verify openAPIFetch is included when needed", async () => {
  // Generate client code
  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generate(multiOperationSpec);

  // Write generated client to temp file
  const hash = encodeHex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(generatedCode + "openAPIFetch"),
    ),
  );
  const clientFile = `${import.meta.dirname}/tmp/tree-shaking-openapi-${hash}.ts`;
  await Deno.mkdir(dirname(clientFile), { recursive: true });
  await Deno.writeTextFile(clientFile, generatedCode);

  // Create a consumer file that uses a single operation
  const consumerCode = `
import { getUser } from "${clientFile}";

const config = {
  baseUrl: "https://api.example.com",
};

export async function fetchUser(id: string) {
  return await getUser(config, { path: { id } });
}
`;

  const consumerFile = `${import.meta.dirname}/tmp/tree-shaking-openapi-consumer-${hash}.ts`;
  await Deno.writeTextFile(consumerFile, consumerCode);

  // Bundle the consumer file
  const denoBundler = new DenoBundler();
  const bundle = await denoBundler.fromFile(consumerFile);

  // Verify the bundle contains openAPIFetch (it's used by all operations)
  expect(bundle.srcCode).toContain("openAPIFetch");

  // Verify the operation function is present
  expect(bundle.srcCode).toContain("getUser");
});
