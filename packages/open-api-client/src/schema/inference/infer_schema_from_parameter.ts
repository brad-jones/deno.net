import { inferSchema } from "./infer_schema.ts";

/**
 * Infer a schema from an OpenAPI parameter that may have example(s) but no schema.
 *
 * @param parameter - The OpenAPI parameter object
 * @returns The schema if it exists, or an inferred schema from examples, or undefined
 */
export function inferSchemaFromParameter(
  parameter: {
    schema?: Record<string, unknown>;
    example?: unknown;
    examples?: Record<string, unknown>;
  },
): Record<string, unknown> | undefined {
  // If schema exists, use it
  if (parameter.schema) {
    return parameter.schema;
  }

  // Try to infer from example
  if (parameter.example !== undefined) {
    return inferSchema(parameter.example);
  }

  // Try to infer from first example in examples
  if (parameter.examples) {
    const firstExampleKey = Object.keys(parameter.examples)[0];
    if (firstExampleKey) {
      const exampleObj = parameter.examples[firstExampleKey] as Record<
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
