# @brad-jones/deno-net-configuration

A flexible and extensible configuration library for Deno applications that provides a clean,
type-safe way to manage configuration from multiple sources with dependency injection integration.

## Features

- 🔧 **Multiple Configuration Sources**: Environment variables, files, remote services, and more
- 📊 **Hierarchical Configuration**: Dot notation and array-based section access
- 🛡️ **Type Safety**: Strongly typed configuration options with validation support
- 🔄 **Runtime Reloading**: Support for dynamic configuration updates
- 💉 **Dependency Injection**: Seamless integration with `@brad-jones/deno-net-container`
- 📝 **Source Precedence**: Configurable override behavior between sources
- 🎯 **Callable Interface**: Both function-style and method-style access patterns

## Installation

```bash
deno add jsr:@brad-jones/deno-net-configuration
```

## Dependencies

This library requires the following dependencies:

```bash
deno add jsr:@brad-jones/deno-net-container
deno add jsr:@zod/zod  # For validation examples
```

## Quick Start

```typescript
import { Container, inject } from "@brad-jones/deno-net-container";
import { ConfigurationBuilder, IConfiguration } from "@brad-jones/deno-net-configuration";
import z from "@zod/zod";

// Setup dependency injection container
const container = new Container();
const configBuilder = new ConfigurationBuilder(container);

// Register configuration sources (order matters - first registered wins!)
configBuilder.fromEnv();

// Define strongly typed options with validation
const DatabaseOptions = async (config = inject(IConfiguration)("database")) =>
  z.object({
    host: z.string().default("localhost"),
    port: z.number().default(5432),
    username: z.string(),
    password: z.string(),
  }).parse(await config);

configBuilder.configureOptions(DatabaseOptions);

// Use in your services
class DatabaseService {
  constructor(private options = inject(DatabaseOptions)) {}

  async connect() {
    const opts = await this.options;
    console.log(`Connecting to ${opts.host}:${opts.port}`);
  }
}
```

## Environment Variables Convention

The `EnvironmentSource` uses a hierarchical naming convention:

- **Section Separator**: Double underscores (`__`)
- **Word Separator**: Single underscores (`_`)
- **Case Conversion**: Environment variables are UPPER_CASE, config keys become camelCase

### Examples

```bash
# Environment variables
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER_NAME=admin

MY_APP__DATABASE_HOST=prod-db
MY_APP__DATABASE_PORT=3306
MY_APP__CACHE__REDIS_URL=redis://localhost
```

```typescript
// Access patterns
const dbConfig = await config.getSection("database");
// Returns: { host: "localhost", port: "5432", userName: "admin" }

const appDbConfig = await config.getSection(["myApp", "database"]);
// Returns: { host: "prod-db", port: "3306" }

const cacheConfig = await config.getSection("myApp.cache");
// Returns: { redisUrl: "redis://localhost" }
```

## Configuration Sources

### Built-in Sources

#### EnvironmentSource

Reads from environment variables with hierarchical naming.

```typescript
builder.fromEnv();
// or
builder.fromSource(EnvironmentSource);
```

### Custom Sources

Implement the `IConfigurationSource` interface:

```typescript
import { IConfigurationSource } from "@brad-jones/deno-net-configuration";

class FileConfigurationSource implements IConfigurationSource {
  constructor(private filePath: string) {}

  async read(section: string[]): Promise<Record<string, string>> {
    const fileContent = await Deno.readTextFile(this.filePath);
    const config = JSON.parse(fileContent);

    // Navigate to the requested section
    let current = config;
    for (const part of section) {
      current = current[part] || {};
    }

    // Flatten to string values
    return this.flatten(current);
  }

  private flatten(obj: any, prefix = ""): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null) {
        Object.assign(result, this.flatten(value, `${prefix}${key}.`));
      } else {
        result[`${prefix}${key}`] = String(value);
      }
    }
    return result;
  }
}

// Register custom source
builder.fromSource(FileConfigurationSource);
```

## Source Precedence

**Important**: Earlier registered sources take precedence over later registered sources.

```typescript
builder
  .fromSource(FileConfigurationSource) // 🏆 Highest precedence
  .fromSource(EnvironmentConfigurationSource); // 📉 Lower precedence

// If both sources have the same key, FileConfigurationSource wins
```

This allows for typical configuration layering:

1. Register defaults/base configuration first (highest precedence)
2. Register environment-specific overrides later (lower precedence)

## Configuration Access Patterns

### Direct Access

```typescript
const config = container.getService(IConfiguration);

// Callable interface
const dbConfig = await config("database");
const nestedConfig = await config(["app", "database"]);

// Method interface
const dbConfig2 = await config.getSection("database");
const nestedConfig2 = await config.getSection(["app", "database"]);
```

### Strongly Typed Options

```typescript
// Define validation schema
const ServerOptions = async (config = inject(IConfiguration)("server")) =>
  z.object({
    port: z.number().min(1).max(65535),
    host: z.string().ip().or(z.literal("localhost")),
    ssl: z.boolean(),
    workers: z.number().positive().default(1),
  }).parse(await config);

// Register with container
builder.configureOptions(ServerOptions);

// Use in services
class WebServer {
  constructor(private options = inject(ServerOptions)) {}

  async start() {
    const opts = await this.options;
    console.log(`Starting server on ${opts.host}:${opts.port}`);
  }
}
```

### Runtime Configuration Reloading

For dynamic configuration updates, register options with `Transient` scope:

```typescript
import { Scope } from "@brad-jones/deno-net-container";

// Register as transient so it's re-evaluated on each access
builder.configureOptions(DatabaseOptions, Scope.Transient);

class DatabaseService {
  constructor(
    private getOptions = inject(DatabaseOptions, { lazy: true }),
  ) {}

  async reconnect() {
    // This will re-read configuration from sources
    const currentOptions = await this.getOptions();
    // ... reconnect with new options
  }
}
```

## Configuration Modules

Organize configuration setup using modules:

```typescript
import { ConfigurationModule } from "@brad-jones/deno-net-configuration";

// database.config.ts
export const databaseModule: ConfigurationModule = (builder, container) => {
  const DatabaseOptions = async (config = inject(IConfiguration)("database")) => {
    // ... validation logic
  };

  builder.configureOptions(DatabaseOptions);
  container.addSingleton(DatabaseService);
};

// main.ts
builder.fromModule(databaseModule);

// Or load multiple modules from files
await builder.fromModules("./config/*.config.ts");
```
