/**
 * Infer an OpenAPI schema from an example value.
 *
 * @param example - The example value to infer a schema from
 * @returns An OpenAPI schema object
 */
export function inferSchema(example: unknown): Record<string, unknown> {
  // Handle null
  if (example === null) {
    return { type: "null" };
  }

  // Handle undefined (treat as nullable)
  if (example === undefined) {
    return { nullable: true };
  }

  // Handle arrays
  if (Array.isArray(example)) {
    if (example.length === 0) {
      // Empty array - we don't know the item type
      return {
        type: "array",
        items: {},
      };
    }

    // Infer schema from first item (assumption: homogeneous array)
    const itemSchema = inferSchema(example[0]);

    // Check if all items have the same inferred type
    const allSameType = example.every((item) => {
      const schema = inferSchema(item);
      return schema.type === itemSchema.type;
    });

    if (allSameType) {
      return {
        type: "array",
        items: itemSchema,
      };
    }

    // Mixed types - use oneOf with unique types found
    const uniqueSchemas = new Map<string, Record<string, unknown>>();
    for (const item of example) {
      const schema = inferSchema(item);
      const key = JSON.stringify(schema);
      if (!uniqueSchemas.has(key)) {
        uniqueSchemas.set(key, schema);
      }
    }

    return {
      type: "array",
      items: {
        oneOf: Array.from(uniqueSchemas.values()),
      },
    };
  }

  // Handle objects
  if (typeof example === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(example)) {
      properties[key] = inferSchema(value);

      // Mark as required if value is not null/undefined
      if (value !== null && value !== undefined) {
        required.push(key);
      }
    }

    const schema: Record<string, unknown> = {
      type: "object",
      properties,
    };

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  }

  // Handle primitives
  const type = typeof example;

  if (type === "string") {
    return { type: "string" };
  }

  if (type === "number") {
    // Distinguish between integer and number
    if (Number.isInteger(example)) {
      return { type: "integer" };
    }
    return { type: "number" };
  }

  if (type === "boolean") {
    return { type: "boolean" };
  }

  // Unknown type
  return {};
}
