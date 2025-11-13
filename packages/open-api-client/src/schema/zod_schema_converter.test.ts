import { expect } from "@std/expect";
import type { OpenAPISchemaObjectSchema } from "../types/mod.ts";
import { SchemaSanitizer } from "./schema_sanitizer.ts";
import { ZodSchemaGenerator } from "./zod_schema_converter.ts";

Deno.test("ZodSchemaGenerator - generates string schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "string" };
  expect(generator.generate(schema)).toBe("z.string()");
});

Deno.test("ZodSchemaGenerator - generates nullable string schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "string", nullable: true };
  expect(generator.generate(schema)).toBe("z.string().nullable()");
});

Deno.test("ZodSchemaGenerator - generates string with minLength", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    minLength: 5,
  };
  expect(generator.generate(schema)).toBe("z.string().min(5)");
});

Deno.test("ZodSchemaGenerator - generates string with maxLength", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    maxLength: 100,
  };
  expect(generator.generate(schema)).toBe("z.string().max(100)");
});

Deno.test("ZodSchemaGenerator - generates string with min and max length", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    minLength: 5,
    maxLength: 100,
  };
  expect(generator.generate(schema)).toBe("z.string().min(5).max(100)");
});

Deno.test("ZodSchemaGenerator - generates string with pattern", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    pattern: "^[A-Z]+$",
  };
  expect(generator.generate(schema)).toBe(
    'z.string().regex(new RegExp("^[A-Z]+$"))',
  );
});

Deno.test("ZodSchemaGenerator - generates string with default value", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    default: "hello",
  };
  expect(generator.generate(schema)).toBe('z.string().default("hello")');
});

Deno.test("ZodSchemaGenerator - generates number schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "number" };
  expect(generator.generate(schema)).toBe("z.number()");
});

Deno.test("ZodSchemaGenerator - generates nullable number schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "number", nullable: true };
  expect(generator.generate(schema)).toBe("z.number().nullable()");
});

Deno.test("ZodSchemaGenerator - generates number with minimum", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    minimum: 0,
  };
  expect(generator.generate(schema)).toBe("z.number().min(0)");
});

Deno.test("ZodSchemaGenerator - generates number with maximum", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    maximum: 100,
  };
  expect(generator.generate(schema)).toBe("z.number().max(100)");
});

Deno.test("ZodSchemaGenerator - generates number with exclusive minimum (OpenAPI 3.0)", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    minimum: 0,
    exclusiveMinimum: true,
  };
  expect(generator.generate(schema)).toBe("z.number().gt(0)");
});

Deno.test("ZodSchemaGenerator - generates number with exclusive maximum (OpenAPI 3.0)", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    maximum: 100,
    exclusiveMaximum: true,
  };
  expect(generator.generate(schema)).toBe("z.number().lt(100)");
});

Deno.test("ZodSchemaGenerator - generates number with exclusive minimum (OpenAPI 3.1)", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    exclusiveMinimum: 0,
  };
  expect(generator.generate(schema)).toBe("z.number().gt(0)");
});

Deno.test("ZodSchemaGenerator - generates number with exclusive maximum (OpenAPI 3.1)", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    exclusiveMaximum: 100,
  };
  expect(generator.generate(schema)).toBe("z.number().lt(100)");
});

Deno.test("ZodSchemaGenerator - generates number with multipleOf", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    multipleOf: 0.5,
  };
  expect(generator.generate(schema)).toBe("z.number().multipleOf(0.5)");
});

Deno.test("ZodSchemaGenerator - generates number with default value", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    default: 42,
  };
  expect(generator.generate(schema)).toBe("z.number().default(42)");
});

Deno.test("ZodSchemaGenerator - generates integer schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "integer" };
  expect(generator.generate(schema)).toBe("z.number().int()");
});

Deno.test("ZodSchemaGenerator - generates integer with constraints", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "integer",
    minimum: 1,
    maximum: 10,
  };
  expect(generator.generate(schema)).toBe("z.number().int().min(1).max(10)");
});

Deno.test("ZodSchemaGenerator - generates boolean schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "boolean" };
  expect(generator.generate(schema)).toBe("z.boolean()");
});

Deno.test("ZodSchemaGenerator - generates nullable boolean schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "boolean", nullable: true };
  expect(generator.generate(schema)).toBe("z.boolean().nullable()");
});

Deno.test("ZodSchemaGenerator - generates null schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "null" };
  expect(generator.generate(schema)).toBe("z.null()");
});

Deno.test("ZodSchemaGenerator - generates string enum", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    enum: ["pending", "approved", "rejected"],
  };
  expect(generator.generate(schema)).toBe(
    'z.enum(["pending", "approved", "rejected"])',
  );
});

Deno.test("ZodSchemaGenerator - generates number enum", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    enum: [1, 2, 3],
  };
  expect(generator.generate(schema)).toBe(
    "z.union([z.literal(1), z.literal(2), z.literal(3)])",
  );
});

Deno.test("ZodSchemaGenerator - generates mixed enum", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    enum: ["active", 1, "inactive", 2],
  };
  expect(generator.generate(schema)).toBe(
    'z.union([z.literal("active"), z.literal(1), z.literal("inactive"), z.literal(2)])',
  );
});

Deno.test("ZodSchemaGenerator - generates array of strings", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { type: "string" },
  };
  expect(generator.generate(schema)).toBe("z.array(z.string())");
});

Deno.test("ZodSchemaGenerator - generates nullable array", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { type: "string" },
    nullable: true,
  };
  expect(generator.generate(schema)).toBe("z.array(z.string()).nullable()");
});

Deno.test("ZodSchemaGenerator - generates array without items as unknown[]", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "array" };
  expect(generator.generate(schema)).toBe("z.array(z.unknown())");
});

Deno.test("ZodSchemaGenerator - generates array with minItems", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { type: "string" },
    minItems: 1,
  };
  expect(generator.generate(schema)).toBe("z.array(z.string()).min(1)");
});

Deno.test("ZodSchemaGenerator - generates array with maxItems", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { type: "string" },
    maxItems: 10,
  };
  expect(generator.generate(schema)).toBe("z.array(z.string()).max(10)");
});

Deno.test("ZodSchemaGenerator - generates array with default value", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { type: "string" },
    default: ["a", "b"],
  };
  expect(generator.generate(schema)).toBe(
    'z.array(z.string()).default(["a","b"])',
  );
});

Deno.test("ZodSchemaGenerator - generates simple object schema", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: ["name"],
  };

  const result = generator.generate(schema);
  expect(result).toContain("z.object({");
  expect(result).toContain("name: z.string()");
  expect(result).toContain("age: z.number().optional()");
});

Deno.test("ZodSchemaGenerator - generates empty object", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "object" };
  expect(generator.generate(schema)).toBe("z.object({})");
});

Deno.test("ZodSchemaGenerator - generates empty object with additionalProperties true", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    additionalProperties: true,
  };
  expect(generator.generate(schema)).toBe("z.record(z.string(), z.unknown())");
});

Deno.test("ZodSchemaGenerator - generates empty object with typed additionalProperties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    additionalProperties: { type: "string" },
  };
  expect(generator.generate(schema)).toBe("z.record(z.string(), z.string())");
});

Deno.test("ZodSchemaGenerator - generates object with additionalProperties true", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
    },
    additionalProperties: true,
  };

  const result = generator.generate(schema);
  expect(result).toContain("z.object({");
  expect(result).toContain("id: z.string().optional()");
  expect(result).toContain("}).catchall(z.unknown())");
});

Deno.test("ZodSchemaGenerator - generates object with additionalProperties false", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
    },
    additionalProperties: false,
  };

  const result = generator.generate(schema);
  expect(result).toContain("}).strict()");
});

Deno.test("ZodSchemaGenerator - generates object with typed additionalProperties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
    },
    additionalProperties: { type: "number" },
  };

  const result = generator.generate(schema);
  expect(result).toContain("}).catchall(z.number())");
});

Deno.test("ZodSchemaGenerator - quotes property names with special characters", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      "first-name": { type: "string" },
      "last.name": { type: "string" },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain('"first-name": z.string().optional()');
  expect(result).toContain('"last.name": z.string().optional()');
});

Deno.test("ZodSchemaGenerator - does not quote valid identifiers", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      firstName: { type: "string" },
      last_name: { type: "string" },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain("firstName: z.string().optional()");
  expect(result).toContain("last_name: z.string().optional()");
});

Deno.test("ZodSchemaGenerator - generates nullable object", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
    },
    nullable: true,
  };

  const result = generator.generate(schema);
  expect(result).toContain(".nullable()");
});

Deno.test("ZodSchemaGenerator - generates oneOf as union", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    oneOf: [{ type: "string" }, { type: "number" }],
  };
  expect(generator.generate(schema)).toBe("z.union([z.string(), z.number()])");
});

Deno.test("ZodSchemaGenerator - generates anyOf as union", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    anyOf: [{ type: "string" }, { type: "number" }],
  };
  expect(generator.generate(schema)).toBe("z.union([z.string(), z.number()])");
});

Deno.test("ZodSchemaGenerator - generates allOf with intersection", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    allOf: [
      { type: "object", properties: { name: { type: "string" } } },
      { type: "object", properties: { age: { type: "number" } } },
    ],
  };

  const result = generator.generate(schema);
  expect(result).toContain(".and(");
});

Deno.test("ZodSchemaGenerator - handles $ref to component schema", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    User: { type: "object", properties: { name: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    $ref: "#/components/schemas/User",
  };
  expect(generator.generate(schema)).toBe("UserSchema");
});

Deno.test("ZodSchemaGenerator - handles circular reference with z.lazy", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Node: {
      type: "object",
      properties: {
        value: { type: "string" },
        next: { $ref: "#/components/schemas/Node" },
      },
    },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  const result = generator.generate(schemas.Node);
  expect(result).toContain("z.lazy((): z.ZodType<Node> => NodeSchema)");
});

Deno.test("ZodSchemaGenerator - handles mutual circular references", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    User: {
      type: "object",
      properties: {
        posts: {
          type: "array",
          items: { $ref: "#/components/schemas/Post" },
        },
      },
    },
    Post: {
      type: "object",
      properties: {
        author: { $ref: "#/components/schemas/User" },
      },
    },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  const userResult = generator.generate(schemas.User);
  const postResult = generator.generate(schemas.Post);

  expect(userResult).toContain("z.lazy((): z.ZodType<Post> => PostSchema)");
  expect(postResult).toContain("z.lazy((): z.ZodType<User> => UserSchema)");
});

Deno.test("ZodSchemaGenerator - sanitizes referenced schema names", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    "user-profile": { type: "object" },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    $ref: "#/components/schemas/user-profile",
  };
  expect(generator.generate(schema)).toBe("UserProfileSchema");
});

Deno.test("ZodSchemaGenerator - handles unresolvable $ref", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    $ref: "#/components/schemas/NonExistent",
  };
  expect(generator.generate(schema)).toBe("z.unknown()");
});

Deno.test("ZodSchemaGenerator - handles $ref in object properties", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Address: { type: "object", properties: { street: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      address: { $ref: "#/components/schemas/Address" },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain("address: AddressSchema.optional()");
});

Deno.test("ZodSchemaGenerator - handles $ref in array items", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Tag: { type: "object", properties: { name: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { $ref: "#/components/schemas/Tag" },
  };
  expect(generator.generate(schema)).toBe("z.array(TagSchema)");
});

Deno.test("ZodSchemaGenerator - generates unknown for missing type", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {};
  expect(generator.generate(schema)).toBe("z.unknown()");
});

Deno.test("ZodSchemaGenerator - handles multiple types (JSON Schema)", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: ["string", "number"],
  };
  expect(generator.generate(schema)).toBe("z.union([z.string(), z.number()])");
});

Deno.test("ZodSchemaGenerator - handles allOf with $ref", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Base: { type: "object", properties: { id: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    allOf: [
      { $ref: "#/components/schemas/Base" },
      { type: "object", properties: { name: { type: "string" } } },
    ],
  };

  const result = generator.generate(schema);
  expect(result).toContain("BaseSchema");
  expect(result).toContain(".and(");
});

Deno.test("ZodSchemaGenerator - handles oneOf with $ref", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Cat: { type: "object", properties: { meow: { type: "boolean" } } },
    Dog: { type: "object", properties: { bark: { type: "boolean" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    oneOf: [
      { $ref: "#/components/schemas/Cat" },
      { $ref: "#/components/schemas/Dog" },
    ],
  };

  expect(generator.generate(schema)).toBe("z.union([CatSchema, DogSchema])");
});

Deno.test("ZodSchemaGenerator - handles nested objects", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain("user:");
  expect(result).toContain("name: z.string().optional()");
});

Deno.test("ZodSchemaGenerator - handles complex nested structure", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      users: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain("users:");
  expect(result).toContain("z.array(");
  expect(result).toContain("id: z.string().optional()");
  expect(result).toContain("tags: z.array(z.string()).optional()");
});

Deno.test("ZodSchemaGenerator - handles string with all constraints", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    minLength: 5,
    maxLength: 100,
    pattern: "^[a-z]+$",
    default: "test",
    nullable: true,
  };

  const result = generator.generate(schema);
  expect(result).toContain("z.string()");
  expect(result).toContain('.regex(new RegExp("^[a-z]+$"))');
  expect(result).toContain(".min(5)");
  expect(result).toContain(".max(100)");
  expect(result).toContain('.default("test")');
  expect(result).toContain(".nullable()");
});

Deno.test("ZodSchemaGenerator - handles number with all constraints", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    minimum: 0,
    maximum: 100,
    multipleOf: 5,
    default: 10,
    nullable: true,
  };

  const result = generator.generate(schema);
  expect(result).toContain("z.number()");
  expect(result).toContain(".min(0)");
  expect(result).toContain(".max(100)");
  expect(result).toContain(".multipleOf(5)");
  expect(result).toContain(".default(10)");
  expect(result).toContain(".nullable()");
});

Deno.test("ZodSchemaGenerator - handles array with all constraints", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { type: "string" },
    minItems: 1,
    maxItems: 10,
    default: ["a"],
    nullable: true,
  };

  const result = generator.generate(schema);
  expect(result).toContain("z.array(z.string())");
  expect(result).toContain(".min(1)");
  expect(result).toContain(".max(10)");
  expect(result).toContain('.default(["a"])');
  expect(result).toContain(".nullable()");
});

Deno.test("ZodSchemaGenerator - escapes quotes in regex pattern", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    pattern: '^"quoted"$',
  };

  const result = generator.generate(schema);
  expect(result).toContain('new RegExp("^\\"quoted\\"$")');
});

Deno.test("ZodSchemaGenerator - escapes slashes in regex pattern", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    pattern: "^\\d\\d\\d\\d-\\d\\d-\\d\\d.*$",
  };

  const result = generator.generate(schema);
  expect(result).toContain('new RegExp("^\\\\d\\\\d\\\\d\\\\d-\\\\d\\\\d-\\\\d\\\\d.*$")');
});

Deno.test("ZodSchemaGenerator - handles inline mode for non-component refs", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Status: { type: "string", enum: ["active", "inactive"] },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new ZodSchemaGenerator(sanitizer);

  // Component schemas should NEVER be inlined, even with inline=true
  const schema: OpenAPISchemaObjectSchema = {
    $ref: "#/components/schemas/Status",
  };
  expect(generator.generate(schema, true)).toBe("StatusSchema");
});

Deno.test("ZodSchemaGenerator - handles nullable empty object with additionalProperties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new ZodSchemaGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    additionalProperties: { type: "string" },
    nullable: true,
  };

  expect(generator.generate(schema)).toBe(
    "z.record(z.string(), z.string()).nullable()",
  );
});
