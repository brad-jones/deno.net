# @brad-jones/deno-net-middleware

A flexible and type-safe middleware system for Deno web applications, designed
to work seamlessly with the deno.net framework ecosystem. Build composable
middleware pipelines with full dependency injection support and modular architecture.

## Features

- 🎯 **Type-Safe Middleware** - Full TypeScript support with HttpContext integration
- 🔌 **Dependency Injection Ready** - First-class DI container integration
- 📦 **Modular Design** - Reusable middleware modules and composable pipelines
- 🚀 **Class & Function Support** - Use either class-based or functional middleware
- 🔄 **Pipeline Architecture** - Standard middleware pattern with async/await support
- 📁 **Auto-Discovery** - Load middleware modules from filesystem using glob patterns
- 🎨 **Fluent API** - Intuitive builder pattern for middleware configuration

## Installation

```bash
deno add jsr:@brad-jones/deno-net-middleware
```

## Quick Start

```typescript
import { IMiddleware, MiddlewareBuilder } from "@brad-jones/deno-net-middleware";
import { HttpContext, Next } from "@brad-jones/deno-net-http-context";
import { Container } from "@brad-jones/deno-net-container";

const container = new Container();
const middleware = new MiddlewareBuilder(container);

// Add functional middleware
middleware.use(async (ctx: HttpContext, next: Next) => {
  console.log(`${ctx.req.method} ${ctx.req.path}`);
  await next();
});

// Add class-based middleware
class AuthMiddleware implements IMiddleware {
  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    const token = ctx.req.header("Authorization");
    if (!token) {
      ctx.status(401);
      return ctx.json({ error: "Unauthorized" });
    }
    await next();
  }
}

middleware.use(AuthMiddleware);
```

## Core Concepts

### IMiddleware Interface

All middleware must implement the `IMiddleware` interface:

```typescript
interface IMiddleware {
  invokeAsync(ctx: HttpContext, next: Next): Promise<void>;
}
```

### Middleware Pipeline

Middleware executes in a pipeline pattern where each middleware can:

- Process the request before calling `next()`
- Process the response after `next()` returns
- Short-circuit the pipeline by not calling `next()`

```typescript
class LoggingMiddleware implements IMiddleware {
  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    // Before request processing
    console.log(`Request: ${ctx.req.method} ${ctx.req.path}`);
    const start = Date.now();

    await next(); // Continue to next middleware

    // After request processing
    const duration = Date.now() - start;
    console.log(`Response: ${ctx.res.status} (${duration}ms)`);
  }
}
```

## Middleware Types

### Class-Based Middleware

Implement the `IMiddleware` interface for full control and dependency injection:

```typescript
import { inject } from "@brad-jones/deno-net-container";
import { ILogger } from "@brad-jones/deno-net-logging";

class RequestLoggingMiddleware implements IMiddleware {
  constructor(
    private logger = inject(ILogger)("middleware"),
  ) {}

  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    this.logger.info("Processing request", {
      method: ctx.req.method,
      path: ctx.req.path,
      userAgent: ctx.req.header("User-Agent"),
    });

    await next();

    this.logger.info("Request completed", {
      status: ctx.res.status,
      statusText: ctx.res.statusText,
    });
  }
}

// Register with container scope
middleware.use(RequestLoggingMiddleware, Scope.Singleton);
```

### Functional Middleware

For simple middleware, use function syntax:

```typescript
// CORS middleware
middleware.use(async (ctx: HttpContext, next: Next) => {
  ctx.header("Access-Control-Allow-Origin", "*");
  ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (ctx.req.method === "OPTIONS") {
    ctx.status(204);
    return ctx.body("");
  }

  await next();
});

// Request timing middleware
middleware.use(async (ctx: HttpContext, next: Next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  ctx.header("X-Response-Time", `${duration.toFixed(2)}ms`);
});

// Error handling middleware
middleware.use(async (ctx: HttpContext, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error("Request failed:", error);
    ctx.status(500);
    return ctx.json({ error: "Internal Server Error" });
  }
});
```

## Middleware Modules

Create reusable middleware configurations using modules:

```typescript
// Define a middleware module
export function authenticationModule(secretKey: string): MiddlewareModule {
  return (builder: MiddlewareBuilder, container: IContainer) => {
    // Register dependencies
    container.addSingleton("AUTH_SECRET", { useValue: secretKey });

    // Add middleware to pipeline
    builder.use(JwtAuthMiddleware);
    builder.use(RoleAuthorizationMiddleware);
  };
}

// JWT authentication middleware
class JwtAuthMiddleware implements IMiddleware {
  constructor(
    private secret = inject("AUTH_SECRET"),
  ) {}

  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    const token = ctx.req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      ctx.status(401);
      return ctx.json({ error: "Token required" });
    }

    try {
      const payload = await verifyJWT(token, this.secret);
      ctx.set("user", payload);
      await next();
    } catch {
      ctx.status(401);
      return ctx.json({ error: "Invalid token" });
    }
  }
}

// Use the module
middleware.useModule(authenticationModule("your-secret-key"));
```

## Built-in Middleware

### HTTP Logging

Pre-built logging middleware for request/response logging:

```typescript
import { httpLogging } from "@brad-jones/deno-net-middleware";

// Basic HTTP logging
middleware.useModule(httpLogging());

// With custom options
middleware.useModule(httpLogging({
  foo: "custom-option", // Extend with your options
}));
```

The HTTP logging middleware automatically logs:

- Inbound requests with method and path
- Outbound responses with status and status text

## Loading Middleware from Files

Automatically discover and load middleware modules from the filesystem:

```typescript
// Load all middleware modules from a directory
await middleware.useModules("./src/middleware/**/*.ts");

// This will import and execute the default export from each file
// Files should export middleware modules like:

// src/middleware/cors.ts
export default function corsModule(): MiddlewareModule {
  return (builder, container) => {
    builder.use(async (ctx, next) => {
      ctx.header("Access-Control-Allow-Origin", "*");
      await next();
    });
  };
}

// src/middleware/security.ts
export default function securityModule(): MiddlewareModule {
  return (builder, container) => {
    builder.use(SecurityHeadersMiddleware);
    builder.use(RateLimitingMiddleware);
  };
}
```

## Advanced Patterns

### Conditional Middleware

Apply middleware based on conditions:

```typescript
class ConditionalAuthMiddleware implements IMiddleware {
  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    // Skip authentication for public endpoints
    const publicPaths = ["/health", "/docs", "/ping"];

    if (publicPaths.includes(ctx.req.path)) {
      await next();
      return;
    }

    // Apply authentication for protected routes
    const token = ctx.req.header("Authorization");
    if (!token) {
      ctx.status(401);
      return ctx.json({ error: "Authentication required" });
    }

    await next();
  }
}
```

### Middleware with Configuration

Create configurable middleware using dependency injection:

```typescript
// Configuration interface
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

const RateLimitConfig = new Type<RateLimitConfig>("RateLimitConfig");

// Configurable middleware
class RateLimitMiddleware implements IMiddleware {
  private requests = new Map<string, number[]>();

  constructor(
    private config = inject(RateLimitConfig),
  ) {}

  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    const clientId = this.getClientId(ctx);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean old requests
    const clientRequests = this.requests.get(clientId) || [];
    const validRequests = clientRequests.filter((time) => time > windowStart);

    if (validRequests.length >= this.config.maxRequests) {
      ctx.status(429);
      return ctx.json({
        error: this.config.message || "Too many requests",
      });
    }

    // Track this request
    validRequests.push(now);
    this.requests.set(clientId, validRequests);

    await next();
  }

  private getClientId(ctx: HttpContext): string {
    return ctx.req.header("X-Forwarded-For") ||
      ctx.req.header("X-Real-IP") ||
      "unknown";
  }
}

// Module with configuration
export function rateLimitModule(config: RateLimitConfig): MiddlewareModule {
  return (builder, container) => {
    container.addSingleton(RateLimitConfig, { useValue: config });
    builder.use(RateLimitMiddleware);
  };
}

// Usage
middleware.useModule(rateLimitModule({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  message: "Rate limit exceeded. Try again later.",
}));
```

### Error Handling Middleware

Centralized error handling and response formatting:

```typescript
import { ProblemDetails } from "@brad-jones/deno-net-problem-details";

class ErrorHandlingMiddleware implements IMiddleware {
  constructor(
    private logger = inject(ILogger)("errors"),
  ) {}

  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    try {
      await next();
    } catch (error) {
      await this.handleError(ctx, error);
    }
  }

  private async handleError(ctx: HttpContext, error: unknown): Promise<void> {
    if (error instanceof ProblemDetails) {
      // Handle structured problem details
      ctx.status(error.status);
      return ctx.json(error.toJSON());
    }

    if (error instanceof Error) {
      this.logger.error("Unhandled error", {
        message: error.message,
        stack: error.stack,
        path: ctx.req.path,
        method: ctx.req.method,
      });

      // Don't expose internal errors in production
      const isDevelopment = Deno.env.get("DENO_ENV") === "development";

      ctx.status(500);
      return ctx.json({
        error: "Internal Server Error",
        ...(isDevelopment && {
          message: error.message,
          stack: error.stack,
        }),
      });
    }

    // Unknown error type
    this.logger.error("Unknown error type", { error });
    ctx.status(500);
    return ctx.json({ error: "Internal Server Error" });
  }
}
```

## Integration with deno.net

### API Application Builder

The middleware system integrates seamlessly with the API application builder:

```typescript
import { ApiAppBuilder } from "@brad-jones/deno-net-app-builder";
import { httpLogging } from "@brad-jones/deno-net-middleware";

const builder = new ApiAppBuilder();

// Add individual middleware
builder.middleware.use(async (ctx, next) => {
  ctx.header("X-Powered-By", "deno.net");
  await next();
});

// Add middleware modules
builder.middleware.useModule(httpLogging());

// Load middleware from files
await builder.middleware.useModules("./src/middleware/**/*.ts");

// Build the application
const app = await builder.build();
```

### Route-Specific Middleware

While this package provides global middleware, you can combine it with route-specific middleware:

```typescript
// Global middleware applies to all routes
builder.middleware.use(AuthenticationMiddleware);

// Route-specific logic in route handlers
builder.routes.mapGet("/admin", async (ctx, next) => {
  // Additional authorization check for admin routes
  const user = ctx.get("user");
  if (!user.isAdmin) {
    ctx.status(403);
    return ctx.json({ error: "Admin access required" });
  }

  return ctx.json({ message: "Admin dashboard" });
});
```

## API Reference

### MiddlewareBuilder

Main builder class for configuring middleware:

```typescript
class MiddlewareBuilder {
  // Add class-based middleware
  use<T extends Constructor<IMiddleware>>(handler: T, scope?: Scope): this;

  // Add functional middleware
  use<T extends (ctx: HttpContext, next: Next) => Promise<void>>(handler: T): this;

  // Add middleware module
  useModule(module: MiddlewareModule): this;

  // Load modules from filesystem
  useModules(glob: string): Promise<void>;
}
```

### Types

```typescript
// Middleware interface
interface IMiddleware {
  invokeAsync(ctx: HttpContext, next: Next): Promise<void>;
}

// Middleware module function
type MiddlewareModule = (builder: MiddlewareBuilder, container: IContainer) => void;

// Next function for pipeline continuation
type Next = () => Promise<void>;
```

### Dependency Injection Token

```typescript
// Token for middleware registration
const IMiddleware = new Type<Constructor<IMiddleware>>();
```

## Best Practices

### 1. Order Matters

Place middleware in the correct order for proper execution:

```typescript
// Error handling should be first
middleware.use(ErrorHandlingMiddleware);

// Logging comes early
middleware.use(LoggingMiddleware);

// CORS before authentication
middleware.use(CorsMiddleware);

// Authentication before authorization
middleware.use(AuthenticationMiddleware);
middleware.use(AuthorizationMiddleware);

// Rate limiting after auth
middleware.use(RateLimitMiddleware);
```

### 2. Use Dependency Injection

Leverage the DI container for configuration and dependencies:

```typescript
class ConfigurableMiddleware implements IMiddleware {
  constructor(
    private config = inject(MyConfig),
    private logger = inject(ILogger)("middleware"),
    private cache = inject(ICache),
  ) {}

  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    // Use injected dependencies
  }
}
```

### 3. Handle Errors Gracefully

Always handle errors appropriately:

```typescript
middleware.use(async (ctx: HttpContext, next: Next) => {
  try {
    await next();
  } catch (error) {
    // Log error
    console.error("Middleware error:", error);

    // Don't let errors bubble up unhandled
    if (!ctx.res.status || ctx.res.status === 200) {
      ctx.status(500);
      return ctx.json({ error: "Internal Server Error" });
    }
  }
});
```

### 4. Performance Considerations

- Use singleton scope for stateless middleware
- Avoid blocking operations in middleware
- Consider caching for expensive operations

```typescript
// Efficient caching middleware
class CacheMiddleware implements IMiddleware {
  private cache = new Map<string, { data: any; expires: number }>();

  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    const key = `${ctx.req.method}:${ctx.req.path}`;
    const cached = this.cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return ctx.json(cached.data);
    }

    await next();

    // Cache successful responses
    if (ctx.res.status === 200) {
      this.cache.set(key, {
        data: await ctx.res.clone().json(),
        expires: Date.now() + 300000, // 5 minutes
      });
    }
  }
}
```

## Examples

See the [examples](../../examples/) directory for complete working examples:

- **API Application** - Shows middleware integration with API routes
- **Authentication Example** - JWT-based authentication middleware
- **Rate Limiting Example** - Request rate limiting implementation

## Contributing

Contributions are welcome! Please see the main [deno.net repository](https://github.com/brad-jones/deno.net) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Related Packages

- [@brad-jones/deno-net-http-context](../http-context/) - HTTP context interface
- [@brad-jones/deno-net-app-builder](../app-builder/) - Application builder framework
- [@brad-jones/deno-net-container](../container/) - Dependency injection container
- [@brad-jones/deno-net-logging](../logging/) - Logging system
