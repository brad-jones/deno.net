/**
 * Deserializes cookie parameters from Cookie header according to OpenAPI specification.
 *
 * Cookies only support the "form" style:
 * - Primitive values: session=abc123
 * - Arrays: tags=red,blue,green (comma-separated, always explode: false)
 * - Objects (explode false): meta=role,admin,status,active
 * - Objects (explode true): serialized as JSON
 *
 * @param rawCookies - The raw cookies extracted from the Cookie header
 * @param metadata - Array of parameter metadata from the OpenAPI operation
 * @returns Deserialized cookie parameters as a record
 */
export function deserializeCookies(
  rawCookies: Record<string, string>,
  metadata?: Array<CookieParameterMetadata>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!metadata || metadata.length === 0) {
    // No metadata, return raw cookies as-is (decoded)
    for (const [key, value] of Object.entries(rawCookies)) {
      result[key] = decodeCookieValue(value);
    }
    return result;
  }

  for (const param of metadata) {
    const { name, style = "form", explode = false, schema } = param;
    const rawValue = rawCookies[name];

    if (rawValue === undefined) {
      continue;
    }

    // Decode the cookie value
    const decodedValue = decodeCookieValue(rawValue);

    // Determine if the schema expects an array
    const isArray = schema?.type === "array" || (schema && "items" in schema);

    // Determine if the schema expects an object
    const isObject = schema?.type === "object" ||
      (schema && "properties" in schema);

    if (style !== "form") {
      // Cookies only support form style
      result[name] = decodedValue;
      continue;
    }

    result[name] = deserializeForm(decodedValue, explode, isArray ?? false, isObject ?? false);
  }

  return result;
}

function deserializeForm(
  decodedValue: string,
  explode: boolean,
  isArray: boolean,
  isObject: boolean,
): unknown {
  if (isArray) {
    // Arrays are comma-separated
    return decodedValue.split(",").map((v) => v.trim());
  }

  if (isObject) {
    if (explode) {
      // Try to parse as JSON first
      try {
        return JSON.parse(decodedValue);
      } catch {
        // If not valid JSON, return as-is
        return decodedValue;
      }
    } else {
      // key,value,key,value format
      const obj: Record<string, string> = {};
      const parts = decodedValue.split(",").map((v) => v.trim());

      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i + 1]) {
          obj[parts[i]] = parts[i + 1];
        }
      }

      return obj;
    }
  }

  // Primitive value
  return decodedValue;
}

function decodeCookieValue(value: string): string {
  // Decode RFC 6265 cookie-value encoding
  return value
    .replace(/%3B/gi, ";") // Semicolon
    .replace(/%2C/gi, ",") // Comma
    .replace(/%25/g, "%"); // Percent must be decoded last
}

/**
 * Metadata for a cookie parameter extracted from the OpenAPI operation.
 */
interface CookieParameterMetadata {
  /** Parameter name */
  name: string;

  /** Serialization style (only "form" is supported for cookies) */
  style?: "form";

  /** Whether to explode objects (default: false for cookie params) */
  explode?: boolean;

  /** Schema information to determine if parameter is an array or object */
  schema?: {
    type?: string;
    items?: unknown;
    properties?: unknown;
  };
}
