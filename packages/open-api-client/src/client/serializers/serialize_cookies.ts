import type { OpenAPIParameter, OpenAPIRequestMetadata } from "../../types/mod.ts";
import { isObject, isPrimitive, valueToString } from "./utils.ts";

/**
 * Serializes cookie parameters into a Cookie header string according to OpenAPI specification.
 *
 * This function processes cookie parameters defined in the OpenAPI request metadata and
 * formats them into a properly encoded Cookie header value. It supports the 'form' style
 * serialization with optional explode parameter for objects.
 *
 * @param values - A record of parameter names mapped to their values, or undefined if no cookies are provided
 * @param metadata - The OpenAPI request metadata containing parameter definitions
 * @returns A Cookie header string with format "name1=value1; name2=value2" or empty string if no cookies
 *
 * @throws {Error} If a cookie parameter uses an unsupported style (only 'form' is supported)
 * @throws {Error} If a cookie name contains illegal characters according to RFC 6265
 *
 * @example
 * ```ts
 * const metadata = {
 *   parameters: [
 *     { name: "session", location: "cookie", style: "form", explode: false }
 *   ]
 * };
 * const cookies = serializeCookies({ session: "abc123" }, metadata);
 * // Returns: "session=abc123"
 * ```
 */
export function serializeCookies(
  values: Record<string, OpenAPIParameter> | undefined,
  metadata: OpenAPIRequestMetadata,
): string {
  const cookies: string[] = [];

  if (values) {
    for (
      const param of metadata.parameters?.filter((_) => _.location === "cookie") ?? []
    ) {
      const value = values[param.name];
      if (value === undefined) continue;

      const { style = "form", explode = false, name } = param;

      if (style !== "form") {
        throw new Error(
          `Unsupported cookie parameter style: ${style}. Cookies only support 'form' style.`,
        );
      }

      validateCookieName(name);
      const cookieValue = serializeForm(value, explode);
      cookies.push(`${name}=${cookieValue}`);
    }
  }

  return cookies.join("; ");
}

function serializeForm(value: unknown, explode: boolean): string {
  if (isPrimitive(value)) {
    // Primitive: Convert to string and encode
    const stringValue = valueToString(value);
    return encodeCookieValue(stringValue);
  }

  if (Array.isArray(value)) {
    // Array (explode: false): Comma-separated values
    // Note: explode: true for arrays is not practical for cookies
    // We treat all arrays as explode: false
    const arrayStr = value.map((item) => valueToString(item)).join(
      ",",
    );
    return encodeCookieValue(arrayStr);
  }

  if (isObject(value)) {
    if (explode) {
      // Object with explode: true: Serialize as JSON
      // This is a practical approach for complex objects in cookies
      const jsonStr = JSON.stringify(value);
      return encodeCookieValue(jsonStr);
    } else {
      // Object with explode: false: Comma-separated key-value pairs
      const objectStr = Object.entries(value)
        .flatMap(([key, val]) => [key, valueToString(val)])
        .join(",");
      return encodeCookieValue(objectStr);
    }
  }

  return "";
}

function encodeCookieValue(value: string): string {
  // RFC 6265 cookie-value encoding
  // Must encode: %, comma, semicolon, backslash, double-quote, space, colon, braces
  return value
    .replace(/%/g, "%25") // Percent must be encoded first
    .replace(/,/g, "%2C") // Comma
    .replace(/;/g, "%3B") // Semicolon
    .replace(/\\/g, "%5C") // Backslash
    .replace(/"/g, "%22") // Double quote
    .replace(/ /g, "%20") // Space
    .replace(/:/g, "%3A") // Colon
    .replace(/{/g, "%7B") // Left brace
    .replace(/}/g, "%7D"); // Right brace
}

function validateCookieName(name: string): void {
  // Cookie names cannot contain: ( ) < > @ , ; : \ " / [ ] ? = { } or spaces
  const invalidChars = /[\(\)<>@,;:\\"\/\[\]\?=\{\}\s]/;
  if (invalidChars.test(name)) {
    throw new Error(
      `Invalid cookie name: ${name}. Contains illegal characters.`,
    );
  }
}
