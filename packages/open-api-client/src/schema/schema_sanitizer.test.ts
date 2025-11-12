import { expect } from "@std/expect";
import type { OpenAPISchemaObjectSchema } from "../types/mod.ts";
import { SchemaSanitizer } from "./schema_sanitizer.ts";

Deno.test("SchemaSanitizer - sanitizeSchemaName converts to PascalCase", () => {
  const sanitizer = new SchemaSanitizer();
  expect(sanitizer.sanitizeSchemaName("user")).toBe("User");

  const sanitizer2 = new SchemaSanitizer();
  expect(sanitizer2.sanitizeSchemaName("user-profile")).toBe("UserProfile");

  const sanitizer3 = new SchemaSanitizer();
  expect(sanitizer3.sanitizeSchemaName("user_profile")).toBe("UserProfile");

  const sanitizer4 = new SchemaSanitizer();
  expect(sanitizer4.sanitizeSchemaName("user.profile")).toBe("UserProfile");
});

Deno.test("SchemaSanitizer - sanitizeSchemaName handles names starting with numbers", () => {
  const sanitizer = new SchemaSanitizer();

  expect(sanitizer.sanitizeSchemaName("123User")).toBe("_123User");
  expect(sanitizer.sanitizeSchemaName("4xx-error")).toBe("_4XxError");
});

Deno.test("SchemaSanitizer - sanitizeSchemaName replaces invalid characters", () => {
  const sanitizer = new SchemaSanitizer();
  expect(sanitizer.sanitizeSchemaName("user@profile")).toBe("UserProfile");

  const sanitizer2 = new SchemaSanitizer();
  expect(sanitizer2.sanitizeSchemaName("user#profile")).toBe("UserProfile");

  const sanitizer3 = new SchemaSanitizer();
  expect(sanitizer3.sanitizeSchemaName("user$profile")).toBe("UserProfile");

  const sanitizer4 = new SchemaSanitizer();
  expect(sanitizer4.sanitizeSchemaName("user!profile")).toBe("UserProfile");
});

Deno.test("SchemaSanitizer - sanitizeSchemaName handles empty or invalid names", () => {
  const sanitizer = new SchemaSanitizer();
  expect(sanitizer.sanitizeSchemaName("")).toBe("Schema");

  const sanitizer2 = new SchemaSanitizer();
  expect(sanitizer2.sanitizeSchemaName("___")).toBe("Schema");

  const sanitizer3 = new SchemaSanitizer();
  expect(sanitizer3.sanitizeSchemaName("@#$")).toBe("Schema");
});

Deno.test("SchemaSanitizer - sanitizeSchemaName handles duplicate names", () => {
  const sanitizer = new SchemaSanitizer();

  const first = sanitizer.sanitizeSchemaName("EventList");
  const second = sanitizer.sanitizeSchemaName("event_list");
  const third = sanitizer.sanitizeSchemaName("event-list");

  expect(first).toBe("EventList");
  expect(second).toBe("EventList_1");
  expect(third).toBe("EventList_2");
});

Deno.test("SchemaSanitizer - sanitizeSchemaName caches results", () => {
  const sanitizer = new SchemaSanitizer();

  const first = sanitizer.sanitizeSchemaName("user-profile");
  const second = sanitizer.sanitizeSchemaName("user-profile");

  expect(first).toBe(second);
  expect(first).toBe("UserProfile");
});

Deno.test("SchemaSanitizer - constructor with no schemas", () => {
  const sanitizer = new SchemaSanitizer();

  expect(sanitizer.schemas).toBeUndefined();
  expect(sanitizer.orderedSchemaNames).toEqual([]);
  expect(sanitizer.cyclicSchemas).toBeUndefined();
});

Deno.test("SchemaSanitizer - constructor with simple schemas (no dependencies)", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    User: { type: "object", properties: { name: { type: "string" } } },
    Product: { type: "object", properties: { title: { type: "string" } } },
    Order: { type: "object", properties: { id: { type: "number" } } },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  expect(sanitizer.schemas).toBe(schemas);
  expect(sanitizer.orderedSchemaNames).toEqual(["Order", "Product", "User"]);
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});

Deno.test("SchemaSanitizer - topological sort with linear dependencies", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Address: {
      type: "object",
      properties: {
        street: { type: "string" },
      },
    },
    User: {
      type: "object",
      properties: {
        name: { type: "string" },
        address: { $ref: "#/components/schemas/Address" },
      },
    },
    Order: {
      type: "object",
      properties: {
        user: { $ref: "#/components/schemas/User" },
      },
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  expect(sanitizer.orderedSchemaNames).toEqual(["Address", "User", "Order"]);
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});

Deno.test("SchemaSanitizer - topological sort with multiple dependencies", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Category: { type: "object" },
    Tag: { type: "object" },
    Product: {
      type: "object",
      properties: {
        category: { $ref: "#/components/schemas/Category" },
        tags: {
          type: "array",
          items: { $ref: "#/components/schemas/Tag" },
        },
      },
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  // Product depends on both Category and Tag, so it should come last
  expect(sanitizer.orderedSchemaNames[2]).toBe("Product");
  expect(sanitizer.orderedSchemaNames.slice(0, 2)).toContain("Category");
  expect(sanitizer.orderedSchemaNames.slice(0, 2)).toContain("Tag");
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});

Deno.test("SchemaSanitizer - topological sort with nested dependencies", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Base: { type: "object" },
    Middle: {
      type: "object",
      allOf: [{ $ref: "#/components/schemas/Base" }],
    },
    Top: {
      type: "object",
      properties: {
        middle: { $ref: "#/components/schemas/Middle" },
      },
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  expect(sanitizer.orderedSchemaNames).toEqual(["Base", "Middle", "Top"]);
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});

Deno.test("SchemaSanitizer - detects circular dependencies (simple cycle)", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Node: {
      type: "object",
      properties: {
        next: { $ref: "#/components/schemas/Node" },
      },
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  expect(sanitizer.orderedSchemaNames).toEqual(["Node"]);
  expect(sanitizer.cyclicSchemas?.has("Node")).toBe(true);
  expect(sanitizer.cyclicSchemas?.size).toBe(1);
});

Deno.test("SchemaSanitizer - detects circular dependencies (mutual cycle)", () => {
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

  expect(sanitizer.orderedSchemaNames).toEqual(["Post", "User"]);
  expect(sanitizer.cyclicSchemas?.has("User")).toBe(true);
  expect(sanitizer.cyclicSchemas?.has("Post")).toBe(true);
  expect(sanitizer.cyclicSchemas?.size).toBe(2);
});

Deno.test("SchemaSanitizer - handles circular dependencies with non-circular schemas", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Independent: { type: "object" },
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

  // Independent should come first, then the circular schemas
  expect(sanitizer.orderedSchemaNames[0]).toBe("Independent");
  expect(sanitizer.orderedSchemaNames.slice(1)).toContain("User");
  expect(sanitizer.orderedSchemaNames.slice(1)).toContain("Post");
  expect(sanitizer.cyclicSchemas?.has("User")).toBe(true);
  expect(sanitizer.cyclicSchemas?.has("Post")).toBe(true);
  expect(sanitizer.cyclicSchemas?.has("Independent")).toBe(false);
});

Deno.test("SchemaSanitizer - ignores external references", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    User: {
      type: "object",
      properties: {
        name: { type: "string" },
        // External reference should be ignored
        external: { $ref: "https://example.com/schemas/External" },
      },
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  expect(sanitizer.orderedSchemaNames).toEqual(["User"]);
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});

Deno.test("SchemaSanitizer - handles anyOf with references", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Cat: { type: "object", properties: { meow: { type: "boolean" } } },
    Dog: { type: "object", properties: { bark: { type: "boolean" } } },
    Pet: {
      anyOf: [
        { $ref: "#/components/schemas/Cat" },
        { $ref: "#/components/schemas/Dog" },
      ],
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  // Pet depends on Cat and Dog
  expect(sanitizer.orderedSchemaNames[2]).toBe("Pet");
  expect(sanitizer.orderedSchemaNames.slice(0, 2)).toContain("Cat");
  expect(sanitizer.orderedSchemaNames.slice(0, 2)).toContain("Dog");
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});

Deno.test("SchemaSanitizer - handles oneOf with references", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Success: { type: "object", properties: { data: { type: "string" } } },
    Error: { type: "object", properties: { error: { type: "string" } } },
    Response: {
      oneOf: [
        { $ref: "#/components/schemas/Success" },
        { $ref: "#/components/schemas/Error" },
      ],
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  // Response depends on Success and Error
  expect(sanitizer.orderedSchemaNames[2]).toBe("Response");
  expect(sanitizer.orderedSchemaNames.slice(0, 2)).toContain("Success");
  expect(sanitizer.orderedSchemaNames.slice(0, 2)).toContain("Error");
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});

Deno.test("SchemaSanitizer - handles deeply nested references", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Level1: { type: "object" },
    Level2: {
      type: "object",
      properties: {
        nested: {
          type: "object",
          properties: {
            deep: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ref: { $ref: "#/components/schemas/Level1" },
                },
              },
            },
          },
        },
      },
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  expect(sanitizer.orderedSchemaNames).toEqual(["Level1", "Level2"]);
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});

Deno.test("SchemaSanitizer - handles complex circular dependency chain", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    A: {
      type: "object",
      properties: {
        b: { $ref: "#/components/schemas/B" },
      },
    },
    B: {
      type: "object",
      properties: {
        c: { $ref: "#/components/schemas/C" },
      },
    },
    C: {
      type: "object",
      properties: {
        a: { $ref: "#/components/schemas/A" },
      },
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  expect(sanitizer.orderedSchemaNames.length).toBe(3);
  expect(sanitizer.cyclicSchemas?.has("A")).toBe(true);
  expect(sanitizer.cyclicSchemas?.has("B")).toBe(true);
  expect(sanitizer.cyclicSchemas?.has("C")).toBe(true);
  expect(sanitizer.cyclicSchemas?.size).toBe(3);
});

Deno.test("SchemaSanitizer - deterministic ordering (alphabetical)", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Zebra: { type: "object" },
    Apple: { type: "object" },
    Mango: { type: "object" },
    Banana: { type: "object" },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  // All have no dependencies, so should be alphabetically sorted
  expect(sanitizer.orderedSchemaNames).toEqual([
    "Apple",
    "Banana",
    "Mango",
    "Zebra",
  ]);
});

Deno.test("SchemaSanitizer - preserves valid TypeScript identifiers", () => {
  const sanitizer = new SchemaSanitizer();
  expect(sanitizer.sanitizeSchemaName("ValidName")).toBe("ValidName");

  const sanitizer2 = new SchemaSanitizer();
  expect(sanitizer2.sanitizeSchemaName("valid_name")).toBe("ValidName");

  const sanitizer3 = new SchemaSanitizer();
  expect(sanitizer3.sanitizeSchemaName("VALID_NAME")).toBe("ValidName");
});

Deno.test("SchemaSanitizer - handles schemas with additionalProperties references", () => {
  const schemas: Record<string, OpenAPISchemaObjectSchema> = {
    Value: { type: "string" },
    Dictionary: {
      type: "object",
      additionalProperties: { $ref: "#/components/schemas/Value" },
    },
  };

  const sanitizer = new SchemaSanitizer(schemas);

  expect(sanitizer.orderedSchemaNames).toEqual(["Value", "Dictionary"]);
  expect(sanitizer.cyclicSchemas?.size).toBe(0);
});
