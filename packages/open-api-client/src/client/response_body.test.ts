import { expect } from "@std/expect";
import { z } from "@zod/zod";
import type { OpenAPIRequestMetadata } from "../types/mod.ts";
import { openAPIFetch } from "./open_api_fetch.ts";
import { ResponseError } from "./response_error.ts";

let originalFetch: typeof globalThis.fetch;

function setupFetchMock(fetchMock: typeof fetch) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test("body() should return body when status matches expected status", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ message: "Hello, World!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/hello/{name}",
    responseSchema: {
      200: z.object({
        body: z.object({
          message: z.string(),
        }),
      }),
      400: z.object({
        body: z.object({
          error: z.string(),
        }),
      }),
    },
  };

  const bodyData = await openAPIFetch(config, metadata, {
    path: { name: "Brad" },
  }).body(200);

  expect(bodyData).toEqual({ message: "Hello, World!" });
  restoreFetch();
});

Deno.test("body() should return body for default response when status is 'default'", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ fooBar: "unexpected" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/hello/{name}",
    responseSchema: {
      200: z.object({
        body: z.object({
          message: z.string(),
        }),
      }),
      "default": z.object({
        body: z.object({
          fooBar: z.string(),
        }),
      }),
    },
  };

  const bodyData = await openAPIFetch(config, metadata, {
    path: { name: "Brad" },
  }).body("default");

  expect(bodyData).toEqual({ fooBar: "unexpected" });
  restoreFetch();
});

Deno.test("body() should default to 200 when no status code is provided and 200 is defined", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ message: "Hello!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/hello/{name}",
    responseSchema: {
      200: z.object({
        body: z.object({
          message: z.string(),
        }),
      }),
      400: z.object({
        body: z.object({
          error: z.string(),
        }),
      }),
    },
  };

  const bodyData = await openAPIFetch(config, metadata, {
    path: { name: "Brad" },
  }).body();

  expect(bodyData).toEqual({ message: "Hello!" });
  restoreFetch();
});

Deno.test("body() should default to 'default' when 200 is not defined but default is", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ fooBar: "value" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/hello/{name}",
    responseSchema: {
      400: z.object({
        body: z.object({
          error: z.string(),
        }),
      }),
      "default": z.object({
        body: z.object({
          fooBar: z.string(),
        }),
      }),
    },
  };

  const bodyData = await openAPIFetch(config, metadata, {
    path: { name: "Brad" },
  }).body();

  expect(bodyData).toEqual({ fooBar: "value" });
  restoreFetch();
});

Deno.test("body() should default to first defined status when neither 200 nor default are defined", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ created: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "post",
    path: "/users",
    responseSchema: {
      201: z.object({
        body: z.object({
          created: z.boolean(),
        }),
      }),
      400: z.object({
        body: z.object({
          error: z.string(),
        }),
      }),
    },
  };

  const bodyData = await openAPIFetch(config, metadata).body();

  expect(bodyData).toEqual({ created: true });
  restoreFetch();
});

Deno.test("body() should assume 200 when no response schema is defined", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ data: "test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/test",
  };

  const bodyData = await openAPIFetch(config, metadata).body();

  expect(bodyData).toEqual({ data: "test" });
  restoreFetch();
});

Deno.test("body() should throw ResponseError when status doesn't match expected", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/hello/{name}",
    responseSchema: {
      200: z.object({
        body: z.object({
          message: z.string(),
        }),
      }),
      404: z.object({
        body: z.object({
          error: z.string(),
        }),
      }),
    },
  };

  let error: ResponseError | undefined;
  try {
    await openAPIFetch(config, metadata, {
      path: { name: "Brad" },
    }).body(200);
  } catch (e) {
    error = e as ResponseError;
  }

  expect(error).toBeInstanceOf(ResponseError);
  expect(error?.message).toBe("Expected response status 200 but received 404");
  expect(error?.response).toBeInstanceOf(Response);
  expect(error?.response.status).toBe(404);
  restoreFetch();
});

Deno.test("body() should throw ResponseError when expecting default but got explicit status", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ message: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/hello/{name}",
    responseSchema: {
      200: z.object({
        body: z.object({
          message: z.string(),
        }),
      }),
      "default": z.object({
        body: z.object({
          fooBar: z.string(),
        }),
      }),
    },
  };

  let error: ResponseError | undefined;
  try {
    await openAPIFetch(config, metadata, {
      path: { name: "Brad" },
    }).body("default");
  } catch (e) {
    error = e as ResponseError;
  }

  expect(error).toBeInstanceOf(ResponseError);
  expect(error?.message).toBe("Expected default response but received status 200");
  restoreFetch();
});

Deno.test("body() should throw ResponseError when expecting specific status but got default response", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ fooBar: "error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/hello/{name}",
    responseSchema: {
      200: z.object({
        body: z.object({
          message: z.string(),
        }),
      }),
      "default": z.object({
        body: z.object({
          fooBar: z.string(),
        }),
      }),
    },
  };

  let error: ResponseError | undefined;
  try {
    await openAPIFetch(config, metadata, {
      path: { name: "Brad" },
    }).body(200);
  } catch (e) {
    error = e as ResponseError;
  }

  expect(error).toBeInstanceOf(ResponseError);
  expect(error?.message).toBe("Expected response status 200 but received 500 (default response)");
  restoreFetch();
});

Deno.test("body() ResponseError should include error name property", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/test",
    responseSchema: {
      200: z.object({
        body: z.object({
          success: z.boolean(),
        }),
      }),
      400: z.object({
        body: z.object({
          error: z.string(),
        }),
      }),
    },
  };

  let error: ResponseError | undefined;
  try {
    await openAPIFetch(config, metadata).body(200);
  } catch (e) {
    error = e as ResponseError;
  }

  expect(error?.name).toBe("ResponseError");
  restoreFetch();
});

Deno.test("body() should work alongside is() method for different patterns", async () => {
  setupFetchMock(async () => {
    return new Response(JSON.stringify({ message: "Success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const config = { baseUrl: "https://api.example.com" };
  const metadata: OpenAPIRequestMetadata = {
    method: "get",
    path: "/test",
    responseSchema: {
      200: z.object({
        body: z.object({
          message: z.string(),
        }),
      }),
      400: z.object({
        body: z.object({
          error: z.string(),
        }),
      }),
    },
  };

  // Test both patterns: Using body() shortcut method
  const bodyData = await openAPIFetch(config, metadata).body(200);
  expect(bodyData).toEqual({ message: "Success" });

  // And also test awaiting the full response first (for is() pattern)
  const response = await openAPIFetch(config, metadata);
  expect(response.status).toBe(200);

  restoreFetch();
});
