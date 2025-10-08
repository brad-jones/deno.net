import { expect } from "@std/expect";
import { Container, TokenNotFound } from "../src/mod.ts";
import { iLogger, Logger } from "./test-fixtures.ts";

Deno.test("getService returns last registered service", () => {
  const container = new Container();
  const logger1 = new Logger();
  const logger2 = new Logger();

  container.addTransient(iLogger, { useValue: logger1 });
  container.addTransient(iLogger, { useValue: logger2 });

  const service = container.getService(iLogger);
  expect(service).toBe(logger2); // Should return the last registered
});

Deno.test("getServices returns all registered services", () => {
  const container = new Container();
  const logger1 = new Logger();
  const logger2 = new Logger();

  container.addTransient(iLogger, { useValue: logger1 });
  container.addTransient(iLogger, { useValue: logger2 });

  const services = container.getServices(iLogger);
  expect(services).toHaveLength(2);
  expect(services[0]).toBe(logger1);
  expect(services[1]).toBe(logger2);
});

Deno.test("getService with unregistered constructor creates instance", () => {
  const container = new Container();

  const service = container.getService(Logger);
  expect(service).toBeInstanceOf(Logger);
});

Deno.test("getService with unregistered Type token throws error", () => {
  const container = new Container();

  expect(() => container.getService(iLogger)).toThrow(TokenNotFound);
});
