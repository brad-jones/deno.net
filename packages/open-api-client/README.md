# @brad-jones/deno-net-open-api-client

A powerful, type-safe OpenAPI client generator for TypeScript/Deno that creates
fully typed HTTP clients from OpenAPI 3.0/3.1 specifications.

## ✨ Features

- 🔒 **Full Type Safety** - Complete TypeScript inference with discriminated union responses
- 🎯 **OpenAPI 3.0/3.1 Support** - Validates and generates clients from standard OpenAPI specs
- 🔗 **`$ref` Resolution** - Automatically resolves component schema references
- 🛡️ **Request/Response Validation** - Runtime validation using Zod schemas
- 📊 **Status Code Discrimination** - Different response types for different HTTP status codes
- 🎨 **Clean Generated Code** - Readable, maintainable TypeScript output
- ⚡ **Deno Native** - Built for modern JavaScript runtimes

## 📦 Installation

```bash
deno add jsr:@brad-jones/deno-net-open-api-client
```

## 🚀 Quick Start

### 1. Generate a Client

```typescript
import { OpenAPIClientGenerator } from "@brad-jones/deno-net-open-api-client";

// Your OpenAPI specification
const openApiSpec = {
  openapi: "3.0.0",
  info: { title: "Pet Store API", version: "1.0.0" },
  paths: {
    "/pets/{id}": {
      get: {
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Pet found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
          "404": {
            description: "Pet not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          tag: { type: "string" },
        },
      },
      Error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "integer" },
          message: { type: "string" },
        },
      },
    },
  },
};

// Generate the client
const generator = new OpenAPIClientGenerator();
const clientCode = await generator.generate(openApiSpec);

// Save to file
await Deno.writeTextFile("./generated-client.ts", clientCode);
```

### 2. Use the Generated Client

```typescript
import { PetStoreApiClient } from "./generated-client.ts";

const client = new PetStoreApiClient({
  baseUrl: "https://api.petstore.com/v1",
  validateRequests: true,
  validateResponses: true,
});

// Make type-safe requests
const response = await client["/pets/{id}"].get({
  params: { id: "123" },
});

// Type-safe response handling
if (response.status === 200) {
  // TypeScript knows response.body is Pet
  console.log(`Found pet: ${response.body.name}`);
  if (response.body.tag) {
    console.log(`Tag: ${response.body.tag}`);
  }
} else if (response.status === 404) {
  // TypeScript knows response.body is Error
  console.log(`Pet not found: ${response.body.message}`);
}
```

## 🎯 Generated Code Structure

The generator produces three main parts:

### 1. Component Schemas

```typescript
export const PetSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  tag: z.string().optional(),
});

export const ErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
});
```

### 2. The Main Path Schema

```typescript
export const PathSchema = {
  "/pets/{id}": {
    get: {
      request: z.object({
        params: z.object({
          id: z.string(),
        }),
      }),
      response: {
        200: PetSchema,
        404: ErrorSchema,
      },
    },
  },
};
```

### 3. Client Class

```typescript
export class PetStoreApiClient extends BaseClient {
  readonly "/pets/{id}" = {
    get: (
      request: z.input<typeof ClientTypes["/pets/{id}"]["get"]["request"]>,
    ): Promise<OpenAPIResponses<typeof ClientTypes["/pets/{id}"]["get"]["response"]>> =>
      this.sendRequest("/pets/{id}", "get", ClientTypes["/pets/{id}"]["get"], request),
  };
}
```

## 🔧 Configuration Options

### BaseClientOptions

```typescript
interface BaseClientOptions {
  baseUrl: string; // API base URL
  customFetch?: typeof fetch; // Custom fetch implementation
  validateRequests?: boolean; // Validate requests (default: true)
  validateResponses?: boolean; // Validate responses (default: false)
  additionalHeaders?: Record<string, string>; // Default headers for all requests
}
```

### Advanced Usage

```typescript
const client = new PetStoreApiClient({
  baseUrl: "https://api.petstore.com/v1",
  validateRequests: true,
  validateResponses: true,
  additionalHeaders: {
    "Authorization": "Bearer your-token",
    "User-Agent": "MyApp/1.0",
  },
  customFetch: async (input, init) => {
    // Add custom logic (logging, retries, etc.)
    console.log(`Making request to: ${input}`);
    return fetch(input, init);
  },
});
```

## 🛡️ Error Handling

The client provides sophisticated error handling for different scenarios:

### Invalid Responses

```typescript
import { InvalidResponse } from "@brad-jones/deno-net-open-api-client";

try {
  const response = await client["/pets/{id}"].get({ params: { id: "123" } });
} catch (error) {
  if (error instanceof InvalidResponse) {
    console.log(`HTTP ${error.status}`);

    // Access the response headers
    console.log("Response headers:", error.headers);

    // Access the raw response body
    console.log("Response body:", new TextDecoder().decode(error.body));
  }
}
```

### Validation Errors

```typescript
import { ZodError } from "@zod/zod";

try {
  const response = await client["/pets"].post({
    body: { invalid: "data" }, // Missing required fields
  });
} catch (error) {
  if (error instanceof ZodError) {
    console.log("Validation error:", error.errors);
  }
}
```

## 🎨 Supported OpenAPI Features

### Schema Types

- ✅ Object schemas with required/optional properties
- ✅ Array schemas with typed items
- ✅ String schemas with enums
- ✅ Number/integer schemas with constraints
- ✅ Boolean schemas
- ✅ `$ref` references to component schemas
- ✅ Nested object structures

### Parameters

- ✅ Path parameters
- ✅ Query parameters (required/optional)
- ✅ Header parameters
- ✅ Request body (JSON content type)

### Responses

- ✅ Multiple status codes with different schemas
- ✅ Content-type based response parsing
- ✅ Empty responses (204 No Content)
- ✅ Error responses with detailed schemas

### HTTP Methods

- ✅ GET, POST, PUT, DELETE, PATCH
- ✅ HEAD, OPTIONS, TRACE

## 🔍 Type Safety Examples

### Discriminated Union Responses

```typescript
const response = await client["/pets/{id}"].get({ params: { id: "123" } });

// Exhaustive checking with TypeScript
switch (response.status) {
  case 200: {
    // TypeScript knows this is Pet
    console.log(`Pet name: ${response.body.name}`);
    break;
  }
  case 404: {
    // TypeScript knows this is Error
    console.log(`Error: ${response.body.message}`);
    break;
  }
  default: {
    // TypeScript ensures all cases are handled
    const _exhaustive: never = response;
    break;
  }
}
```

### Request Validation

```typescript
// TypeScript will enforce correct request structure
await client["/pets"].post({
  body: {
    id: 123, // ✅ Required field
    name: "Fluffy", // ✅ Required field
    tag: "cat", // ✅ Optional field
    // missing fields will cause TypeScript error
  },
});
```

## 🔗 Related Projects

This OpenAPI client generator is part of the [@brad-jones/deno-net](https://github.com/brad-jones/deno.net) ecosystem
for building modern web applications with Deno and TypeScript.
