import { expect } from "@std/expect";
import { inferSchemaFromParameter } from "./infer_schema_from_parameter.ts";

Deno.test("inferSchemaFromParameter - returns existing schema when present", () => {
  const parameter = {
    schema: {
      type: "string",
      minLength: 5,
    },
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({
    type: "string",
    minLength: 5,
  });
});

Deno.test("inferSchemaFromParameter - prefers schema over example", () => {
  const parameter = {
    schema: {
      type: "string",
    },
    example: 123,
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromParameter - prefers schema over examples", () => {
  const parameter = {
    schema: {
      type: "string",
    },
    examples: {
      example1: { value: 123 },
    },
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromParameter - infers from example", () => {
  const parameter = {
    example: "hello world",
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromParameter - infers from examples with value property", () => {
  const parameter = {
    examples: {
      example1: {
        value: "test string",
      },
    },
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromParameter - infers from examples with direct value", () => {
  const parameter = {
    examples: {
      example1: "direct value",
    },
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromParameter - uses first example when multiple exist", () => {
  const parameter = {
    examples: {
      stringExample: { value: "string" },
      numberExample: { value: 123 },
    },
  };

  const result = inferSchemaFromParameter(parameter);
  // Result depends on object key order, but should be one of them
  expect(result).toBeDefined();
  expect(result?.type).toMatch(/string|integer/);
});

Deno.test("inferSchemaFromParameter - handles examples with nested properties", () => {
  const parameter = {
    examples: {
      example1: {
        value: [1, 2, 3],
        summary: "An array of numbers",
        description: "Additional metadata",
      },
    },
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({
    type: "array",
    items: { type: "integer" },
  });
});

Deno.test("inferSchemaFromParameter - returns undefined when no schema or examples", () => {
  const parameter = {};

  const result = inferSchemaFromParameter(parameter);
  expect(result).toBeUndefined();
});

Deno.test("inferSchemaFromParameter - returns undefined when examples is empty", () => {
  const parameter = {
    examples: {},
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toBeUndefined();
});

Deno.test("inferSchemaFromParameter - prefers example over examples", () => {
  const parameter = {
    example: "from example",
    examples: {
      example1: { value: 123 },
    },
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({ type: "string" });
});

Deno.test("inferSchemaFromParameter - handles example with undefined value", () => {
  const parameter = {
    example: undefined,
  };

  const result = inferSchemaFromParameter(parameter);
  // When example is undefined, it's treated as not present, so returns undefined
  expect(result).toBeUndefined();
});

Deno.test("inferSchemaFromParameter - handles empty schema object", () => {
  const parameter = {
    schema: {},
  };

  const result = inferSchemaFromParameter(parameter);
  expect(result).toEqual({});
});

Deno.test("inferSchemaFromParameter - handles examples with undefined value property", () => {
  const parameter = {
    examples: {
      example1: {
        value: undefined,
      },
    },
  };

  const result = inferSchemaFromParameter(parameter);
  // When value property is undefined, it falls back to using the entire object
  // which has a 'value' property with undefined value
  expect(result).toEqual({
    type: "object",
    properties: {
      value: { nullable: true },
    },
  });
});
