import { expect } from "@std/expect";
import { type ILogger, iLogger, Logger } from "./test-fixtures.ts";
import { Container, inject, NeedsInjectionContextError, Type } from "../src/mod.ts";

Deno.test("Type creates unique symbols", () => {
  const token1 = new Type<ILogger>("ILogger");
  const token2 = new Type<ILogger>("ILogger");

  expect(token1.id).not.toBe(token2.id);
  expect(token1.id.description).toBe("ILogger");
  expect(token2.id.description).toBe("ILogger");
});

Deno.test("Type without description creates unnamed symbol", () => {
  const token = new Type<ILogger>();

  expect(token.id.description).toBeUndefined();
});

Deno.test("createChild shares parent registry", () => {
  const parent = new Container();
  const logger = new Logger();
  parent.addTransient(iLogger, { useValue: logger });

  const child = parent.createChild();
  const service = child.getService(iLogger);

  expect(service).toBe(logger);
});

Deno.test("createChild has separate scoped instances", () => {
  const parent = new Container();
  parent.addScoped(Logger);

  const child = parent.createChild();

  const parentService = parent.getService(Logger);
  const childService = child.getService(Logger);

  expect(parentService).toBeInstanceOf(Logger);
  expect(childService).toBeInstanceOf(Logger);
  expect(parentService).not.toBe(childService); // Different scoped instances
});

Deno.test("createChild shares singleton instances", () => {
  const parent = new Container();
  parent.addSingleton(Logger);

  const child = parent.createChild();

  const parentService = parent.getService(Logger);
  const childService = child.getService(Logger);

  expect(parentService).toBeInstanceOf(Logger);
  expect(childService).toBeInstanceOf(Logger);
  expect(parentService).toBe(childService); // Same singleton instance
});

Deno.test("callFunc sets and resets injection context", () => {
  const container = new Container();
  const logger = new Logger();
  container.addTransient(iLogger, { useValue: logger });

  const result = container.callFunc((arg: string) => {
    const injectedLogger = inject(iLogger);
    return { arg, logger: injectedLogger };
  }, "test");

  expect(result.arg).toBe("test");
  expect(result.logger).toBe(logger);

  // Context should be reset after function call
  expect(() => inject(iLogger)).toThrow(NeedsInjectionContextError);
});

Deno.test("callFunc works with multiple arguments", () => {
  const container = new Container();

  const result = container.callFunc(
    (a: number, b: number, c: string) => {
      return { sum: a + b, text: c };
    },
    1,
    2,
    "hello",
  );

  expect(result.sum).toBe(3);
  expect(result.text).toBe("hello");
});
