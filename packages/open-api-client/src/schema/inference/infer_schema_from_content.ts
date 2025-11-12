import { inferSchema } from "./infer_schema.ts";

/**
 * Infer a schema from an OpenAPI content object that may have example(s) but no schema.
 *
 * @param contentObject - The OpenAPI content object (e.g., from response or request body)
 * @returns The schema if it exists, or an inferred schema from examples, or undefined
 */
export function inferSchemaFromContent(
  contentObject: Record<
    string,
    {
      schema?: Record<string, unknown>;
      example?: unknown;
      examples?: Record<string, unknown>;
    }
  >,
): Record<string, unknown> | undefined {
  // Get the first content type (usually application/json)
  const firstContentType = Object.keys(contentObject)[0];
  if (!firstContentType) {
    return undefined;
  }

  const content = contentObject[firstContentType];

  // If schema exists, use it
  if (content.schema) {
    return content.schema;
  }

  // Try to infer from example
  if (content.example !== undefined) {
    return inferSchema(content.example);
  }

  // Try to infer from first example in examples
  if (content.examples) {
    const firstExampleKey = Object.keys(content.examples)[0];
    if (firstExampleKey) {
      const exampleObj = content.examples[firstExampleKey] as Record<
        string,
        unknown
      >;
      // Examples can have a 'value' property or be the value directly
      const exampleValue = exampleObj.value !== undefined ? exampleObj.value : exampleObj;
      return inferSchema(exampleValue);
    }
  }

  // No schema or examples found
  return undefined;
}
