import { expect } from "@std/expect";
import { serializeQuery } from "./serialize_query.ts";

Deno.test("serializeQuery - Single parameter", () => {
  const result = serializeQuery(
    { id: "123" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "id",
        location: "query",
        style: "form",
        explode: true,
      }],
    },
  );

  expect(result).toBe("?id=123");
});

Deno.test("serializeQuery - Multiple parameters", () => {
  const result = serializeQuery(
    { id: "123", status: "active" },
    {
      path: "",
      method: "",
      parameters: [
        { name: "id", location: "query", style: "form", explode: true },
        { name: "status", location: "query", style: "form", explode: true },
      ],
    },
  );

  expect(result).toBe("?id=123&status=active");
});

Deno.test("serializeQuery - Number and boolean values", () => {
  const result = serializeQuery(
    { page: 2, active: true, limit: 10 },
    {
      path: "",
      method: "",
      parameters: [
        { name: "page", location: "query", style: "form", explode: true },
        { name: "active", location: "query", style: "form", explode: true },
        { name: "limit", location: "query", style: "form", explode: true },
      ],
    },
  );

  expect(result).toBe("?page=2&active=true&limit=10");
});

Deno.test("serializeQuery - Form style array (explode: true)", () => {
  const result = serializeQuery(
    { filter: ["active", "pending"] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "filter",
        location: "query",
        style: "form",
        explode: true,
      }],
    },
  );

  expect(result).toBe("?filter=active&filter=pending");
});

Deno.test("serializeQuery - Form style array (explode: false)", () => {
  const result = serializeQuery(
    { ids: [3, 4, 5] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "ids",
        location: "query",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("?ids=3%2C4%2C5");
});

Deno.test("serializeQuery - Form style object (explode: true)", () => {
  const result = serializeQuery(
    { filter: { role: "admin", status: "active" } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "filter",
        location: "query",
        style: "form",
        explode: true,
      }],
    },
  );

  // When explode is true with objects, parameter name is not used
  expect(result).toBe("?role=admin&status=active");
});

Deno.test("serializeQuery - Form style object (explode: false)", () => {
  const result = serializeQuery(
    { filter: { role: "admin", status: "active" } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "filter",
        location: "query",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("?filter=role%2Cadmin%2Cstatus%2Cactive");
});

Deno.test("serializeQuery - spaceDelimited array (explode: false)", () => {
  const result = serializeQuery(
    { ids: [3, 4, 5] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "ids",
        location: "query",
        style: "spaceDelimited",
        explode: false,
      }],
    },
  );

  expect(result).toBe("?ids=3+4+5");
});

Deno.test("serializeQuery - spaceDelimited array (explode: true)", () => {
  const result = serializeQuery(
    { ids: [3, 4, 5] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "ids",
        location: "query",
        style: "spaceDelimited",
        explode: true,
      }],
    },
  );

  // With explode true, same as form style
  expect(result).toBe("?ids=3&ids=4&ids=5");
});

Deno.test("serializeQuery - spaceDelimited primitive (fallback to form)", () => {
  const result = serializeQuery(
    { id: "123" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "id",
        location: "query",
        style: "spaceDelimited",
        explode: false,
      }],
    },
  );

  expect(result).toBe("?id=123");
});

Deno.test("serializeQuery - pipeDelimited array (explode: false)", () => {
  const result = serializeQuery(
    { ids: [3, 4, 5] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "ids",
        location: "query",
        style: "pipeDelimited",
        explode: false,
      }],
    },
  );

  expect(result).toBe("?ids=3%7C4%7C5");
});

Deno.test("serializeQuery - pipeDelimited array (explode: true)", () => {
  const result = serializeQuery(
    { ids: [3, 4, 5] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "ids",
        location: "query",
        style: "pipeDelimited",
        explode: true,
      }],
    },
  );

  // With explode true, same as form style
  expect(result).toBe("?ids=3&ids=4&ids=5");
});

Deno.test("serializeQuery - pipeDelimited primitive (fallback to form)", () => {
  const result = serializeQuery(
    { id: "123" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "id",
        location: "query",
        style: "pipeDelimited",
        explode: false,
      }],
    },
  );

  expect(result).toBe("?id=123");
});

Deno.test("serializeQuery - deepObject style", () => {
  const result = serializeQuery(
    { filter: { role: "admin", status: "active" } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "filter",
        location: "query",
        style: "deepObject",
        explode: true,
      }],
    },
  );

  expect(result).toBe("?filter%5Brole%5D=admin&filter%5Bstatus%5D=active");
});

Deno.test("serializeQuery - deepObject with numbers", () => {
  const result = serializeQuery(
    { user: { id: 123, age: 25 } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "user",
        location: "query",
        style: "deepObject",
        explode: true,
      }],
    },
  );

  expect(result).toBe("?user%5Bid%5D=123&user%5Bage%5D=25");
});

Deno.test("serializeQuery - deepObject with non-object throws error", () => {
  expect(() => {
    serializeQuery(
      { filter: "value" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "filter",
          location: "query",
          style: "deepObject",
          explode: true,
        }],
      },
    );
  }).toThrow("deepObject style is only valid for objects");
});

Deno.test("serializeQuery - Empty values", () => {
  const result = serializeQuery({}, {
    path: "",
    method: "",
    parameters: [],
  });

  expect(result).toBe("");
});

Deno.test("serializeQuery - Empty array", () => {
  const result = serializeQuery(
    { ids: [] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "ids",
        location: "query",
        style: "form",
        explode: true,
      }],
    },
  );

  expect(result).toBe("");
});

Deno.test("serializeQuery - Empty object (explode: true)", () => {
  const result = serializeQuery(
    { filter: {} },
    {
      path: "",
      method: "",
      parameters: [{
        name: "filter",
        location: "query",
        style: "form",
        explode: true,
      }],
    },
  );

  expect(result).toBe("");
});

Deno.test("serializeQuery - Empty object (explode: false)", () => {
  const result = serializeQuery(
    { filter: {} },
    {
      path: "",
      method: "",
      parameters: [{
        name: "filter",
        location: "query",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("?filter=");
});

Deno.test("serializeQuery - Special characters are encoded", () => {
  const result = serializeQuery(
    { query: "hello world & special=chars" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "query",
        location: "query",
        style: "form",
        explode: true,
      }],
    },
  );

  expect(result).toBe("?query=hello+world+%26+special%3Dchars");
});

Deno.test("serializeQuery - Default style (no metadata)", () => {
  const result = serializeQuery(
    { id: "123", filter: ["a", "b"] },
    {
      path: "",
      method: "",
      parameters: [],
    },
  );

  // Should default to form style with explode true
  expect(result).toBe("?id=123&filter=a&filter=b");
});

Deno.test("serializeQuery - Default explode (should be true)", () => {
  const result = serializeQuery(
    { ids: [1, 2, 3] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "ids",
        location: "query",
        style: "form",
        explode: true,
      }],
    },
  );

  // Defaults to explode: true
  expect(result).toBe("?ids=1&ids=2&ids=3");
});

Deno.test("serializeQuery - Mixed types", () => {
  const result = serializeQuery(
    {
      filter: ["active", "pending"],
      page: 2,
      limit: 10,
      sort: { field: "name", order: "asc" },
    },
    {
      path: "",
      method: "",
      parameters: [
        { name: "filter", location: "query", style: "form", explode: true },
        { name: "page", location: "query", style: "form", explode: true },
        { name: "limit", location: "query", style: "form", explode: true },
        { name: "sort", location: "query", style: "form", explode: true },
      ],
    },
  );

  expect(result).toBe(
    "?filter=active&filter=pending&page=2&limit=10&field=name&order=asc",
  );
});

Deno.test("serializeQuery - Unsupported style throws error", () => {
  expect(() => {
    serializeQuery(
      { id: "123" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "id",
          location: "query",
          // deno-lint-ignore no-explicit-any
          style: "unsupported" as any,
          explode: true,
        }],
      },
    );
  }).toThrow("Unsupported query parameter style: unsupported");
});

Deno.test("serializeQuery - Array with mixed value types", () => {
  const result = serializeQuery(
    { values: [1, "two", true] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "values",
        location: "query",
        style: "form",
        explode: true,
      }],
    },
  );

  expect(result).toBe("?values=1&values=two&values=true");
});

Deno.test("serializeQuery - Object with default style (no metadata)", () => {
  const result = serializeQuery(
    { filter: { role: "admin", active: true } },
    {
      path: "",
      method: "",
      parameters: [],
    },
  );

  // Default for objects: explode true, each key becomes a parameter
  expect(result).toBe("?role=admin&active=true");
});

Deno.test("serializeQuery - Undefined values are skipped", () => {
  // deno-lint-ignore no-explicit-any
  const values: any = { id: "123", name: undefined, status: "active" };
  const result = serializeQuery(
    values,
    {
      path: "",
      method: "",
      parameters: [
        { name: "id", location: "query", style: "form", explode: true },
        { name: "name", location: "query", style: "form", explode: true },
        { name: "status", location: "query", style: "form", explode: true },
      ],
    },
  );

  expect(result).toBe("?id=123&status=active");
});
