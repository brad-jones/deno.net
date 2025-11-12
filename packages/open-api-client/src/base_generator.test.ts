import { expect } from "@std/expect";
import { BaseClientGenerator } from "./base_generator.ts";
import { SchemaSanitizer, TypeScriptTypeGenerator, ZodSchemaGenerator } from "./schema/mod.ts";
import type { OpenAPISpec } from "./types/mod.ts";

// Test implementation of the abstract class
class TestClientGenerator extends BaseClientGenerator {
  protected generateClient(_spec: OpenAPISpec): string {
    return "// test client";
  }

  // Expose protected methods for testing
  public testGenerateComponentSchemas(
    schemas: Record<string, unknown> | undefined,
  ) {
    // deno-lint-ignore no-explicit-any
    return this.generateComponentSchemas(schemas as any);
  }

  public testResolveParameters(
    parameters: Array<Record<string, unknown>>,
    components?: Record<string, unknown>,
  ) {
    return this.resolveParameters(parameters, components);
  }

  public testGenerateOperationJSDoc(operation: Record<string, unknown>) {
    return this.generateOperationJSDoc(operation);
  }

  public testGenerateParameterGroupTypeInline(
    parameters: Array<Record<string, unknown>>,
    typeGen: TypeScriptTypeGenerator,
  ) {
    return this.generateParameterGroupTypeInline(parameters, typeGen);
  }

  public testGenerateRequestBodyTypeInline(
    requestBody: Record<string, unknown>,
    typeGen: TypeScriptTypeGenerator,
    operationContext?: { method: string; path: string },
  ) {
    return this.generateRequestBodyTypeInline(
      requestBody,
      typeGen,
      operationContext,
    );
  }

  public testHasAllOptionalProperties(
    schema: Record<string, unknown>,
    componentSchemas?: Record<string, unknown>,
  ) {
    return this.hasAllOptionalProperties(schema, componentSchemas);
  }

  public testGenerateResponseTypeInline(
    operation: Record<string, unknown>,
    typeGen: TypeScriptTypeGenerator,
  ) {
    return this.generateResponseTypeInline(operation, typeGen);
  }

  public testGenerateRequestSchema(
    operation: Record<string, unknown>,
    parameters: Array<Record<string, unknown>>,
    schemaGen: ZodSchemaGenerator,
  ) {
    return this.generateRequestSchema(operation, parameters, schemaGen);
  }

  public testGenerateParameterGroupSchema(
    parameters: Array<Record<string, unknown>>,
    schemaGen: ZodSchemaGenerator,
  ) {
    return this.generateParameterGroupSchema(parameters, schemaGen);
  }

  public testGenerateRequestBodySchema(
    requestBody: Record<string, unknown>,
    schemaGen: ZodSchemaGenerator,
  ) {
    return this.generateRequestBodySchema(requestBody, schemaGen);
  }

  public testGenerateResponseSchema(
    operation: Record<string, unknown>,
    schemaGen: ZodSchemaGenerator,
  ) {
    return this.generateResponseSchema(operation, schemaGen);
  }

  public testGenerateOperationMetadata(
    schemaGen: ZodSchemaGenerator,
    path: string,
    method: string,
    operation: Record<string, unknown>,
    pathItem: Record<string, unknown>,
    components?: Record<string, unknown>,
  ) {
    return this.generateOperationMetadata(
      schemaGen,
      path,
      method,
      operation,
      pathItem,
      components,
    );
  }

  public testGenerateParameterMetadata(
    parameters: Array<Record<string, unknown>>,
  ) {
    return this.generateParameterMetadata(parameters);
  }

  public testIsDefaultParameterStyle(
    location: string,
    style?: string,
    explode?: boolean,
  ) {
    return this.isDefaultParameterStyle(location, style, explode);
  }

  public testGetDefaultStyle(location: string) {
    return this.getDefaultStyle(location);
  }

  public testGetDefaultExplode(location: string) {
    return this.getDefaultExplode(location);
  }

  public testBuildRequestSignature(
    typeGen: TypeScriptTypeGenerator,
    path: string,
    method: string,
    operation: Record<string, unknown>,
    pathItem: Record<string, unknown>,
    components?: Record<string, unknown>,
  ) {
    return this.buildRequestSignature(
      typeGen,
      path,
      method,
      operation,
      pathItem,
      components,
    );
  }

  public getClientImport() {
    return this.clientImport;
  }

  public getZodImport() {
    return this.zodImport;
  }
}

Deno.test("BaseClientGenerator - constructor with default options", () => {
  const generator = new TestClientGenerator();
  expect(generator).toBeInstanceOf(TestClientGenerator);
  expect(generator.getClientImport()).toMatch(/^jsr:@brad-jones\/deno-net-open-api-client@.*$/);
  expect(generator.getZodImport()).toMatch(/^npm:zod@.*$/);
});

Deno.test("BaseClientGenerator - constructor with custom import specifiers", () => {
  const generator = new TestClientGenerator({
    importSpecifiers: {
      client: "my-custom-client",
      zod: "my-custom-zod",
    },
  });
  expect(generator.getClientImport()).toBe("my-custom-client");
  expect(generator.getZodImport()).toBe("my-custom-zod");
});

Deno.test("BaseClientGenerator - constructor with validation options", () => {
  const generator = new TestClientGenerator({
    validateRequests: true,
    validateResponses: true,
  });
  expect(generator).toBeInstanceOf(TestClientGenerator);
});

Deno.test("BaseClientGenerator - generate() returns string when no output path", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const result = await generator.generate(spec);
  expect(typeof result).toBe("string");
  expect(result).toBe("// test client");
});

Deno.test("BaseClientGenerator - generate() writes to file when output path provided", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const tempFile = await Deno.makeTempFile({ suffix: ".ts" });
  try {
    const result = await generator.generate(spec, tempFile);
    expect(result).toBeUndefined();

    const content = await Deno.readTextFile(tempFile);
    expect(content).toContain("// test client");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("BaseClientGenerator - generateFromFile() with JSON file", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const tempFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(tempFile, JSON.stringify(spec));
    const result = await generator.generateFromFile(tempFile);
    expect(typeof result).toBe("string");
    expect(result).toBe("// test client");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("BaseClientGenerator - generateFromFile() with YAML file", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const yamlContent = `
openapi: "3.0.0"
info:
  title: Test API
  version: 1.0.0
paths: {}
`;

  const tempFile = await Deno.makeTempFile({ suffix: ".yaml" });
  try {
    await Deno.writeTextFile(tempFile, yamlContent);
    const result = await generator.generateFromFile(tempFile);
    expect(typeof result).toBe("string");
    expect(result).toBe("// test client");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("BaseClientGenerator - generateFromFile() with YML extension", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const yamlContent = `
openapi: "3.0.0"
info:
  title: Test API
  version: 1.0.0
paths: {}
`;

  const tempFile = await Deno.makeTempFile({ suffix: ".yml" });
  try {
    await Deno.writeTextFile(tempFile, yamlContent);
    const result = await generator.generateFromFile(tempFile);
    expect(typeof result).toBe("string");
    expect(result).toBe("// test client");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("BaseClientGenerator - generateFromFile() throws on unknown file type", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const tempFile = await Deno.makeTempFile({ suffix: ".txt" });
  try {
    await Deno.writeTextFile(tempFile, "invalid");
    await expect(generator.generateFromFile(tempFile)).rejects.toThrow(
      "unknown file type",
    );
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("BaseClientGenerator - generateFromUrl() with file URL", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const tempFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(tempFile, JSON.stringify(spec));
    const fileUrl = new URL(`file://${tempFile}`);
    const result = await generator.generateFromUrl(fileUrl);
    expect(typeof result).toBe("string");
    expect(result).toBe("// test client");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("BaseClientGenerator - generateComponentSchemas() with no schemas", () => {
  const generator = new TestClientGenerator();
  const result = generator.testGenerateComponentSchemas(undefined);

  expect(result.code).toBe("");
  expect(result.typeGen).toBeInstanceOf(TypeScriptTypeGenerator);
  expect(result.zodGen).toBeInstanceOf(ZodSchemaGenerator);
});

Deno.test("BaseClientGenerator - generateComponentSchemas() with simple schemas", () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const schemas = {
    User: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
        age: { type: "number" as const },
      },
    },
  };

  const result = generator.testGenerateComponentSchemas(schemas);

  expect(result.code).toContain("export type User =");
  expect(result.code).toContain("name");
  expect(result.code).toContain("age");
});

Deno.test("BaseClientGenerator - generateComponentSchemas() generates Zod schemas when validation enabled", () => {
  const generator = new TestClientGenerator({
    validateRequests: true,
    fmtResult: false,
  });
  const schemas = {
    User: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
      },
    },
  };

  const result = generator.testGenerateComponentSchemas(schemas);

  expect(result.code).toContain("export type User =");
  expect(result.code).toContain("export const UserSchema");
  expect(result.code).toContain("z.ZodType<User>");
});

Deno.test("BaseClientGenerator - resolveParameters() with direct parameters", () => {
  const generator = new TestClientGenerator();
  const parameters = [
    { name: "id", in: "path", schema: { type: "string" } },
    { name: "filter", in: "query", schema: { type: "string" } },
  ];

  const result = generator.testResolveParameters(parameters);

  expect(result).toHaveLength(2);
  expect(result[0].name).toBe("id");
  expect(result[1].name).toBe("filter");
});

Deno.test("BaseClientGenerator - resolveParameters() resolves $ref parameters", () => {
  const generator = new TestClientGenerator();
  const parameters = [
    { $ref: "#/components/parameters/UserId" },
  ];
  const components = {
    parameters: {
      UserId: {
        name: "userId",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
    },
  };

  const result = generator.testResolveParameters(parameters, components);

  expect(result).toHaveLength(1);
  expect(result[0].name).toBe("userId");
  expect(result[0].in).toBe("path");
});

Deno.test("BaseClientGenerator - generateOperationJSDoc() with summary only", () => {
  const generator = new TestClientGenerator();
  const operation = {
    summary: "Get user by ID",
  };

  const result = generator.testGenerateOperationJSDoc(operation);

  expect(result).toBe("/**\n * Get user by ID\n */");
});

Deno.test("BaseClientGenerator - generateOperationJSDoc() with description only", () => {
  const generator = new TestClientGenerator();
  const operation = {
    description: "Retrieves a user by their unique identifier",
  };

  const result = generator.testGenerateOperationJSDoc(operation);

  expect(result).toBe(
    "/**\n * Retrieves a user by their unique identifier\n */",
  );
});

Deno.test("BaseClientGenerator - generateOperationJSDoc() with both summary and description", () => {
  const generator = new TestClientGenerator();
  const operation = {
    summary: "Get user",
    description: "Retrieves a user by their unique identifier",
  };

  const result = generator.testGenerateOperationJSDoc(operation);

  expect(result).toContain("Get user");
  expect(result).toContain("Retrieves a user by their unique identifier");
});

Deno.test("BaseClientGenerator - generateOperationJSDoc() with multiline description", () => {
  const generator = new TestClientGenerator();
  const operation = {
    description: "Line 1\nLine 2\nLine 3",
  };

  const result = generator.testGenerateOperationJSDoc(operation);

  expect(result).toContain("Line 1");
  expect(result).toContain("Line 2");
  expect(result).toContain("Line 3");
});

Deno.test("BaseClientGenerator - generateOperationJSDoc() returns null when no docs", () => {
  const generator = new TestClientGenerator();
  const operation = {};

  const result = generator.testGenerateOperationJSDoc(operation);

  expect(result).toBeNull();
});

Deno.test("BaseClientGenerator - generateParameterGroupTypeInline() with simple parameters", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const parameters = [
    { name: "id", required: true, schema: { type: "string" } },
    { name: "filter", required: false, schema: { type: "string" } },
  ];

  const result = generator.testGenerateParameterGroupTypeInline(
    parameters,
    typeGen,
  );

  expect(result).toContain("id: string");
  expect(result).toContain("filter?: string");
});

Deno.test("BaseClientGenerator - generateParameterGroupTypeInline() with parameter descriptions", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const parameters = [
    {
      name: "id",
      required: true,
      schema: { type: "string" },
      description: "User ID",
    },
  ];

  const result = generator.testGenerateParameterGroupTypeInline(
    parameters,
    typeGen,
  );

  expect(result).toContain("User ID");
  expect(result).toContain("id: string");
});

Deno.test("BaseClientGenerator - generateParameterGroupTypeInline() quotes special character names", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const parameters = [
    { name: "user-id", required: true, schema: { type: "string" } },
    { name: "content.type", required: true, schema: { type: "string" } },
  ];

  const result = generator.testGenerateParameterGroupTypeInline(
    parameters,
    typeGen,
  );

  expect(result).toContain('"user-id": string');
  expect(result).toContain('"content.type": string');
});

Deno.test("BaseClientGenerator - generateParameterGroupTypeInline() returns empty object for no parameters", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);

  const result = generator.testGenerateParameterGroupTypeInline([], typeGen);

  expect(result).toBe("{}");
});

Deno.test("BaseClientGenerator - generateRequestBodyTypeInline() with JSON content", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const requestBody = {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      },
    },
  };

  const result = generator.testGenerateRequestBodyTypeInline(
    requestBody,
    typeGen,
  );

  expect(result).toContain("name");
  expect(result).not.toBeNull();
});

Deno.test("BaseClientGenerator - generateRequestBodyTypeInline() returns null for no content", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const requestBody = {};

  const result = generator.testGenerateRequestBodyTypeInline(
    requestBody,
    typeGen,
  );

  expect(result).toBeNull();
});

Deno.test("BaseClientGenerator - hasAllOptionalProperties() for object with all optional", () => {
  const generator = new TestClientGenerator();
  const schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: [],
  };

  const result = generator.testHasAllOptionalProperties(schema);

  expect(result).toBe(true);
});

Deno.test("BaseClientGenerator - hasAllOptionalProperties() for object with required properties", () => {
  const generator = new TestClientGenerator();
  const schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: ["name"],
  };

  const result = generator.testHasAllOptionalProperties(schema);

  expect(result).toBe(false);
});

Deno.test("BaseClientGenerator - hasAllOptionalProperties() for primitive types", () => {
  const generator = new TestClientGenerator();

  expect(generator.testHasAllOptionalProperties({ type: "string" })).toBe(
    false,
  );
  expect(generator.testHasAllOptionalProperties({ type: "number" })).toBe(
    false,
  );
  expect(generator.testHasAllOptionalProperties({ type: "boolean" })).toBe(
    false,
  );
  expect(generator.testHasAllOptionalProperties({ type: "array" })).toBe(false);
});

Deno.test("BaseClientGenerator - hasAllOptionalProperties() resolves $ref", () => {
  const generator = new TestClientGenerator();
  const schema = {
    $ref: "#/components/schemas/User",
  };
  const componentSchemas = {
    User: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: [],
    },
  };

  const result = generator.testHasAllOptionalProperties(
    schema,
    componentSchemas,
  );

  expect(result).toBe(true);
});

Deno.test("BaseClientGenerator - generateResponseTypeInline() with simple response", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  };

  const result = generator.testGenerateResponseTypeInline(operation, typeGen);

  expect(result).toContain("200");
  expect(result).toContain("body");
  expect(result).toContain("message");
});

Deno.test("BaseClientGenerator - generateResponseTypeInline() with response headers", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
        headers: {
          "X-Request-Id": {
            schema: { type: "string" },
            description: "Request ID",
          },
        },
      },
    },
  };

  const result = generator.testGenerateResponseTypeInline(operation, typeGen);

  expect(result).toContain("headers");
  expect(result).toContain("X-Request-Id");
});

Deno.test("BaseClientGenerator - generateRequestSchema() with path and query parameters", () => {
  const generator = new TestClientGenerator({ validateRequests: true });
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {};
  const parameters = [
    { name: "id", in: "path", required: true, schema: { type: "string" } },
    {
      name: "filter",
      in: "query",
      required: false,
      schema: { type: "string" },
    },
  ];

  const result = generator.testGenerateRequestSchema(
    operation,
    parameters,
    schemaGen,
  );

  expect(result).toContain("path:");
  expect(result).toContain("query:");
  expect(result).toContain("z.object");
});

Deno.test("BaseClientGenerator - generateRequestSchema() returns null when no parameters", () => {
  const generator = new TestClientGenerator({ validateRequests: true });
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {};
  const parameters: Array<Record<string, unknown>> = [];

  const result = generator.testGenerateRequestSchema(
    operation,
    parameters,
    schemaGen,
  );

  expect(result).toBeNull();
});

Deno.test("BaseClientGenerator - generateParameterGroupSchema() generates Zod schema", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const parameters = [
    { name: "id", required: true, schema: { type: "string" } },
    { name: "filter", required: false, schema: { type: "string" } },
  ];

  const result = generator.testGenerateParameterGroupSchema(
    parameters,
    schemaGen,
  );

  expect(result).toContain("z.object");
  expect(result).toContain("id:");
  expect(result).toContain("filter:");
  expect(result).toContain(".optional()");
});

Deno.test("BaseClientGenerator - generateRequestBodySchema() with JSON schema", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const requestBody = {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      },
    },
  };

  const result = generator.testGenerateRequestBodySchema(
    requestBody,
    schemaGen,
  );

  expect(result).toContain("z.object");
  expect(result).not.toBeNull();
});

Deno.test("BaseClientGenerator - generateResponseSchema() generates Zod schema", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {
    responses: {
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  };

  const result = generator.testGenerateResponseSchema(operation, schemaGen);

  expect(result).toContain("200");
  expect(result).toContain("body:");
  expect(result).toContain("z.object");
});

Deno.test("BaseClientGenerator - generateParameterMetadata() returns null for default styles", () => {
  const generator = new TestClientGenerator();
  const parameters = [
    { name: "id", in: "path", style: "simple", explode: false },
    { name: "filter", in: "query", style: "form", explode: true },
  ];

  const result = generator.testGenerateParameterMetadata(parameters);

  expect(result).toBeNull();
});

Deno.test("BaseClientGenerator - generateParameterMetadata() returns metadata for non-default styles", () => {
  const generator = new TestClientGenerator();
  const parameters = [
    { name: "id", in: "path", style: "matrix", explode: true },
  ];

  const result = generator.testGenerateParameterMetadata(parameters);

  expect(result).not.toBeNull();
  expect(result).toContain("matrix");
});

Deno.test("BaseClientGenerator - isDefaultParameterStyle() for path parameters", () => {
  const generator = new TestClientGenerator();

  expect(generator.testIsDefaultParameterStyle("path", "simple", false)).toBe(
    true,
  );
  expect(generator.testIsDefaultParameterStyle("path", "simple")).toBe(true);
  expect(generator.testIsDefaultParameterStyle("path", undefined, false)).toBe(
    true,
  );
  expect(generator.testIsDefaultParameterStyle("path", "matrix", false)).toBe(
    false,
  );
});

Deno.test("BaseClientGenerator - isDefaultParameterStyle() for query parameters", () => {
  const generator = new TestClientGenerator();

  expect(generator.testIsDefaultParameterStyle("query", "form", true)).toBe(
    true,
  );
  expect(generator.testIsDefaultParameterStyle("query", "form")).toBe(true);
  expect(generator.testIsDefaultParameterStyle("query", undefined, true)).toBe(
    true,
  );
  expect(generator.testIsDefaultParameterStyle("query", "form", false)).toBe(
    false,
  );
});

Deno.test("BaseClientGenerator - getDefaultStyle() for different locations", () => {
  const generator = new TestClientGenerator();

  expect(generator.testGetDefaultStyle("path")).toBe("simple");
  expect(generator.testGetDefaultStyle("query")).toBe("form");
  expect(generator.testGetDefaultStyle("header")).toBe("simple");
  expect(generator.testGetDefaultStyle("cookie")).toBe("form");
});

Deno.test("BaseClientGenerator - getDefaultExplode() for different locations", () => {
  const generator = new TestClientGenerator();

  expect(generator.testGetDefaultExplode("path")).toBe(false);
  expect(generator.testGetDefaultExplode("query")).toBe(true);
  expect(generator.testGetDefaultExplode("header")).toBe(false);
  expect(generator.testGetDefaultExplode("cookie")).toBe(true);
});

Deno.test("BaseClientGenerator - buildRequestSignature() with no parameters", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {};
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users",
    "get",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(false);
  expect(result.requestType).toBe("");
});

Deno.test("BaseClientGenerator - buildRequestSignature() with path parameters", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users/{id}",
    "get",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("path:");
  expect(result.requestType).toContain("id");
  expect(result.requestType).not.toContain("request?"); // Required param
});

Deno.test("BaseClientGenerator - buildRequestSignature() with optional query parameters only", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    parameters: [
      {
        name: "filter",
        in: "query",
        required: false,
        schema: { type: "string" },
      },
    ],
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users",
    "get",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("request?:"); // All optional
  expect(result.requestType).toContain("query?:");
});

Deno.test("BaseClientGenerator - buildRequestSignature() with request body", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
          },
        },
      },
    },
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users",
    "post",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("body:");
  expect(result.requestType).not.toContain("body?:"); // Required body
});

Deno.test("BaseClientGenerator - buildRequestSignature() with optional request body", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    requestBody: {
      required: false,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
          },
        },
      },
    },
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users",
    "post",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("body?:"); // Optional body
});

Deno.test("BaseClientGenerator - buildRequestSignature() merges path and operation parameters", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    parameters: [
      {
        name: "filter",
        in: "query",
        required: false,
        schema: { type: "string" },
      },
    ],
  };
  const pathItem = {
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
  };

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users/{id}",
    "get",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("path:");
  expect(result.requestType).toContain("query?:");
  expect(result.requestType).toContain("id");
  expect(result.requestType).toContain("filter");
});

Deno.test("BaseClientGenerator - generateOperationMetadata() includes path and method", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {};
  const pathItem = {};

  const result = generator.testGenerateOperationMetadata(
    schemaGen,
    "/users",
    "get",
    operation,
    pathItem,
  );

  expect(result).toContain('path: "/users"');
  expect(result).toContain('method: "get"');
});

Deno.test("BaseClientGenerator - generateOperationMetadata() includes request schema when validation enabled", () => {
  const generator = new TestClientGenerator({ validateRequests: true });
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
  };
  const pathItem = {};

  const result = generator.testGenerateOperationMetadata(
    schemaGen,
    "/users/{id}",
    "get",
    operation,
    pathItem,
  );

  expect(result).toContain("requestSchema:");
  expect(result).toContain("z.object");
});

Deno.test("BaseClientGenerator - generateOperationMetadata() includes response schema when validation enabled", () => {
  const generator = new TestClientGenerator({ validateResponses: true });
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {
    responses: {
      "200": {
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      },
    },
  };
  const pathItem = {};

  const result = generator.testGenerateOperationMetadata(
    schemaGen,
    "/users",
    "get",
    operation,
    pathItem,
  );

  expect(result).toContain("responseSchema:");
  expect(result).toContain("200");
});

Deno.test("BaseClientGenerator - generateFromFile() writes to output file (JSON)", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const tempInputFile = await Deno.makeTempFile({ suffix: ".json" });
  const tempOutputFile = await Deno.makeTempFile({ suffix: ".ts" });
  try {
    await Deno.writeTextFile(tempInputFile, JSON.stringify(spec));
    const result = await generator.generateFromFile(
      tempInputFile,
      tempOutputFile,
    );
    expect(result).toBeUndefined();

    const content = await Deno.readTextFile(tempOutputFile);
    expect(content).toContain("// test client");
  } finally {
    await Deno.remove(tempInputFile);
    await Deno.remove(tempOutputFile);
  }
});

Deno.test("BaseClientGenerator - generateFromFile() writes to output file (YAML)", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const yamlContent = `
openapi: "3.0.0"
info:
  title: Test API
  version: 1.0.0
paths: {}
`;

  const tempInputFile = await Deno.makeTempFile({ suffix: ".yaml" });
  const tempOutputFile = await Deno.makeTempFile({ suffix: ".ts" });
  try {
    await Deno.writeTextFile(tempInputFile, yamlContent);
    const result = await generator.generateFromFile(
      tempInputFile,
      tempOutputFile,
    );
    expect(result).toBeUndefined();

    const content = await Deno.readTextFile(tempOutputFile);
    expect(content).toContain("// test client");
  } finally {
    await Deno.remove(tempInputFile);
    await Deno.remove(tempOutputFile);
  }
});

Deno.test("BaseClientGenerator - generateFromUrl() with file URL and output path", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const tempInputFile = await Deno.makeTempFile({ suffix: ".json" });
  const tempOutputFile = await Deno.makeTempFile({ suffix: ".ts" });
  try {
    await Deno.writeTextFile(tempInputFile, JSON.stringify(spec));
    const fileUrl = new URL(`file://${tempInputFile}`);
    const result = await generator.generateFromUrl(fileUrl, tempOutputFile);
    expect(result).toBeUndefined();

    const content = await Deno.readTextFile(tempOutputFile);
    expect(content).toContain("// test client");
  } finally {
    await Deno.remove(tempInputFile);
    await Deno.remove(tempOutputFile);
  }
});

Deno.test("BaseClientGenerator - generateFromUrl() with string URL converts to URL", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const tempFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(tempFile, JSON.stringify(spec));
    const fileUrlString = `file://${tempFile}`;
    const result = await generator.generateFromUrl(fileUrlString);
    expect(typeof result).toBe("string");
    expect(result).toBe("// test client");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("BaseClientGenerator - generateParameterGroupTypeInline() with parameter with no schema", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const parameters = [
    { name: "id", required: true, example: "test-id" },
  ];

  const result = generator.testGenerateParameterGroupTypeInline(
    parameters,
    typeGen,
  );

  expect(result).toContain("id:");
});

Deno.test("BaseClientGenerator - generateParameterGroupTypeInline() with header parameters", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const parameters = [
    {
      name: "Authorization",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ];

  const result = generator.testGenerateParameterGroupTypeInline(
    parameters,
    typeGen,
  );

  expect(result).toContain("Authorization: string");
});

Deno.test("BaseClientGenerator - buildRequestSignature() with header parameters", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    parameters: [
      {
        name: "X-API-Key",
        in: "header",
        required: true,
        schema: { type: "string" },
      },
    ],
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users",
    "get",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("headers:");
  expect(result.requestType).toContain("X-API-Key");
});

Deno.test("BaseClientGenerator - buildRequestSignature() with cookie parameters", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    parameters: [
      {
        name: "session",
        in: "cookie",
        required: false,
        schema: { type: "string" },
      },
    ],
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users",
    "get",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("cookies?:");
  expect(result.requestType).toContain("session");
});

Deno.test("BaseClientGenerator - buildRequestSignature() with all parameter types", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
      {
        name: "filter",
        in: "query",
        required: false,
        schema: { type: "string" },
      },
      {
        name: "X-API-Key",
        in: "header",
        required: true,
        schema: { type: "string" },
      },
      {
        name: "session",
        in: "cookie",
        required: false,
        schema: { type: "string" },
      },
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
          },
        },
      },
    },
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users/{id}",
    "post",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("path:");
  expect(result.requestType).toContain("query?:");
  expect(result.requestType).toContain("headers:");
  expect(result.requestType).toContain("cookies?:");
  expect(result.requestType).toContain("body:");
});

Deno.test("BaseClientGenerator - generateRequestSchema() with header and cookie parameters", () => {
  const generator = new TestClientGenerator({ validateRequests: true });
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {};
  const parameters = [
    {
      name: "X-API-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "session",
      in: "cookie",
      required: false,
      schema: { type: "string" },
    },
  ];

  const result = generator.testGenerateRequestSchema(
    operation,
    parameters,
    schemaGen,
  );

  expect(result).toContain("headers:");
  expect(result).toContain("cookies:");
  expect(result).toContain("z.object");
});

Deno.test("BaseClientGenerator - generateRequestSchema() with request body", () => {
  const generator = new TestClientGenerator({ validateRequests: true });
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
          },
        },
      },
    },
  };
  const parameters: Array<Record<string, unknown>> = [];

  const result = generator.testGenerateRequestSchema(
    operation,
    parameters,
    schemaGen,
  );

  expect(result).toContain("body:");
  expect(result).toContain("z.object");
});

Deno.test("BaseClientGenerator - generateRequestBodyTypeInline() returns null for non-JSON content", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const requestBody = {
    content: {
      "text/plain": {
        schema: { type: "string" },
      },
    },
  };

  const result = generator.testGenerateRequestBodyTypeInline(
    requestBody,
    typeGen,
    { path: "/test", method: "post" },
  );

  expect(result).toBe(
    '"WARN: application/json is the only supported content type"',
  );
});

Deno.test("BaseClientGenerator - generateRequestBodyTypeInline() infers schema from examples", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const requestBody = {
    content: {
      "application/json": {
        example: { name: "John", age: 30 },
      },
    },
  };

  const result = generator.testGenerateRequestBodyTypeInline(
    requestBody,
    typeGen,
  );

  expect(result).not.toBeNull();
  expect(result).toContain("name");
  expect(result).toContain("age");
});

Deno.test("BaseClientGenerator - generateResponseTypeInline() with default status", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    responses: {
      default: {
        description: "Default response",
        content: {
          "application/json": {
            schema: { type: "string" },
          },
        },
      },
    },
  };

  const result = generator.testGenerateResponseTypeInline(operation, typeGen);

  expect(result).toContain('"default"');
  expect(result).toContain("body:");
});

Deno.test("BaseClientGenerator - generateResponseTypeInline() without content", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    responses: {
      "204": {
        description: "No content",
      },
    },
  };

  const result = generator.testGenerateResponseTypeInline(operation, typeGen);

  expect(result).toContain("204");
  expect(result).toContain("body: unknown");
});

Deno.test("BaseClientGenerator - generateResponseTypeInline() infers schema from examples", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            example: { message: "success" },
          },
        },
      },
    },
  };

  const result = generator.testGenerateResponseTypeInline(operation, typeGen);

  expect(result).toContain("200");
  expect(result).toContain("body:");
  expect(result).toContain("message");
});

Deno.test("BaseClientGenerator - generateResponseSchema() with response headers", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {
    responses: {
      "200": {
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
        headers: {
          "X-Request-Id": {
            required: true,
            schema: { type: "string" },
          },
        },
      },
    },
  };

  const result = generator.testGenerateResponseSchema(operation, schemaGen);

  expect(result).toContain("200");
  expect(result).toContain("body:");
  expect(result).toContain("headers:");
});

Deno.test("BaseClientGenerator - generateResponseSchema() without content", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {
    responses: {
      "204": {
        description: "No content",
      },
    },
  };

  const result = generator.testGenerateResponseSchema(operation, schemaGen);

  expect(result).toContain("204");
  expect(result).toContain("body: z.unknown()");
});

Deno.test("BaseClientGenerator - generateComponentSchemas() handles schema with JSDoc", () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const schemas = {
    User: {
      type: "object" as const,
      description: "A user object",
      properties: {
        name: { type: "string" as const, description: "User's name" },
        email: {
          type: "string" as const,
          format: "email",
          description: "User's email",
        },
      },
    },
  };

  const result = generator.testGenerateComponentSchemas(schemas);

  expect(result.code).toContain("export type User =");
  expect(result.code).toContain("A user object");
  expect(result.code).toContain("User's name");
  expect(result.code).toContain("User's email");
});

Deno.test("BaseClientGenerator - generateComponentSchemas() handles schema with nested JSDoc", () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const schemas = {
    Product: {
      type: "object" as const,
      description: "A product with nested properties",
      properties: {
        details: {
          type: "object" as const,
          description: "Product details",
          properties: {
            name: { type: "string" as const },
            price: { type: "number" as const },
          },
        },
      },
    },
  };

  const result = generator.testGenerateComponentSchemas(schemas);

  expect(result.code).toContain("export type Product =");
  expect(result.code).toContain("A product with nested properties");
});

Deno.test("BaseClientGenerator - resolveParameters() warns on unresolvable $ref", () => {
  const generator = new TestClientGenerator();
  const parameters = [
    { $ref: "#/components/parameters/NonExistent" },
  ];
  const components = {
    parameters: {
      ExistingParam: {
        name: "existing",
        in: "query",
        schema: { type: "string" },
      },
    },
  };

  const result = generator.testResolveParameters(parameters, components);

  expect(result).toHaveLength(0);
});

Deno.test("BaseClientGenerator - resolveParameters() warns on unsupported $ref format", () => {
  const generator = new TestClientGenerator();
  const parameters = [
    { $ref: "#/definitions/SomeParam" },
  ];
  const components = {};

  const result = generator.testResolveParameters(parameters, components);

  expect(result).toHaveLength(0);
});

Deno.test("BaseClientGenerator - hasAllOptionalProperties() for object with no properties", () => {
  const generator = new TestClientGenerator();
  const schema = {
    type: "object",
  };

  const result = generator.testHasAllOptionalProperties(schema);

  expect(result).toBe(false);
});

Deno.test("BaseClientGenerator - hasAllOptionalProperties() for composition types", () => {
  const generator = new TestClientGenerator();

  const allOfSchema = {
    allOf: [{ type: "object" }, { type: "object" }],
  };
  expect(generator.testHasAllOptionalProperties(allOfSchema)).toBe(false);

  const oneOfSchema = {
    oneOf: [{ type: "string" }, { type: "number" }],
  };
  expect(generator.testHasAllOptionalProperties(oneOfSchema)).toBe(false);

  const anyOfSchema = {
    anyOf: [{ type: "string" }, { type: "number" }],
  };
  expect(generator.testHasAllOptionalProperties(anyOfSchema)).toBe(false);
});

Deno.test("BaseClientGenerator - hasAllOptionalProperties() with unresolvable $ref", () => {
  const generator = new TestClientGenerator();
  const schema = {
    $ref: "#/components/schemas/NonExistent",
  };
  const componentSchemas = {
    ExistingSchema: { type: "object" },
  };

  const result = generator.testHasAllOptionalProperties(
    schema,
    componentSchemas,
  );

  expect(result).toBe(false);
});

Deno.test("BaseClientGenerator - generateRequestBodySchema() returns null when no content", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const requestBody = {};

  const result = generator.testGenerateRequestBodySchema(
    requestBody,
    schemaGen,
  );

  expect(result).toBeNull();
});

Deno.test("BaseClientGenerator - generateRequestBodySchema() returns null when no JSON content", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const requestBody = {
    content: {
      "text/plain": {
        schema: { type: "string" },
      },
    },
  };

  const result = generator.testGenerateRequestBodySchema(
    requestBody,
    schemaGen,
  );

  expect(result).toBeNull();
});

Deno.test("BaseClientGenerator - generateRequestBodySchema() infers schema from examples", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const requestBody = {
    content: {
      "application/json": {
        example: { foo: "bar", count: 42 },
      },
    },
  };

  const result = generator.testGenerateRequestBodySchema(
    requestBody,
    schemaGen,
  );

  expect(result).not.toBeNull();
  expect(result).toContain("z.object");
});

Deno.test("BaseClientGenerator - generateParameterGroupSchema() quotes special character names", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const parameters = [
    { name: "user-id", required: true, schema: { type: "string" } },
    { name: "content.type", required: false, schema: { type: "string" } },
  ];

  const result = generator.testGenerateParameterGroupSchema(
    parameters,
    schemaGen,
  );

  expect(result).toContain('"user-id"');
  expect(result).toContain('"content.type"');
});

Deno.test("BaseClientGenerator - generateParameterGroupSchema() with parameter with no schema", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const parameters = [
    { name: "id", required: true, example: 123 },
  ];

  const result = generator.testGenerateParameterGroupSchema(
    parameters,
    schemaGen,
  );

  expect(result).toContain("id:");
  expect(result).toContain("z.object");
});

Deno.test("BaseClientGenerator - generateOperationMetadata() with non-default parameter styles", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {
    parameters: [
      {
        name: "id",
        in: "path",
        style: "matrix",
        explode: true,
        schema: { type: "string" },
      },
    ],
  };
  const pathItem = {};

  const result = generator.testGenerateOperationMetadata(
    schemaGen,
    "/users/{id}",
    "get",
    operation,
    pathItem,
  );

  expect(result).toContain("parameters:");
  expect(result).toContain("matrix");
});

Deno.test("BaseClientGenerator - getDefaultStyle() for unknown location", () => {
  const generator = new TestClientGenerator();

  const result = generator.testGetDefaultStyle("unknown");

  expect(result).toBe("simple");
});

Deno.test("BaseClientGenerator - getDefaultExplode() for unknown location", () => {
  const generator = new TestClientGenerator();

  const result = generator.testGetDefaultExplode("unknown");

  expect(result).toBe(false);
});

Deno.test("BaseClientGenerator - buildRequestSignature() with body having all optional properties", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    requestBody: {
      required: false,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
            required: [],
          },
        },
      },
    },
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users",
    "post",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("body?:"); // Body is optional
});

Deno.test("BaseClientGenerator - buildRequestSignature() with required body having required properties", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const typeGen = new TypeScriptTypeGenerator(sanitizer);
  const operation = {
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
          },
        },
      },
    },
  };
  const pathItem = {};

  const result = generator.testBuildRequestSignature(
    typeGen,
    "/users",
    "post",
    operation,
    pathItem,
  );

  expect(result.hasRequest).toBe(true);
  expect(result.requestType).toContain("body:");
  expect(result.requestType).not.toContain("body?:");
});

Deno.test("BaseClientGenerator - generateResponseSchema() infers schema from examples", () => {
  const generator = new TestClientGenerator();
  const sanitizer = new SchemaSanitizer();
  const schemaGen = new ZodSchemaGenerator(sanitizer);
  const operation = {
    responses: {
      "200": {
        content: {
          "application/json": {
            example: { success: true, data: [] },
          },
        },
      },
    },
  };

  const result = generator.testGenerateResponseSchema(operation, schemaGen);

  expect(result).toContain("200");
  expect(result).toContain("body:");
});

Deno.test("BaseClientGenerator - generateFromUrl() with HTTP URL (success)", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  // Mock fetch to return our spec
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_url: string | URL | Request) => {
      return Promise.resolve(
        new Response(JSON.stringify(spec), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };

    const result = await generator.generateFromUrl(
      "https://api.example.com/openapi.json",
    );
    expect(typeof result).toBe("string");
    expect(result).toBe("// test client");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("BaseClientGenerator - generateFromUrl() with HTTP URL (failure)", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });

  // Mock fetch to return 404
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_url: string | URL | Request) => {
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    };

    await expect(
      generator.generateFromUrl("https://api.example.com/openapi.json"),
    ).rejects.toThrow("fetch of https://api.example.com/openapi.json failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("BaseClientGenerator - generateFromUrl() with HTTP URL and output path", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const spec = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };

  const tempOutputFile = await Deno.makeTempFile({ suffix: ".ts" });

  // Mock fetch to return our spec
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_url: string | URL | Request) => {
      return Promise.resolve(
        new Response(JSON.stringify(spec), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    };

    const result = await generator.generateFromUrl(
      "https://api.example.com/openapi.json",
      tempOutputFile,
    );
    expect(result).toBeUndefined();

    const content = await Deno.readTextFile(tempOutputFile);
    expect(content).toContain("// test client");
  } finally {
    globalThis.fetch = originalFetch;
    await Deno.remove(tempOutputFile);
  }
});

Deno.test("BaseClientGenerator - generateFromUrl() with HTTP URL returning YAML", async () => {
  const generator = new TestClientGenerator({ fmtResult: false });
  const yamlContent = `
openapi: "3.0.0"
info:
  title: Test API
  version: 1.0.0
paths: {}
`;

  // Mock fetch to return YAML
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_url: string | URL | Request) => {
      return Promise.resolve(
        new Response(yamlContent, {
          status: 200,
          headers: { "Content-Type": "application/yaml" },
        }),
      );
    };

    const result = await generator.generateFromUrl(
      "https://api.example.com/openapi.yaml",
    );
    expect(typeof result).toBe("string");
    expect(result).toBe("// test client");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
