import type { OpenAPIParameter, OpenAPIParameterMetadata, OpenAPIRequestMetadata } from "../../types/mod.ts";
import { isObject, isPrimitive, valueToString } from "./utils.ts";

/**
 * Serializes header parameters into a Headers object according to OpenAPI specification.
 *
 * This function processes header parameters defined in the OpenAPI request metadata and
 * creates a properly formatted Headers object. It supports the 'simple' style serialization
 * with optional explode parameter for objects. Headers not defined in metadata are serialized
 * using simple style with explode false as the default.
 *
 * @param values - A record of header names mapped to their values, or undefined if no headers are provided
 * @param metadata - The OpenAPI request metadata containing parameter definitions
 * @returns A Headers object containing all serialized header values
 *
 * @throws {Error} If a header parameter uses an unsupported style (only 'simple' is supported)
 * @throws {Error} If a header value contains newlines, carriage returns, or null bytes
 *
 * @example
 * ```ts
 * const metadata = {
 *   parameters: [
 *     { name: "X-API-Key", location: "header", style: "simple", explode: false }
 *   ]
 * };
 * const headers = serializeHeaders({ "X-API-Key": "secret123" }, metadata);
 * // Returns: Headers with "X-API-Key: secret123"
 * ```
 *
 * @example
 * ```ts
 * // Array values are comma-separated
 * const headers = serializeHeaders({ "X-Tags": ["foo", "bar"] }, metadata);
 * // Returns: Headers with "X-Tags: foo,bar"
 * ```
 */
export function serializeHeaders(
  values: Record<string, OpenAPIParameter> | undefined,
  metadata: OpenAPIRequestMetadata,
): Headers {
  const headers = new Headers();

  const headerMetadata = metadata.parameters?.filter((_) => _.location === "header");

  if (values) {
    for (const [name, value] of Object.entries(values)) {
      if (value === undefined) continue;

      // Find parameter metadata
      const meta = headerMetadata?.find((p) => p.name === name);

      if (meta) {
        const serialized = serializeParameter(value, meta);
        validateHeaderValue(serialized);
        headers.set(name, serialized);
      } else {
        // Default: simple style, explode false
        const serialized = serializeSimple(value, false);
        validateHeaderValue(serialized);
        headers.set(name, serialized);
      }
    }
  }

  return headers;
}

function serializeParameter(
  value: OpenAPIParameter,
  metadata: OpenAPIParameterMetadata,
): string {
  const { style = "simple", explode = false } = metadata;

  if (style !== "simple") {
    throw new Error(
      `Unsupported header parameter style: ${style}. Headers only support 'simple' style.`,
    );
  }

  return serializeSimple(value, explode);
}

function serializeSimple(value: unknown, explode: boolean): string {
  if (isPrimitive(value)) {
    // Primitive: Convert to string (no encoding for headers)
    return valueToString(value);
  }

  if (Array.isArray(value)) {
    // Array: Comma-separated values (explode has no effect for arrays in simple style)
    return value.map((item) => valueToString(item)).join(",");
  }

  if (isObject(value)) {
    if (explode) {
      // Object with explode true: key=value,key=value
      return Object.entries(value)
        .map(([key, val]) => `${key}=${valueToString(val)}`)
        .join(",");
    } else {
      // Object with explode false: key,value,key,value
      return Object.entries(value)
        .flatMap(([key, val]) => [key, valueToString(val)])
        .join(",");
    }
  }

  return "";
}

function validateHeaderValue(value: string): void {
  // Check for invalid characters (newlines, null bytes)
  if (
    value.includes("\n") || value.includes("\r") || value.includes("\0")
  ) {
    throw new Error(
      "Header values cannot contain newlines or null bytes",
    );
  }
}
