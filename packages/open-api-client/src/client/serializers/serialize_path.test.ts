import { expect } from "@std/expect";
import { serializePath } from "./serialize_path.ts";

Deno.test("serializeHeaders - Simple path with one parameter", () => {
  const result = serializePath(
    { id: "123" },
    {
      path: "/users/{id}",
      method: "",
      parameters: [{
        name: "id",
        location: "path",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/users/123");
});

Deno.test("serializeHeaders - Multiple parameters", () => {
  const result = serializePath(
    { userId: "123", postId: "456" },
    {
      path: "/users/{userId}/posts/{postId}",
      method: "",
      parameters: [
        { name: "userId", location: "path", style: "simple", explode: false },
        { name: "postId", location: "path", style: "simple", explode: false },
      ],
    },
  );

  expect(result).toBe("/users/123/posts/456");
});

Deno.test("serializeHeaders - Array parameter simple style", () => {
  const result = serializePath(
    { path: ["docs", "2024", "report.pdf"] },
    {
      path: "/files/{path}",
      method: "",
      parameters: [{
        name: "path",
        location: "path",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/files/docs,2024,report.pdf");
});

Deno.test("serializeHeaders - Array parameter simple style explode true", () => {
  const result = serializePath(
    { list: ["red", "green", "blue"] },
    {
      path: "/colors/{list}",
      method: "",
      parameters: [{
        name: "list",
        location: "path",
        style: "simple",
        explode: true,
      }],
    },
  );

  // Simple style ignores explode for arrays
  expect(result).toBe("/colors/red,green,blue");
});

Deno.test("serializeHeaders - Object parameter simple style explode false", () => {
  const result = serializePath(
    { filter: { role: "admin", firstName: "Alex" } },
    {
      path: "/users/{filter}",
      method: "",
      parameters: [{
        name: "filter",
        location: "path",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/users/role,admin,firstName,Alex");
});

Deno.test("serializeHeaders - Object parameter simple style explode true", () => {
  const result = serializePath(
    { filter: { role: "admin", firstName: "Alex" } },
    {
      path: "/users/{filter}",
      method: "",
      parameters: [{
        name: "filter",
        location: "path",
        style: "simple",
        explode: true,
      }],
    },
  );

  expect(result).toBe("/users/role=admin,firstName=Alex");
});

Deno.test("serializeHeaders - Label style primitive", () => {
  const result = serializePath(
    { id: "123" },
    {
      path: "/users/{id}",
      method: "",
      parameters: [{
        name: "id",
        location: "path",
        style: "label",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/users/.123");
});

Deno.test("serializeHeaders - Label style array explode false", () => {
  const result = serializePath(
    { path: ["docs", "2024"] },
    {
      path: "/files/{path}",
      method: "",
      parameters: [{
        name: "path",
        location: "path",
        style: "label",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/files/.docs,2024");
});

Deno.test("serializeHeaders - Label style array explode true", () => {
  const result = serializePath(
    { path: ["docs", "2024"] },
    {
      path: "/files/{path}",
      method: "",
      parameters: [{
        name: "path",
        location: "path",
        style: "label",
        explode: true,
      }],
    },
  );

  expect(result).toBe("/files/.docs.2024");
});

Deno.test("serializeHeaders - Label style object explode false", () => {
  const result = serializePath(
    { filter: { role: "admin", firstName: "Alex" } },
    {
      path: "/users/{filter}",
      method: "",
      parameters: [{
        name: "filter",
        location: "path",
        style: "label",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/users/.role,admin,firstName,Alex");
});

Deno.test("serializeHeaders - Label style object explode true", () => {
  const result = serializePath(
    { filter: { role: "admin", firstName: "Alex" } },
    {
      path: "/users/{filter}",
      method: "",
      parameters: [{
        name: "filter",
        location: "path",
        style: "label",
        explode: true,
      }],
    },
  );

  expect(result).toBe("/users/.role=admin.firstName=Alex");
});

Deno.test("serializeHeaders - Matrix style primitive", () => {
  const result = serializePath(
    { id: "123" },
    {
      path: "/users/{id}",
      method: "",
      parameters: [{
        name: "id",
        location: "path",
        style: "matrix",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/users/;id=123");
});

Deno.test("serializeHeaders - Matrix style array explode false", () => {
  const result = serializePath(
    { path: ["docs", "2024", "report.pdf"] },
    {
      path: "/files/{path}",
      method: "",
      parameters: [{
        name: "path",
        location: "path",
        style: "matrix",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/files/;path=docs,2024,report.pdf");
});

Deno.test("serializeHeaders - Matrix style array explode true", () => {
  const result = serializePath(
    { path: [3, 4, 5] },
    {
      path: "/files/{path}",
      method: "",
      parameters: [{
        name: "path",
        location: "path",
        style: "matrix",
        explode: true,
      }],
    },
  );

  expect(result).toBe("/files/;path=3;path=4;path=5");
});

Deno.test("serializeHeaders - Matrix style object explode false", () => {
  const result = serializePath(
    { filter: { role: "admin", firstName: "Alex" } },
    {
      path: "/search/{filter}",
      method: "",
      parameters: [{
        name: "filter",
        location: "path",
        style: "matrix",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/search/;filter=role,admin,firstName,Alex");
});

Deno.test("serializeHeaders - Matrix style object explode true", () => {
  const result = serializePath(
    { filter: { category: "books", status: "available" } },
    {
      path: "/search/{filter}",
      method: "",
      parameters: [{
        name: "filter",
        location: "path",
        style: "matrix",
        explode: true,
      }],
    },
  );

  expect(result).toBe("/search/;category=books;status=available");
});

Deno.test("serializeHeaders - Missing required parameter throws error", () => {
  expect(() => {
    serializePath(
      {}, // missing id
      {
        path: "/users/{id}",
        method: "",
        parameters: [{
          name: "id",
          location: "path",
          style: "simple",
          explode: false,
        }],
      },
    );
  }).toThrow("Missing required path parameter: id");
});

Deno.test("serializeHeaders - Special characters are encoded", () => {
  const result = serializePath(
    { query: "hello world" },
    {
      path: "/search/{query}",
      method: "",
      parameters: [{
        name: "query",
        location: "path",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/search/hello%20world");
});

Deno.test("serializeHeaders - Default style (no metadata)", () => {
  const result = serializePath(
    { id: "456" },
    {
      path: "/users/{id}",
      method: "",
      parameters: [], // No metadata - should use simple style
    },
  );

  expect(result).toBe("/users/456");
});

Deno.test("serializeHeaders - Number values", () => {
  const result = serializePath(
    { id: 123, age: 25 },
    {
      path: "/users/{id}/age/{age}",
      method: "",
      parameters: [
        { name: "id", location: "path", style: "simple", explode: false },
        { name: "age", location: "path", style: "simple", explode: false },
      ],
    },
  );

  expect(result).toBe("/users/123/age/25");
});

Deno.test("serializeHeaders - Boolean values", () => {
  const result = serializePath(
    { active: true },
    {
      path: "/users/{active}",
      method: "",
      parameters: [{
        name: "active",
        location: "path",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/users/true");
});

Deno.test("serializeHeaders - Empty array", () => {
  const result = serializePath(
    { list: [] },
    {
      path: "/items/{list}",
      method: "",
      parameters: [{
        name: "list",
        location: "path",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/items/");
});

Deno.test("serializeHeaders - Empty object", () => {
  const result = serializePath(
    { filter: {} },
    {
      path: "/items/{filter}",
      method: "",
      parameters: [{
        name: "filter",
        location: "path",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result).toBe("/items/");
});

Deno.test("serializeHeaders - Special characters in object keys/values", () => {
  const result = serializePath(
    { params: { "user name": "John Doe", "email@domain": "test@example.com" } },
    {
      path: "/search/{params}",
      method: "",
      parameters: [{
        name: "params",
        location: "path",
        style: "simple",
        explode: true,
      }],
    },
  );

  expect(result).toBe(
    "/search/user%20name=John%20Doe,email%40domain=test%40example.com",
  );
});

Deno.test("serializeHeaders - Unsupported style throws error", () => {
  expect(() => {
    serializePath(
      { id: "123" },
      {
        path: "/users/{id}",
        method: "",
        parameters: [{
          name: "id",
          location: "path",
          // deno-lint-ignore no-explicit-any
          style: "form" as any,
          explode: false,
        }],
      },
    );
  }).toThrow("Unsupported path parameter style: form");
});
