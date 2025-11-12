import { expect } from "@std/expect";
import { inferSchema } from "./infer_schema.ts";

Deno.test("inferSchema - handles null values", () => {
  const result = inferSchema(null);
  expect(result).toEqual({ type: "null" });
});

Deno.test("inferSchema - handles undefined values", () => {
  const result = inferSchema(undefined);
  expect(result).toEqual({ nullable: true });
});

Deno.test("inferSchema - handles string primitives", () => {
  const result = inferSchema("hello");
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchema - handles empty string", () => {
  const result = inferSchema("");
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchema - handles integer numbers", () => {
  const result = inferSchema(42);
  expect(result).toEqual({ type: "integer" });
});

Deno.test("inferSchema - handles zero as integer", () => {
  const result = inferSchema(0);
  expect(result).toEqual({ type: "integer" });
});

Deno.test("inferSchema - handles negative integers", () => {
  const result = inferSchema(-100);
  expect(result).toEqual({ type: "integer" });
});

Deno.test("inferSchema - handles float numbers", () => {
  const result = inferSchema(3.14);
  expect(result).toEqual({ type: "number" });
});

Deno.test("inferSchema - handles negative floats", () => {
  const result = inferSchema(-2.5);
  expect(result).toEqual({ type: "number" });
});

Deno.test("inferSchema - handles boolean true", () => {
  const result = inferSchema(true);
  expect(result).toEqual({ type: "boolean" });
});

Deno.test("inferSchema - handles boolean false", () => {
  const result = inferSchema(false);
  expect(result).toEqual({ type: "boolean" });
});

Deno.test("inferSchema - handles empty arrays", () => {
  const result = inferSchema([]);
  expect(result).toEqual({
    type: "array",
    items: {},
  });
});

Deno.test("inferSchema - handles homogeneous string arrays", () => {
  const result = inferSchema(["foo", "bar", "baz"]);
  expect(result).toEqual({
    type: "array",
    items: { type: "string" },
  });
});

Deno.test("inferSchema - handles homogeneous number arrays", () => {
  const result = inferSchema([1, 2, 3]);
  expect(result).toEqual({
    type: "array",
    items: { type: "integer" },
  });
});

Deno.test("inferSchema - handles homogeneous boolean arrays", () => {
  const result = inferSchema([true, false, true]);
  expect(result).toEqual({
    type: "array",
    items: { type: "boolean" },
  });
});

Deno.test("inferSchema - handles mixed type arrays", () => {
  const result = inferSchema([1, "string", true]);
  expect(result).toEqual({
    type: "array",
    items: {
      oneOf: [
        { type: "integer" },
        { type: "string" },
        { type: "boolean" },
      ],
    },
  });
});

Deno.test("inferSchema - handles arrays with null values", () => {
  const result = inferSchema([null, null]);
  expect(result).toEqual({
    type: "array",
    items: { type: "null" },
  });
});

Deno.test("inferSchema - handles arrays of objects", () => {
  const result = inferSchema([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ]);
  expect(result).toEqual({
    type: "array",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
      },
      required: ["name", "age"],
    },
  });
});

Deno.test("inferSchema - handles simple objects", () => {
  const result = inferSchema({
    name: "John",
    age: 30,
    active: true,
  });
  expect(result).toEqual({
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "integer" },
      active: { type: "boolean" },
    },
    required: ["name", "age", "active"],
  });
});

Deno.test("inferSchema - handles empty objects", () => {
  const result = inferSchema({});
  expect(result).toEqual({
    type: "object",
    properties: {},
  });
});

Deno.test("inferSchema - handles objects with null values", () => {
  const result = inferSchema({
    name: "John",
    middleName: null,
  });
  expect(result).toEqual({
    type: "object",
    properties: {
      name: { type: "string" },
      middleName: { type: "null" },
    },
    required: ["name"],
  });
});

Deno.test("inferSchema - handles objects with undefined values", () => {
  const result = inferSchema({
    name: "John",
    middleName: undefined,
  });
  expect(result).toEqual({
    type: "object",
    properties: {
      name: { type: "string" },
      middleName: { nullable: true },
    },
    required: ["name"],
  });
});

Deno.test("inferSchema - handles nested objects", () => {
  const result = inferSchema({
    user: {
      name: "Alice",
      email: "alice@example.com",
    },
    active: true,
  });
  expect(result).toEqual({
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["name", "email"],
      },
      active: { type: "boolean" },
    },
    required: ["user", "active"],
  });
});

Deno.test("inferSchema - handles objects with arrays", () => {
  const result = inferSchema({
    tags: ["javascript", "typescript"],
    count: 2,
  });
  expect(result).toEqual({
    type: "object",
    properties: {
      tags: {
        type: "array",
        items: { type: "string" },
      },
      count: { type: "integer" },
    },
    required: ["tags", "count"],
  });
});

Deno.test("inferSchema - handles deeply nested structures", () => {
  const result = inferSchema({
    data: {
      users: [
        {
          id: 1,
          profile: {
            name: "Alice",
            verified: true,
          },
        },
      ],
    },
  });
  expect(result).toEqual({
    type: "object",
    properties: {
      data: {
        type: "object",
        properties: {
          users: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                profile: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    verified: { type: "boolean" },
                  },
                  required: ["name", "verified"],
                },
              },
              required: ["id", "profile"],
            },
          },
        },
        required: ["users"],
      },
    },
    required: ["data"],
  });
});

Deno.test("inferSchema - handles mixed type arrays with duplicates", () => {
  const result = inferSchema([1, "string", 2, "another", true]);
  expect(result).toEqual({
    type: "array",
    items: {
      oneOf: [
        { type: "integer" },
        { type: "string" },
        { type: "boolean" },
      ],
    },
  });
});

Deno.test("inferSchema - handles array with single element", () => {
  const result = inferSchema([42]);
  expect(result).toEqual({
    type: "array",
    items: { type: "integer" },
  });
});

Deno.test("inferSchema - handles complex mixed arrays", () => {
  const result = inferSchema([
    { type: "admin" },
    { type: "user" },
    null,
  ]);
  expect(result).toEqual({
    type: "array",
    items: {
      oneOf: [
        {
          type: "object",
          properties: {
            type: { type: "string" },
          },
          required: ["type"],
        },
        { type: "null" },
      ],
    },
  });
});

Deno.test("inferSchema - handles object with mixed number types", () => {
  const result = inferSchema({
    integer: 42,
    float: 3.14,
  });
  expect(result).toEqual({
    type: "object",
    properties: {
      integer: { type: "integer" },
      float: { type: "number" },
    },
    required: ["integer", "float"],
  });
});

Deno.test("inferSchema - handles special number values", () => {
  const infinityResult = inferSchema(Infinity);
  expect(infinityResult).toEqual({ type: "number" });

  const negInfinityResult = inferSchema(-Infinity);
  expect(negInfinityResult).toEqual({ type: "number" });
});

Deno.test("inferSchema - handles NaN", () => {
  const result = inferSchema(NaN);
  expect(result).toEqual({ type: "number" });
});
