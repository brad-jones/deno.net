# @brad-jones/deno-net-formatter

A comprehensive code formatting library for Deno that wraps [@dprint/formatter](https://dprint.dev/) WASM modules,
providing a simple and consistent API for formatting multiple programming languages.

## Features

- 🚀 **Zero Configuration**: Works out of the box with sensible defaults
- 🎯 **Multiple Languages**: Support for 9+ programming languages and formats
- 📦 **WASM Integration**: Automatically handles WASM module loading and caching
- 🔧 **Configurable**: Extensive configuration options for each formatter
- 🧪 **Well Tested**: Comprehensive test suite ensuring reliability
- 📝 **TypeScript**: Full TypeScript support with type definitions

## Supported Formats

| Language/Format | Class                 | Description                       |
| --------------- | --------------------- | --------------------------------- |
| **Dockerfile**  | `DockerfileFormatter` | Format Dockerfile syntax          |
| **HTML**        | `HtmlFormatter`       | Format HTML documents             |
| **JavaScript**  | `JavascriptFormatter` | Format JavaScript/TypeScript code |
| **JSON**        | `JsonFormatter`       | Format JSON documents             |
| **Markdown**    | `MarkdownFormatter`   | Format Markdown documents         |
| **Python**      | `PythonFormatter`     | Format Python code                |
| **SQL**         | `SqlFormatter`        | Format SQL queries                |
| **TOML**        | `TomlFormatter`       | Format TOML configuration files   |
| **YAML**        | `YamlFormatter`       | Format YAML configuration files   |

## Installation

```bash
deno add jsr:@brad-jones/deno-net-formatter
```

## Quick Start

### Basic Usage

```typescript
import { JavascriptFormatter } from "@brad-jones/deno-net-formatter";

const formatter = new JavascriptFormatter();
const unformatted = `function hello(name){return "Hello, "+name+"!"}`;
const formatted = await formatter.fmt(unformatted);

console.log(formatted);
// Output:
// function hello(name) {
//   return "Hello, " + name + "!";
// }
```

### Multiple Formatters

```typescript
import { JsonFormatter, MarkdownFormatter, SqlFormatter } from "@brad-jones/deno-net-formatter";

// Format JSON
const jsonFormatter = new JsonFormatter();
const json = await jsonFormatter.fmt('{"name":"John","age":30}');
// Output: { "name": "John", "age": 30 }

// Format Markdown
const mdFormatter = new MarkdownFormatter();
const markdown = await mdFormatter.fmt("# Title\n\nSome **bold** text");

// Format SQL
const sqlFormatter = new SqlFormatter();
const sql = await sqlFormatter.fmt("SELECT name,email FROM users WHERE active=true");
```

## Configuration

Each formatter accepts configuration options to customize the formatting behavior:

### JavaScript/TypeScript Configuration

```typescript
import { JavascriptFormatter } from "@brad-jones/deno-net-formatter";

const formatter = new JavascriptFormatter({
  // Global dprint options
  globalOptions: {
    indentWidth: 4,
    lineWidth: 100,
  },
  // JavaScript-specific options
  semiColons: "always",
  quoteStyle: "alwaysDouble",
  indentWidth: 2,
});

const formatted = await formatter.fmt("const x='hello'");
```

### JSON Configuration

```typescript
import { JsonFormatter } from "@brad-jones/deno-net-formatter";

const formatter = new JsonFormatter({
  globalOptions: {
    indentWidth: 4,
  },
  indentWidth: 2,
});
```

### HTML Configuration

```typescript
import { HtmlFormatter } from "@brad-jones/deno-net-formatter";

const formatter = new HtmlFormatter({
  globalOptions: {
    lineWidth: 120,
  },
  // HTML-specific options available
});
```

## Container Integration

This library also provides container integration using the [@brad-jones/deno-net-container](https://jsr.io/@brad-jones/deno-net-container) dependency injection system:

```typescript
import { Container, inject } from "@brad-jones/deno-net-container";
import { IJavascriptFormatter, javascriptFmt } from "@brad-jones/deno-net-formatter";

const container = new Container();
container.addModule(javascriptFmt({ semiColons: "always" }));

class MyService {
  constructor(private jsFormatter = inject(IJavascriptFormatter)) {}

  prettyPrintJS() {
    return this.jsFormatter.fmt("const x = 1");
  }
}
```

## API Reference

### Core Interface

All formatters implement the `IFormatter` interface:

```typescript
interface IFormatter {
  fmt(srcCode: string): Promise<string>;
}
```

### Base Classes

- **`DprintFormatter`**: Abstract base class that handles WASM module loading and caching
- **`IFormatter`**: Interface that all formatters implement

### Formatter Classes

Each formatter class follows the same pattern:

```typescript
class XxxFormatter extends DprintFormatter {
  readonly version: string; // Version of the underlying WASM plugin
  constructor(options?: XxxFormatterOptions) {/* ... */}
}
```

## Error Handling

The formatters will throw errors in the following scenarios:

- **WASM Loading Errors**: If the WASM module fails to load
- **Parse Errors**: If the input code cannot be parsed
- **Configuration Errors**: If invalid configuration options are provided

```typescript
try {
  const formatter = new JavascriptFormatter();
  const result = await formatter.fmt("invalid javascript syntax {{{");
} catch (error) {
  console.error("Formatting failed:", error.message);
}
```

## Performance

- **WASM Caching**: WASM modules are loaded once and cached for subsequent use
- **Memory Efficient**: Formatters reuse the same WASM instance across multiple format calls
- **Lazy Loading**: WASM modules are only loaded when first needed

## Related Projects

- [dprint](https://dprint.dev/) - The original dprint project
- [@dprint/formatter](https://jsr.io/@dprint/formatter) - The underlying WASM engine
- [@brad-jones/deno-net-container](https://jsr.io/@brad-jones/deno-net-container) - Dependency injection container
