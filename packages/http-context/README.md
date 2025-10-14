# @brad-jones/deno-net-http-context

A TypeScript-first HTTP context interface for Deno web applications, providing type-safe
request and response handling. This package abstracts HTTP context operations with an
interface inspired by [Hono's Context API](https://hono.dev/docs/api/context),
designed for use within the deno.net framework ecosystem.

## Features

- 🎯 **Type-Safe Context** - Full TypeScript support with generic path parameter extraction
- 🚀 **Hono-Inspired API** - Familiar interface for developers coming from Hono
- 🔌 **Framework Agnostic** - Abstracted interface allows for future HTTP framework swaps
- 📝 **Rich Response Methods** - Built-in JSON, HTML, text, and redirect response helpers
- 🔍 **Request Parsing** - Comprehensive request body parsing (JSON, form data, etc.)
- 📤 **Header Management** - Type-safe header manipulation
- 🎨 **Renderer Support** - Built-in template rendering capabilities

## Installation

```bash
deno add jsr:@brad-jones/deno-net-http-context
```

## Quick Start

```typescript
import { HttpContext } from "@brad-jones/deno-net-http-context";

// Use in route handlers
function getUserHandler(ctx: HttpContext<"/users/:id">) {
  const userId = ctx.req.param("id"); // Type-safe parameter extraction

  return ctx.json({
    id: userId,
    name: "John Doe",
    email: "john@example.com",
  });
}

// Use in middleware
async function loggingMiddleware(ctx: HttpContext, next: Next) {
  console.log(`${ctx.req.method} ${ctx.req.path}`);
  await next();
  console.log(`Response: ${ctx.res.status}`);
}
```

## Core Interface

### HttpContext

The main context interface provides access to request data and response methods:

```typescript
interface HttpContext<Path extends string = any> {
  req: ExtendedRequest<Path>; // Request object with type-safe parameter extraction
  res: Response; // Standard Web API Response object
  error: Error | undefined; // Any error thrown during processing

  // Response methods
  json(data: any): Response;
  text(content: string): Response;
  html(content: string): Response;
  redirect(location: string): Response;

  // Header and status management
  header(name: string, value: string): void;
  status(code: number): void;

  // Context storage
  set(key: string, value: any): void;
  get(key: string): any;

  // Rendering
  render(content: string): Response;
  setRenderer(renderer: Renderer): void;
}
```

## Request Handling

### Path Parameters

Extract type-safe path parameters from route patterns:

```typescript
// Route: /users/:userId/posts/:postId
function handler(ctx: HttpContext<"/users/:userId/posts/:postId">) {
  const userId = ctx.req.param("userId"); // string
  const postId = ctx.req.param("postId"); // string

  // Get all parameters at once
  const { userId, postId } = ctx.req.param(); // { userId: string, postId: string }
}
```

### Query Parameters

Access query string parameters with type safety:

```typescript
function searchHandler(ctx: HttpContext) {
  const query = ctx.req.query("q"); // string | undefined
  const limit = ctx.req.query("limit"); // string | undefined

  // Get all query parameters
  const params = ctx.req.query(); // Record<string, string>

  // Handle array parameters (e.g., ?tags=js&tags=ts)
  const tags = ctx.req.queries("tags"); // string[] | undefined
}
```

### Request Headers

Access request headers with type safety:

```typescript
function handler(ctx: HttpContext) {
  const userAgent = ctx.req.header("User-Agent"); // string | undefined
  const contentType = ctx.req.header("Content-Type"); // string | undefined

  // Get all headers
  const headers = ctx.req.header(); // Record<string, string>
}
```

### Request Body Parsing

Parse request bodies in various formats:

```typescript
// JSON data
async function createUser(ctx: HttpContext) {
  const userData = await ctx.req.json<{ name: string; email: string }>();
  return ctx.json({ id: 1, ...userData });
}

// Form data
async function uploadFile(ctx: HttpContext) {
  const formData = await ctx.req.formData();
  const file = formData.get("file") as File;

  return ctx.json({ filename: file.name, size: file.size });
}

// Plain text
async function webhook(ctx: HttpContext) {
  const payload = await ctx.req.text();
  return ctx.text("Webhook received");
}

// Binary data
async function handleBinary(ctx: HttpContext) {
  const buffer = await ctx.req.arrayBuffer();
  const blob = await ctx.req.blob();

  return ctx.json({ size: buffer.byteLength });
}

// Multipart/form-data parsing
async function submitForm(ctx: HttpContext) {
  const body = await ctx.req.parseBody();
  return ctx.json(body);
}
```

## Response Generation

### JSON Responses

```typescript
function apiHandler(ctx: HttpContext) {
  // Basic JSON response
  return ctx.json({ message: "Success" });

  // JSON with status code
  return ctx.json({ error: "Not found" }, 404);

  // JSON with custom headers
  return ctx.json(
    { data: [] },
    200,
    { "X-Total-Count": "0" },
  );
}
```

### HTML Responses

```typescript
function pageHandler(ctx: HttpContext) {
  return ctx.html(`
    <html>
      <body>
        <h1>Welcome to our site!</h1>
      </body>
    </html>
  `);
}

// With custom status and headers
function errorPage(ctx: HttpContext) {
  return ctx.html(
    "<h1>Page Not Found</h1>",
    404,
    { "Cache-Control": "no-cache" },
  );
}
```

### Text Responses

```typescript
function textHandler(ctx: HttpContext) {
  return ctx.text("Hello, World!");
}

function csvHandler(ctx: HttpContext) {
  return ctx.text(
    "id,name,email\n1,John,john@example.com",
    200,
    { "Content-Type": "text/csv" },
  );
}
```

### Redirects

```typescript
function redirectHandler(ctx: HttpContext) {
  // Temporary redirect (302)
  return ctx.redirect("/new-location");

  // Permanent redirect (301)
  return ctx.redirect("/permanent-location", 301);

  // External redirect
  return ctx.redirect("https://example.com");
}
```

### Custom Responses

```typescript
function customResponse(ctx: HttpContext) {
  // Set headers
  ctx.header("X-Custom-Header", "value");
  ctx.header("Content-Type", "application/xml");

  // Set status
  ctx.status(201);

  // Return custom body
  return ctx.body("<xml>Custom response</xml>");
}
```

## Template Rendering

Set up and use template rendering:

```typescript
// Configure renderer (typically in middleware)
function setupRenderer(ctx: HttpContext, next: Next) {
  ctx.setRenderer((content) => {
    return ctx.html(`
      <!DOCTYPE html>
      <html>
        <head><title>My App</title></head>
        <body>
          <header>My App</header>
          <main>${content}</main>
        </body>
      </html>
    `);
  });

  await next();
}

// Use renderer in route handlers
function pageHandler(ctx: HttpContext) {
  return ctx.render("<h1>Welcome!</h1>");
}
```

## Context Storage

Store and retrieve data within the request lifecycle:

```typescript
// Middleware sets data
async function authMiddleware(ctx: HttpContext, next: Next) {
  const user = await authenticateUser(ctx);
  ctx.set("user", user);
  ctx.set("isAuthenticated", true);

  await next();
}

// Route handler uses data
function protectedRoute(ctx: HttpContext) {
  const user = ctx.get("user");
  const isAuth = ctx.get("isAuthenticated");

  if (!isAuth) {
    return ctx.json({ error: "Unauthorized" }, 401);
  }

  return ctx.json({ message: `Hello, ${user.name}!` });
}
```

## Error Handling

Access and handle errors in middleware:

```typescript
async function errorHandler(ctx: HttpContext, next: Next) {
  try {
    await next();
  } catch (error) {
    // Error is also available on ctx.error
    console.error("Request failed:", ctx.error);

    return ctx.json(
      { error: "Internal Server Error" },
      500,
    );
  }
}
```

## Integration with deno.net

This package integrates seamlessly with other deno.net components:

### Route Handlers

```typescript
import { ApiAppBuilder } from "@brad-jones/deno-net-app-builder";
import { HttpContext } from "@brad-jones/deno-net-http-context";

const builder = new ApiAppBuilder();

// Type-safe route handlers
builder.routes.mapGet("/users/:id", (ctx: HttpContext<"/users/:id">) => {
  const id = ctx.req.param("id"); // Type-safe parameter
  return ctx.json({ id, name: "John Doe" });
});

builder.routes.mapPost("/users", async (ctx: HttpContext) => {
  const userData = await ctx.req.json();
  return ctx.json({ id: 1, ...userData }, 201);
});
```

### Middleware

```typescript
import { IMiddleware } from "@brad-jones/deno-net-middleware";
import { HttpContext, Next } from "@brad-jones/deno-net-http-context";

class LoggingMiddleware implements IMiddleware {
  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    console.log(`${ctx.req.method} ${ctx.req.path}`);
    await next();
    console.log(`Response: ${ctx.res.status}`);
  }
}
```

### Dependency Injection

```typescript
import { inject } from "@brad-jones/deno-net-container";
import { HttpContext } from "@brad-jones/deno-net-http-context";

class UserController {
  constructor(
    private userService = inject(IUserService),
  ) {}

  async getUser(ctx: HttpContext<"/users/:id">) {
    const id = ctx.req.param("id");
    const user = await this.userService.findById(id);

    if (!user) {
      return ctx.notFound();
    }

    return ctx.json(user);
  }
}
```

## Advanced Usage

### Custom Response Types

```typescript
// Extend context with custom methods
interface CustomHttpContext extends HttpContext {
  xml(data: any): Response;
  csv(data: any[]): Response;
}

function xmlResponse(ctx: CustomHttpContext) {
  return ctx.xml({ users: [{ id: 1, name: "John" }] });
}
```

### Type-Safe Parameter Extraction

```typescript
// Complex route patterns
type ComplexRoute = "/api/v1/organizations/:orgId/projects/:projectId/issues/:issueId";

function handleComplexRoute(ctx: HttpContext<ComplexRoute>) {
  const { orgId, projectId, issueId } = ctx.req.param();
  // All parameters are strongly typed as strings

  return ctx.json({
    organization: orgId,
    project: projectId,
    issue: issueId,
  });
}
```

### Streaming Responses

```typescript
function streamingHandler(ctx: HttpContext) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue("chunk 1\n");
      controller.enqueue("chunk 2\n");
      controller.close();
    },
  });

  return ctx.body(stream, 200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked",
  });
}
```

## API Reference

### HttpContext Methods

- `req: ExtendedRequest` - Request object with type-safe parameter extraction
- `res: Response` - Standard Web API Response object
- `error: Error | undefined` - Any error from request processing
- `json(data, status?, headers?)` - Create JSON response
- `text(content, status?, headers?)` - Create text response
- `html(content, status?, headers?)` - Create HTML response
- `body(data, status?, headers?)` - Create response with custom body
- `redirect(location, status?)` - Create redirect response
- `notFound()` - Create 404 response
- `header(name, value, options?)` - Set response header
- `status(code)` - Set response status code
- `set(key, value)` - Store value in context
- `get(key)` - Retrieve value from context
- `render(content)` - Render content using configured renderer
- `setRenderer(renderer)` - Configure template renderer

### ExtendedRequest Methods

- `raw: Request` - Native Request object
- `url: string` - Complete request URL
- `method: string` - HTTP method
- `path: string` - URL pathname
- `param(key?)` - Extract path parameters
- `query(key?)` - Extract query parameters
- `queries(key?)` - Extract array query parameters
- `header(name?)` - Extract request headers
- `json()` - Parse JSON body
- `text()` - Parse text body
- `formData()` - Parse FormData body
- `parseBody()` - Parse form body
- `arrayBuffer()` - Parse binary body
- `blob()` - Parse blob body

## Performance Considerations

- **Zero-Cost Abstractions** - Interface provides no runtime overhead
- **Type Safety** - Compile-time parameter validation prevents runtime errors
- **Efficient Parsing** - Lazy evaluation of request body parsing
- **Memory Efficient** - Minimal memory allocation for context storage

## Related Packages

- [@brad-jones/deno-net-app-builder](../app-builder/) - Application builder framework
- [@brad-jones/deno-net-middleware](../middleware/) - Middleware system
- [@brad-jones/deno-net-container](../container/) - Dependency injection container
- [Hono](https://hono.dev/) - Underlying HTTP framework inspiration

## Contributing

Contributions are welcome! Please see the main [deno.net repository](https://github.com/brad-jones/deno.net) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.
