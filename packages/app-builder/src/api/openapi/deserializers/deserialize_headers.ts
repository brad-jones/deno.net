import { coerceValue } from "./utils.ts";

/**
 * Deserializes header parameters from HTTP headers according to OpenAPI specification.
 *
 * Headers only support the "simple" style:
 * - Primitive values: X-RateLimit: 100
 * - Arrays: X-Tags: red,blue,green (comma-separated)
 * - Objects (explode false): X-Meta: role,admin,status,active
 * - Objects (explode true): X-Meta: role=admin,status=active
 *
 * @param rawHeaders - The raw headers from the request
 * @param metadata - Array of parameter metadata from the OpenAPI operation
 * @returns Deserialized header parameters as a record
 */
export function deserializeHeaders(
  rawHeaders: Record<string, string | undefined>,
  metadata?: Array<HeaderParameterMetadata>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!metadata || metadata.length === 0) {
    // No metadata, return raw headers as-is
    return rawHeaders;
  }

  for (const param of metadata) {
    const { name, style = "simple", explode = false, schema } = param;
    const rawValue = rawHeaders[name.toLowerCase()]; // Headers are case-insensitive

    if (rawValue === undefined) {
      continue;
    }

    // Determine if the schema expects an array
    const isArray = schema?.type === "array" || (schema && "items" in schema);

    // Determine if the schema expects an object
    const isObject = schema?.type === "object" ||
      (schema && "properties" in schema);

    if (style !== "simple") {
      // Headers only support simple style
      result[name] = coerceValue(rawValue, schema);
      continue;
    }

    result[name] = coerceValue(deserializeSimple(rawValue, explode, isArray ?? false, isObject ?? false), schema);
  }

  return result;
}

function deserializeSimple(
  rawValue: string,
  explode: boolean,
  isArray: boolean,
  isObject: boolean,
): unknown {
  if (isArray) {
    // Arrays are comma-separated
    return rawValue.split(",").map((v) => v.trim());
  }

  if (isObject) {
    const obj: Record<string, string> = {};
    const parts = rawValue.split(",").map((v) => v.trim());

    if (explode) {
      // key=value,key=value format
      for (const part of parts) {
        const [key, value] = part.split("=");
        if (key && value) {
          obj[key.trim()] = value.trim();
        }
      }
    } else {
      // key,value,key,value format
      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i + 1]) {
          obj[parts[i]] = parts[i + 1];
        }
      }
    }

    return obj;
  }

  // Primitive value
  return rawValue;
}

/**
 * Metadata for a header parameter extracted from the OpenAPI operation.
 */
interface HeaderParameterMetadata {
  /** Parameter name */
  name: string;

  /** Serialization style (only "simple" is supported for headers) */
  style?: "simple";

  /** Whether to explode objects (default: false for header params) */
  explode?: boolean;

  /** Schema information to determine if parameter is an array or object */
  schema?: {
    type?: string;
    items?: unknown;
    properties?: unknown;
  };
}
