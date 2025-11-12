/**
 * Utility to infer OpenAPI schemas from example values.
 *
 * This is useful when an OpenAPI spec provides examples but no schema definitions.
 * The inference makes best-effort guesses about data types based on the example values.
 *
 * @module
 */

export * from "./infer_schema.ts";
export * from "./infer_schema_from_content.ts";
export * from "./infer_schema_from_parameter.ts";
