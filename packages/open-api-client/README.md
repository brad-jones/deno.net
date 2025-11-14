# @brad-jones/deno-net-open-api-client

A powerful TypeScript code generator that transforms OpenAPI specifications into strongly-typed, tree-shakeable API clients for Deno.

## Features

- **🎯 Full Type Safety** - Generate TypeScript types directly from your OpenAPI spec with complete IntelliSense support
- **📦 Tree-Shakeable** - Functional client style allows bundlers to eliminate unused API operations
- **✅ Runtime Validation** - Optional Zod schema generation for request/response validation
- **🔄 Multiple Client Styles** - Choose between classical OOP or functional programming styles
- **🌐 OpenAPI 3.x Support** - Full support for OpenAPI 3.0 and 3.1 specifications
- **📝 Auto-Documentation** - Preserve JSDoc comments from your OpenAPI descriptions
- **🎨 Customizable** - Configure output style, validation, and more

## Installation

```bash
deno add jsr:@brad-jones/deno-net-open-api-client
```

## Quick Start

### Generate a Client

```typescript
import { ClassicalClientGenerator } from "@brad-jones/deno-net-open-api-client";

// Generate the client
const generator = new ClassicalClientGenerator();
await generator.generateFromFile("./openapi.yaml", "./client.ts");
```

### Use the Generated Client

```typescript
import { ApiClient } from "./client.ts";

const client = new ApiClient({
  baseUrl: "https://api.example.com",
  headers: {
    "Authorization": "Bearer your-token-here",
  },
});

// Make API calls with full type safety
const response = await client["/users/{id}"].get({
  path: { id: 123 },
});

if (response.status === 200) {
  console.log(response.body); // Fully typed!
}
```

## Client Styles

This package supports two different client generation styles to suit your preferences and use case.

### Classical Client (OOP Style)

The classical client generates a class with path-based access to operations.
Best for traditional OOP applications or when you want a single client instance.
And bundle size is not a concern.

```typescript
import { ClassicalClientGenerator } from "@brad-jones/deno-net-open-api-client";

const generator = new ClassicalClientGenerator();
const code = await generator.generate(spec);
```

**Usage:**

```typescript
const client = new ApiClient(config);

// Path-based access with inline methods
await client["/users/{id}"].get({ path: { id: 123 } });
await client["/users"].post({ body: { name: "John" } });
await client["/users/{id}"].delete({ path: { id: 123 } });
```

**Pros:**

- Familiar OOP pattern
- Single client instance
- Clear path-based organization

**Cons:**

- Larger bundle size (entire client is included)
- Less optimal for tree-shaking

### Functional Client

The functional client generates standalone functions for each operation.
Best for modern applications where bundle size matters and tree-shaking is important.

```typescript
import { FunctionalClientGenerator } from "@brad-jones/deno-net-open-api-client";

const generator = new FunctionalClientGenerator();
const code = await generator.generate(spec);
```

#### Usage Option 1: Convenience Client (includes all operations)

```typescript
import { createClient } from "./client.ts";

const client = createClient(config);
await client.getUserById({ path: { id: 123 } });
```

#### Usage Option 2: Custom Client (cherry-pick operations for better tree-shaking)

```typescript
import { createCustomClient, getUserById, updateUser } from "./client.ts";

const client = createCustomClient(config, {
  getUserById,
  updateUser,
  // Only include operations you need
});

await client.getUserById({ path: { id: 123 } });
```

#### Usage Option 3: Direct Operation Usage (maximum tree-shaking)

```typescript
import { getUserById, updateUser } from "./client.ts";

const config = {
  baseUrl: "https://api.example.com",
  headers: { "Authorization": "Bearer token" },
};

// Call operations directly without a client wrapper
const user = await getUserById(config, { path: { id: 123 } });
const updated = await updateUser(config, {
  path: { id: 123 },
  body: { name: "Jane" },
});
```

**Pros:**

- Excellent tree-shaking support
- Smaller bundle sizes
- Flexible composition
- Easier to test individual operations

**Cons:**

- More verbose import statements
- Less discoverable API surface

## Configuration

### Generator Options

Both generators accept the following options:

```typescript
interface ClientGeneratorOptions {
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
   * Custom import specifiers for runtime dependencies.
   */
  importSpecifiers?: {
    /** Custom Zod import specifier (e.g., "npm:zod@1.2.3") */
    zod?: string;
    /** Custom client runtime import specifier (e.g., "./my-custom-fetch.ts") */
    client?: string;
  };
}
```

**Example usage:**

```typescript
import { ClassicalClientGenerator } from "@brad-jones/deno-net-open-api-client";

const generator = new ClassicalClientGenerator({
  validateRequests: true, // Enable request validation
  validateResponses: true, // Enable response validation
  fmtResult: true, // Format the output (default)
  importSpecifiers: {
    zod: "npm:zod@3.22.4", // Use specific Zod version
  },
});

const clientCode = await generator.generate(spec);
```

### Client Configuration

Generated clients require a configuration object:

```typescript
interface OpenAPIClientConfig {
  /**
   * Base URL for all API requests
   */
  baseUrl: string | URL;

  /**
   * Default headers to include in all requests
   *
   * @optional
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation (useful for testing)
   *
   * @optional
   */
  fetch?: typeof fetch;
}
```

**Example with all options:**

```typescript
const client = new ApiClient({
  baseUrl: "https://api.example.com/v1",
  headers: {
    "Authorization": "Bearer token",
    "X-API-Version": "2024-01-01",
  },
  fetch: customFetchWithRetry, // Your custom fetch implementation
});
```

## Runtime Validation

When `validateRequests: true` and/or `validateResponses: true` are enabled,
the generator creates Zod schemas for both requests and responses,
providing runtime type safety.

```typescript
// Request validation ensures you're sending valid data
await client["/users"].post({
  body: {
    name: "John",
    age: "invalid", // ❌ Throws validation error at runtime
  },
});

// Response validation ensures the API returns expected data
const response = await client["/users/{id}"].get({ path: { id: 123 } });
// ✅ Response body is validated against the schema
```

## Response Handling

All API calls return an `OpenAPIResponse` with the following structure:

```typescript
interface OpenAPIResponse<TStatus, TBody, THeaders, TIsDefault> {
  status: TStatus;
  isDefault: TIsDefault;
  headers: THeaders;
  body: TBody;
  raw: Response;
  is<S>(statusCode: S): this is Extract<this, OpenAPIResponse<S, unknown, unknown, false>>;
}
```

### Type Narrowing with `is()` Method

The `is()` method provides elegant type narrowing for response handling:

```typescript
const response = await client["/users/{id}"].get({ path: { id: 123 } });

// Pattern 1: Simple if statement
if (response.is(200)) {
  // TypeScript knows body is the 200 response type
  console.log(response.body.name);
} else if (response.is(404)) {
  // TypeScript knows body is the 404 response type
  console.log(response.body.error);
}

// Pattern 2: Switch with true
switch (true) {
  case response.is(200):
    console.log(response.body.name);
    break;
  case response.is(404):
    console.error(response.body.error);
    break;
  case response.isDefault:
    // Handle default/unexpected status codes
    console.log(`Unexpected status: ${response.status}`);
    break;
}

// Pattern 3: Check isDefault first (alternative approach)
if (!response.isDefault) {
  switch (response.status) {
    case 200:
      console.log(response.body.name);
      break;
    case 404:
      console.error(response.body.error);
      break;
  }
} else {
  console.log(`Default response: ${response.status}`);
}

// Access raw fetch Response for advanced use cases
console.log(response.raw.ok);
```

### Default Responses

OpenAPI specifications can define a "default" response that matches any status code not explicitly defined. The `isDefault` property indicates when a response matched the default schema:

```typescript
const response = await client["/api/resource"].get();

if (response.isDefault) {
  // This response matched the "default" specification
  // response.status could be any number (500, 503, etc.)
  console.log(`Unexpected status ${response.status}: ${response.body.message}`);
}
```

## Parameter Serialization

The client automatically handles parameter serialization according to OpenAPI specification:

### Path Parameters

```typescript
// Simple style (default): /users/123
await client["/users/{id}"].get({
  path: { id: 123 },
});

// Array: /users/1,2,3
await client["/users/{ids}"].get({
  path: { ids: [1, 2, 3] },
});
```

### Query Parameters

```typescript
// Form style (default): ?tags=red&tags=blue
await client["/items"].get({
  query: { tags: ["red", "blue"] },
});

// Deep object: ?filter[name]=John&filter[age]=30
await client["/items"].get({
  query: { filter: { name: "John", age: 30 } },
});
```

### Header Parameters

```typescript
await client["/data"].get({
  headers: {
    "X-API-Key": "secret",
  },
});
```

### Cookie Parameters

```typescript
await client["/session"].get({
  cookies: {
    session_id: "abc123",
  },
});
```

## Advanced Usage

### Dependency Injection

If you're using `@brad-jones/deno-net-container`, you can register the generator as a service:

```typescript
import { openAPIClientModule } from "@brad-jones/deno-net-open-api-client";
import { Container } from "@brad-jones/deno-net-container";

const container = new Container();
container.useModule(
  openAPIClientModule({
    style: "functional", // or "classical"
    validateRequests: true,
    validateResponses: true,
  }),
);

const generator = container.get(IClientGenerator);
```

## Examples

The `examples/` directory contains generated clients from various OpenAPI specifications:

### Contrived APIs

- **hello-world** - Simple greeting API
- **petstore** - Classic Swagger Petstore example
- **runtime-validation** - Demonstrates Zod validation
- **parameter-serialization** - Various parameter styles

### Real-World APIs

- **GitHub API** - GitHub REST API v3
- **Stripe API** - Payment processing
- **PayPal API** - Payment platform
- **Xero API** - Accounting software

Explore these examples to see the generator in action with different API designs.

## OpenAPI Support

### Supported Versions

- ✅ OpenAPI 3.1.x (full support)
- ✅ OpenAPI 3.0.x (full support)
- ❌ OpenAPI 2.0 / Swagger (not supported)

### Content Types

- ✅ `application/json` (full support)
- ⚠️ Other content types (planned for future releases)

### Parameter Styles

- ✅ Path parameters (simple, label, matrix)
- ✅ Query parameters (form, spaceDelimited, pipeDelimited, deepObject)
- ✅ Header parameters (simple)
- ✅ Cookie parameters (form)

## Related Packages

This package is part of the [@brad-jones/deno-net](../../README.md) framework:

- **@brad-jones/deno-net-app-builder** - Application builder and server
- **@brad-jones/deno-net-container** - Dependency injection container

## Credits

Inspired by:

- <https://heyapi.dev/>
- <https://openapi-ts.dev/>
- <https://gunzip.github.io/apical-ts/>
  - <https://www.reddit.com/r/typescript/comments/1n96vjh/building_a_robust_openapitotypescript_tool/>

And others...
