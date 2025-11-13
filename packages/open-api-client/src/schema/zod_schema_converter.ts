import type { OpenAPISchemaObjectSchema } from "../types/mod.ts";
import type { ISchemaConverter } from "./i_schema_converter.ts";
import type { SchemaSanitizer } from "./schema_sanitizer.ts";

/**
 * Converts OpenAPI schema objects into Zod schema definitions.
 *
 * This class implements the ISchemaConverter interface and provides comprehensive
 * support for converting OpenAPI 3.x schema definitions into Zod validation schemas.
 * It handles all OpenAPI schema types and translates validation constraints into
 * equivalent Zod validators.
 *
 * Features:
 * - Supports all OpenAPI schema types (string, number, integer, boolean, null, object, array)
 * - Handles composition keywords (oneOf, anyOf, allOf) as Zod unions and intersections
 * - Resolves $ref references with support for circular dependencies using z.lazy()
 * - Translates validation constraints (min/max length, pattern, numeric ranges, etc.)
 * - Supports nullable types, default values, and enums
 * - Generates schemas for both inline and named types
 * - Properly handles additionalProperties with catchall or strict mode
 *
 * @example
 * ```ts
 * const sanitizer = new SchemaSanitizer({
 *   "User": {
 *     type: "object",
 *     properties: { name: { type: "string", minLength: 1 } },
 *     required: ["name"]
 *   }
 * });
 * const generator = new ZodSchemaGenerator(sanitizer);
 *
 * const schema = { type: "string", minLength: 3, maxLength: 50 };
 * const zodSchema = generator.generate(schema);
 * // Returns: "z.string().min(3).max(50)"
 * ```
 */
export class ZodSchemaGenerator implements ISchemaConverter {
  /**
   * Creates a new ZodSchemaGenerator instance.
   *
   * @param schemaSanitizer - The schema sanitizer used to resolve and sanitize schema references
   */
  constructor(private schemaSanitizer: SchemaSanitizer) {}

  /**
   * Generates a Zod schema string from an OpenAPI schema object.
   *
   * This method is the main entry point for schema generation. It handles all OpenAPI schema
   * constructs including $ref references, composition keywords (oneOf, anyOf, allOf),
   * enums, primitive types with validation constraints, arrays, and objects. Circular
   * references are automatically handled using z.lazy().
   *
   * @param schema - The OpenAPI schema object to convert
   * @param inline - If true, generates inline schema references; if false, uses named schema references. Defaults to false.
   * @returns A Zod schema definition string (e.g., "z.string().min(3)" or "z.object({...})")
   *
   * @example
   * ```ts
   * // Simple string with constraints
   * generator.generate({ type: "string", minLength: 5, maxLength: 100 });
   * // Returns: "z.string().min(5).max(100)"
   *
   * // Number with range validation
   * generator.generate({ type: "number", minimum: 0, maximum: 100 });
   * // Returns: "z.number().min(0).max(100)"
   *
   * // Object with required and optional properties
   * generator.generate({
   *   type: "object",
   *   properties: {
   *     id: { type: "integer" },
   *     name: { type: "string" }
   *   },
   *   required: ["id"]
   * });
   * // Returns: "z.object({\n  id: z.number().int(),\n  name: z.string().optional()\n})"
   *
   * // Array with item constraints
   * generator.generate({
   *   type: "array",
   *   items: { type: "string" },
   *   minItems: 1,
   *   maxItems: 10
   * });
   * // Returns: "z.array(z.string()).min(1).max(10)"
   *
   * // Enum
   * generator.generate({ enum: ["active", "inactive", "pending"] });
   * // Returns: 'z.enum(["active", "inactive", "pending"])'
   *
   * // Union type
   * generator.generate({ oneOf: [{ type: "string" }, { type: "number" }] });
   * // Returns: "z.union([z.string(), z.number()])"
   *
   * // Reference to component schema
   * generator.generate({ $ref: "#/components/schemas/User" });
   * // Returns: "UserSchema" or "z.lazy((): z.ZodType<User> => UserSchema)" for circular refs
   *
   * // Nullable type
   * generator.generate({ type: "string", nullable: true });
   * // Returns: "z.string().nullable()"
   * ```
   */
  generate(schema: OpenAPISchemaObjectSchema, inline = false): string {
    // Handle $ref
    if (schema.$ref && typeof schema.$ref === "string") {
      return this.handleRef(schema.$ref, inline);
    }

    // Handle composition
    if ("oneOf" in schema && schema.oneOf) {
      return this.handleOneOf(schema.oneOf, inline);
    }

    if ("anyOf" in schema && schema.anyOf) {
      return this.handleAnyOf(schema.anyOf, inline);
    }

    if ("allOf" in schema && schema.allOf) {
      return this.handleAllOf(schema.allOf, inline);
    }

    // Handle enum
    if ("enum" in schema && Array.isArray(schema.enum)) {
      return this.handleEnum(schema.enum);
    }

    // Handle type
    if ("type" in schema) {
      const type = schema.type;

      // Handle multiple types (JSON Schema 2019-09+ and OpenAPI 3.1)
      if (Array.isArray(type)) {
        return this.handleMultipleTypes(schema, type, inline);
      }

      // Handle nullable (OpenAPI 3.0 style)
      const nullable = schema.nullable === true;

      // Handle specific types
      if (type === "string") {
        return this.handleString(schema, nullable);
      }

      if (type === "number") {
        return this.handleNumber(schema, nullable);
      }

      if (type === "integer") {
        return this.handleInteger(schema, nullable);
      }

      if (type === "boolean") {
        return this.handleBoolean(nullable);
      }

      if (type === "null") {
        return "z.null()";
      }

      if (type === "array") {
        return this.handleArray(schema, inline, nullable);
      }

      if (type === "object") {
        return this.handleObject(schema, inline, nullable);
      }
    }

    // No type specified or unknown type
    return "z.unknown()";
  }

  private handleRef(ref: string, inline: boolean): string {
    // Extract the schema name from the reference path
    // Expected format: #/components/schemas/SchemaName
    const parts = ref.split("/");
    const schemaName = parts[parts.length - 1];

    // Get the sanitized name if mapping exists, otherwise use original
    const sanitizedName = this.schemaSanitizer.sanitizeSchemaName(schemaName);

    // Component schemas should ALWAYS be referenced by name, never inlined
    // This ensures circular references work and schemas are reusable
    if (ref.startsWith("#/components/schemas/")) {
      // Check if the schema actually exists in components
      if (
        !this.schemaSanitizer.schemas ||
        !this.schemaSanitizer.schemas[schemaName]
      ) {
        // If we can't resolve the ref, return unknown
        return "z.unknown()";
      }

      // Use z.lazy() only for schemas that are part of circular dependencies
      // Add explicit return type annotation to avoid TypeScript errors
      if (this.schemaSanitizer.cyclicSchemas?.has(schemaName)) {
        return `z.lazy((): z.ZodType<${sanitizedName}> => ${sanitizedName}Schema)`;
      }

      // For non-cyclic schemas, use direct reference
      return `${sanitizedName}Schema`;
    }

    // For non-component refs (if they exist), use the inline parameter
    if (!inline) {
      if (this.schemaSanitizer.cyclicSchemas?.has(schemaName)) {
        return `z.lazy((): z.ZodType<${sanitizedName}> => ${sanitizedName}Schema)`;
      }
      return `${sanitizedName}Schema`;
    }

    // Inline mode for non-component refs: try to resolve and generate the actual schema
    if (
      !this.schemaSanitizer.schemas || !this.schemaSanitizer.schemas[schemaName]
    ) {
      // If we can't resolve the ref, return unknown
      return "z.unknown()";
    }

    return this.generate(this.schemaSanitizer.schemas[schemaName], true);
  }

  private handleEnum(values: unknown[]): string {
    // If all values are strings, use z.enum()
    if (values.every((v) => typeof v === "string")) {
      const enumValues = values.map((v) => `"${v}"`).join(", ");
      return `z.enum([${enumValues}])`;
    }

    // For number or mixed enums, use z.union of literals
    const literals = values.map((v) => {
      if (typeof v === "string") {
        return `z.literal("${v}")`;
      }
      return `z.literal(${v})`;
    });

    return `z.union([${literals.join(", ")}])`;
  }

  private handleString(
    schema: OpenAPISchemaObjectSchema,
    nullable: boolean,
  ): string {
    let result = "z.string()";

    // Handle pattern (explicit validation)
    if ("pattern" in schema && typeof schema.pattern === "string") {
      result += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
    }

    // Handle string constraints
    if ("minLength" in schema && typeof schema.minLength === "number") {
      result += `.min(${schema.minLength})`;
    }

    if ("maxLength" in schema && typeof schema.maxLength === "number") {
      result += `.max(${schema.maxLength})`;
    }

    // Add default value if specified
    if ("default" in schema && schema.default !== undefined) {
      const defaultValue = typeof schema.default === "string" ? `"${schema.default}"` : String(schema.default);
      result += `.default(${defaultValue})`;
    }

    // Handle nullable
    if (nullable) {
      result += ".nullable()";
    }

    return result;
  }

  private handleNumber(
    schema: OpenAPISchemaObjectSchema,
    nullable: boolean,
  ): string {
    let result = "z.number()";

    // Handle number constraints
    if ("minimum" in schema && typeof schema.minimum === "number") {
      if (schema.exclusiveMinimum === true) {
        result += `.gt(${schema.minimum})`;
      } else {
        result += `.min(${schema.minimum})`;
      }
    } else if (
      "exclusiveMinimum" in schema &&
      typeof schema.exclusiveMinimum === "number"
    ) {
      // OpenAPI 3.1 style where exclusiveMinimum is a number
      result += `.gt(${schema.exclusiveMinimum})`;
    }

    if ("maximum" in schema && typeof schema.maximum === "number") {
      if (schema.exclusiveMaximum === true) {
        result += `.lt(${schema.maximum})`;
      } else {
        result += `.max(${schema.maximum})`;
      }
    } else if (
      "exclusiveMaximum" in schema &&
      typeof schema.exclusiveMaximum === "number"
    ) {
      // OpenAPI 3.1 style where exclusiveMaximum is a number
      result += `.lt(${schema.exclusiveMaximum})`;
    }

    if ("multipleOf" in schema && typeof schema.multipleOf === "number") {
      result += `.multipleOf(${schema.multipleOf})`;
    }

    // Add default value if specified
    if ("default" in schema && schema.default !== undefined) {
      result += `.default(${schema.default})`;
    }

    // Handle nullable
    if (nullable) {
      result += ".nullable()";
    }

    return result;
  }

  private handleInteger(
    schema: OpenAPISchemaObjectSchema,
    nullable: boolean,
  ): string {
    let result = "z.number().int()";

    // Handle number constraints
    if ("minimum" in schema && typeof schema.minimum === "number") {
      if (schema.exclusiveMinimum === true) {
        result += `.gt(${schema.minimum})`;
      } else {
        result += `.min(${schema.minimum})`;
      }
    } else if (
      "exclusiveMinimum" in schema &&
      typeof schema.exclusiveMinimum === "number"
    ) {
      result += `.gt(${schema.exclusiveMinimum})`;
    }

    if ("maximum" in schema && typeof schema.maximum === "number") {
      if (schema.exclusiveMaximum === true) {
        result += `.lt(${schema.maximum})`;
      } else {
        result += `.max(${schema.maximum})`;
      }
    } else if (
      "exclusiveMaximum" in schema &&
      typeof schema.exclusiveMaximum === "number"
    ) {
      result += `.lt(${schema.exclusiveMaximum})`;
    }

    if ("multipleOf" in schema && typeof schema.multipleOf === "number") {
      result += `.multipleOf(${schema.multipleOf})`;
    }

    // Add default value if specified
    if ("default" in schema && schema.default !== undefined) {
      result += `.default(${schema.default})`;
    }

    // Handle nullable
    if (nullable) {
      result += ".nullable()";
    }

    return result;
  }

  private handleBoolean(nullable: boolean): string {
    let result = "z.boolean()";

    if (nullable) {
      result += ".nullable()";
    }

    return result;
  }

  private handleArray(
    schema: OpenAPISchemaObjectSchema,
    inline: boolean,
    nullable: boolean,
  ): string {
    let result: string;
    if ("items" in schema && schema.items) {
      result = `z.array(${this.generate(schema.items, inline)})`;
    } else {
      result = "z.array(z.unknown())";
    }

    // Handle array constraints
    if ("minItems" in schema && typeof schema.minItems === "number") {
      result += `.min(${schema.minItems})`;
    }

    if ("maxItems" in schema && typeof schema.maxItems === "number") {
      result += `.max(${schema.maxItems})`;
    }

    // Add default value if specified
    if (
      "default" in schema && schema.default !== undefined &&
      Array.isArray(schema.default)
    ) {
      const defaultValue = JSON.stringify(schema.default);
      result += `.default(${defaultValue})`;
    }

    // Handle nullable
    if (nullable) {
      result += ".nullable()";
    }

    return result;
  }

  private handleObject(
    schema: OpenAPISchemaObjectSchema,
    inline: boolean,
    nullable: boolean,
  ): string {
    const properties = "properties" in schema ? schema.properties : {};
    const required = "required" in schema ? schema.required : [];
    const additionalProperties = "additionalProperties" in schema ? schema.additionalProperties : undefined;

    // Handle empty object with additionalProperties as record
    if (!properties || Object.keys(properties).length === 0) {
      if (additionalProperties === true) {
        return nullable ? "z.record(z.string(), z.unknown()).nullable()" : "z.record(z.string(), z.unknown())";
      }

      if (additionalProperties && typeof additionalProperties === "object") {
        const valueSchema = this.generate(
          additionalProperties,
          inline,
        );
        return nullable ? `z.record(z.string(), ${valueSchema}).nullable()` : `z.record(z.string(), ${valueSchema})`;
      }

      return nullable ? "z.object({}).nullable()" : "z.object({})";
    }

    // Build object schema
    const propSchemas: string[] = [];

    for (const [propName, propSchema] of Object.entries(properties)) {
      const isRequired = required?.includes(propName);
      let propSchemaStr = this.generate(propSchema, inline);

      // Add .optional() if not required
      if (!isRequired) {
        propSchemaStr += ".optional()";
      }

      // Quote property names that aren't valid JavaScript identifiers
      const quotedPropName = this.needsQuoting(propName) ? `"${propName}"` : propName;

      propSchemas.push(`  ${quotedPropName}: ${propSchemaStr}`);
    }

    let result = `z.object({\n${propSchemas.join(",\n")}\n})`;

    // Handle additionalProperties
    if (additionalProperties === true) {
      result += ".catchall(z.unknown())";
    } else if (additionalProperties === false) {
      result += ".strict()";
    } else if (
      additionalProperties && typeof additionalProperties === "object"
    ) {
      const valueSchema = this.generate(
        additionalProperties,
        inline,
      );
      result += `.catchall(${valueSchema})`;
    }

    // Handle nullable
    if (nullable) {
      result += ".nullable()";
    }

    return result;
  }

  private handleOneOf(
    schemas: OpenAPISchemaObjectSchema[],
    inline: boolean,
  ): string {
    const schemaStrings = schemas.map((s) => this.generate(s, inline));
    return `z.union([${schemaStrings.join(", ")}])`;
  }

  private handleAnyOf(
    schemas: OpenAPISchemaObjectSchema[],
    inline: boolean,
  ): string {
    // anyOf is similar to oneOf in Zod - both become union types
    return this.handleOneOf(schemas, inline);
  }

  private handleAllOf(
    schemas: OpenAPISchemaObjectSchema[],
    inline: boolean,
  ): string {
    // Try to merge objects when possible
    const allObjects = schemas.every((s) => {
      if (s.$ref) return true; // Refs might be objects
      if ("type" in s && s.type === "object") {
        return true;
      }
      return false;
    });

    if (allObjects && schemas.length > 0) {
      // Merge all schemas using .and()
      const firstSchema = this.generate(schemas[0], inline);
      let result = firstSchema;

      for (let i = 1; i < schemas.length; i++) {
        const nextSchema = this.generate(schemas[i], inline);
        result = `${result}.and(${nextSchema})`;
      }

      return result;
    }

    // Fallback: use intersection with .and()
    const firstSchema = this.generate(schemas[0], inline);
    let result = firstSchema;

    for (let i = 1; i < schemas.length; i++) {
      const nextSchema = this.generate(schemas[i], inline);
      result = `${result}.and(${nextSchema})`;
    }

    return result;
  }

  private handleMultipleTypes(
    schema: OpenAPISchemaObjectSchema,
    types: (
      | "string"
      | "number"
      | "boolean"
      | "object"
      | "integer"
      | "array"
      | "null"
      | undefined
    )[],
    inline: boolean,
  ): string {
    // Create a union of each type
    const schemas = types.map((type) => {
      const typeSchema = { ...schema, type };
      // Remove the array type to avoid recursion
      delete (typeSchema as { type?: unknown }).type;
      return this.generate({ ...typeSchema, type }, inline);
    });

    return `z.union([${schemas.join(", ")}])`;
  }

  /**
   * Check if a property name needs to be quoted in JavaScript/TypeScript.
   * Property names that aren't valid JavaScript identifiers must be quoted.
   */
  private needsQuoting(propName: string): boolean {
    // Valid JavaScript identifier: starts with letter, $, or _
    // and contains only letters, digits, $, or _
    const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return !validIdentifier.test(propName);
  }
}
