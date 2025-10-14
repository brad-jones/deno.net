import { expect } from "@std/expect";
import {
  AlreadyExistsProblem,
  InvalidBodyPropertyValueProblem,
  MissingBodyPropertyProblem,
  MissingRequestParameterProblem,
  NotFoundProblem,
  ValidationProblem,
} from "../src/mod.ts";

Deno.test("ValidationProblem - should create with default values", () => {
  const problem = new ValidationProblem();

  expect(problem.problem.type).toBe("https://problems-registry.smartbear.com/validation-error");
  expect(problem.problem.title).toBe("Validation Error");
  expect(problem.problem.detail).toBe("The request is not valid.");
  expect(problem.problem.status).toBe(400);
});

Deno.test("ValidationProblem - should allow overriding default values", () => {
  const problem = new ValidationProblem({
    type: "https://problems-registry.smartbear.com/validation-error",
    title: "Validation Error",
    detail: "Custom validation failed",
    status: 400,
    instance: "/api/users/123",
  });

  expect(problem.problem.type).toBe("https://problems-registry.smartbear.com/validation-error");
  expect(problem.problem.title).toBe("Validation Error");
  expect(problem.problem.detail).toBe("Custom validation failed");
  expect(problem.problem.status).toBe(400);
  expect(problem.problem.instance).toBe("/api/users/123");
});

Deno.test("MissingRequestParameterProblem - should create with specific parameter details", () => {
  const problem = new MissingRequestParameterProblem("userId", "path");

  expect(problem.problem.type).toBe("https://problems-registry.smartbear.com/missing-request-parameter");
  expect(problem.problem.title).toBe("Missing Request Parameter");
  expect(problem.problem.detail).toBe("The request is missing the required path parameter 'userId'.");
  expect(problem.problem.status).toBe(400);
  expect(problem.problem.instance).toBe("#/pathParameters/userId");
});

Deno.test("MissingRequestParameterProblem - should default to query parameter", () => {
  const problem = new MissingRequestParameterProblem("sort");

  expect(problem.problem.detail).toBe("The request is missing the required query parameter 'sort'.");
  expect(problem.problem.instance).toBe("#/queryParameters/sort");
});

Deno.test("MissingBodyPropertyProblem - should create with specific property details", () => {
  const problem = new MissingBodyPropertyProblem("email");

  expect(problem.problem.type).toBe("https://problems-registry.smartbear.com/missing-body-property");
  expect(problem.problem.title).toBe("Missing Body Property");
  expect(problem.problem.detail).toBe("The request body is missing the required property 'email'.");
  expect(problem.problem.status).toBe(400);
  expect(problem.problem.instance).toBe("#/email");
});

Deno.test("InvalidBodyPropertyValueProblem - should create with specific property and value details", () => {
  const problem = new InvalidBodyPropertyValueProblem(
    "status",
    "invalid",
    ["active", "inactive", "pending"],
  );

  expect(problem.problem.type).toBe("https://problems-registry.smartbear.com/invalid-body-property-value");
  expect(problem.problem.title).toBe("Invalid Body Property Value");
  expect(problem.problem.detail).toBe(
    "The request body property 'status' has an invalid value 'invalid'. Valid values are: active, inactive, pending.",
  );
  expect(problem.problem.status).toBe(400);
  expect(problem.problem.instance).toBe("#/status");
});

Deno.test("InvalidBodyPropertyValueProblem - should work without valid values list", () => {
  const problem = new InvalidBodyPropertyValueProblem("age", -5);

  expect(problem.problem.detail).toBe("The request body property 'age' has an invalid value '-5'.");
  expect(problem.problem.instance).toBe("#/age");
});

Deno.test("NotFoundProblem - should create with 404 status", () => {
  const problem = new NotFoundProblem();

  expect(problem.problem.type).toBe("https://problems-registry.smartbear.com/not-found");
  expect(problem.problem.title).toBe("Not Found");
  expect(problem.problem.detail).toBe("The requested resource was not found");
  expect(problem.problem.status).toBe(404);
});

Deno.test("AlreadyExistsProblem - should create with 409 status", () => {
  const problem = new AlreadyExistsProblem();

  expect(problem.problem.type).toBe("https://problems-registry.smartbear.com/already-exists");
  expect(problem.problem.title).toBe("Already Exists");
  expect(problem.problem.detail).toBe("The resource being created already exists.");
  expect(problem.problem.status).toBe(409);
});

Deno.test("Problem classes should create proper HTTP responses", async () => {
  const problem = new NotFoundProblem({
    type: "https://problems-registry.smartbear.com/not-found",
    title: "Not Found",
    detail: "User with ID 123 was not found",
    status: 404,
    instance: "/api/users/123",
  });

  const response = problem.toResponse({
    "X-Request-ID": "req-123",
  });

  expect(response.status).toBe(404);
  expect(response.headers.get("Content-Type")).toBe("application/problem+json");
  expect(response.headers.get("X-Request-ID")).toBe("req-123");

  const body = await response.json();
  expect(body.type).toBe("https://problems-registry.smartbear.com/not-found");
  expect(body.title).toBe("Not Found");
  expect(body.detail).toBe("User with ID 123 was not found");
  expect(body.status).toBe(404);
  expect(body.instance).toBe("/api/users/123");
});

Deno.test("Problem classes should be JSON serializable", () => {
  const problem = new MissingBodyPropertyProblem("name", {
    type: "https://problems-registry.smartbear.com/missing-body-property",
    title: "Missing Body Property",
    detail: "Custom detail message",
    status: 400,
    instance: "/api/users",
  });

  const jsonString = JSON.stringify(problem);
  const parsed = JSON.parse(jsonString);

  expect(parsed.type).toBe("https://problems-registry.smartbear.com/missing-body-property");
  expect(parsed.title).toBe("Missing Body Property");
  expect(parsed.detail).toBe("Custom detail message");
  expect(parsed.status).toBe(400);
  expect(parsed.instance).toBe("/api/users");
});
