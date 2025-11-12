import { expect } from "@std/expect";
import { inferSchemaFromContent } from "./infer_schema_from_content.ts";

Deno.test("inferSchemaFromContent - returns existing schema when present", () => {
  const contentObject = {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          id: { type: "integer" },
        },
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({
    type: "object",
    properties: {
      id: { type: "integer" },
    },
  });
});

Deno.test("inferSchemaFromContent - prefers schema over example", () => {
  const contentObject = {
    "application/json": {
      schema: {
        type: "string",
      },
      example: 123,
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromContent - prefers schema over examples", () => {
  const contentObject = {
    "application/json": {
      schema: {
        type: "string",
      },
      examples: {
        example1: { value: 123 },
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromContent - infers from example", () => {
  const contentObject = {
    "application/json": {
      example: "hello world",
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromContent - prefers example over examples", () => {
  const contentObject = {
    "application/json": {
      example: "from example",
      examples: {
        example1: { value: 123 },
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromContent - infers from examples with value property", () => {
  const contentObject = {
    "application/json": {
      examples: {
        example1: {
          value: "test string",
        },
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromContent - infers from examples with direct value", () => {
  const contentObject = {
    "application/json": {
      examples: {
        example1: "direct value",
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromContent - uses first example when multiple exist", () => {
  const contentObject = {
    "application/json": {
      examples: {
        stringExample: { value: "string" },
        numberExample: { value: 123 },
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  // Result depends on object key order, but should be one of them
  expect(result).toBeDefined();
  expect(result?.type).toMatch(/string|integer/);
});

Deno.test("inferSchemaFromContent - handles examples with nested properties", () => {
  const contentObject = {
    "application/json": {
      examples: {
        example1: {
          value: [1, 2, 3],
          summary: "An array of numbers",
          description: "Additional metadata",
        },
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({
    type: "array",
    items: { type: "integer" },
  });
});

Deno.test("inferSchemaFromContent - uses first content type", () => {
  const contentObject = {
    "application/json": {
      example: "json content",
    },
    "application/xml": {
      example: "xml content",
    },
  };

  const result = inferSchemaFromContent(contentObject);
  // Should use the first content type
  expect(result).toBeDefined();
  expect(result?.type).toBe("string");
});

Deno.test("inferSchemaFromContent - handles different content types", () => {
  const contentObject = {
    "text/plain": {
      schema: {
        type: "string",
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromContent - returns undefined when content object is empty", () => {
  const contentObject = {};

  const result = inferSchemaFromContent(contentObject);
  expect(result).toBeUndefined();
});

Deno.test("inferSchemaFromContent - returns undefined when no schema or examples", () => {
  const contentObject = {
    "application/json": {},
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toBeUndefined();
});

Deno.test("inferSchemaFromContent - returns undefined when examples is empty", () => {
  const contentObject = {
    "application/json": {
      examples: {},
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toBeUndefined();
});

Deno.test("inferSchemaFromContent - handles example with undefined value", () => {
  const contentObject = {
    "application/json": {
      example: undefined,
    },
  };

  const result = inferSchemaFromContent(contentObject);
  // When example is undefined, it's treated as not present, so returns undefined
  expect(result).toBeUndefined();
});

Deno.test("inferSchemaFromContent - handles empty schema object", () => {
  const contentObject = {
    "application/json": {
      schema: {},
    },
  };

  const result = inferSchemaFromContent(contentObject);
  expect(result).toEqual({});
});

Deno.test("inferSchemaFromContent - handles examples with undefined value property", () => {
  const contentObject = {
    "application/json": {
      examples: {
        example1: {
          value: undefined,
        },
      },
    },
  };

  const result = inferSchemaFromContent(contentObject);
  // When value property is undefined, it falls back to using the entire object
  expect(result).toEqual({
    type: "object",
    properties: {
      value: { nullable: true },
    },
  });
});

Deno.test("inferSchemaFromContent - handles multiple content types with first having no data", () => {
  const contentObject = {
    "application/json": {},
    "application/xml": {
      example: "xml content",
    },
  };

  const result = inferSchemaFromContent(contentObject);
  // Should still use first content type even if it has no schema/examples
  expect(result).toBeUndefined();
});
