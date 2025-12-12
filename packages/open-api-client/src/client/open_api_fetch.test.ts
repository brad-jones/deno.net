import type { StandardSchemaV1 } from "@standard-schema/spec";
import { expect } from "@std/expect";
import { openAPIFetch } from "./open_api_fetch.ts";

// Helper to create a mock Standard Schema for testing
function createMockSchema(
  shouldPass: boolean,
): StandardSchemaV1 {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value: unknown) => {
        if (shouldPass) {
          return { value };
        } else {
          return {
            issues: [
              {
                message: "Validation failed",
                path: ["body"],
              },
            ],
          };
        }
      },
    },
  };
}

Deno.test("openAPIFetch - Basic GET request", async () => {
  const mockFetch = (url: string) => {
    expect(url).toBe("https://api.example.com/ping");
    return Promise.resolve(
      new Response(JSON.stringify({ pong: "hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/ping",
      method: "get",
    },
  );

  expect(result.status).toBe(200);
  expect(result.body).toEqual({ pong: "hello" });
  expect(result.headers["content-type"]).toBe("application/json");
});

Deno.test("openAPIFetch - GET with path parameter", async () => {
  const mockFetch = (url: string) => {
    expect(url).toBe("https://api.example.com/users/123");
    return Promise.resolve(
      new Response(JSON.stringify({ id: "123", name: "John" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users/{id}",
      method: "get",
      parameters: [
        { name: "id", location: "path", style: "simple", explode: false },
      ],
    },
    { path: { id: "123" } },
  );

  expect(result.status).toBe(200);
  expect(result.body).toEqual({ id: "123", name: "John" });
});

Deno.test("openAPIFetch - GET with query parameters", async () => {
  const mockFetch = (url: string) => {
    expect(url).toBe("https://api.example.com/users?page=2&limit=10");
    return Promise.resolve(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users",
      method: "get",
      parameters: [
        { name: "page", location: "query", style: "form", explode: true },
        { name: "limit", location: "query", style: "form", explode: true },
      ],
    },
    { query: { page: 2, limit: 10 } },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - POST with body", async () => {
  const mockFetch = (url: string, init?: RequestInit) => {
    expect(url).toBe("https://api.example.com/users");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({ name: "John", email: "john@example.com" }),
    );
    const headers = init?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");

    return Promise.resolve(
      new Response(
        JSON.stringify({ id: "123", name: "John", email: "john@example.com" }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users",
      method: "post",
    },
    { body: { name: "John", email: "john@example.com" } },
  );

  expect(result.status).toBe(201);
  expect(result.body).toEqual({
    id: "123",
    name: "John",
    email: "john@example.com",
  });
});

Deno.test("openAPIFetch - Request with custom headers", async () => {
  const mockFetch = (_url: string, init?: RequestInit) => {
    const headers = init?.headers as Headers;
    expect(headers.get("X-API-Key")).toBe("secret123");
    expect(headers.get("Accept")).toBe("application/json");

    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/secure",
      method: "get",
      parameters: [
        {
          name: "X-API-Key",
          location: "header",
          style: "simple",
          explode: false,
        },
        {
          name: "Accept",
          location: "header",
          style: "simple",
          explode: false,
        },
      ],
    },
    { headers: { "X-API-Key": "secret123", "Accept": "application/json" } },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - Request with cookies", async () => {
  const mockFetch = (_url: string, init?: RequestInit) => {
    const headers = init?.headers as Headers;
    expect(headers.get("Cookie")).toBe("sessionId=abc123; userId=42");

    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/profile",
      method: "get",
      parameters: [
        {
          name: "sessionId",
          location: "cookie",
          style: "form",
          explode: false,
        },
        { name: "userId", location: "cookie", style: "form", explode: false },
      ],
    },
    { cookies: { sessionId: "abc123", userId: "42" } },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - Empty response body", async () => {
  const mockFetch = () => {
    return Promise.resolve(
      new Response(null, {
        status: 204,
        headers: {},
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/delete",
      method: "delete",
    },
  );

  expect(result.status).toBe(204);
  expect(result.body).toBe("");
});

Deno.test("openAPIFetch - Non-JSON response", async () => {
  const mockFetch = () => {
    return Promise.resolve(
      new Response("Plain text response", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/text",
      method: "get",
    },
  );

  expect(result.status).toBe(200);
  expect(result.body).toBe("Plain text response");
});

Deno.test("openAPIFetch - Invalid baseUrl throws error", async () => {
  await expect(openAPIFetch( // deno-lint-ignore no-explicit-any
    { baseUrl: "not-a-valid-url" } as any,
    { path: "/test", method: "get" },
  ))
    .rejects.toThrow();
});

Deno.test("openAPIFetch - URL object as baseUrl", async () => {
  const mockFetch = (url: string) => {
    expect(url).toBe("https://api.example.com/test");
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    {
      baseUrl: new URL("https://api.example.com"),
      fetch: mockFetch as typeof fetch,
    },
    {
      path: "/test",
      method: "get",
    },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - Config headers added", async () => {
  const mockFetch = (_url: string, init?: RequestInit) => {
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token123");

    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    {
      baseUrl: "https://api.example.com",
      fetch: mockFetch as typeof fetch,
      headers: { "Authorization": "Bearer token123" },
    },
    {
      path: "/data",
      method: "get",
    },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - Request headers override config headers", async () => {
  const mockFetch = (_url: string, init?: RequestInit) => {
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer override123");

    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    {
      baseUrl: "https://api.example.com",
      fetch: mockFetch as typeof fetch,
      headers: { "Authorization": "Bearer default123" },
    },
    {
      path: "/data",
      method: "get",
      parameters: [
        {
          name: "Authorization",
          location: "header",
          style: "simple",
          explode: false,
        },
      ],
    },
    { headers: { "Authorization": "Bearer override123" } },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - Raw response available", async () => {
  const mockFetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/test",
      method: "get",
    },
  );

  expect(result.raw).toBeInstanceOf(Response);
  expect(result.raw.status).toBe(200);
});

Deno.test("openAPIFetch - All parameter types together", async () => {
  const mockFetch = (url: string, init?: RequestInit) => {
    expect(url).toBe(
      "https://api.example.com/users/123?page=2&limit=10",
    );
    const headers = init?.headers as Headers;
    expect(headers.get("X-API-Key")).toBe("secret");
    expect(headers.get("Cookie")).toBe("sessionId=abc");

    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users/{id}",
      method: "get",
      parameters: [
        { name: "id", location: "path", style: "simple", explode: false },
        { name: "page", location: "query", style: "form", explode: true },
        { name: "limit", location: "query", style: "form", explode: true },
        {
          name: "X-API-Key",
          location: "header",
          style: "simple",
          explode: false,
        },
        {
          name: "sessionId",
          location: "cookie",
          style: "form",
          explode: false,
        },
      ],
    },
    {
      path: { id: "123" },
      query: { page: 2, limit: 10 },
      headers: { "X-API-Key": "secret" },
      cookies: { sessionId: "abc" },
    },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - PUT request", async () => {
  const mockFetch = (_url: string, init?: RequestInit) => {
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe(JSON.stringify({ name: "Updated" }));

    return Promise.resolve(
      new Response(JSON.stringify({ name: "Updated" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users/123",
      method: "put",
    },
    { body: { name: "Updated" } },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - DELETE request", async () => {
  const mockFetch = (_url: string, init?: RequestInit) => {
    expect(init?.method).toBe("DELETE");

    return Promise.resolve(
      new Response(null, {
        status: 204,
        headers: {},
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users/123",
      method: "delete",
    },
  );

  expect(result.status).toBe(204);
});

Deno.test("openAPIFetch - PATCH request", async () => {
  const mockFetch = (_url: string, init?: RequestInit) => {
    expect(init?.method).toBe("PATCH");

    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users/123",
      method: "patch",
    },
    { body: { email: "new@example.com" } },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - Request validation success", async () => {
  const mockFetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users",
      method: "post",
      requestSchema: createMockSchema(true),
    },
    { body: { name: "John", email: "john@example.com" } },
  );

  expect(result.status).toBe(200);
});

Deno.test("openAPIFetch - Request validation failure", async () => {
  const mockFetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  try {
    await openAPIFetch(
      { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
      {
        path: "/users",
        method: "post",
        requestSchema: createMockSchema(false),
      },
      { body: { name: "John" } },
    );
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    expect((error as Error).message).toContain("Request validation failed");
  }
});

Deno.test("openAPIFetch - Response validation success", async () => {
  const mockFetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({ id: "123", name: "John" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users/123",
      method: "get",
      responseSchema: {
        200: createMockSchema(true),
      },
    },
  );

  expect(result.status).toBe(200);
  expect(result.body).toEqual({ id: "123", name: "John" });
});

Deno.test("openAPIFetch - Response validation failure", async () => {
  const mockFetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({ invalid: "data" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  try {
    await openAPIFetch(
      { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
      {
        path: "/users/123",
        method: "get",
        responseSchema: {
          200: createMockSchema(false),
        },
      },
    );
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    expect((error as Error).message).toContain("Response validation failed");
  }
});

Deno.test("openAPIFetch - Response validation with default schema", async () => {
  const mockFetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const result = await openAPIFetch(
    { baseUrl: "https://api.example.com", fetch: mockFetch as typeof fetch },
    {
      path: "/users/999",
      method: "get",
      responseSchema: {
        200: createMockSchema(true),
        default: createMockSchema(true),
      },
    },
  );

  expect(result.status).toBe(404);
});

Deno.test("openAPIFetch - Uses globalThis.fetch when no custom fetch", async () => {
  // Save original fetch
  const originalFetch = globalThis.fetch;

  // Mock globalThis.fetch
  let fetchCalled = false;
  globalThis.fetch = (() => {
    fetchCalled = true;
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as typeof fetch;

  try {
    const result = await openAPIFetch(
      { baseUrl: "https://api.example.com" },
      {
        path: "/test",
        method: "get",
      },
    );

    expect(fetchCalled).toBe(true);
    expect(result.status).toBe(200);
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  }
});
