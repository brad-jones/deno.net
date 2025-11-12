import type { OpenAPISchemaObjectSchema } from "../types/mod.ts";

export interface ISchemaConverter {
  /**
   * Converts an OpenAPI schemas into a different form.
   * eg: TypeScript Types or Zod Schemas.
   *
   * @param schema - The OpenAPI schema object to convert
   * @param inline - If true, resolve $refs and inline the schema definition.
   *                 If false, use the referenced schema name directly.
   * @returns The new form's source code serialized as a string.
   */
  generate(schema: OpenAPISchemaObjectSchema, inline?: boolean): string;
}
