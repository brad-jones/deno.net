import { expect } from "@std/expect";
import type { OpenAPISchemaObjectSchema } from "../types/mod.ts";
import { SchemaSanitizer } from "./schema_sanitizer.ts";
import { TypeScriptTypeGenerator } from "./typescript_type_converter.ts";

Deno.test("TypeScriptTypeGenerator - generates string type", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "string" };
  expect(generator.generate(schema)).toBe("string");
});

Deno.test("TypeScriptTypeGenerator - generates nullable string type", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "string", nullable: true };
  expect(generator.generate(schema)).toBe("string | null");
});

Deno.test("TypeScriptTypeGenerator - generates number type", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "number" };
  expect(generator.generate(schema)).toBe("number");
});

Deno.test("TypeScriptTypeGenerator - generates integer type as number", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "integer" };
  expect(generator.generate(schema)).toBe("number");
});

Deno.test("TypeScriptTypeGenerator - generates boolean type", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "boolean" };
  expect(generator.generate(schema)).toBe("boolean");
});

Deno.test("TypeScriptTypeGenerator - generates null type", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "null" };
  expect(generator.generate(schema)).toBe("null");
});

Deno.test("TypeScriptTypeGenerator - generates string enum", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    enum: ["pending", "approved", "rejected"],
  };
  expect(generator.generate(schema)).toBe(
    '"pending" | "approved" | "rejected"',
  );
});

Deno.test("TypeScriptTypeGenerator - generates number enum", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "number",
    enum: [1, 2, 3],
  };
  expect(generator.generate(schema)).toBe("1 | 2 | 3");
});

Deno.test("TypeScriptTypeGenerator - generates array of strings", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { type: "string" },
  };
  expect(generator.generate(schema)).toBe("string[]");
});

Deno.test("TypeScriptTypeGenerator - generates nullable array", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { type: "string" },
    nullable: true,
  };
  expect(generator.generate(schema)).toBe("string[] | null");
});

Deno.test("TypeScriptTypeGenerator - generates array without items as unknown[]", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "array" };
  expect(generator.generate(schema)).toBe("unknown[]");
});

Deno.test("TypeScriptTypeGenerator - generates array with union items", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: {
      oneOf: [{ type: "string" }, { type: "number" }],
    },
  };
  expect(generator.generate(schema)).toBe("(string | number)[]");
});

Deno.test("TypeScriptTypeGenerator - generates simple object type", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: ["name"],
  };

  const result = generator.generate(schema);
  expect(result).toContain("name: string;");
  expect(result).toContain("age?: number;");
});

Deno.test("TypeScriptTypeGenerator - generates empty object with additionalProperties true", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    additionalProperties: true,
  };
  expect(generator.generate(schema)).toBe("Record<string, unknown>");
});

Deno.test("TypeScriptTypeGenerator - generates empty object with typed additionalProperties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    additionalProperties: { type: "string" },
  };
  expect(generator.generate(schema)).toBe("Record<string, string>");
});

Deno.test("TypeScriptTypeGenerator - generates empty object without additionalProperties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = { type: "object" };
  expect(generator.generate(schema)).toBe("Record<string, never>");
});

Deno.test("TypeScriptTypeGenerator - generates object with additionalProperties and optional properties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
    },
    required: ["id"],
    additionalProperties: { type: "number" },
  };

  const result = generator.generate(schema);
  expect(result).toContain("id: string;");
  expect(result).toContain("name?: string;");
  expect(result).toContain("[key: string]: number | undefined;");
});

Deno.test("TypeScriptTypeGenerator - generates object with additionalProperties and all required properties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
    },
    required: ["id", "name"],
    additionalProperties: { type: "number" },
  };

  const result = generator.generate(schema);
  expect(result).toContain("id: string;");
  expect(result).toContain("name: string;");
  expect(result).toContain("[key: string]: number;");
  expect(result).not.toContain("undefined");
});

Deno.test("TypeScriptTypeGenerator - quotes property names with special characters", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      "first-name": { type: "string" },
      "last.name": { type: "string" },
      "123invalid": { type: "string" },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain('"first-name"?: string;');
  expect(result).toContain('"last.name"?: string;');
  expect(result).toContain('"123invalid"?: string;');
});

Deno.test("TypeScriptTypeGenerator - does not quote valid identifiers", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      firstName: { type: "string" },
      last_name: { type: "string" },
      $special: { type: "string" },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain("firstName?: string;");
  expect(result).toContain("last_name?: string;");
  expect(result).toContain("$special?: string;");
});

Deno.test("TypeScriptTypeGenerator - generates oneOf as union", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    oneOf: [{ type: "string" }, { type: "number" }],
  };
  expect(generator.generate(schema)).toBe("string | number");
});

Deno.test("TypeScriptTypeGenerator - generates anyOf as union", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    anyOf: [{ type: "string" }, { type: "number" }],
  };
  expect(generator.generate(schema)).toBe("string | number");
});

Deno.test("TypeScriptTypeGenerator - generates allOf as intersection", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    allOf: [
      { type: "object", properties: { name: { type: "string" } } },
      { type: "object", properties: { age: { type: "number" } } },
    ],
  };

  const result = generator.generate(schema);
  expect(result).toContain("&");
  expect(result).toContain("name");
  expect(result).toContain("age");
});

Deno.test("TypeScriptTypeGenerator - wraps nested unions in oneOf", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    oneOf: [
      { oneOf: [{ type: "string" }, { type: "number" }] },
      { type: "boolean" },
    ],
  };
  expect(generator.generate(schema)).toBe("(string | number) | boolean");
});

Deno.test("TypeScriptTypeGenerator - wraps unions in allOf", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    allOf: [
      { oneOf: [{ type: "string" }, { type: "number" }] },
      { type: "object", properties: { valid: { type: "boolean" } } },
    ],
  };

  const result = generator.generate(schema);
  expect(result).toContain("(string | number)");
  expect(result).toContain("&");
});

Deno.test("TypeScriptTypeGenerator - handles $ref to component schema", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    User: { type: "object", properties: { name: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    $ref: "#/components/schemas/User",
  };
  expect(generator.generate(schema)).toBe("User");
});

Deno.test("TypeScriptTypeGenerator - handles nullable $ref", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    User: { type: "object", properties: { name: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    $ref: "#/components/schemas/User",
    nullable: true,
  };
  expect(generator.generate(schema)).toBe("User | null");
});

Deno.test("TypeScriptTypeGenerator - sanitizes referenced schema names", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    "user-profile": { type: "object" },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    $ref: "#/components/schemas/user-profile",
  };
  expect(generator.generate(schema)).toBe("UserProfile");
});

Deno.test("TypeScriptTypeGenerator - handles $ref in object properties", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Address: { type: "object", properties: { street: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      address: { $ref: "#/components/schemas/Address" },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain("address?: Address;");
});

Deno.test("TypeScriptTypeGenerator - handles $ref in array items", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Tag: { type: "object", properties: { name: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "array",
    items: { $ref: "#/components/schemas/Tag" },
  };
  expect(generator.generate(schema)).toBe("Tag[]");
});

Deno.test("TypeScriptTypeGenerator - generates unknown for missing type", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {};
  expect(generator.generate(schema)).toBe("unknown");
});

Deno.test("TypeScriptTypeGenerator - handles multiple types (JSON Schema)", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: ["string", "number"],
  };
  expect(generator.generate(schema)).toBe("string | number");
});

Deno.test("TypeScriptTypeGenerator - handles inline mode for refs", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Status: { type: "string", enum: ["active", "inactive"] },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new TypeScriptTypeGenerator(sanitizer);

  // Component schemas should NEVER be inlined, even with inline=true
  const schema: OpenAPISchemaObjectSchema = {
    $ref: "#/components/schemas/Status",
  };
  expect(generator.generate(schema, true)).toBe("Status");
});

Deno.test("TypeScriptTypeGenerator - generates JSDoc for string with description", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    description: "User's email address",
  };

  const result = generator.generate(schema);
  expect(result).toContain("/**");
  expect(result).toContain("User's email address");
  expect(result).toContain("*/");
  expect(result).toContain("string");
});

Deno.test("TypeScriptTypeGenerator - does not generate JSDoc for inline types", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    description: "A description",
  };

  const result = generator.generate(schema, true);
  expect(result).not.toContain("/**");
  expect(result).toBe("string");
});

Deno.test("TypeScriptTypeGenerator - generates JSDoc for object properties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "User email address",
      },
    },
  };

  const result = generator.generate(schema);
  expect(result).toContain("/**");
  expect(result).toContain("User email address");
  expect(result).toContain("*/");
  expect(result).toContain("email?: string;");
});

Deno.test("TypeScriptTypeGenerator - handles nested objects", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

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
  expect(result).toContain("user?:");
  expect(result).toContain("name?: string;");
});

Deno.test("TypeScriptTypeGenerator - handles complex nested structure", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

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
  expect(result).toContain("users?:");
  expect(result).toContain("id?: string;");
  expect(result).toContain("tags?: string[];");
});

Deno.test("TypeScriptTypeGenerator - handles nullable object", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
    },
    nullable: true,
  };

  const result = generator.generate(schema);
  expect(result).toContain("| null");
});

Deno.test("TypeScriptTypeGenerator - handles allOf with $ref", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Base: { type: "object", properties: { id: { type: "string" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    allOf: [
      { $ref: "#/components/schemas/Base" },
      { type: "object", properties: { name: { type: "string" } } },
    ],
  };

  const result = generator.generate(schema);
  expect(result).toContain("Base");
  expect(result).toContain("&");
});

Deno.test("TypeScriptTypeGenerator - handles oneOf with $ref", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Cat: { type: "object", properties: { meow: { type: "boolean" } } },
    Dog: { type: "object", properties: { bark: { type: "boolean" } } },
  };
  const sanitizer = new SchemaSanitizer(schemas);
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    oneOf: [
      { $ref: "#/components/schemas/Cat" },
      { $ref: "#/components/schemas/Dog" },
    ],
  };

  const result = generator.generate(schema);
  expect(result).toBe("Cat | Dog");
});

Deno.test("TypeScriptTypeGenerator - handles mixed enum types", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    enum: ["active", 1, "inactive", 2],
  };

  const result = generator.generate(schema);
  expect(result).toContain('"active"');
  expect(result).toContain('"inactive"');
  expect(result).toContain("1");
  expect(result).toContain("2");
  expect(result).toContain("|");
});

Deno.test("TypeScriptTypeGenerator - handles empty enum", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "string",
    enum: [],
  };

  expect(generator.generate(schema)).toBe("");
});

Deno.test("TypeScriptTypeGenerator - handles circular reference", () => {
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
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const result = generator.generate(schemas.Node);
  expect(result).toContain("value?: string;");
  expect(result).toContain("next?: Node;");
});

Deno.test("TypeScriptTypeGenerator - handles additionalProperties true in object with properties", () => {
  const sanitizer = new SchemaSanitizer();
  const generator = new TypeScriptTypeGenerator(sanitizer);

  const schema: OpenAPISchemaObjectSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
    },
    additionalProperties: true,
  };

  const result = generator.generate(schema);
  expect(result).toContain("id?: string;");
  expect(result).toContain("[key: string]: unknown;");
});
