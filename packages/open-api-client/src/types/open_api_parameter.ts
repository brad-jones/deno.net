/**
 * Represents a valid parameter value that can be used in OpenAPI requests.
 *
 * This type defines all possible values that can be passed as parameters in different
 * parts of an HTTP request (path, query, header, or cookie). It supports primitive types,
 * arrays, and nested objects to accommodate various parameter serialization styles
 * defined in the OpenAPI specification.
 *
 * The type is recursively defined to allow for complex nested object structures in
 * parameters, though typically parameters are simple primitives or shallow objects/arrays.
 *
 * @example
 * ```ts
 * // Primitive values
 * const stringParam: OpenAPIParameter = "hello";
 * const numberParam: OpenAPIParameter = 42;
 * const boolParam: OpenAPIParameter = true;
 * const nullParam: OpenAPIParameter = null;
 *
 * // Array of primitives
 * const arrayParam: OpenAPIParameter = ["tag1", "tag2", "tag3"];
 * const numberArrayParam: OpenAPIParameter = [1, 2, 3];
 *
 * // Object with simple properties
 * const objectParam: OpenAPIParameter = {
 *   color: "red",
 *   size: "large",
 *   quantity: 5
 * };
 *
 * // Array with nested objects
 * const complexArrayParam: OpenAPIParameter = [
 *   { name: "item1", count: 10 },
 *   { name: "item2", count: 20 }
 * ];
 *
 * // Nested object structure
 * const nestedParam: OpenAPIParameter = {
 *   user: {
 *     name: "John",
 *     age: 30,
 *     tags: ["developer", "remote"]
 *   }
 * };
 * ```
 */
export type OpenAPIParameter =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | { [key: string]: OpenAPIParameter }>
  | { [key: string]: OpenAPIParameter };
