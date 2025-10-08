# @brad-jones/deno-net-container

A lightweight, type-safe Inversion of Control (IoC) container for Deno and TypeScript applications.
This package provides dependency injection capabilities with support for multiple service lifetimes,
container hierarchies, and flexible registration patterns.

_Inspired by the dotnet [ServiceCollection](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.servicecollection) class as well as [Needle-Di](https://needle-di.io/)._

## Features

- 🎯 **Type-safe dependency injection** with full TypeScript support
- 🔄 **Multiple service lifetimes**: Transient, Scoped, and Singleton
- 🏗️ **Flexible registration**: Support for values, classes, and factory functions
- 🌳 **Container hierarchies** with child container inheritance
- 💉 **Advanced injection options**: Multi-service resolution, optional dependencies, and lazy loading
- 🧪 **Comprehensive test coverage** with extensive test suite
- 📦 **Zero dependencies** - pure TypeScript implementation, built for Deno!

## Introduction

### Installation

```txt
deno add jsr:@brad-jones/deno-net-container
```

### Basic Example

```typescript
import { Container, Type } from "@brad-jones/deno-net-container";

// Define interfaces and tokens
const ILogger = new Type<ILogger>("ILogger");

interface ILogger {
  log(message: string): void;
}

class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

// Create container and register services
const container = new Container();
container.addTransient(ILogger, ConsoleLogger);

// Resolve services
const logger = container.getService(ILogger);
logger.log("Hello, World!"); // Output: [LOG] Hello, World!
```
