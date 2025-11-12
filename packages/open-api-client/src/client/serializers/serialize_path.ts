import type { OpenAPIParameter, OpenAPIParameterMetadata, OpenAPIRequestMetadata } from "../../types/mod.ts";
import { isObject, isPrimitive, valueToString } from "./utils.ts";

/**
 * Serializes path parameters into a complete URL path according to OpenAPI specification.
 *
 * This function takes a path template (e.g., "/users/{id}/posts/{postId}") and replaces
 * the parameter placeholders with properly serialized and encoded values. It supports
 * multiple serialization styles including 'simple', 'label', and 'matrix' as defined in
 * the OpenAPI specification.
 *
 * @param values - A record of parameter names mapped to their values, or undefined if no parameters are provided
 * @param metadata - The OpenAPI request metadata containing the path template and parameter definitions
 * @returns The complete URL path with all parameters serialized and substituted
 *
 * @throws {Error} If a required path parameter is missing from the values
 * @throws {Error} If a path parameter uses an unsupported style
 *
 * @example
 * ```ts
 * // Simple style (default)
 * const metadata = {
 *   path: "/users/{id}",
 *   parameters: [
 *     { name: "id", location: "path", style: "simple" }
 *   ]
 * };
 * const path = serializePath({ id: 123 }, metadata);
 * // Returns: "/users/123"
 * ```
 *
 * @example
 * ```ts
 * // Label style with array
 * const metadata = {
 *   path: "/items{ids}",
 *   parameters: [
 *     { name: "ids", location: "path", style: "label", explode: true }
 *   ]
 * };
 * const path = serializePath({ ids: [1, 2, 3] }, metadata);
 * // Returns: "/items.1.2.3"
 * ```
 *
 * @example
 * ```ts
 * // Matrix style with object
 * const metadata = {
 *   path: "/search{filter}",
 *   parameters: [
 *     { name: "filter", location: "path", style: "matrix", explode: true }
 *   ]
 * };
 * const path = serializePath({ filter: { color: "red", size: "large" } }, metadata);
 * // Returns: "/search;color=red;size=large"
 * ```
 */
export function serializePath(
  values: Record<string, OpenAPIParameter> | undefined,
  metadata: OpenAPIRequestMetadata,
): string {
  const pathTemplate = metadata.path;
  const parameters = metadata.parameters?.filter((_) => _.location === "path");

  return pathTemplate.replace(/\{(\w+)\}/g, (_match, paramName) => {
    const value = (values ?? {})[paramName];
    if (value === undefined) {
      throw new Error(`Missing required path parameter: ${paramName}`);
    }

    // Find parameter metadata
    const meta = parameters?.find((p) => p.name === paramName);

    if (meta) {
      return serializeParameter(value, meta);
    }

    // Default: simple style, explode false
    return serializeSimple(value, false);
  });
}

function serializeParameter(
  value: OpenAPIParameter,
  metadata: OpenAPIParameterMetadata,
): string {
  const { style = "simple", explode = false, name } = metadata;

  switch (style) {
    case "simple":
      return serializeSimple(value, explode);
    case "label":
      return serializeLabel(value, explode);
    case "matrix":
      return serializeMatrix(value, explode, name);
    default:
      throw new Error(`Unsupported path parameter style: ${style}`);
  }
}

function serializeSimple(value: unknown, explode: boolean): string {
  // Primitive: just encode and return
  if (isPrimitive(value)) {
    return encodeURIComponent(valueToString(value));
  }

  // Array: comma-separated (explode doesn't change behavior for simple style)
  if (Array.isArray(value)) {
    return value
      .map((v) => encodeURIComponent(valueToString(v)))
      .join(",");
  }

  // Object
  if (isObject(value)) {
    const entries = Object.entries(value);

    if (explode) {
      // Object explode: true -> key=value,key=value
      return entries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(valueToString(v))}`)
        .join(",");
    } else {
      // Object explode: false -> key,value,key,value
      return entries
        .flatMap(([k, v]) => [
          encodeURIComponent(k),
          encodeURIComponent(valueToString(v)),
        ])
        .join(",");
    }
  }

  return "";
}

function serializeLabel(value: unknown, explode: boolean): string {
  // Primitive: prefix with dot
  if (isPrimitive(value)) {
    return `.${encodeURIComponent(valueToString(value))}`;
  }

  // Array
  if (Array.isArray(value)) {
    if (explode) {
      // Array explode: true -> .value1.value2.value3
      return value
        .map((v) => `.${encodeURIComponent(valueToString(v))}`)
        .join("");
    } else {
      // Array explode: false -> .value1,value2,value3
      const encoded = value
        .map((v) => encodeURIComponent(valueToString(v)))
        .join(",");
      return `.${encoded}`;
    }
  }

  // Object
  if (isObject(value)) {
    const entries = Object.entries(value);

    if (explode) {
      // Object explode: true -> .key=value.key=value
      return entries
        .map(([k, v]) => `.${encodeURIComponent(k)}=${encodeURIComponent(valueToString(v))}`)
        .join("");
    } else {
      // Object explode: false -> .key,value,key,value
      const encoded = entries
        .flatMap(([k, v]) => [
          encodeURIComponent(k),
          encodeURIComponent(valueToString(v)),
        ])
        .join(",");
      return `.${encoded}`;
    }
  }

  return "";
}

function serializeMatrix(
  value: unknown,
  explode: boolean,
  name: string,
): string {
  // Primitive: ;name=value
  if (isPrimitive(value)) {
    return `;${encodeURIComponent(name)}=${encodeURIComponent(valueToString(value))}`;
  }

  // Array
  if (Array.isArray(value)) {
    if (explode) {
      // Array explode: true -> ;name=value1;name=value2;name=value3
      return value
        .map((v) => `;${encodeURIComponent(name)}=${encodeURIComponent(valueToString(v))}`)
        .join("");
    } else {
      // Array explode: false -> ;name=value1,value2,value3
      const encoded = value
        .map((v) => encodeURIComponent(valueToString(v)))
        .join(",");
      return `;${encodeURIComponent(name)}=${encoded}`;
    }
  }

  // Object
  if (isObject(value)) {
    const entries = Object.entries(value);

    if (explode) {
      // Object explode: true -> ;key=value;key=value (parameter name NOT used)
      return entries
        .map(([k, v]) => `;${encodeURIComponent(k)}=${encodeURIComponent(valueToString(v))}`)
        .join("");
    } else {
      // Object explode: false -> ;name=key,value,key,value
      const encoded = entries
        .flatMap(([k, v]) => [
          encodeURIComponent(k),
          encodeURIComponent(valueToString(v)),
        ])
        .join(",");
      return `;${encodeURIComponent(name)}=${encoded}`;
    }
  }

  return "";
}
