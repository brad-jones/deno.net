import { inject } from "@brad-jones/deno-net-container";
import { type IFormatter, IJavascriptFormatter, JavascriptFormatter } from "@brad-jones/deno-net-formatter";
import { basename, dirname, fromFileUrl } from "@std/path";
import * as yaml from "@std/yaml";
import type { IClientGenerator } from "./i_client_generator.ts";
import { inferSchemaFromContent, inferSchemaFromParameter } from "./schema/inference/mod.ts";
import { buildJsDocComments, hasJSDoc, splitJSDocAndType } from "./schema/jsdoc/mod.ts";
import { SchemaSanitizer, TypeScriptTypeGenerator, ZodSchemaGenerator } from "./schema/mod.ts";
import { type OpenAPISchemaObjectSchema, OpenAPISpec } from "./types/mod.ts";

// These are replaced at build time by the `replace-import-specifiers.ts` script.
const _DEFAULT_CLIENT_IMPORT_SPECIFIER = "jsr:@brad-jones/deno-net-open-api-client@0.3.1";
const _DEFAULT_ZOD_IMPORT_SPECIFIER = "npm:zod@^4.1.12";

/**
 * Configuration options for client code generation.
 *
 * These options control various aspects of the generated TypeScript client code,
 * including validation behavior, formatting, and import specifiers for dependencies.
 *
 * @example
 * ```ts
 * const options: ClientGeneratorOptions = {
 *   validateRequests: true,
 *   validateResponses: true,
 *   fmtResult: true,
 *   importSpecifiers: {
 *     zod: "npm:zod@1.2.3"
 *   }
 * };
 * ```
 */
export interface ClientGeneratorOptions {
  /**
   * If true, generates Zod schemas for request validation.
   *
   * @default false
   */
  validateRequests?: boolean;

  /**
   * If true, generates Zod schemas for response validation.
   *
   * @default false
   */
  validateResponses?: boolean;

  /**
   * If true, formats the generated code using the configured formatter.
   *
   * @default true
   */
  fmtResult?: boolean;

  /**
   * Custom import specifiers for any runtime dependencies that generated client have.
   */
  importSpecifiers?: { zod?: string; client?: string };
}

/**
 * Abstract base class for OpenAPI client code generators.
 *
 * This class provides common functionality for generating TypeScript client code from
 * OpenAPI specifications. It handles parsing OpenAPI specs from various sources (files,
 * URLs, text), generating TypeScript types and Zod schemas for component schemas, and
 * building type-safe request/response signatures for operations.
 *
 * Subclasses must implement the `generateClient` method to produce the final client code
 * in their desired format (e.g., class-based, function-based).
 *
 * Features:
 * - Parse OpenAPI specs from JSON, YAML files, URLs, or raw text
 * - Generate TypeScript types from OpenAPI schemas
 * - Generate Zod validation schemas (optional)
 * - Build type-safe operation signatures with proper JSDoc
 * - Handle parameter serialization metadata
 * - Support request/response validation
 * - Automatic code formatting
 *
 * @example
 * ```ts
 * class MyGenerator extends BaseClientGenerator {
 *   protected generateClient(spec: OpenAPISpec): string {
 *     // Custom implementation
 *     return "// Generated client code";
 *   }
 * }
 *
 * const generator = new MyGenerator({
 *   validateRequests: true,
 *   validateResponses: true
 * });
 *
 * const clientCode = await generator.generateFromUrl("https://api.example.com/openapi.json");
 * ```
 */
export abstract class BaseClientGenerator implements IClientGenerator {
  protected readonly jsFormatter: IFormatter;

  protected get clientImport() {
    return this.options?.importSpecifiers?.client ?? _DEFAULT_CLIENT_IMPORT_SPECIFIER;
  }

  protected get zodImport() {
    return this.options?.importSpecifiers?.zod ?? _DEFAULT_ZOD_IMPORT_SPECIFIER;
  }

  constructor(
    protected readonly options?: ClientGeneratorOptions,
    formatter = inject(IJavascriptFormatter, {
      optional: true,
    }),
  ) {
    this.jsFormatter = formatter ?? new JavascriptFormatter();
  }

  /**
   * Generates TypeScript client code from an OpenAPI specification.
   *
   * This method validates the OpenAPI spec, generates the client code, optionally formats it,
   * and either returns the code as a string or writes it to a file.
   *
   * @param spec - The OpenAPI specification object to generate from
   * @param outFilePath - Optional file path to write the generated code. If omitted, returns the code as a string.
   * @returns A promise that resolves to the generated code string (if no outFilePath) or void (if written to file)
   *
   * @throws {Error} If the spec validation fails
   *
   * @example
   * ```ts
   * // Generate and return as string
   * const code = await generator.generate(spec);
   * console.log(code);
   *
   * // Generate and write to file
   * await generator.generate(spec, "./src/generated/api-client.ts");
   * ```
   */
  generate(spec: OpenAPISpec): Promise<string>;
  generate(spec: OpenAPISpec, outFilePath: string): Promise<void>;
  async generate(
    spec: OpenAPISpec,
    outFilePath?: string,
  ): Promise<string | void> {
    const validatedSpec = OpenAPISpec.parse(spec);
    let clientSrc = this.generateClient(validatedSpec);
    if (this.options?.fmtResult !== false) {
      clientSrc = await this.jsFormatter.fmt(clientSrc);
    }
    if (typeof outFilePath === "string") {
      await Deno.mkdir(dirname(outFilePath), { recursive: true });
      await Deno.writeTextFile(outFilePath, clientSrc);
      return;
    }
    return clientSrc;
  }

  /**
   * Generates TypeScript client code from an OpenAPI specification file.
   *
   * Reads an OpenAPI specification from a JSON or YAML file, parses it, and generates
   * client code. Supports both JSON (.json) and YAML (.yaml, .yml) file formats.
   *
   * @param filePath - Path to the OpenAPI specification file (JSON or YAML)
   * @param outFilePath - Optional file path to write the generated code. If omitted, returns the code as a string.
   * @returns A promise that resolves to the generated code string (if no outFilePath) or void (if written to file)
   *
   * @throws {Error} If the file cannot be read, parsed, or validated
   *
   * @example
   * ```ts
   * // Generate from JSON file
   * const code = await generator.generateFromFile("./openapi.json");
   *
   * // Generate from YAML file and write to output
   * await generator.generateFromFile("./openapi.yaml", "./src/api-client.ts");
   * ```
   */
  generateFromFile(filePath: string): Promise<string>;
  generateFromFile(filePath: string, outFilePath: string): Promise<void>;
  async generateFromFile(
    filePath: string,
    outFilePath?: string,
  ): Promise<string | void> {
    const rawObject = this.generateFromText(
      await Deno.readTextFile(filePath),
      basename(filePath),
    );
    if (outFilePath) {
      return await this.generate(rawObject, outFilePath);
    }
    return await this.generate(rawObject);
  }

  /**
   * Generates TypeScript client code from an OpenAPI specification URL.
   *
   * Fetches an OpenAPI specification from a URL (HTTP/HTTPS or file:// protocol),
   * parses it, and generates client code. Automatically detects JSON or YAML format
   * based on file extension.
   *
   * @param url - URL to the OpenAPI specification (HTTP/HTTPS URL or file:// URL)
   * @param outFilePath - Optional file path to write the generated code. If omitted, returns the code as a string.
   * @returns A promise that resolves to the generated code string (if no outFilePath) or void (if written to file)
   *
   * @throws {Error} If the URL cannot be fetched, parsed, or validated
   *
   * @example
   * ```ts
   * // Generate from remote URL
   * const code = await generator.generateFromUrl("https://api.example.com/openapi.json");
   *
   * // Generate from file:// URL
   * await generator.generateFromUrl("file:///path/to/openapi.yaml", "./src/api-client.ts");
   *
   * // Using URL object
   * const url = new URL("https://petstore3.swagger.io/api/v3/openapi.json");
   * await generator.generateFromUrl(url, "./src/petstore-client.ts");
   * ```
   */
  generateFromUrl(url: string | URL): Promise<string>;
  generateFromUrl(url: string | URL, outFilePath: string): Promise<void>;
  async generateFromUrl(
    url: string | URL,
    outFilePath?: string,
  ): Promise<string | void> {
    if (typeof url === "string") url = new URL(url);

    if (url.protocol === "file:") {
      if (outFilePath) {
        return await this.generateFromFile(fromFileUrl(url), outFilePath);
      }
      return await this.generateFromFile(fromFileUrl(url));
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`fetch of ${url} failed`);
    }

    const rawObject = this.generateFromText(
      await response.text(),
      basename(url.pathname),
    );
    if (outFilePath) {
      return await this.generate(rawObject, outFilePath);
    }
    return await this.generate(rawObject);
  }

  // deno-lint-ignore no-explicit-any
  protected generateFromText(rawText: string, filename: string): any {
    let rawObject;

    if (filename.endsWith(".json")) {
      rawObject = JSON.parse(rawText);
    } else if (filename.endsWith(".yaml") || filename.endsWith(".yml")) {
      rawObject = yaml.parse(rawText);
    } else {
      throw new Error("unknown file type");
    }

    return rawObject;
  }

  protected abstract generateClient(spec: OpenAPISpec): string;

  protected generateComponentSchemas(
    schemas: Record<string, OpenAPISchemaObjectSchema> | undefined,
  ): {
    code: string;
    typeGen: TypeScriptTypeGenerator;
    zodGen: ZodSchemaGenerator;
  } {
    const schemaSanitizer = new SchemaSanitizer(schemas);
    const typeGen = new TypeScriptTypeGenerator(schemaSanitizer);
    const zodGen = new ZodSchemaGenerator(schemaSanitizer);

    if (!schemas) {
      return {
        code: "",
        typeGen,
        zodGen,
      };
    }

    const parts: string[] = [];

    // Generate TypeScript types
    for (const schemaName of schemaSanitizer.orderedSchemaNames) {
      const sanitizedName = schemaSanitizer.sanitizeSchemaName(schemaName);
      const typeCode = typeGen.generate(schemas[schemaName]);

      // If the type code starts with JSDoc, extract and place it before the export
      if (typeCode.trimStart().startsWith("/**")) {
        // Find the end of the JSDoc comment
        const jsdocEndMatch = typeCode.match(/\*\/\s*/);
        if (jsdocEndMatch && jsdocEndMatch.index !== undefined) {
          const jsdocEndPos = jsdocEndMatch.index + jsdocEndMatch[0].length;
          const jsdoc = typeCode.substring(0, jsdocEndPos).trimEnd();
          const remainingType = typeCode.substring(jsdocEndPos).trimStart();
          parts.push(jsdoc);
          parts.push(`export type ${sanitizedName} = ${remainingType};`);
        } else {
          parts.push(`export type ${sanitizedName} = ${typeCode};`);
        }
      } else {
        parts.push(`export type ${sanitizedName} = ${typeCode};`);
      }
      parts.push("");
    }

    // Generate Zod schemas if validation is enabled
    if (this.options?.validateRequests || this.options?.validateResponses) {
      for (const schemaName of schemaSanitizer.orderedSchemaNames) {
        const sanitizedName = schemaSanitizer.sanitizeSchemaName(schemaName);
        const schemaCode = zodGen.generate(schemas[schemaName]);
        parts.push(
          `export const ${sanitizedName}Schema: z.ZodType<${sanitizedName}> = ${schemaCode};`,
        );
        parts.push("");
      }
    }

    return { code: parts.join("\n"), typeGen, zodGen };
  }

  protected resolveParameters(
    parameters: Array<Record<string, unknown>>,
    components?: Record<string, unknown>,
  ): Array<Record<string, unknown>> {
    const resolved: Array<Record<string, unknown>> = [];
    const componentParameters = components?.parameters as
      | Record<string, unknown>
      | undefined;

    for (const param of parameters) {
      if (param.$ref && typeof param.$ref === "string") {
        // It's a reference - resolve it
        const ref = param.$ref;
        if (ref.startsWith("#/components/parameters/")) {
          const paramName = ref.substring("#/components/parameters/".length);
          const resolvedParam = componentParameters?.[paramName] as
            | Record<string, unknown>
            | undefined;
          if (resolvedParam) {
            resolved.push(resolvedParam);
          } else {
            console.warn(`Could not resolve parameter reference: ${ref}`);
          }
        } else {
          console.warn(`Unsupported parameter $ref format: ${ref}`);
        }
      } else {
        // It's already a parameter object
        resolved.push(param);
      }
    }

    return resolved;
  }

  protected generateOperationJSDoc(
    operation: Record<string, unknown>,
  ): string | null {
    const summary = operation.summary as string | undefined;
    const description = operation.description as string | undefined;

    if (!summary && !description) {
      return null;
    }

    const formatText = (text: string): string => {
      // Split by newlines and add * prefix to each line
      return text.split("\n").map((line) => ` * ${line}`).join("\n");
    };

    if (summary && description) {
      return `/**\n${formatText(summary)}\n *\n${formatText(description)}\n */`;
    }

    if (summary) {
      return `/**\n${formatText(summary)}\n */`;
    }

    if (description) {
      return `/**\n${formatText(description)}\n */`;
    }

    return null;
  }

  protected generateParameterGroupTypeInline(
    parameters: Array<Record<string, unknown>>,
    typeGen: TypeScriptTypeGenerator,
  ): string {
    const props: string[] = [];

    for (const param of parameters) {
      const name = param.name as string;
      const required = param.required === true;
      let schema = param.schema as Record<string, unknown> | undefined;
      const description = param.description as string | undefined;

      // If no schema exists, try to infer one from examples
      if (!schema) {
        schema = inferSchemaFromParameter(
          param as {
            schema?: Record<string, unknown>;
            example?: unknown;
            examples?: Record<string, unknown>;
          },
        );
      }

      // Generate the type without JSDoc wrapping
      const baseSchema = schema || { type: "string" };
      const paramType = typeGen.generate(baseSchema, true);

      // Quote parameter name if it contains special characters
      const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : `"${name}"`;

      // Build property with optional JSDoc
      let prop = "";

      // Combine parameter description with schema JSDoc (format, etc)
      if (description || hasJSDoc(paramType)) {
        let combinedJSDoc: string;

        if (hasJSDoc(paramType)) {
          const { jsdocLines, typeLine } = splitJSDocAndType(paramType);

          if (description) {
            // Merge parameter description with schema JSDoc
            // Schema JSDoc typically contains format info
            const descLines = description.split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0);

            const jsdocContent: string[] = [];
            descLines.forEach((line) => jsdocContent.push(` * ${line}`));

            // Extract format or other tags from schema JSDoc
            const schemaJSDocTags: string[] = [];
            jsdocLines.forEach((line) => {
              // Handle both single-line /** @format ... */ and multi-line JSDoc
              const trimmed = line.trim();
              if (trimmed.includes("@")) {
                // Extract @tags from the line
                const tagMatch = trimmed.match(/@[\w-]+\s+[\w-]+/g);
                if (tagMatch) {
                  tagMatch.forEach((tag) => schemaJSDocTags.push(tag));
                }
              }
            });

            if (schemaJSDocTags.length > 0) {
              jsdocContent.push(` *`);
              schemaJSDocTags.forEach((tag) => jsdocContent.push(` * ${tag}`));
            }

            combinedJSDoc = `/**\n${jsdocContent.join("\n")}\n     */`;
            const formattedJSDoc = combinedJSDoc.split("\n").map((line) => `    ${line}`).join("\n");
            prop = `${formattedJSDoc}\n    ${safeName}${required ? "" : "?"}: ${typeLine};`;
          } else {
            // Just use schema JSDoc
            const formattedJSDoc = jsdocLines.map((line) => `    ${line}`).join(
              "\n",
            );
            prop = `${formattedJSDoc}\n    ${safeName}${required ? "" : "?"}: ${typeLine};`;
          }
        } else if (description) {
          // Only parameter description, no schema JSDoc
          const descJSDoc = buildJsDocComments({ description });
          if (descJSDoc) {
            const formattedJSDoc = descJSDoc.split("\n").map((line) => `    ${line}`).join("\n");
            prop = `${formattedJSDoc}\n    ${safeName}${required ? "" : "?"}: ${paramType};`;
          } else {
            prop = `    ${safeName}${required ? "" : "?"}: ${paramType};`;
          }
        }
      } else {
        // No JSDoc at all
        prop = `    ${safeName}${required ? "" : "?"}: ${paramType};`;
      }

      props.push(prop);
    }

    if (props.length === 0) {
      return "{}";
    }

    return `{\n${props.join("\n")}\n  }`;
  }

  protected generateRequestBodyTypeInline(
    requestBody: Record<string, unknown>,
    typeGen: TypeScriptTypeGenerator,
    operationContext?: { method: string; path: string },
  ): string | null {
    const content = requestBody.content as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!content) return null;

    // Only support application/json for now
    const jsonContent = content["application/json"];
    if (!jsonContent) {
      const contentTypes = Object.keys(content).join(", ");
      const context = operationContext
        ? `${operationContext.method.toUpperCase()} ${operationContext.path}`
        : "unknown operation";
      console.warn(
        `Non-JSON request body content type not supported for ${context}, found: ${contentTypes}`,
      );
      return `"WARN: application/json is the only supported content type"`;
    }

    let schema = jsonContent.schema as Record<string, unknown> | undefined;

    // If no schema exists, try to infer one from examples
    if (!schema) {
      schema = inferSchemaFromContent(content);
    }

    if (!schema) return null;

    // Use inline=false to reference component types instead of inlining them
    return typeGen.generate(schema, false);
  }

  protected hasAllOptionalProperties(
    schema: Record<string, unknown>,
    componentSchemas?: Record<string, unknown>,
  ): boolean {
    // Handle $ref
    if (schema.$ref && typeof schema.$ref === "string") {
      const parts = schema.$ref.split("/");
      const schemaName = parts[parts.length - 1];
      if (componentSchemas && componentSchemas[schemaName]) {
        return this.hasAllOptionalProperties(
          componentSchemas[schemaName] as Record<string, unknown>,
          componentSchemas,
        );
      }
      return false; // Can't determine, assume not all optional
    }

    // Handle arrays - if it's an array type, it's not "all optional properties"
    if (schema.type === "array") {
      return false;
    }

    // Handle primitives - if it's a primitive type, it's not "all optional properties"
    if (
      schema.type === "string" ||
      schema.type === "number" ||
      schema.type === "integer" ||
      schema.type === "boolean" ||
      schema.type === "null"
    ) {
      return false;
    }

    // Handle objects
    if (schema.type === "object" || schema.properties) {
      const properties = schema.properties as
        | Record<string, unknown>
        | undefined;
      const required = (schema.required as string[]) || [];

      // If there are no properties, treat as not all optional
      if (!properties || Object.keys(properties).length === 0) {
        return false;
      }

      // Check if all properties are optional (not in required array)
      const allPropertiesOptional = Object.keys(properties).every(
        (propName) => !required.includes(propName),
      );

      return allPropertiesOptional;
    }

    // Handle composition (allOf, oneOf, anyOf)
    if (schema.allOf || schema.oneOf || schema.anyOf) {
      // For composition, we can't easily determine if all properties are optional
      // Conservative approach: assume not all optional
      return false;
    }

    // Unknown schema type, assume not all optional
    return false;
  }

  protected generateResponseTypeInline(
    operation: Record<string, unknown>,
    typeGen: TypeScriptTypeGenerator,
  ): string {
    const responses = operation.responses as Record<
      string,
      Record<string, unknown>
    >;

    const responseParts: string[] = [];

    for (const [status, response] of Object.entries(responses)) {
      const content = response.content as
        | Record<string, Record<string, unknown>>
        | undefined;
      const description = response.description as string | undefined;
      const headers = response.headers as
        | Record<string, Record<string, unknown>>
        | undefined;

      let bodyType = "unknown";
      let bodyJSDoc: string | null = null;

      if (content) {
        const jsonContent = content["application/json"];
        if (jsonContent) {
          let schema = jsonContent.schema as
            | Record<string, unknown>
            | undefined;

          // If no schema exists, try to infer one from examples
          if (!schema) {
            schema = inferSchemaFromContent(content);
          }

          if (schema) {
            // Use inline=false to reference component types instead of inlining them
            const generatedType = typeGen.generate(schema, false);

            // Only extract block-level JSDoc that appears at the start of the type
            // (not inline JSDoc like "Record<string, /** @format */ number>")
            if (generatedType.trimStart().startsWith("/**")) {
              const { jsdocLines, typeLine } = splitJSDocAndType(generatedType);
              if (jsdocLines.length > 0) {
                bodyType = typeLine;
                // Format JSDoc for inline placement
                if (
                  jsdocLines.length === 1 && jsdocLines[0].includes("/**") &&
                  jsdocLines[0].includes("*/")
                ) {
                  // Single-line JSDoc
                  bodyJSDoc = jsdocLines[0].trim();
                } else {
                  // Multi-line JSDoc
                  bodyJSDoc = jsdocLines.join("\n");
                }
              } else {
                bodyType = generatedType;
              }
            } else {
              bodyType = generatedType;
            }
          }
        }
      }

      const statusKey = status === "default" ? `"default"` : status;

      // Build the response part with proper JSDoc placement
      const parts: string[] = [];

      // Add response description JSDoc if present
      if (description) {
        const lines = description.split("\n").filter((line) => line.trim());
        if (lines.length === 1) {
          parts.push(`/** ${lines[0]} */`);
        } else {
          const jsdocLines = lines.map((line) => `     * ${line}`).join("\n");
          parts.push(`/**\n${jsdocLines}\n     */`);
        }
      }

      // Start the status object
      parts.push(`${statusKey}: {`);

      // Add body with its JSDoc if present
      if (bodyJSDoc) {
        parts.push(`      ${bodyJSDoc}`);
        parts.push(`      body: ${bodyType};`);
      } else {
        parts.push(`      body: ${bodyType};`);
      }

      // Add headers if present
      if (headers && Object.keys(headers).length > 0) {
        const headerParams = Object.entries(headers).map(([name, header]) => ({
          name,
          required: (header.required as boolean | undefined) || false,
          schema: header.schema as Record<string, unknown> | undefined,
          description: header.description as string | undefined,
          example: header.example,
          examples: header.examples as Record<string, unknown> | undefined,
        }));

        const headersType = this.generateParameterGroupTypeInline(
          headerParams,
          typeGen,
        );
        parts.push(`      headers: ${headersType};`);
      }

      parts.push(`    }`);

      responseParts.push(parts.join("\n    "));
    }

    return `{\n    ${responseParts.join(";\n    ")};\n  }`;
  }

  protected generateRequestSchema(
    operation: Record<string, unknown>,
    parameters: Array<Record<string, unknown>>,
    schemaGen: ZodSchemaGenerator,
  ): string | null {
    const requestBody = operation.requestBody as
      | Record<string, unknown>
      | undefined;

    const hasPathParams = parameters.some((p) => p.in === "path");
    const hasQueryParams = parameters.some((p) => p.in === "query");
    const hasHeaderParams = parameters.some((p) => p.in === "header");
    const hasCookieParams = parameters.some((p) => p.in === "cookie");
    const hasBody = requestBody !== undefined;

    if (
      !hasPathParams && !hasQueryParams && !hasHeaderParams &&
      !hasCookieParams && !hasBody
    ) {
      return null;
    }

    const schemaParts: string[] = [];

    // Path parameters
    if (hasPathParams) {
      const pathParams = parameters.filter((p) => p.in === "path");
      const pathSchema = this.generateParameterGroupSchema(
        pathParams,
        schemaGen,
      );
      schemaParts.push(`path: ${pathSchema}`);
    }

    // Query parameters
    if (hasQueryParams) {
      const queryParams = parameters.filter((p) => p.in === "query");
      const querySchema = this.generateParameterGroupSchema(
        queryParams,
        schemaGen,
      );
      const isAllOptional = queryParams.every((p) => !p.required);
      schemaParts.push(
        `query: ${querySchema}${isAllOptional ? ".optional()" : ""}`,
      );
    }

    // Header parameters
    if (hasHeaderParams) {
      const headerParams = parameters.filter((p) => p.in === "header");
      const headerSchema = this.generateParameterGroupSchema(
        headerParams,
        schemaGen,
      );
      const isAllOptional = headerParams.every((p) => !p.required);
      schemaParts.push(
        `headers: ${headerSchema}${isAllOptional ? ".optional()" : ""}`,
      );
    }

    // Cookie parameters
    if (hasCookieParams) {
      const cookieParams = parameters.filter((p) => p.in === "cookie");
      const cookieSchema = this.generateParameterGroupSchema(
        cookieParams,
        schemaGen,
      );
      const isAllOptional = cookieParams.every((p) => !p.required);
      schemaParts.push(
        `cookies: ${cookieSchema}${isAllOptional ? ".optional()" : ""}`,
      );
    }

    // Request body
    if (hasBody) {
      const bodySchema = this.generateRequestBodySchema(requestBody, schemaGen);
      if (bodySchema) {
        const isRequired = requestBody.required !== false;
        schemaParts.push(
          `body: ${bodySchema}${isRequired ? "" : ".optional()"}`,
        );
      }
    }

    return `z.object({\n${schemaParts.join(",\n")}\n})`;
  }

  protected generateParameterGroupSchema(
    parameters: Array<Record<string, unknown>>,
    schemaGen: ZodSchemaGenerator,
  ): string {
    const props: string[] = [];

    for (const param of parameters) {
      const name = param.name as string;
      const required = param.required === true;
      let schema = param.schema as Record<string, unknown> | undefined;

      // If no schema exists, try to infer one from examples
      if (!schema) {
        schema = inferSchemaFromParameter(
          param as {
            schema?: Record<string, unknown>;
            example?: unknown;
            examples?: Record<string, unknown>;
          },
        );
      }

      const paramSchema = schemaGen.generate(
        schema || { type: "string" },
        false,
      );

      // Quote parameter name if it contains special characters
      const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : `"${name}"`;
      props.push(`${safeName}: ${paramSchema}${required ? "" : ".optional()"}`);
    }

    return `z.object({\n${props.join(",\n")}\n})`;
  }

  protected generateRequestBodySchema(
    requestBody: Record<string, unknown>,
    schemaGen: ZodSchemaGenerator,
  ): string | null {
    const content = requestBody.content as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!content) return null;

    const jsonContent = content["application/json"];
    if (!jsonContent) return null;

    let schema = jsonContent.schema as Record<string, unknown> | undefined;

    // If no schema exists, try to infer one from examples
    if (!schema) {
      schema = inferSchemaFromContent(content);
    }

    if (!schema) return null;

    return schemaGen.generate(schema, false);
  }

  protected generateResponseSchema(
    operation: Record<string, unknown>,
    schemaGen: ZodSchemaGenerator,
  ): string | null {
    const responses = operation.responses as Record<
      string,
      Record<string, unknown>
    >;

    const schemaParts: string[] = [];

    for (const [status, response] of Object.entries(responses)) {
      const content = response.content as
        | Record<string, Record<string, unknown>>
        | undefined;
      const headers = response.headers as
        | Record<string, Record<string, unknown>>
        | undefined;

      let bodySchema = "z.unknown()";
      if (content) {
        const jsonContent = content["application/json"];
        if (jsonContent) {
          let schema = jsonContent.schema as
            | Record<string, unknown>
            | undefined;

          // If no schema exists, try to infer one from examples
          if (!schema) {
            schema = inferSchemaFromContent(content);
          }

          if (schema) {
            bodySchema = schemaGen.generate(schema, false);
          }
        }
      }

      const statusKey = status === "default" ? `"default"` : status;

      // Build response object schema with body and optional headers
      const responseObjectParts: string[] = [`body: ${bodySchema}`];

      if (headers && Object.keys(headers).length > 0) {
        const headerParams = Object.entries(headers).map(([name, header]) => ({
          name,
          required: (header.required as boolean | undefined) || false,
          schema: header.schema as Record<string, unknown> | undefined,
          example: header.example,
          examples: header.examples as Record<string, unknown> | undefined,
        }));

        const headersSchema = this.generateParameterGroupSchema(
          headerParams,
          schemaGen,
        );
        responseObjectParts.push(`headers: ${headersSchema}`);
      }

      schemaParts.push(
        `${statusKey}: z.object({ ${responseObjectParts.join(", ")} })`,
      );
    }

    return `{\n${schemaParts.join(",\n")}\n}`;
  }

  protected generateOperationMetadata(
    schemaGen: ZodSchemaGenerator,
    path: string,
    method: string,
    operation: Record<string, unknown>,
    pathItem: Record<string, unknown>,
    components?: Record<string, unknown>,
  ): string {
    const metadataParts: string[] = [];

    // Path and method
    metadataParts.push(`path: "${path}"`);
    metadataParts.push(`method: "${method}"`);

    // Resolve parameters
    const pathParameters = (pathItem.parameters as Array<Record<string, unknown>>) || [];
    const operationParameters = (operation.parameters as Array<Record<string, unknown>>) || [];
    const allParameters = [...pathParameters, ...operationParameters];
    const parameters = this.resolveParameters(allParameters, components);

    // Parameters metadata (only if non-default)
    const paramMetadata = this.generateParameterMetadata(parameters);
    if (paramMetadata) {
      metadataParts.push(`parameters: ${paramMetadata}`);
    }

    // Request schema (if validation enabled)
    if (this.options?.validateRequests) {
      const requestSchema = this.generateRequestSchema(
        operation,
        parameters,
        schemaGen,
      );
      if (requestSchema) {
        metadataParts.push(`requestSchema: ${requestSchema}`);
      }
    }

    // Response schema (if validation enabled)
    if (this.options?.validateResponses) {
      const responseSchema = this.generateResponseSchema(
        operation,
        schemaGen,
      );
      if (responseSchema) {
        metadataParts.push(`responseSchema: ${responseSchema}`);
      }
    }

    return `{\n${metadataParts.join(",\n")}\n}`;
  }

  protected generateParameterMetadata(
    parameters: Array<Record<string, unknown>>,
  ): string | null {
    const metadata: Array<Record<string, unknown>> = [];

    for (const param of parameters) {
      const location = param.in as string;
      const style = param.style as string | undefined;
      const explode = param.explode as boolean | undefined;

      // Check if this is a non-default combination
      const isDefault = this.isDefaultParameterStyle(location, style, explode);
      if (!isDefault) {
        metadata.push({
          name: param.name,
          location,
          style: style || this.getDefaultStyle(location),
          explode: explode !== undefined ? explode : this.getDefaultExplode(location),
        });
      }
    }

    if (metadata.length === 0) return null;

    return JSON.stringify(metadata);
  }

  protected isDefaultParameterStyle(
    location: string,
    style?: string,
    explode?: boolean,
  ): boolean {
    const defaultStyle = this.getDefaultStyle(location);
    const defaultExplode = this.getDefaultExplode(location);

    return (
      (style === undefined || style === defaultStyle) &&
      (explode === undefined || explode === defaultExplode)
    );
  }

  protected getDefaultStyle(location: string): string {
    switch (location) {
      case "path":
        return "simple";
      case "query":
        return "form";
      case "header":
        return "simple";
      case "cookie":
        return "form";
      default:
        return "simple";
    }
  }

  protected getDefaultExplode(location: string): boolean {
    switch (location) {
      case "path":
        return false;
      case "query":
        return true;
      case "header":
        return false;
      case "cookie":
        return true;
      default:
        return false;
    }
  }

  protected buildRequestSignature(
    typeGen: TypeScriptTypeGenerator,
    path: string,
    method: string,
    operation: Record<string, unknown>,
    pathItem: Record<string, unknown>,
    components?: Record<string, unknown>,
  ): {
    requestType: string;
    hasRequest: boolean;
  } {
    // Resolve parameters from both path-level and operation-level
    const pathParameters = (pathItem.parameters as Array<Record<string, unknown>>) || [];
    const operationParameters = (operation.parameters as Array<Record<string, unknown>>) || [];

    // Merge and resolve parameters
    const allParameters = [...pathParameters, ...operationParameters];
    const parameters = this.resolveParameters(allParameters, components);

    const requestBody = operation.requestBody as
      | Record<string, unknown>
      | undefined;

    const hasPathParams = parameters.some((p: Record<string, unknown>) => p.in === "path");
    const hasQueryParams = parameters.some((p: Record<string, unknown>) => p.in === "query");
    const hasHeaderParams = parameters.some((p: Record<string, unknown>) => p.in === "header");
    const hasCookieParams = parameters.some((p: Record<string, unknown>) => p.in === "cookie");
    const hasBody = requestBody !== undefined;

    const hasRequest = hasPathParams || hasQueryParams || hasHeaderParams ||
      hasCookieParams || hasBody;

    // Build inline request type
    let requestType = "";
    let allRequestPartsOptional = true; // Track if all parts are optional

    if (hasRequest) {
      const requestParts: string[] = [];

      // Path parameters (never optional)
      if (hasPathParams) {
        const pathParams = parameters.filter((p: Record<string, unknown>) => p.in === "path");
        const pathType = this.generateParameterGroupTypeInline(
          pathParams,
          typeGen,
        );
        requestParts.push(`path:${pathType}`);
        allRequestPartsOptional = false; // Path params are never optional
      }

      // Query parameters
      if (hasQueryParams) {
        const queryParams = parameters.filter((p: Record<string, unknown>) => p.in === "query");
        const queryType = this.generateParameterGroupTypeInline(
          queryParams,
          typeGen,
        );
        const isAllOptional = queryParams.every((p: Record<string, unknown>) => !p.required);
        requestParts.push(`query${isAllOptional ? "?" : ""}:${queryType}`);
        if (!isAllOptional) allRequestPartsOptional = false;
      }

      // Header parameters
      if (hasHeaderParams) {
        const headerParams = parameters.filter((p: Record<string, unknown>) => p.in === "header");
        const headerType = this.generateParameterGroupTypeInline(
          headerParams,
          typeGen,
        );
        const isAllOptional = headerParams.every((p: Record<string, unknown>) => !p.required);
        requestParts.push(`headers${isAllOptional ? "?" : ""}:${headerType}`);
        if (!isAllOptional) allRequestPartsOptional = false;
      }

      // Cookie parameters
      if (hasCookieParams) {
        const cookieParams = parameters.filter((p: Record<string, unknown>) => p.in === "cookie");
        const cookieType = this.generateParameterGroupTypeInline(
          cookieParams,
          typeGen,
        );
        const isAllOptional = cookieParams.every((p: Record<string, unknown>) => !p.required);
        requestParts.push(`cookies${isAllOptional ? "?" : ""}:${cookieType}`);
        if (!isAllOptional) allRequestPartsOptional = false;
      }

      // Request body
      if (hasBody) {
        const bodyType = this.generateRequestBodyTypeInline(
          requestBody,
          typeGen,
          path && method ? { path, method } : undefined,
        );
        if (bodyType) {
          const isBodyRequired = requestBody.required === true;

          // Check if the body schema has all optional properties
          const content = requestBody.content as
            | Record<string, Record<string, unknown>>
            | undefined;
          const jsonContent = content?.["application/json"];
          let schema = jsonContent?.schema as
            | Record<string, unknown>
            | undefined;

          // If no schema exists, try to infer one from examples
          if (!schema && content) {
            schema = inferSchemaFromContent(content);
          }

          const hasAllOptionalProps = schema
            ? this.hasAllOptionalProperties(
              schema,
              components?.schemas as
                | Record<string, unknown>
                | undefined,
            )
            : false;

          // Body is optional if the requestBody is not required AND all schema properties are optional
          const shouldBodyBeOptional = !isBodyRequired && hasAllOptionalProps;

          requestParts.push(
            `body${shouldBodyBeOptional ? "?" : ""}: ${bodyType}`,
          );
          if (!shouldBodyBeOptional) allRequestPartsOptional = false;
        }
      }

      requestType = `request${allRequestPartsOptional ? "?" : ""}: {${requestParts.join(", ")}}`;
    }

    return { hasRequest, requestType };
  }
}
