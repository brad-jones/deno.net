import { expect } from "@std/expect";
import { ClassicalClientGenerator, type OpenAPISpec } from "../src/mod.ts";

Deno.test("classical-client: generates and executes class-based client", async () => {
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "Classical Client Test API",
      version: "1.0.0",
    },
    paths: {
      "/ping": {
        get: {
          operationId: "getPing",
          summary: "Health check endpoint",
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      timestamp: { type: "number" },
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
          summary: "Get user by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "User found",
              content: {
                "application/json": {
                  schema: {
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
    },
  };

  const generator = new ClassicalClientGenerator();
  const clientCode = await generator.generate(spec);

  // Write to temp file for execution
  const timestamp = Date.now();
  const tempFile = `${import.meta.dirname}/tmp/generated-${timestamp}.ts`;
  await Deno.mkdir(`${import.meta.dirname}/tmp`, { recursive: true });
  await Deno.writeTextFile(tempFile, clientCode);

  // Import and test the generated client
  const exports = await import(tempFile);

  // Should export ApiClient class
  expect(exports.ApiClient).toBeDefined();

  // Mock fetch for testing
  const mockFetch = (url: string | URL, _init?: RequestInit) => {
    const urlStr = url.toString();

    if (urlStr.endsWith("/ping")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ status: "ok", timestamp: Date.now() }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }

    if (urlStr.includes("/users/")) {
      const userId = urlStr.split("/users/")[1];
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: userId, name: "Test User" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }

    return Promise.resolve(new Response("Not Found", { status: 404 }));
  };

  // Create client instance
  const client = new exports.ApiClient({
    baseUrl: "https://api.example.com",
    fetch: mockFetch,
  });

  // Test ping endpoint (no parameters)
  const pingResponse = await client["/ping"].get();
  expect(pingResponse.status).toBe(200);
  expect(pingResponse.body.status).toBe("ok");
  expect(pingResponse.body.timestamp).toBeDefined();

  // Test getUser endpoint (with path parameter)
  const userResponse = await client["/users/{id}"].get({
    path: { id: "123" },
  });
  expect(userResponse.status).toBe(200);
  expect(userResponse.body.id).toBe("123");
  expect(userResponse.body.name).toBe("Test User");
});
