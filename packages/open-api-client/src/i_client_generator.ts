import { Type } from "@brad-jones/deno-net-container";
import type { OpenAPISpec } from "./types/mod.ts";

/**
 * Dependency injection token for IClientGenerator interface.
 *
 * This token is used with the dependency injection container to register and resolve
 * client generator implementations.
 *
 * @example
 * ```ts
 * import { Container } from "@brad-jones/deno-net-container";
 * import { IClientGenerator, ClassicalClientGenerator } from "./mod.ts";
 *
 * const container = new Container();
 * container.register(IClientGenerator, ClassicalClientGenerator);
 *
 * const generator = container.resolve(IClientGenerator);
 * ```
 */
export const IClientGenerator = new Type<IClientGenerator>("IClientGenerator");

/**
 * Interface for OpenAPI client code generators.
 *
 * Defines the contract for all client generator implementations. Generators can produce
 * TypeScript client code from OpenAPI specifications in various formats (classical OOP,
 * functional, etc.). All methods support both returning the generated code as a string
 * or writing it directly to a file.
 *
 * Implementations must handle:
 * - Parsing OpenAPI specs from objects, files, or URLs
 * - Generating TypeScript types from schemas
 * - Creating type-safe operation methods/functions
 * - Optional request/response validation with Zod
 * - Code formatting
 *
 * @example
 * ```ts
 * class MyGenerator implements IClientGenerator {
 *   async generate(spec: OpenAPISpec): Promise<string>;
 *   async generate(spec: OpenAPISpec, outFilePath: string): Promise<void>;
 *   async generate(spec: OpenAPISpec, outFilePath?: string): Promise<string | void> {
 *     // Implementation
 *   }
 *
 *   // ... implement other methods
 * }
 * ```
 */
export interface IClientGenerator {
  /**
   * Generates TypeScript client code from an OpenAPI specification object.
   *
   * @param spec - The OpenAPI specification object to generate from
   * @returns A promise that resolves to the generated TypeScript code
   *
   * @example
   * ```ts
   * const spec = { openapi: "3.1.0", info: { title: "API", version: "1.0.0" }, paths: {} };
   * const code = await generator.generate(spec);
   * ```
   */
  generate(spec: OpenAPISpec): Promise<string>;

  /**
   * Generates TypeScript client code from an OpenAPI specification object and writes it to a file.
   *
   * @param spec - The OpenAPI specification object to generate from
   * @param outFilePath - The file path where the generated code will be written
   * @returns A promise that resolves when the file has been written
   *
   * @example
   * ```ts
   * const spec = { openapi: "3.1.0", info: { title: "API", version: "1.0.0" }, paths: {} };
   * await generator.generate(spec, "./src/api-client.ts");
   * ```
   */
  generate(spec: OpenAPISpec, outFilePath: string): Promise<void>;

  /**
   * Generates TypeScript client code from an OpenAPI specification file.
   *
   * Reads and parses a JSON or YAML OpenAPI specification file, then generates client code.
   *
   * @param filePath - Path to the OpenAPI specification file (JSON or YAML)
   * @returns A promise that resolves to the generated TypeScript code
   *
   * @example
   * ```ts
   * const code = await generator.generateFromFile("./openapi.yaml");
   * ```
   */
  generateFromFile(filePath: string): Promise<string>;

  /**
   * Generates TypeScript client code from an OpenAPI specification file and writes it to a file.
   *
   * Reads and parses a JSON or YAML OpenAPI specification file, generates client code,
   * and writes the result to the specified output file.
   *
   * @param filePath - Path to the OpenAPI specification file (JSON or YAML)
   * @param outFilePath - The file path where the generated code will be written
   * @returns A promise that resolves when the file has been written
   *
   * @example
   * ```ts
   * await generator.generateFromFile("./openapi.yaml", "./src/api-client.ts");
   * ```
   */
  generateFromFile(filePath: string, outFilePath: string): Promise<void>;

  /**
   * Generates TypeScript client code from an OpenAPI specification URL.
   *
   * Fetches an OpenAPI specification from a URL (HTTP/HTTPS or file://), parses it,
   * and generates client code.
   *
   * @param url - URL to the OpenAPI specification (HTTP/HTTPS URL or file:// URL)
   * @returns A promise that resolves to the generated TypeScript code
   *
   * @example
   * ```ts
   * const code = await generator.generateFromUrl("https://api.example.com/openapi.json");
   * ```
   */
  generateFromUrl(url: string | URL): Promise<string>;

  /**
   * Generates TypeScript client code from an OpenAPI specification URL and writes it to a file.
   *
   * Fetches an OpenAPI specification from a URL (HTTP/HTTPS or file://), parses it,
   * generates client code, and writes the result to the specified output file.
   *
   * @param url - URL to the OpenAPI specification (HTTP/HTTPS URL or file:// URL)
   * @param outFilePath - The file path where the generated code will be written
   * @returns A promise that resolves when the file has been written
   *
   * @example
   * ```ts
   * await generator.generateFromUrl(
   *   "https://petstore3.swagger.io/api/v3/openapi.json",
   *   "./src/petstore-client.ts"
   * );
   * ```
   */
  generateFromUrl(url: string | URL, outFilePath: string): Promise<void>;
}
