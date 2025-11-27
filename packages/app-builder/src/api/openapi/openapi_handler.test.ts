import { expect } from "@std/expect";
import { z } from "@zod/zod";
import { OpenApiHandler } from "./openapi_handler.ts";

/**
 * Helper to get the type of a schema (Zod v4).
 * Zod v4 uses type or def.type (e.g., "string")
 */
function getSchemaType(schema: unknown): string | undefined {
  // deno-lint-ignore no-explicit-any
  const s = schema as any;
  return s?.type || s?.def?.type;
}

Deno.test("OpenApiHandler.unwrapSchema", async (t) => {
  const handler = new OpenApiHandler();

  await t.step("should return the schema unchanged if it is null", () => {
    const schema = null;
    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(schema);
    expect(result).toBe(null);
  });

  await t.step("should return the schema unchanged if it is undefined", () => {
    const schema = undefined;
    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(schema);
    expect(result).toBe(undefined);
  });

  await t.step("should return a non-wrapped schema unchanged", () => {
    const schema = z.string();
    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(schema);
    expect(result).toBe(schema);
    expect(getSchemaType(result)).toBe("string");
  });

  await t.step("should unwrap optional to get underlying schema", () => {
    const innerSchema = z.string();
    const wrappedSchema = z.optional(innerSchema);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("string");
    expect(result).toBe(innerSchema);
  });

  await t.step("should unwrap nullable to get underlying schema", () => {
    const innerSchema = z.number();
    const wrappedSchema = z.nullable(innerSchema);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("number");
    expect(result).toBe(innerSchema);
  });

  await t.step("should unwrap default to get underlying schema", () => {
    const innerSchema = z.boolean();
    const wrappedSchema = innerSchema.default(true);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("boolean");
    expect(result).toBe(innerSchema);
  });

  await t.step("should unwrap catch to get underlying schema", () => {
    const innerSchema = z.string();
    const wrappedSchema = innerSchema.catch("fallback");

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("string");
    expect(result).toBe(innerSchema);
  });

  await t.step("should unwrap branded to get underlying schema", () => {
    const innerSchema = z.string();
    const wrappedSchema = innerSchema.brand<"UserId">();

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("string");
    expect(result).toBe(innerSchema);
  });

  await t.step("should recursively unwrap multiple layers of wrappers", () => {
    const innerSchema = z.array(z.string());
    const wrappedSchema = z.optional(z.nullable(innerSchema.default([])));

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("array");
    expect(result).toBe(innerSchema);
  });

  await t.step("should unwrap deeply nested wrappers", () => {
    const innerSchema = z.number();
    const wrappedSchema = z.optional(
      z.nullable(
        z.optional(
          innerSchema.default(0),
        ),
      ),
    );

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("number");
    expect(result).toBe(innerSchema);
  });

  await t.step("should handle array schemas wrapped with optional", () => {
    const arraySchema = z.array(z.string());
    const wrappedSchema = z.optional(arraySchema);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("array");
    expect(result).toBe(arraySchema);

    // deno-lint-ignore no-explicit-any
    const elementType = (result as any).def?.element;
    expect(getSchemaType(elementType)).toBe("string");
  });

  await t.step("should handle object schemas wrapped with nullable", () => {
    const objectSchema = z.object({ name: z.string(), age: z.number() });
    const wrappedSchema = z.nullable(objectSchema);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("object");
    expect(result).toBe(objectSchema);

    // Verify the shape contains the expected fields
    // deno-lint-ignore no-explicit-any
    const shape = (result as any).def?.shape;
    expect(shape).toBeDefined();
    expect(getSchemaType(shape.name)).toBe("string");
    expect(getSchemaType(shape.age)).toBe("number");
  });

  await t.step("should unwrap optional even when checking def.type pattern", () => {
    // This is the actual structure we see in production
    const innerSchema = z.string();
    const wrappedSchema = z.optional(innerSchema);

    // Verify the wrapper has def.type === "optional"
    // deno-lint-ignore no-explicit-any
    expect((wrappedSchema as any).def?.type || (wrappedSchema as any).type).toBe("optional");

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    // Should unwrap to the inner schema
    expect(result).toBe(innerSchema);
    expect(getSchemaType(result)).toBe("string");
  });

  await t.step("should handle complex real-world scenario: optional nullable array with default", () => {
    const innerSchema = z.array(z.string());
    const wrappedSchema = z.optional(z.nullable(innerSchema.default(["default"])));

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("array");
    expect(result).toBe(innerSchema);
  });

  await t.step("should handle branded optional schemas", () => {
    const innerSchema = z.string();
    const branded = innerSchema.brand<"Email">();
    const wrappedSchema = z.optional(branded);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    // Should unwrap to the branded schema (which itself wraps the string)
    expect(result).toBe(branded);
    expect(getSchemaType(result)).toBe("string");
  });

  await t.step("should preserve the innermost schema type for catch + optional + nullable", () => {
    const innerSchema = z.object({ id: z.number() });
    const withCatch = innerSchema.catch({ id: 0 });
    const wrappedSchema = z.optional(z.nullable(withCatch));

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("object");
    expect(result).toBe(innerSchema);
  });

  await t.step("should handle enum wrapped with default and optional", () => {
    const enumSchema = z.enum(["red", "green", "blue"]);
    const withDefault = enumSchema.default("red");
    const wrappedSchema = z.optional(withDefault);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("enum");
    expect(result).toBe(enumSchema);

    // Verify enum entries (Zod v4 uses entries object)
    // deno-lint-ignore no-explicit-any
    const entries = (result as any).def?.entries;
    expect(Object.keys(entries).sort()).toEqual(["blue", "green", "red"]);
  });

  await t.step("should handle literal wrapped with nullable", () => {
    const literalSchema = z.literal("constant");
    const wrappedSchema = z.nullable(literalSchema);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("literal");
    expect(result).toBe(literalSchema);

    // Verify literal value (Zod v4 uses values array)
    // deno-lint-ignore no-explicit-any
    const values = (result as any).def?.values;
    expect(values).toEqual(["constant"]);
  });

  await t.step("should handle union types (not wrapper types, should return unchanged)", () => {
    const unionSchema = z.union([z.string(), z.number()]);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(unionSchema);

    expect(getSchemaType(result)).toBe("union");
    expect(result).toBe(unionSchema);
  });

  await t.step("should handle tuple wrapped with optional", () => {
    const tupleSchema = z.tuple([z.string(), z.number()]);
    const wrappedSchema = z.optional(tupleSchema);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("tuple");
    expect(result).toBe(tupleSchema);

    // deno-lint-ignore no-explicit-any
    const items = (result as any).def?.items;
    expect(items.length).toBe(2);
  });

  await t.step("should handle record wrapped with default", () => {
    const recordSchema = z.record(z.string(), z.number());
    const wrappedSchema = recordSchema.default({});

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedSchema);

    expect(getSchemaType(result)).toBe("record");
    expect(result).toBe(recordSchema);
  });

  await t.step("should stop unwrapping at the base schema type", () => {
    const baseSchema = z.string();
    const wrappedOnce = z.optional(baseSchema);
    const wrappedTwice = z.nullable(wrappedOnce);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(wrappedTwice);

    expect(getSchemaType(result)).toBe("string");
    expect(result).toBe(baseSchema);
  });

  await t.step("should handle edge case: wrapper without innerType", () => {
    // Create a mock schema that looks like a wrapper but can't be unwrapped
    const mockSchema = {
      def: { type: "optional" },
      type: "optional",
      // Missing innerType property
    };

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(mockSchema);

    // Should return the mock schema unchanged since innerType is missing
    expect(result).toBe(mockSchema);
  });

  await t.step("should handle mixed wrapper scenario: nullable(optional(default))", () => {
    const baseSchema = z.string();
    const withDefault = baseSchema.default("hello");
    const withOptional = z.optional(withDefault);
    const withNullable = z.nullable(withOptional);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(withNullable);

    expect(result).toBe(baseSchema);
    expect(getSchemaType(result)).toBe("string");
  });

  await t.step("should handle pipe wrapper", () => {
    const innerSchema = z.string();
    const pipedSchema = innerSchema.pipe(z.string().transform((s) => s.toUpperCase()));

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(pipedSchema);

    // Pipe is not a wrapper type we unwrap - should return unchanged
    expect(result).toBe(pipedSchema);
    // Zod v4 uses "pipe" while some versions use "pipeline"
    const schemaType = getSchemaType(result);
    expect(["pipe", "pipeline"]).toContain(schemaType);
  });

  await t.step("should handle promise wrapper", () => {
    const innerSchema = z.string();
    const promiseSchema = z.promise(innerSchema);

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(promiseSchema);

    // Promise is not a wrapper type we unwrap - should return unchanged
    expect(result).toBe(promiseSchema);
    expect(getSchemaType(result)).toBe("promise");
  });

  await t.step("should handle readonly wrapper", () => {
    const arraySchema = z.array(z.string());
    const readonlySchema = arraySchema.readonly();

    // deno-lint-ignore no-explicit-any
    const result = (handler as any).unwrapSchema(readonlySchema);

    // Readonly wraps the array - should unwrap if it's implemented as a wrapper
    const resultType = getSchemaType(result);
    // Either unwraps to array or stays as readonly depending on implementation
    expect(["array", "readonly"]).toContain(resultType);
  });
});
