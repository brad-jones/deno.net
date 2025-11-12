import type { OpenAPIParameter, OpenAPIParameterMetadata, OpenAPIRequestMetadata } from "../../types/mod.ts";
import { isObject, isPrimitive, valueToString } from "./utils.ts";

/**
 * Serializes query parameters into a URL query string according to OpenAPI specification.
 *
 * This function processes query parameters and formats them according to their defined
 * serialization style. It supports multiple styles including 'form', 'spaceDelimited',
 * 'pipeDelimited', and 'deepObject' as defined in the OpenAPI specification. Parameters
 * not defined in metadata default to 'form' style with explode true.
 *
 * @param values - A record of parameter names mapped to their values, or undefined if no query parameters are provided
 * @param metadata - The OpenAPI request metadata containing parameter definitions
 * @returns A query string starting with "?" (e.g., "?id=123&name=test") or empty string if no parameters
 *
 * @throws {Error} If a query parameter uses an unsupported style
 * @throws {Error} If deepObject style is used with non-object values
 *
 * @example
 * ```ts
 * // Form style with primitive value
 * const metadata = {
 *   parameters: [
 *     { name: "id", location: "query", style: "form", explode: true }
 *   ]
 * };
 * const query = serializeQuery({ id: 123 }, metadata);
 * // Returns: "?id=123"
 * ```
 *
 * @example
 * ```ts
 * // Form style with array (explode: true)
 * const metadata = {
 *   parameters: [
 *     { name: "tags", location: "query", style: "form", explode: true }
 *   ]
 * };
 * const query = serializeQuery({ tags: ["red", "blue"] }, metadata);
 * // Returns: "?tags=red&tags=blue"
 * ```
 *
 * @example
 * ```ts
 * // Form style with array (explode: false)
 * const metadata = {
 *   parameters: [
 *     { name: "tags", location: "query", style: "form", explode: false }
 *   ]
 * };
 * const query = serializeQuery({ tags: ["red", "blue"] }, metadata);
 * // Returns: "?tags=red,blue"
 * ```
 *
 * @example
 * ```ts
 * // DeepObject style with nested object
 * const metadata = {
 *   parameters: [
 *     { name: "filter", location: "query", style: "deepObject" }
 *   ]
 * };
 * const query = serializeQuery({ filter: { color: "red", size: "large" } }, metadata);
 * // Returns: "?filter[color]=red&filter[size]=large"
 * ```
 */
export function serializeQuery(
  values: Record<string, OpenAPIParameter> | undefined,
  metadata: OpenAPIRequestMetadata,
): string {
  const searchParams = new URLSearchParams();
  const parameters = metadata.parameters?.filter((_) => _.location === "query");

  if (values) {
    for (const [name, value] of Object.entries(values)) {
      if (value === undefined) continue;

      // Find parameter metadata
      const meta = parameters?.find((p) => p.name === name);

      if (meta) {
        const entries = serializeParameter(value, meta);
        for (const [key, val] of entries) {
          searchParams.append(key, val);
        }
      } else {
        // Default: form style, explode true
        appendDefault(searchParams, name, value);
      }
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function serializeParameter(
  value: OpenAPIParameter,
  metadata: OpenAPIParameterMetadata,
): Array<[string, string]> {
  const { style = "form", explode = true, name } = metadata;

  switch (style) {
    case "form":
      return serializeForm(value, explode, name);
    case "spaceDelimited":
      return serializeSpaceDelimited(value, explode, name);
    case "pipeDelimited":
      return serializePipeDelimited(value, explode, name);
    case "deepObject":
      return serializeDeepObject(value, name);
    default:
      throw new Error(`Unsupported query parameter style: ${style}`);
  }
}

function appendDefault(
  searchParams: URLSearchParams,
  name: string,
  value:
    | string
    | number
    | boolean
    | null
    | object
    | Array<string | number | boolean>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      searchParams.append(name, valueToString(item));
    }
  } else if (isObject(value)) {
    // Default for objects: explode true, so each key becomes a parameter
    for (const [key, val] of Object.entries(value)) {
      searchParams.append(key, valueToString(val));
    }
  } else {
    searchParams.append(name, valueToString(value));
  }
}

function serializeForm(
  value: unknown,
  explode: boolean,
  name: string,
): Array<[string, string]> {
  if (isPrimitive(value)) {
    // Primitive: Single key-value pair
    return [[name, valueToString(value)]];
  }

  if (Array.isArray(value)) {
    if (explode) {
      // Multiple entries with same key
      return value.map((item) =>
        [name, valueToString(item)] as [
          string,
          string,
        ]
      );
    } else {
      // Comma-separated values
      const commaSeparated = value.map((item) => valueToString(item))
        .join(",");
      return [[name, commaSeparated]];
    }
  }

  if (isObject(value)) {
    if (explode) {
      // Each property becomes a separate parameter (name is NOT used)
      return Object.entries(value).map(([key, val]) =>
        [
          key,
          valueToString(val),
        ] as [string, string]
      );
    } else {
      // Comma-separated key-value pairs
      const pairs = Object.entries(value).flatMap(([key, val]) => [
        key,
        valueToString(val),
      ]);
      return [[name, pairs.join(",")]];
    }
  }

  return [];
}

function serializeSpaceDelimited(
  value: unknown,
  explode: boolean,
  name: string,
): Array<[string, string]> {
  // spaceDelimited is only for arrays
  if (isPrimitive(value)) {
    // Fall back to form style
    return [[name, valueToString(value)]];
  }

  if (Array.isArray(value)) {
    if (explode) {
      // Multiple entries with same key (same as form)
      return value.map((item) =>
        [name, valueToString(item)] as [
          string,
          string,
        ]
      );
    } else {
      // Space-delimited values
      const spaceSeparated = value.map((item) => valueToString(item))
        .join(" ");
      return [[name, spaceSeparated]];
    }
  }

  // Objects fall back to form style
  if (isObject(value)) {
    return serializeForm(value, explode, name);
  }

  return [];
}

function serializePipeDelimited(
  value: unknown,
  explode: boolean,
  name: string,
): Array<[string, string]> {
  // pipeDelimited is only for arrays
  if (isPrimitive(value)) {
    // Fall back to form style
    return [[name, valueToString(value)]];
  }

  if (Array.isArray(value)) {
    if (explode) {
      // Multiple entries with same key (same as form)
      return value.map((item) =>
        [name, valueToString(item)] as [
          string,
          string,
        ]
      );
    } else {
      // Pipe-delimited values
      const pipeSeparated = value.map((item) => valueToString(item))
        .join("|");
      return [[name, pipeSeparated]];
    }
  }

  // Objects fall back to form style
  if (isObject(value)) {
    return serializeForm(value, explode, name);
  }

  return [];
}

function serializeDeepObject(
  value: unknown,
  name: string,
): Array<[string, string]> {
  // deepObject is only for objects with explode: true
  if (!isObject(value)) {
    throw new Error(
      `deepObject style is only valid for objects, got ${typeof value}`,
    );
  }

  // Each property uses bracket notation
  return Object.entries(value).map(([key, val]) =>
    [
      `${name}[${key}]`,
      valueToString(val),
    ] as [string, string]
  );
}
