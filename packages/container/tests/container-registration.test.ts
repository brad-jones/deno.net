import { expect } from "@std/expect";
import { Container } from "../src/mod.ts";
import { factoryFunction, getFactoryCallCount, iLogger, Logger, resetFactoryCallCount } from "./test-fixtures.ts";

Deno.test("addTransient with class constructor", () => {
  const container = new Container();
  container.addTransient(Logger);

  const service1 = container.getService(Logger);
  const service2 = container.getService(Logger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).not.toBe(service2); // Different instances
});

Deno.test("addTransient with token and class", () => {
  const container = new Container();
  container.addTransient(iLogger, Logger);

  const service1 = container.getService(iLogger);
  const service2 = container.getService(iLogger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).not.toBe(service2); // Different instances
});

Deno.test("addTransient with token and useValue provider", () => {
  const container = new Container();
  const loggerInstance = new Logger();
  container.addTransient(iLogger, { useValue: loggerInstance });

  const service1 = container.getService(iLogger);
  const service2 = container.getService(iLogger);

  expect(service1).toBe(loggerInstance);
  expect(service2).toBe(loggerInstance); // Same instance because useValue is always singleton
});

Deno.test("addTransient with token and useClass provider", () => {
  const container = new Container();
  container.addTransient(iLogger, { useClass: Logger });

  const service1 = container.getService(iLogger);
  const service2 = container.getService(iLogger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).not.toBe(service2); // Different instances
});

Deno.test("addTransient with token and useFactory provider", () => {
  const container = new Container();
  resetFactoryCallCount();
  container.addTransient(iLogger, { useFactory: factoryFunction });

  const service1 = container.getService(iLogger);
  const service2 = container.getService(iLogger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).not.toBe(service2); // Different instances
  expect(getFactoryCallCount()).toBe(2); // Factory called twice
});

Deno.test("addTransient with token and factory function", () => {
  const container = new Container();
  resetFactoryCallCount();
  container.addTransient(iLogger, factoryFunction);

  const service1 = container.getService(iLogger);
  const service2 = container.getService(iLogger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).not.toBe(service2); // Different instances
  expect(getFactoryCallCount()).toBe(2); // Factory called twice
});

Deno.test("addScoped creates one instance per container", () => {
  const container = new Container();
  container.addScoped(Logger);

  const service1 = container.getService(Logger);
  const service2 = container.getService(Logger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).toBe(service2); // Same instance within container
});

Deno.test("addScoped with factory is called once per container", () => {
  const container = new Container();
  resetFactoryCallCount();
  container.addScoped(iLogger, factoryFunction);

  const service1 = container.getService(iLogger);
  const service2 = container.getService(iLogger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).toBe(service2); // Same instance
  expect(getFactoryCallCount()).toBe(1); // Factory called only once
});

Deno.test("addScoped creates different instances for different containers", () => {
  const container1 = new Container();
  const container2 = new Container();

  container1.addScoped(Logger);
  container2.addScoped(Logger);

  const service1 = container1.getService(Logger);
  const service2 = container2.getService(Logger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).not.toBe(service2); // Different instances for different containers
});

Deno.test("addSingleton creates one instance per container root", () => {
  const container1 = new Container();
  const container2 = new Container();

  container1.addSingleton(Logger);
  container2.addSingleton(Logger);

  const service1 = container1.getService(Logger);
  const service2 = container2.getService(Logger);
  const service3 = container1.getService(Logger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service3).toBeInstanceOf(Logger);
  expect(service1).not.toBe(service2); // Different instances across unrelated containers
  expect(service1).toBe(service3); // Same instance within same container
});

Deno.test("addSingleton with factory is called once per container root", () => {
  const container1 = new Container();
  const container2 = new Container();

  resetFactoryCallCount();
  container1.addSingleton(iLogger, factoryFunction);
  container2.addSingleton(iLogger, factoryFunction);

  const service1 = container1.getService(iLogger);
  const service2 = container2.getService(iLogger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service1).not.toBe(service2); // Different instances across unrelated containers
  expect(getFactoryCallCount()).toBe(2); // Factory called once per container root
});

Deno.test("addSingleton creates same instance within same container", () => {
  const container = new Container();

  resetFactoryCallCount();
  container.addSingleton(iLogger, factoryFunction);

  const service1 = container.getService(iLogger);
  const service2 = container.getService(iLogger);
  const service3 = container.getService(iLogger);

  expect(service1).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service3).toBeInstanceOf(Logger);
  expect(service1).toBe(service2); // Same instance within container
  expect(service1).toBe(service3); // Same instance within container
  expect(getFactoryCallCount()).toBe(1); // Factory called only once
});

Deno.test("addSingleton creates separate instances for unrelated containers", () => {
  const container1 = new Container();
  const container2 = new Container();
  const container3 = new Container();

  resetFactoryCallCount();
  container1.addSingleton(iLogger, factoryFunction);
  container2.addSingleton(iLogger, factoryFunction);
  container3.addSingleton(iLogger, factoryFunction);

  const service1a = container1.getService(iLogger);
  const service1b = container1.getService(iLogger); // Same container
  const service2 = container2.getService(iLogger);
  const service3 = container3.getService(iLogger);

  expect(service1a).toBeInstanceOf(Logger);
  expect(service1b).toBeInstanceOf(Logger);
  expect(service2).toBeInstanceOf(Logger);
  expect(service3).toBeInstanceOf(Logger);

  // Same instance within same container
  expect(service1a).toBe(service1b);

  // Different instances across different containers
  expect(service1a).not.toBe(service2);
  expect(service1a).not.toBe(service3);
  expect(service2).not.toBe(service3);

  expect(getFactoryCallCount()).toBe(3); // Factory called once per container
});
