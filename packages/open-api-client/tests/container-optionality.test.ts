import { expect } from "@std/expect";
import { OpenAPIClientGenerator } from "../src/generator.ts";

Deno.test("Request schema container optionality test", async () => {
  const generator = new OpenAPIClientGenerator({
    importSpecifiers: {
      zod: "@zod/zod",
      baseClient: "@brad-jones/deno-net-open-api-client",
    },
  });

  // Test spec with various parameter combinations
  const testSpec = {
    "openapi": "3.0.0",
    "info": { "title": "Test API", "version": "1.0.0" },
    "paths": {
      "/test1": {
        "get": {
          "operationId": "test1",
          "parameters": [
            { "name": "requiredQuery", "in": "query" as const, "required": true, "schema": { "type": "string" } },
            { "name": "optionalQuery", "in": "query" as const, "required": false, "schema": { "type": "string" } },
          ],
          "responses": { "200": { "description": "OK" } },
        },
      },
      "/test2": {
        "get": {
          "operationId": "test2",
          "parameters": [
            { "name": "optionalQuery1", "in": "query" as const, "required": false, "schema": { "type": "string" } },
            { "name": "optionalQuery2", "in": "query" as const, "required": false, "schema": { "type": "string" } },
          ],
          "responses": { "200": { "description": "OK" } },
        },
      },
      "/test3/{id}": {
        "get": {
          "operationId": "test3",
          "parameters": [
            { "name": "id", "in": "path" as const, "required": true, "schema": { "type": "string" } },
            { "name": "requiredHeader", "in": "header" as const, "required": true, "schema": { "type": "string" } },
            { "name": "optionalHeader", "in": "header" as const, "required": false, "schema": { "type": "string" } },
          ],
          "responses": { "200": { "description": "OK" } },
        },
      },
    },
  };

  const generatedCode = await generator.generate(testSpec);

  // Test 1: Query with both required and optional parameters - query object should be required (no .optional())
  // This means the query object closes with just }),
  expect(generatedCode).toContain(
    '        query: z.object({\n          "requiredQuery": z.string(),\n          "optionalQuery": z.string().optional(),\n        }),',
  );

  // Test 2: Query with only optional parameters - query object should be optional
  expect(generatedCode).toContain(
    '        query: z.object({\n          "optionalQuery1": z.string().optional(),\n          "optionalQuery2": z.string().optional(),\n        }).optional(),',
  );

  // Test 3: Path parameters should always be required (no .optional() on the object)
  expect(generatedCode).toContain('params: z.object({ "id": z.string() })');
  expect(generatedCode).not.toContain('params: z.object({ "id": z.string() }).optional()');

  // Test 3: Headers with both required and optional - headers object should be required
  expect(generatedCode).toContain(
    '        headers: z.object({\n          "requiredHeader": z.string(),\n          "optionalHeader": z.string().optional(),\n        }),',
  );
});
