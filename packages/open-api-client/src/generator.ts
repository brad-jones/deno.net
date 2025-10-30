import type { z } from "@zod/zod";
import * as yaml from "@std/yaml";
import { outdent } from "@cspotcode/outdent";
import { pascalCase } from "@mesqueeb/case-anything";
import { type ContainerModule, inject, Type } from "@brad-jones/deno-net-container";
import { type IFormatter, IJavascriptFormatter, JavascriptFormatter } from "@brad-jones/deno-net-formatter";
import {
  type OpenAPIOperationSchema,
  type OpenAPIRequestBodySchema,
  type OpenAPIResponseSchema,
  OpenAPISpec,
} from "./openapi_spec.ts";

export const IOpenAPIClientGenerator = new Type<IOpenAPIClientGenerator>("IOpenAPIClientGenerator");

export const openAPIClientGeneration = (options?: OpenAPIClientGeneratorOptions): ContainerModule => (c) => {
  c.addSingleton(
    IOpenAPIClientGenerator,
    class extends OpenAPIClientGenerator {
      constructor() {
        super(options);
      }
    },
  );
};

export interface IOpenAPIClientGenerator {
  generate(spec: OpenAPISpec): Promise<string>;
  generateFromFile(filePath: string): Promise<string>;
}

interface ImportSpecifiers {
  zod: string;
  baseClient: string;
}

export interface OpenAPIClientGeneratorOptions {
  importSpecifiers?: Partial<ImportSpecifiers>;
}

export class OpenAPIClientGenerator implements IOpenAPIClientGenerator {
  protected readonly jsFmt: IFormatter;

  constructor(
    private options?: OpenAPIClientGeneratorOptions,
    jsFmt = inject(IJavascriptFormatter, { optional: true }),
  ) {
    this.jsFmt = jsFmt ?? new JavascriptFormatter({ deno: true });
  }

  async generateFromFile(filePath: string): Promise<string> {
    const rawText = await Deno.readTextFile(filePath);

    let rawObject;
    if (filePath.endsWith(".json")) {
      rawObject = JSON.parse(rawText);
    } else if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      rawObject = yaml.parse(rawText);
    } else {
      throw new Error("unknown file type");
    }

    return await this.generate(rawObject);
  }

  async generate(spec: OpenAPISpec): Promise<string> {
    const validatedSpec = OpenAPISpec.parse(spec);
    const imports = this.resolveImportSpecifiers();

    return await this.jsFmt.fmt(outdent`
      import { z } from "${imports.zod}";
      import { BaseClient, type OpenAPIResponses } from "${imports.baseClient}/client";

      ${this.generateComponentSchemas(validatedSpec)}
      ${this.generatePathSchema(validatedSpec)}
      ${this.generateClientClass(validatedSpec)}
    `);
  }

  protected resolveImportSpecifiers(): ImportSpecifiers {
    const importSpecifiers: Partial<ImportSpecifiers> = {};

    if (this.options?.importSpecifiers?.zod) {
      importSpecifiers.zod = this.options?.importSpecifiers.zod;
    } else {
      importSpecifiers.zod = "jsr:@zod/zod@^4.1.12";
    }

    if (this.options?.importSpecifiers?.baseClient) {
      importSpecifiers.baseClient = this.options?.importSpecifiers.baseClient;
    } else {
      importSpecifiers.baseClient = "jsr:@brad-jones/deno-net-open-api-client@0.1.4";
    }

    return importSpecifiers as ImportSpecifiers;
  }

  protected generateComponentSchemas(spec: OpenAPISpec): string {
    if (!spec.components?.schemas) {
      return "";
    }

    const schemaDefinitions: string[] = [];

    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      const zodSchema = this.convertOpenAPISchemaToZod(schema);
      schemaDefinitions.push(`export const ${schemaName}Schema = ${zodSchema};`);
    }

    if (schemaDefinitions.length === 0) {
      return "";
    }

    return `// Component Schemas\n${schemaDefinitions.join("\n\n")}\n\n`;
  }

  protected convertOpenAPISchemaToZod(schema: unknown): string {
    if (typeof schema !== "object" || schema === null) {
      return "z.unknown()";
    }

    const schemaObj = schema as Record<string, unknown>;

    // Handle $ref
    if (schemaObj.$ref) {
      const refPath = schemaObj.$ref as string;
      if (refPath.startsWith("#/components/schemas/")) {
        const schemaName = refPath.replace("#/components/schemas/", "");
        return `${schemaName}Schema`;
      }
      return "z.unknown()";
    }

    // Handle type-based schemas
    switch (schemaObj.type) {
      case "string":
        return this.generateStringSchema(schemaObj);
      case "number":
      case "integer":
        return this.generateNumberSchema(schemaObj);
      case "boolean":
        return "z.boolean()";
      case "array":
        return this.generateArraySchema(schemaObj);
      case "object":
        return this.generateObjectSchema(schemaObj);
      default:
        return "z.unknown()";
    }
  }

  protected generateStringSchema(schema: Record<string, unknown>): string {
    let zodSchema = "z.string()";

    if (schema.enum && Array.isArray(schema.enum)) {
      const enumValues = schema.enum.map((val: unknown) => `"${String(val)}"`).join(",");
      zodSchema = `z.enum([${enumValues}])`;
    }

    return zodSchema;
  }

  protected generateNumberSchema(schema: Record<string, unknown>): string {
    return schema.type === "integer" ? "z.number().int()" : "z.number()";
  }

  protected generateArraySchema(schema: Record<string, unknown>): string {
    if (schema.items) {
      const itemSchema = this.convertOpenAPISchemaToZod(schema.items);
      return `z.array(${itemSchema})`;
    }
    return "z.array(z.unknown())";
  }

  protected generateObjectSchema(schema: Record<string, unknown>): string {
    if (!schema.properties) {
      return "z.object({})";
    }

    const properties: string[] = [];
    const required = Array.isArray(schema.required) ? schema.required : [];

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const zodPropSchema = this.convertOpenAPISchemaToZod(propSchema);
      const isRequired = required.includes(propName);
      const optional = isRequired ? "" : ".optional()";
      properties.push(`"${propName}":${zodPropSchema}${optional}`);
    }

    return `z.object({${properties.join(",")}})`;
  }

  protected operationsWithRequestSchema: { path: string; method: string }[] = [];

  protected hasRequestSchema(path: string, method: string): boolean {
    for (const item of this.operationsWithRequestSchema) {
      if (item.path === path && item.method === method) return true;
    }
    return false;
  }

  protected generatePathSchema(spec: OpenAPISpec): string {
    const typesEntries: string[] = [];

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const pathEntries: string[] = [];

      const httpMethods = ["get", "post", "put", "delete", "patch", "head", "options", "trace"] as const;

      for (const method of httpMethods) {
        const operation = pathItem[method];
        if (!operation) continue;

        const requestSchema = this.generateRequestSchema(operation);
        const responseSchema = this.generateResponseSchema(operation);

        if (requestSchema && responseSchema) {
          this.operationsWithRequestSchema.push({ path, method });
          pathEntries.push(`${method}:{request:${requestSchema},response:{${responseSchema}}}`);
        } else {
          pathEntries.push(`${method}:{response:{${responseSchema}}}`);
        }
      }

      if (pathEntries.length > 0) {
        typesEntries.push(`"${path}":{${pathEntries.join(",")}}`);
      }
    }

    if (typesEntries.length === 0) {
      return "";
    }

    return `// Path Schemas\nexport const PathSchema = {${typesEntries.join(",")}};\n\n`;
  }

  protected generateRequestSchema(operation: z.infer<typeof OpenAPIOperationSchema>): string | undefined {
    const requestParts: string[] = [];

    // Path parameters
    const pathParams = operation.parameters?.filter((p) => p.in === "path") || [];
    if (pathParams.length > 0) {
      const paramProps = pathParams.map((p) => `"${p.name}":z.string()`).join(",");
      requestParts.push(`params:z.object({${paramProps}})`);
    }

    // Query parameters
    const queryParams = operation.parameters?.filter((p) => p.in === "query") || [];
    if (queryParams.length > 0) {
      const queryProps = queryParams.map((p) => {
        const optional = !p.required ? ".optional()" : "";
        return `"${p.name}":z.string()${optional}`;
      }).join(",");
      requestParts.push(`query:z.object({${queryProps}}).optional()`);
    }

    // Headers
    const headerParams = operation.parameters?.filter((p) => p.in === "header") || [];
    if (headerParams.length > 0) {
      const headerProps = headerParams.map((p) => {
        const optional = !p.required ? ".optional()" : "";
        return `"${p.name}":z.string()${optional}`;
      }).join(",");
      requestParts.push(`headers:z.object({${headerProps}}).optional()`);
    }

    // Request body
    if (operation.requestBody) {
      const bodySchema = this.generateRequestBodySchema(operation.requestBody);
      requestParts.push(`body:${bodySchema}`);
    }

    if (requestParts.length === 0) {
      return undefined;
    }

    return `z.object({${requestParts.join(",")}})`;
  }

  protected generateRequestBodySchema(requestBody: z.infer<typeof OpenAPIRequestBodySchema>): string {
    // Look for JSON content type first
    const jsonContent = requestBody.content["application/json"];
    if (jsonContent?.schema) {
      const zodSchema = this.convertOpenAPISchemaToZod(jsonContent.schema);
      const optional = requestBody.required ? "" : ".optional()";
      return `${zodSchema}${optional}`;
    }

    // Fallback to first available content type
    const contentTypes = Object.keys(requestBody.content);
    if (contentTypes.length > 0) {
      const firstContent = requestBody.content[contentTypes[0]];
      if (firstContent?.schema) {
        const zodSchema = this.convertOpenAPISchemaToZod(firstContent.schema);
        const optional = requestBody.required ? "" : ".optional()";
        return `${zodSchema}${optional}`;
      }
    }

    return "z.unknown().optional()";
  }

  protected generateResponseSchema(operation: z.infer<typeof OpenAPIOperationSchema>): string {
    const responseParts: string[] = [];

    for (const [statusCode, response] of Object.entries(operation.responses)) {
      const zodSchema = this.generateSingleResponseSchema(response);
      responseParts.push(`${statusCode}:${zodSchema}`);
    }

    return responseParts.join(",");
  }

  protected generateSingleResponseSchema(response: z.infer<typeof OpenAPIResponseSchema>): string {
    // Look for JSON content type first
    if (response.content) {
      const jsonContent = response.content["application/json"];
      if (jsonContent?.schema) {
        return this.convertOpenAPISchemaToZod(jsonContent.schema);
      }

      // Fallback to first available content type
      const contentTypes = Object.keys(response.content);
      if (contentTypes.length > 0) {
        const firstContent = response.content[contentTypes[0]];
        if (firstContent?.schema) {
          return this.convertOpenAPISchemaToZod(firstContent.schema);
        }
      }
    }

    return "z.unknown().optional()";
  }

  protected generateClientClass(spec: OpenAPISpec): string {
    const clientMethods: string[] = [];
    const className = this.generateClassName(spec.info.title);

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const pathMethods: string[] = [];
      const httpMethods = ["get", "post", "put", "delete", "patch", "head", "options", "trace"] as const;

      for (const method of httpMethods) {
        const operation = pathItem[method];
        if (!operation) continue;

        if (this.hasRequestSchema(path, method)) {
          pathMethods.push(outdent`
            ${method}: (
              request: z.input<typeof PathSchema["${path}"]["${method}"]["request"]>
            ): Promise<OpenAPIResponses<typeof PathSchema["${path}"]["${method}"]["response"]>> =>
              this.sendRequest("${path}","${method}",PathSchema["${path}"]["${method}"],request)
          `);
        } else {
          pathMethods.push(outdent`
            ${method}: (): Promise<OpenAPIResponses<typeof PathSchema["${path}"]["${method}"]["response"]>> =>
              this.sendRequest("${path}","${method}",PathSchema["${path}"]["${method}"])
          `);
        }
      }

      if (pathMethods.length > 0) {
        clientMethods.push(`readonly "${path}" = {${pathMethods.join(",\n")}};`);
      }
    }

    return `export class ${className} extends BaseClient { ${clientMethods.join("\n\n")} }`;
  }

  protected generateClassName(title: string): string {
    const className = pascalCase(title);
    return className.endsWith("Client") ? className : `${className}Client`;
  }
}
