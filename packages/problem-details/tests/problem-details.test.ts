import { expect } from "@std/expect";
import { ProblemDetails, ProblemDetailsSchema } from "../src/mod.ts";

Deno.test("ProblemDetails constructor - should create a valid ProblemDetails instance", () => {
  const problem = new ProblemDetails({
    type: "https://example.com/problems/out-of-credit",
    title: "You do not have enough credit.",
    detail: "Your current balance is 30, but that costs 50.",
    status: 403,
    instance: "/account/12345/msgs/abc",
  });

  expect(problem.problem.type).toBe("https://example.com/problems/out-of-credit");
  expect(problem.problem.title).toBe("You do not have enough credit.");
  expect(problem.problem.detail).toBe("Your current balance is 30, but that costs 50.");
  expect(problem.problem.status).toBe(403);
  expect(problem.problem.instance).toBe("/account/12345/msgs/abc");
});

Deno.test("ProblemDetails constructor - should create a valid ProblemDetails instance without optional instance", () => {
  const problem = new ProblemDetails({
    type: "https://example.com/problems/validation-error",
    title: "Validation Error",
    detail: "The request is not valid.",
    status: 400,
  });

  expect(problem.problem.type).toBe("https://example.com/problems/validation-error");
  expect(problem.problem.title).toBe("Validation Error");
  expect(problem.problem.detail).toBe("The request is not valid.");
  expect(problem.problem.status).toBe(400);
  expect(problem.problem.instance).toBeUndefined();
});

Deno.test("ProblemDetails constructor - should throw error for invalid type URL", () => {
  expect(() =>
    new ProblemDetails({
      type: "not-a-valid-url",
      title: "Test",
      detail: "Test detail",
      status: 400,
    })
  ).toThrow("Invalid URL");
});

Deno.test("ProblemDetails constructor - should throw error for missing required fields", () => {
  expect(() =>
    // @ts-ignore - Testing invalid input intentionally
    new ProblemDetails({
      type: "https://example.com/problems/test",
      // Missing title, detail, status
    })
  ).toThrow();
});

Deno.test("ProblemDetails constructor - should throw error for invalid status code type", () => {
  // Test that Zod validation catches invalid status type at runtime
  expect(() => {
    new ProblemDetails({
      type: "https://example.com/problems/test",
      title: "Test",
      detail: "Test detail",
      // @ts-ignore - Testing invalid input intentionally
      status: "400", // Should be number, not string
    });
  }).toThrow();
});

Deno.test("ProblemDetails toJSON - should return the problem object", () => {
  const problemData = {
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 400,
    instance: "/test/123",
  };

  const problem = new ProblemDetails(problemData);
  const json = problem.toJSON();

  expect(json).toEqual(problemData);
});

Deno.test("ProblemDetails toJSON - should be serializable with JSON.stringify", () => {
  const problem = new ProblemDetails({
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 400,
  });

  const jsonString = JSON.stringify(problem);
  const parsed = JSON.parse(jsonString);

  expect(parsed.type).toBe("https://example.com/problems/test");
  expect(parsed.title).toBe("Test Problem");
  expect(parsed.detail).toBe("This is a test problem.");
  expect(parsed.status).toBe(400);
});

Deno.test("ProblemDetails toResponse - should create a Response with correct status and content-type", () => {
  const problem = new ProblemDetails({
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 404,
  });

  const response = problem.toResponse();

  expect(response.status).toBe(404);
  expect(response.headers.get("Content-Type")).toBe("application/problem+json");
});

Deno.test("ProblemDetails toResponse - should create a Response with JSON body", async () => {
  const problemData = {
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 400,
    instance: "/test/123",
  };

  const problem = new ProblemDetails(problemData);
  const response = problem.toResponse();

  const body = await response.json();
  expect(body).toEqual(problemData);
});

Deno.test("ProblemDetails toResponse - should include additional headers while preserving content-type", () => {
  const problem = new ProblemDetails({
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 500,
  });

  const response = problem.toResponse({
    "X-Request-ID": "abc123",
    "Cache-Control": "no-cache",
  });

  expect(response.status).toBe(500);
  expect(response.headers.get("Content-Type")).toBe("application/problem+json");
  expect(response.headers.get("X-Request-ID")).toBe("abc123");
  expect(response.headers.get("Cache-Control")).toBe("no-cache");
});

Deno.test("ProblemDetails toResponse - should not override content-type even if provided in additional headers", () => {
  const problem = new ProblemDetails({
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 400,
  });

  const response = problem.toResponse({
    "Content-Type": "application/json", // This should be overridden
  });

  expect(response.headers.get("Content-Type")).toBe("application/problem+json");
});

Deno.test("ProblemDetailsSchema - should validate a complete problem details object", () => {
  const result = ProblemDetailsSchema.parse({
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 400,
    instance: "/test/123",
  });

  expect(result.type).toBe("https://example.com/problems/test");
  expect(result.title).toBe("Test Problem");
  expect(result.detail).toBe("This is a test problem.");
  expect(result.status).toBe(400);
  expect(result.instance).toBe("/test/123");
});

Deno.test("ProblemDetailsSchema - should validate a problem details object without instance", () => {
  const result = ProblemDetailsSchema.parse({
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 400,
  });

  expect(result.type).toBe("https://example.com/problems/test");
  expect(result.title).toBe("Test Problem");
  expect(result.detail).toBe("This is a test problem.");
  expect(result.status).toBe(400);
  expect(result.instance).toBeUndefined();
});

Deno.test("ProblemDetailsSchema - should allow additional properties (loose object)", () => {
  const result = ProblemDetailsSchema.parse({
    type: "https://example.com/problems/test",
    title: "Test Problem",
    detail: "This is a test problem.",
    status: 400,
    customField: "custom value",
    errors: [{ field: "name", message: "required" }],
  });

  expect(result.type).toBe("https://example.com/problems/test");
  expect((result as Record<string, unknown>).customField).toBe("custom value");
  expect((result as Record<string, unknown>).errors).toEqual([{ field: "name", message: "required" }]);
});
