import type { OpenAPISchemaObjectSchema } from "../types/mod.ts";
import type { ISchemaConverter } from "./i_schema_converter.ts";
import { buildJsDocComments, splitJSDocAndType } from "./jsdoc/mod.ts";
import type { SchemaSanitizer } from "./schema_sanitizer.ts";

/**
 * Converts OpenAPI schema objects into TypeScript type definitions.
 *
 * This class implements the ISchemaConverter interface and provides comprehensive
 * support for converting OpenAPI 3.x schema definitions into idiomatic TypeScript types.
 * It handles primitive types, objects, arrays, enums, unions, intersections, references,
 * nullable types, and JSDoc comment generation.
 *
 * Features:
 * - Supports all OpenAPI schema types (string, number, boolean, null, object, array)
 * - Handles composition keywords (oneOf, anyOf, allOf)
 * - Resolves $ref references to component schemas
 * - Generates JSDoc comments from schema metadata (title, description, examples, etc.)
 * - Supports both inline and named type generation
 * - Properly handles nullable types for OpenAPI 3.0 and 3.1
 *
 * @example
 * ```ts
 * const sanitizer = new SchemaSanitizer({
 *   "User": { type: "object", properties: { name: { type: "string" } } }
 * });
 * const generator = new TypeScriptTypeGenerator(sanitizer);
 *
 * const schema = { type: "string", description: "A user name" };
 * const typeString = generator.generate(schema);
 * // Returns: "/** A user name *\/\nstring"
 * ```
 */
export class TypeScriptTypeGenerator implements ISchemaConverter {
  /**
   * Creates a new TypeScriptTypeGenerator instance.
   *
   * @param schemaSanitizer - The schema sanitizer used to resolve and sanitize schema references
   */
  constructor(private schemaSanitizer: SchemaSanitizer) {}

  /**
   * Generates a TypeScript type string from an OpenAPI schema object.
   *
   * This method is the main entry point for type generation. It handles all OpenAPI schema
   * constructs including $ref references, composition keywords (oneOf, anyOf, allOf),
   * enums, primitive types, arrays, and objects. JSDoc comments are automatically generated
   * for non-inline types.
   *
   * @param schema - The OpenAPI schema object to convert
   * @param inline - If true, generates an inline type without JSDoc comments; if false, includes JSDoc. Defaults to false.
   * @returns A TypeScript type definition string, optionally prefixed with JSDoc comments
   *
   * @example
   * ```ts
   * // Simple primitive type
   * generator.generate({ type: "string" });
   * // Returns: "string"
   *
   * // Object type
   * generator.generate({
   *   type: "object",
   *   properties: {
   *     id: { type: "number" },
   *     name: { type: "string" }
   *   },
   *   required: ["id"]
   * });
   * // Returns: "{\n  id: number;\n  name?: string;\n}"
   *
   * // Reference to component schema
   * generator.generate({ $ref: "#/components/schemas/User" });
   * // Returns: "User"
   *
   * // Union type
   * generator.generate({ oneOf: [{ type: "string" }, { type: "number" }] });
   * // Returns: "string | number"
   *
   * // Nullable type
   * generator.generate({ type: "string", nullable: true });
   * // Returns: "string | null"
   * ```
   */
  generate(schema: OpenAPISchemaObjectSchema, inline = false): string {
    // Handle $ref
    if (schema.$ref && typeof schema.$ref === "string") {
      const refType = this.handleRef(schema.$ref, inline);
      // Apply nullable to refs if specified
      return schema.nullable === true ? `${refType} | null` : refType;
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

      // Handle multiple types (JSON Schema 2019-09+)
      if (Array.isArray(type)) {
        return type.map((t) => this.generate({ ...schema, type: t }, inline))
          .join(" | ");
      }

      // Check if nullable (OpenAPI 3.0 style)
      const nullable = schema.nullable === true;

      // Handle specific types
      if (type === "string") {
        const baseType = "string";
        return this.wrapWithJSDoc(
          schema,
          nullable ? `${baseType} | null` : baseType,
          inline,
        );
      }

      if (type === "number" || type === "integer") {
        const baseType = "number";
        return this.wrapWithJSDoc(
          schema,
          nullable ? `${baseType} | null` : baseType,
          inline,
        );
      }

      if (type === "boolean") {
        const baseType = "boolean";
        return this.wrapWithJSDoc(
          schema,
          nullable ? `${baseType} | null` : baseType,
          inline,
        );
      }

      if (type === "null") {
        return this.wrapWithJSDoc(schema, "null", inline);
      }

      if (type === "array") {
        return this.handleArray(schema, inline, nullable);
      }

      if (type === "object") {
        return this.handleObject(schema, inline, nullable);
      }
    }

    // No type specified or unknown type
    return "unknown";
  }

  private handleRef(ref: string, inline: boolean): string {
    // Extract the schema name from the reference path
    // Expected format: #/components/schemas/SchemaName
    const parts = ref.split("/");
    const schemaName = parts[parts.length - 1];

    // Component schemas should ALWAYS be referenced by name, never inlined
    // This ensures circular references work and types are reusable
    if (ref.startsWith("#/components/schemas/")) {
      return this.schemaSanitizer.sanitizeSchemaName(schemaName);
    }

    // For non-component refs (if they exist), use the inline parameter
    if (!inline) {
      return this.schemaSanitizer.sanitizeSchemaName(schemaName);
    }

    // Inline mode for non-component refs: try to resolve and generate the actual type
    if (
      !this.schemaSanitizer.schemas || !this.schemaSanitizer.schemas[schemaName]
    ) {
      return this.schemaSanitizer.sanitizeSchemaName(schemaName); // Return the schema name if we can't resolve it
    }

    return this.generate(this.schemaSanitizer.schemas[schemaName], true);
  }

  private handleEnum(values: unknown[]): string {
    return values
      .map((value) => {
        if (typeof value === "string") {
          return `"${value}"`;
        }
        return String(value);
      })
      .join(" | ");
  }

  private handleArray(
    schema: Record<string, unknown>,
    inline: boolean,
    nullable: boolean,
  ): string {
    const items = schema.items as Record<string, unknown> | undefined;

    if (!items) {
      const baseType = "unknown[]";
      return this.wrapWithJSDoc(
        schema,
        nullable ? `${baseType} | null` : baseType,
        inline,
      );
    }

    const itemType = this.generate(items, inline);

    // If the item type contains spaces or special characters, wrap it in parentheses
    const needsParens = itemType.includes("|") || itemType.includes("&");
    const baseArrayType = needsParens ? `(${itemType})[]` : `${itemType}[]`;
    const arrayType = nullable ? `${baseArrayType} | null` : baseArrayType;

    return this.wrapWithJSDoc(schema, arrayType, inline);
  }

  private handleObject(
    schema: Record<string, unknown>,
    inline: boolean,
    nullable: boolean,
  ): string {
    const properties = schema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    const required = (schema.required as string[]) || [];
    const additionalProperties = schema.additionalProperties;

    // Handle empty object with additionalProperties
    if (!properties || Object.keys(properties).length === 0) {
      if (additionalProperties === true) {
        const baseType = "Record<string, unknown>";
        return this.wrapWithJSDoc(
          schema,
          nullable ? `${baseType} | null` : baseType,
          inline,
        );
      }

      if (additionalProperties && typeof additionalProperties === "object") {
        const valueType = this.generate(
          additionalProperties as Record<string, unknown>,
          inline,
        );
        const baseType = `Record<string, ${valueType}>`;
        return this.wrapWithJSDoc(
          schema,
          nullable ? `${baseType} | null` : baseType,
          inline,
        );
      }

      const baseType = "Record<string, never>";
      return this.wrapWithJSDoc(
        schema,
        nullable ? `${baseType} | null` : baseType,
        inline,
      );
    }

    // Build object type
    const propStrings: string[] = [];
    let hasOptionalProperties = false;

    for (const [propName, propSchema] of Object.entries(properties)) {
      const isRequired = required.includes(propName);
      const propType = this.generate(propSchema, inline);
      const optional = isRequired ? "" : "?";

      if (!isRequired) {
        hasOptionalProperties = true;
      }

      // Quote property names that aren't valid JavaScript identifiers
      const quotedPropName = this.needsQuoting(propName) ? `"${propName}"` : propName;

      // Only extract JSDoc for non-inline object types
      // For inline objects (like array items), keep JSDoc with the type
      if (!inline && propType.trimStart().startsWith("/**")) {
        // Multi-line with JSDoc - separate JSDoc from type and format properly
        const { jsdocLines, typeLine } = splitJSDocAndType(propType);
        const formattedJSDoc = jsdocLines.map((line) => `  ${line}`).join("\n");
        propStrings.push(
          `${formattedJSDoc}\n  ${quotedPropName}${optional}: ${typeLine};`,
        );
      } else {
        propStrings.push(`  ${quotedPropName}${optional}: ${propType};`);
      }
    }

    // Handle additionalProperties
    if (additionalProperties === true) {
      propStrings.push("  [key: string]: unknown;");
    } else if (
      additionalProperties && typeof additionalProperties === "object"
    ) {
      const valueType = this.generate(
        additionalProperties as Record<string, unknown>,
        inline,
      );
      // If there are optional properties, the index signature must accept undefined too
      const indexValueType = hasOptionalProperties ? `${valueType} | undefined` : valueType;
      propStrings.push(`  [key: string]: ${indexValueType};`);
    }

    const objectBody = propStrings.join("\n");
    const baseObjectType = `{\n${objectBody}\n}`;
    const objectType = nullable ? `${baseObjectType} | null` : baseObjectType;

    return this.wrapWithJSDoc(schema, objectType, inline);
  }

  private handleOneOf(
    schemas: OpenAPISchemaObjectSchema[],
    inline: boolean,
  ): string {
    const types = schemas.map((s) => {
      const type = this.generate(s, inline);
      // If the type contains unions or intersections, wrap it
      if (type.includes("|") || type.includes("&")) {
        return `(${type})`;
      }
      return type;
    });
    return types.join(" | ");
  }

  private handleAnyOf(
    schemas: OpenAPISchemaObjectSchema[],
    inline: boolean,
  ): string {
    // anyOf is similar to oneOf in TypeScript - both become union types
    return this.handleOneOf(schemas, inline);
  }

  private handleAllOf(
    schemas: OpenAPISchemaObjectSchema[],
    inline: boolean,
  ): string {
    const types = schemas.map((s) => {
      const type = this.generate(s, inline);
      // If the type contains unions, wrap it
      if (type.includes("|")) {
        return `(${type})`;
      }
      return type;
    });
    return types.join(" & ");
  }

  /**
   * Check if a property name needs to be quoted in TypeScript.
   * Property names that aren't valid JavaScript identifiers must be quoted.
   */
  private needsQuoting(propName: string): boolean {
    // Valid JavaScript identifier: starts with letter, $, or _
    // and contains only letters, digits, $, or _
    const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return !validIdentifier.test(propName);
  }

  private wrapWithJSDoc(
    schema: Record<string, unknown>,
    typeString: string,
    inline: boolean,
  ): string {
    // Don't generate JSDoc for inline types
    if (inline) {
      return typeString;
    }

    const jsdoc = buildJsDocComments(schema);
    if (!jsdoc) {
      return typeString;
    }
    return `${jsdoc}\n${typeString}`;
  }
}
