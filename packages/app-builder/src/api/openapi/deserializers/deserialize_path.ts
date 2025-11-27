/**
 * Deserializes path parameters from URL path according to OpenAPI specification.
 *
 * Path parameters support three styles:
 * - simple (default): /users/123 or /users/3,4,5 (arrays comma-separated)
 * - label: /users/.3.4.5 (dot-prefixed)
 * - matrix: /users/;id=3 or /users/;id=3;id=4;id=5 (semicolon-delimited)
 *
 * @param rawPath - The raw path parameters extracted from the URL
 * @param metadata - Array of parameter metadata from the OpenAPI operation
 * @returns Deserialized path parameters as a record
 */
export function deserializePath(
  rawPath: Record<string, string>,
  metadata?: Array<PathParameterMetadata>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!metadata || metadata.length === 0) {
    // No metadata, return raw path as-is
    return rawPath;
  }

  for (const param of metadata) {
    const { name, style = "simple", explode = false, schema } = param;
    const rawValue = rawPath[name];

    if (rawValue === undefined) {
      continue;
    }

    // Determine if the schema expects an array
    const isArray = schema?.type === "array" || (schema && "items" in schema);

    result[name] = deserializeParameter(
      rawValue,
      style,
      explode,
      isArray ?? false,
    );
  }

  return result;
}

function deserializeParameter(
  rawValue: string,
  style: string,
  explode: boolean,
  isArray: boolean,
): unknown {
  switch (style) {
    case "simple":
      return deserializeSimple(rawValue, explode, isArray);
    case "label":
      return deserializeLabel(rawValue, explode, isArray);
    case "matrix":
      return deserializeMatrix(rawValue, explode, isArray);
    default:
      // Unknown style, return as-is
      return rawValue;
  }
}

function deserializeSimple(
  rawValue: string,
  _explode: boolean,
  isArray: boolean,
): unknown {
  if (isArray) {
    // Arrays are comma-separated: 3,4,5
    return rawValue.split(",");
  }

  // Primitive value
  return rawValue;
}

function deserializeLabel(
  rawValue: string,
  _explode: boolean,
  isArray: boolean,
): unknown {
  // Label style starts with a dot
  if (rawValue.startsWith(".")) {
    rawValue = rawValue.slice(1);
  }

  if (isArray) {
    // Arrays are dot-separated: .3.4.5 -> ["3", "4", "5"]
    return rawValue.split(".");
  }

  // Primitive value
  return rawValue;
}

function deserializeMatrix(
  rawValue: string,
  explode: boolean,
  isArray: boolean,
): unknown {
  // Matrix style starts with semicolon
  if (rawValue.startsWith(";")) {
    rawValue = rawValue.slice(1);
  }

  if (isArray) {
    if (explode) {
      // Multiple ;id=3;id=4;id=5
      // This is already handled by the router/framework
      // Just return as single value for now
      return [rawValue];
    } else {
      // Single ;id=3,4,5
      const parts = rawValue.split("=");
      if (parts.length === 2) {
        return parts[1].split(",");
      }
    }
  }

  // For primitives, extract value after =
  const parts = rawValue.split("=");
  return parts.length === 2 ? parts[1] : rawValue;
}

/**
 * Metadata for a path parameter extracted from the OpenAPI operation.
 */
interface PathParameterMetadata {
  /** Parameter name */
  name: string;

  /** Serialization style (default: "simple") */
  style?: "simple" | "label" | "matrix";

  /** Whether to explode arrays/objects (default: false for path params) */
  explode?: boolean;

  /** Schema information to determine if parameter is an array */
  schema?: {
    type?: string;
    items?: unknown;
  };
}
