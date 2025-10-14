# @brad-jones/deno-net-logging

A powerful and flexible logging library for Deno that wraps [LogTape](https://logtape.org/)
with a fluent builder API inspired by ASP.NET Core's logging system. Designed with dependency
injection in mind and fully compatible with the deno.net framework ecosystem.

## Features

- 🚀 **Fluent Builder API** - Intuitive, chainable configuration
- 🎯 **Category-based Logging** - Organize logs by application components
- 📝 **Multiple Formatters** - Plain text, JSON, colorized, and pretty-printed output
- 📤 **Flexible Sinks** - Console and file output with extensible architecture
- 🔍 **Advanced Filtering** - Level-based and custom filtering capabilities
- 🔌 **Dependency Injection Ready** - First-class DI container integration
- 📦 **Modular Design** - Composable logging modules and configuration
- 🎨 **TypeScript First** - Full type safety and IntelliSense support

## Installation

```bash
deno add jsr:@brad-jones/deno-net-logging
```

## Quick Start

```typescript
import { Container } from "@brad-jones/deno-net-container";
import { ILogger, inject, LoggingBuilder } from "@brad-jones/deno-net-logging";

// Create a container and logging builder
const container = new Container();
const builder = new LoggingBuilder(container);

// Configure logging
builder
  .setLevel("info")
  .addConsole({ formatter: "color" })
  .addFile("app.log", { formatter: "json" });

// Build and activate logging
await using loggingSystem = await builder.build();

// Use logging in your services
container.callFunc((logger = inject(ILogger)("MyApp")) => {
  logger.info("Hello World!");
  logger.error("Something went wrong", { userId: 123 });
});
```

## Core Concepts

### Loggers and Categories

Categories help organize logs by application component or module:

```typescript
// Category-specific configuration
builder.addCategory("database", (category) => {
  category
    .setLevel("debug")
    .addFile("db.log", { formatter: "json" });
});

builder.addCategory(["api", "auth"], (category) => {
  category
    .setLevel("warning")
    .addConsole({ formatter: "color" });
});

// Using categorized loggers
const dbLogger = inject(ILogger)("database");
const authLogger = inject(ILogger)(["api", "auth"]);
```

### Formatters

Choose from built-in formatters or create custom ones:

```typescript
// Built-in formatters
builder.addConsole({ formatter: "plain" }); // Simple text
builder.addConsole({ formatter: "color" }); // Colored output
builder.addConsole({ formatter: "json" }); // JSON Lines format
builder.addConsole({ formatter: "pretty" }); // Pretty-printed

// Custom formatter
import { MyCustomFormatter } from "./formatters/custom.ts";
builder.addConsole({ formatter: MyCustomFormatter });
```

### Sinks

Output logs to different destinations:

```typescript
// Console output
builder.addConsole({
  formatter: "color",
  lowestLevel: "info",
});

// File output
builder.addFile("./logs/app.log", {
  formatter: "json",
  lowestLevel: "warning",
});

// Category-specific sinks
builder.addConsole({
  category: "database",
  formatter: "json",
});
```

### Filtering

Control which logs are processed:

```typescript
// Level-based filtering (built-in)
builder.addConsole({ lowestLevel: "warning" });

// Category-specific levels
builder.setLevel("debug", { category: "database" });
builder.setLevel("error", { category: ["network", "http"] });

// Custom filtering with categories
builder.addCategory("sensitive-operations", (category) => {
  category.addFilteredSink(
    ConsoleSink,
    [{ formatter: "json" }],
    (filter) => filter.addFilter(LevelFilter, "error"),
  );
});
```

## Advanced Usage

### Logging Modules

Create reusable logging configurations:

```typescript
// Define a logging module
export function databaseLoggingModule(logPath: string): LoggingModule {
  return (builder: LoggingBuilder) => {
    builder.addCategory("database", (category) => {
      category
        .setLevel("debug")
        .addFile(logPath, { formatter: "json" })
        .addConsole({ formatter: "plain", lowestLevel: "warning" });
    });
  };
}

// Use the module
builder.addModule(databaseLoggingModule("./logs/database.log"));

// Load modules from files
await builder.addModules("./config/logging-modules/**/*.ts");
```

### Dependency Injection Integration

Seamlessly integrate with the deno.net DI container:

```typescript
import { Container, inject } from "@brad-jones/deno-net-container";

class UserService {
  constructor(
    private logger = inject(ILogger)("UserService"),
  ) {}

  async createUser(userData: UserData) {
    this.logger.info("Creating new user", { email: userData.email });

    try {
      const user = await this.userRepository.create(userData);
      this.logger.info("User created successfully", { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error("Failed to create user", {
        error: error.message,
        userData: userData.email,
      });
      throw error;
    }
  }
}
```

### Custom Sinks and Formatters

Extend the system with custom components:

```typescript
import { IFormatter, ISink } from "@brad-jones/deno-net-logging";

// Custom formatter
export class MyCustomFormatter implements IFormatter {
  format(record: LogRecord): string {
    return `[${record.level}] ${record.category.join("·")} ${record.message}`;
  }
}

// Custom sink
export class DatabaseSink implements ISink {
  constructor(private connectionString: string) {}

  emit(record: LogRecord): void {
    // Write to database
  }
}

// Register and use
builder.addCategory("audit", (category) => {
  category.addSink(DatabaseSink, "connection-string", {
    formatter: new MyCustomFormatter(),
  });
});
```

### Environment-based Configuration

Configure logging based on environment:

```typescript
const isDevelopment = Deno.env.get("DENO_ENV") === "development";

if (isDevelopment) {
  builder
    .setLevel("debug")
    .addConsole({ formatter: "pretty" });
} else {
  builder
    .setLevel("info")
    .addConsole({ formatter: "json" })
    .addFile("./logs/app.jsonl", { formatter: "json" });
}

// Production-specific error logging
if (!isDevelopment) {
  builder.addFile("./logs/errors.log", {
    formatter: "json",
    lowestLevel: "error",
    category: [], // Root category catches all
  });
}
```

## API Reference

### LoggingBuilder

The main builder class for configuring logging:

```typescript
class LoggingBuilder {
  // Basic configuration
  setLevel(level: LogLevel | null, options?: { category?: string | string[] }): LoggingBuilder;

  // Sinks
  addConsole(options?: ConsoleOptions): LoggingBuilder;
  addFile(path: string, options?: FileOptions): LoggingBuilder;

  // Categories
  addCategory(category: string | string[], builder: (c: CategoryBuilder) => void): LoggingBuilder;

  // Modules
  addModule(module: LoggingModule): LoggingBuilder;
  addModules(glob: string): Promise<void>;

  // Build
  build(options?: { reset?: boolean }): Promise<AsyncDisposable>;
}
```

### Built-in Components

#### Available Formatters

- `PlainFormatter` - Simple text output
- `ColorFormatter` - ANSI colored output
- `JsonFormatter` - JSON Lines format
- `PrettyFormatter` - Human-readable formatted output

#### Available Sinks

- `ConsoleSink` - Console/terminal output
- `FileSink` - File-based output
- `FilteredSink` - Decorator for conditional output

#### Available Filters

- `LevelFilter` - Filter by log level threshold

### Log Levels

Available log levels (in order of severity):

- `trace` - Detailed diagnostic information
- `debug` - Debug information useful during development
- `info` - General informational messages
- `warning` - Warning messages for potentially harmful situations
- `error` - Error messages for error conditions
- `fatal` - Critical errors that may cause termination

## Integration with deno.net

This logging package integrates seamlessly with other deno.net packages:

```typescript
import { ApiAppBuilder } from "@brad-jones/deno-net-app-builder";

const builder = new ApiAppBuilder();

// Configure logging as part of app building
builder.logging
  .setLevel("info")
  .addConsole({ formatter: "color" })
  .addFile("api.log", { formatter: "json" });

// Logging is automatically available in your services
class WeatherService {
  constructor(private logger = inject(ILogger)("WeatherService")) {}

  async getWeather(city: string) {
    this.logger.info("Fetching weather", { city });
    // ... implementation
  }
}
```

## Performance Considerations

- **Lazy Evaluation** - Log formatting only occurs when logs are actually output
- **Efficient Filtering** - Short-circuit evaluation prevents unnecessary processing
- **Minimal Allocation** - Reuse of formatter instances and optimized string handling
- **Async Disposal** - Proper cleanup of resources when logging system is disposed

## Examples

See the [examples](../../examples/) directory for complete working examples:

- **API Application** - RESTful API with structured logging
- **Web Application** - Client-side logging integration

## Contributing

Contributions are welcome! Please see the main [deno.net repository](https://github.com/brad-jones/deno.net) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Related Packages

- [@brad-jones/deno-net-container](../container/) - Dependency injection container
- [@brad-jones/deno-net-app-builder](../app-builder/) - Application builder framework
- [LogTape](https://logtape.org/) - Underlying logging framework
