import { expect } from "@std/expect";
import { Container, inject, NeedsInjectionContextError, TokenNotFound } from "../src/mod.ts";
import { type ILogger, iLogger, type IPlugin, iPlugin, Logger, Plugin1, Plugin2 } from "./test-fixtures.ts";

// Basic injection tests
Deno.test("inject works within injection context", () => {
  const container = new Container();
  let capturedLogger: ILogger | null = null;
  const expectedLogger = new Logger();

  container.addTransient(iLogger, { useValue: expectedLogger });

  container.callFunc(() => {
    capturedLogger = inject(iLogger);
  });

  expect(capturedLogger).toBe(expectedLogger);
});

Deno.test("inject throws error outside injection context", () => {
  expect(() => inject(iLogger)).toThrow(NeedsInjectionContextError);
});

Deno.test("inject throws TokenNotFound for unregistered services", () => {
  const container = new Container();

  expect(() => {
    container.callFunc(() => inject(iLogger));
  }).toThrow(TokenNotFound);
});

// Multi option tests
Deno.test("inject with multi option returns array of services", () => {
  const container = new Container();
  const plugin1 = new Plugin1();
  const plugin2 = new Plugin2();
  let capturedPlugins: IPlugin[] = [];

  container.addTransient(iPlugin, { useValue: plugin1 });
  container.addTransient(iPlugin, { useValue: plugin2 });

  container.callFunc(() => {
    capturedPlugins = inject(iPlugin, { multi: true });
  });

  expect(capturedPlugins).toHaveLength(2);
  expect(capturedPlugins[0]).toBe(plugin1);
  expect(capturedPlugins[1]).toBe(plugin2);
});

Deno.test("inject with multi option throws TokenNotFound for unregistered services", () => {
  const container = new Container();

  expect(() => {
    container.callFunc(() => {
      inject(iPlugin, { multi: true });
    });
  }).toThrow(TokenNotFound);
});

Deno.test("inject with multi option throws error outside context", () => {
  expect(() => inject(iPlugin, { multi: true })).toThrow(NeedsInjectionContextError);
});

// Optional option tests
Deno.test("inject with optional option returns undefined for unregistered services", () => {
  const container = new Container();
  let capturedLogger: ILogger | undefined = {} as ILogger;

  container.callFunc(() => {
    capturedLogger = inject(iLogger, { optional: true });
  });

  expect(capturedLogger).toBeUndefined();
});

Deno.test("inject with optional option returns service when registered", () => {
  const container = new Container();
  const expectedLogger = new Logger();
  let capturedLogger: ILogger | undefined = undefined;

  container.addTransient(iLogger, { useValue: expectedLogger });

  container.callFunc(() => {
    capturedLogger = inject(iLogger, { optional: true });
  });

  expect(capturedLogger).toBe(expectedLogger);
});

Deno.test("inject with optional option returns undefined outside context", () => {
  const result = inject(iLogger, { optional: true });
  expect(result).toBeUndefined();
});

// Multi + Optional combination tests
Deno.test("inject with multi and optional returns undefined for no context", () => {
  const result = inject(iPlugin, { multi: true, optional: true });
  expect(result).toBeUndefined();
});

Deno.test("inject with multi and optional returns undefined for unregistered services", () => {
  const container = new Container();
  let capturedPlugins: IPlugin[] | undefined = [] as IPlugin[];

  container.callFunc(() => {
    capturedPlugins = inject(iPlugin, { multi: true, optional: true });
  });

  expect(capturedPlugins).toBeUndefined();
});

Deno.test("inject with multi and optional returns services array when registered", () => {
  const container = new Container();
  const plugin1 = new Plugin1();
  const plugin2 = new Plugin2();
  let capturedPlugins: IPlugin[] | undefined = undefined;

  container.addTransient(iPlugin, { useValue: plugin1 });
  container.addTransient(iPlugin, { useValue: plugin2 });

  container.callFunc(() => {
    capturedPlugins = inject(iPlugin, { multi: true, optional: true });
  });

  expect(capturedPlugins).toHaveLength(2);
  expect(capturedPlugins![0]).toBe(plugin1);
  expect(capturedPlugins![1]).toBe(plugin2);
});

// Lazy option tests
Deno.test("inject with lazy option returns function", () => {
  const container = new Container();
  const expectedLogger = new Logger();
  let lazyLogger: (() => ILogger) | null = null;

  container.addTransient(iLogger, { useValue: expectedLogger });

  container.callFunc(() => {
    lazyLogger = inject(iLogger, { lazy: true });
  });

  expect(typeof lazyLogger).toBe("function");
  expect(lazyLogger!()).toBe(expectedLogger);
});

Deno.test("inject with lazy option function throws when service not found", () => {
  const container = new Container();
  let lazyLogger: (() => ILogger) | null = null;

  container.callFunc(() => {
    lazyLogger = inject(iLogger, { lazy: true });
  });

  expect(lazyLogger).toThrow(TokenNotFound);
});

Deno.test("inject with lazy and multi returns function that returns array", () => {
  const container = new Container();
  const plugin1 = new Plugin1();
  const plugin2 = new Plugin2();
  let lazyPlugins: (() => IPlugin[]) | null = null;

  container.addTransient(iPlugin, { useValue: plugin1 });
  container.addTransient(iPlugin, { useValue: plugin2 });

  container.callFunc(() => {
    lazyPlugins = inject(iPlugin, { lazy: true, multi: true });
  });

  expect(typeof lazyPlugins).toBe("function");

  const plugins = lazyPlugins!();
  expect(plugins).toHaveLength(2);
  expect(plugins[0]).toBe(plugin1);
  expect(plugins[1]).toBe(plugin2);
});

Deno.test("inject with lazy and optional returns function that returns undefined", () => {
  const container = new Container();
  let lazyLogger: (() => ILogger | undefined) | null = null;

  container.callFunc(() => {
    lazyLogger = inject(iLogger, { lazy: true, optional: true });
  });

  expect(typeof lazyLogger).toBe("function");
  expect(lazyLogger!()).toBeUndefined();
});

Deno.test("inject with lazy, multi, and optional returns function", () => {
  const container = new Container();
  let lazyPlugins: (() => IPlugin[] | undefined) | null = null;

  container.callFunc(() => {
    lazyPlugins = inject(iPlugin, { lazy: true, multi: true, optional: true });
  });

  expect(typeof lazyPlugins).toBe("function");
  expect(lazyPlugins!()).toBeUndefined();
});

// Edge case tests
Deno.test("inject lazy function captures injection context when created", () => {
  const container = new Container();
  const expectedLogger = new Logger();
  let lazyLogger: (() => ILogger) | null = null;

  container.addTransient(iLogger, { useValue: expectedLogger });

  container.callFunc(() => {
    lazyLogger = inject(iLogger, { lazy: true });
  });

  // Lazy function works outside injection context because it captured the context
  expect(lazyLogger!()).toBe(expectedLogger);

  // And still works within injection context
  container.callFunc(() => {
    expect(lazyLogger!()).toBe(expectedLogger);
  });
});

Deno.test("inject lazy function can be called multiple times", () => {
  const container = new Container();
  let callCount = 0;

  container.addTransient(iLogger, () => {
    callCount++;
    return new Logger();
  });

  let lazyLogger: (() => ILogger) | null = null;

  container.callFunc(() => {
    lazyLogger = inject(iLogger, { lazy: true });
  });

  // Can call outside injection context because it captured the context
  const logger1 = lazyLogger!();
  const logger2 = lazyLogger!();

  expect(callCount).toBe(2); // Factory called twice for transient
  expect(logger1).not.toBe(logger2); // Different instances
});
Deno.test("inject works in class constructors with default parameters", () => {
  const container = new Container();
  const expectedLogger = new Logger();

  container.addTransient(iLogger, { useValue: expectedLogger });

  class TestService {
    constructor(public logger: ILogger = inject(iLogger)) {}
  }

  const service = container.getService(TestService);
  expect(service.logger).toBe(expectedLogger);
});

Deno.test("inject works in class properties", () => {
  const container = new Container();
  const expectedLogger = new Logger();

  container.addTransient(iLogger, { useValue: expectedLogger });

  class TestService {
    public logger = inject(iLogger);
  }

  const service = container.getService(TestService);
  expect(service.logger).toBe(expectedLogger);
});

// Additional comprehensive tests for complete coverage
Deno.test("inject with lazy and multi returns function resolving to services array", () => {
  const container = new Container();
  const plugin1 = new Plugin1();
  let lazyPlugins: (() => IPlugin[]) | null = null;

  container.addTransient(iPlugin, { useValue: plugin1 });

  container.callFunc(() => {
    lazyPlugins = inject(iPlugin, { lazy: true, multi: true });
  });

  expect(typeof lazyPlugins).toBe("function");
  const plugins = lazyPlugins!();
  expect(plugins).toHaveLength(1);
  expect(plugins[0]).toBe(plugin1);
});

Deno.test("inject with lazy and optional returns registered service", () => {
  const container = new Container();
  const expectedLogger = new Logger();
  let lazyLogger: (() => ILogger | undefined) | null = null;

  container.addTransient(iLogger, { useValue: expectedLogger });

  container.callFunc(() => {
    lazyLogger = inject(iLogger, { lazy: true, optional: true });
  });

  expect(typeof lazyLogger).toBe("function");
  expect(lazyLogger!()).toBe(expectedLogger);
});

Deno.test("inject with lazy, multi, and optional returns registered services", () => {
  const container = new Container();
  const plugin1 = new Plugin1();
  const plugin2 = new Plugin2();
  let lazyPlugins: (() => IPlugin[] | undefined) | null = null;

  container.addTransient(iPlugin, { useValue: plugin1 });
  container.addTransient(iPlugin, { useValue: plugin2 });

  container.callFunc(() => {
    lazyPlugins = inject(iPlugin, { lazy: true, multi: true, optional: true });
  });

  expect(typeof lazyPlugins).toBe("function");
  const plugins = lazyPlugins!();
  expect(plugins).toHaveLength(2);
  expect(plugins![0]).toBe(plugin1);
  expect(plugins![1]).toBe(plugin2);
});

Deno.test("inject with multi option works with mixed service lifetimes", () => {
  const container = new Container();
  let capturedPlugins: IPlugin[] = [];

  // Add services with different lifetimes
  container.addTransient(iPlugin, Plugin1);
  container.addScoped(iPlugin, Plugin2);
  container.addSingleton(iPlugin, () => new Plugin1());

  container.callFunc(() => {
    capturedPlugins = inject(iPlugin, { multi: true });
  });

  expect(capturedPlugins).toHaveLength(3);
  expect(capturedPlugins[0]).toBeInstanceOf(Plugin1); // Transient
  expect(capturedPlugins[1]).toBeInstanceOf(Plugin2); // Scoped
  expect(capturedPlugins[2]).toBeInstanceOf(Plugin1); // Singleton
});

Deno.test("inject lazy function works with different service lifetimes", () => {
  const container = new Container();
  let lazyLogger: (() => ILogger) | null = null;

  container.addSingleton(iLogger, Logger);

  container.callFunc(() => {
    lazyLogger = inject(iLogger, { lazy: true });
  });

  const logger1 = lazyLogger!();
  const logger2 = lazyLogger!();

  expect(logger1).toBe(logger2); // Should be same singleton instance
});

Deno.test("inject preserves type safety with generic constraints", () => {
  const container = new Container();
  const expectedLogger = new Logger();

  container.addTransient(iLogger, { useValue: expectedLogger });

  container.callFunc(() => {
    // These should all have proper typing
    const singleLogger: ILogger = inject(iLogger);
    const multiLoggers: ILogger[] = inject(iLogger, { multi: true });
    const optionalLogger: ILogger | undefined = inject(iLogger, { optional: true });
    const lazyLogger: () => ILogger = inject(iLogger, { lazy: true });
    const lazyMultiLogger: () => ILogger[] = inject(iLogger, { lazy: true, multi: true });
    const lazyOptionalLogger: () => ILogger | undefined = inject(iLogger, { lazy: true, optional: true });
    const lazyMultiOptionalLogger: () => ILogger[] | undefined = inject(iLogger, {
      lazy: true,
      multi: true,
      optional: true,
    });

    expect(singleLogger).toBe(expectedLogger);
    expect(multiLoggers[0]).toBe(expectedLogger);
    expect(optionalLogger).toBe(expectedLogger);
    expect(lazyLogger()).toBe(expectedLogger);
    expect(lazyMultiLogger()[0]).toBe(expectedLogger);
    expect(lazyOptionalLogger()).toBe(expectedLogger);
    expect(lazyMultiOptionalLogger()![0]).toBe(expectedLogger);
  });
});
