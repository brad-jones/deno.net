/**
 * Deserializes query parameters from URL query strings according to OpenAPI specification.
 *
 * This function processes query parameters and parses them according to their defined
 * serialization style. It supports multiple styles including 'form', 'spaceDelimited',
 * 'pipeDelimited', and 'deepObject' as defined in the OpenAPI specification.
 *
 * The default style for query parameters is 'form' with explode true, which means:
 * - Arrays are sent as multiple parameters with the same name: ?tags=red&tags=blue
 * - Objects have each property as a separate parameter: ?color=red&size=large
 *
 * @param rawQuery - The raw query parameters from the request (Record<string, string | string[]>)
 * @param metadata - Array of parameter metadata from the OpenAPI operation
 * @returns Deserialized query parameters as a record
 *
 * @example
 * ```ts
 * // Form style array with explode: true (default)
 * const raw = { tags: ["red", "blue"] };
 * const metadata = [
 *   { name: "tags", in: "query", style: "form", explode: true, schema: { type: "array" } }
 * ];
 * const result = deserializeQuery(raw, metadata);
 * // Returns: { tags: ["red", "blue"] }
 * ```
 *
 * @example
 * ```ts
 * // Form style array with explode: false
 * const raw = { tags: "red,blue" };
 * const metadata = [
 *   { name: "tags", in: "query", style: "form", explode: false, schema: { type: "array" } }
 * ];
 * const result = deserializeQuery(raw, metadata);
 * // Returns: { tags: ["red", "blue"] }
 * ```
 */
export function deserializeQuery(
  rawQuery: Record<string, string | string[]>,
  metadata?: Array<QueryParameterMetadata>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!metadata || metadata.length === 0) {
    // No metadata, return raw query as-is
    return rawQuery;
  }

  for (const param of metadata) {
    const { name, style = "form", explode = true, schema } = param;
    const rawValue = rawQuery[name];

    if (rawValue === undefined) {
      // Parameter not present in query string
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

  // Handle deepObject style parameters
  // These use bracket notation like filter[color]=red&filter[size]=large
  const deepObjectParams = metadata.filter((p) => p.style === "deepObject");
  for (const param of deepObjectParams) {
    const { name } = param;
    const prefix = `${name}[`;

    const nestedObject: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawQuery)) {
      if (key.startsWith(prefix) && key.endsWith("]")) {
        const nestedKey = key.slice(prefix.length, -1);
        nestedObject[nestedKey] = value;
      }
    }

    if (Object.keys(nestedObject).length > 0) {
      result[name] = nestedObject;
    }
  }

  return result;
}

function deserializeParameter(
  rawValue: string | string[],
  style: string,
  explode: boolean,
  isArray: boolean,
): unknown {
  switch (style) {
    case "form":
      return deserializeForm(rawValue, explode, isArray);
    case "spaceDelimited":
      return deserializeDelimited(rawValue, " ", explode, isArray);
    case "pipeDelimited":
      return deserializeDelimited(rawValue, "|", explode, isArray);
    case "deepObject":
      // DeepObject is handled separately in the main function
      return rawValue;
    default:
      // Unknown style, return as-is
      return rawValue;
  }
}

function deserializeForm(
  rawValue: string | string[],
  explode: boolean,
  isArray: boolean,
): unknown {
  if (isArray) {
    if (explode) {
      // Array with explode: true means multiple query params with same name
      // e.g., ?tags=red&tags=blue
      return Array.isArray(rawValue) ? rawValue : [rawValue];
    } else {
      // Array with explode: false means comma-separated values
      // e.g., ?tags=red,blue
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      return value ? value.split(",") : [];
    }
  }

  // Not an array, return single value
  return Array.isArray(rawValue) ? rawValue[0] : rawValue;
}

function deserializeDelimited(
  rawValue: string | string[],
  delimiter: string,
  explode: boolean,
  isArray: boolean,
): unknown {
  if (isArray) {
    if (explode) {
      // With explode: true, same as form style
      return Array.isArray(rawValue) ? rawValue : [rawValue];
    } else {
      // With explode: false, split by delimiter
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      return value ? value.split(delimiter) : [];
    }
  }

  // Not an array, return single value
  return Array.isArray(rawValue) ? rawValue[0] : rawValue;
}

/**
 * Metadata for a query parameter extracted from the OpenAPI operation.
 */
interface QueryParameterMetadata {
  /** Parameter name */
  name: string;

  /** Serialization style (default: "form") */
  style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";

  /** Whether to explode arrays/objects (default: true for query params) */
  explode?: boolean;

  /** Schema information to determine if parameter is an array */
  schema?: {
    type?: string;
    items?: unknown;
  };
}
