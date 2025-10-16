import { expect } from "@std/expect";
import { Container } from "../src/mod.ts";

// Test functions that return different types
const createDate = () => new Date();
const createNumber = () => Math.random();
const createString = () => `test-${Math.random()}`;
const createObject = () => ({ id: Math.random(), name: "test" });

// Test function with parameters (should work with injectable functions)
const createCounter = (start: number = 0) => {
  let count = start;
  return {
    increment: () => ++count,
    get value() {
      return count;
    },
  };
};

// Function that returns a complex object
const createLogger = () => ({
  logs: [] as string[],
  log: function (message: string) {
    this.logs.push(message);
  },
});

Deno.test("addTransient with injectable function - creates new instances each time", () => {
  const container = new Container();
  container.addTransient(createDate);

  const date1 = container.getService(createDate);
  const date2 = container.getService(createDate);

  expect(date1).toBeInstanceOf(Date);
  expect(date2).toBeInstanceOf(Date);
  expect(date1).not.toBe(date2); // Different instances
});

Deno.test("addTransient with injectable function - different primitive values", () => {
  const container = new Container();
  container.addTransient(createNumber);

  const num1 = container.getService(createNumber);
  const num2 = container.getService(createNumber);

  expect(typeof num1).toBe("number");
  expect(typeof num2).toBe("number");
  // Numbers should be different due to Math.random()
  expect(num1).not.toBe(num2);
});

Deno.test("addTransient with injectable function - string values", () => {
  const container = new Container();
  container.addTransient(createString);

  const str1 = container.getService(createString);
  const str2 = container.getService(createString);

  expect(typeof str1).toBe("string");
  expect(typeof str2).toBe("string");
  expect(str1).toMatch(/^test-/);
  expect(str2).toMatch(/^test-/);
  expect(str1).not.toBe(str2); // Different random strings
});

Deno.test("addTransient with injectable function - object values", () => {
  const container = new Container();
  container.addTransient(createObject);

  const obj1 = container.getService(createObject);
  const obj2 = container.getService(createObject);

  expect(obj1).toEqual({ id: expect.any(Number), name: "test" });
  expect(obj2).toEqual({ id: expect.any(Number), name: "test" });
  expect(obj1).not.toBe(obj2); // Different instances
  expect(obj1.id).not.toBe(obj2.id); // Different IDs
});

Deno.test("addScoped with injectable function - same instance within scope", () => {
  const container = new Container();
  container.addScoped(createDate);

  const date1 = container.getService(createDate);
  const date2 = container.getService(createDate);

  expect(date1).toBeInstanceOf(Date);
  expect(date2).toBeInstanceOf(Date);
  expect(date1).toBe(date2); // Same instance within scope
});

Deno.test("addScoped with injectable function - different instances in different scopes", () => {
  const parentContainer = new Container();
  parentContainer.addScoped(createDate);

  const childContainer1 = parentContainer.createChild();
  const childContainer2 = parentContainer.createChild();

  const date1 = childContainer1.getService(createDate);
  const date2 = childContainer2.getService(createDate);

  expect(date1).toBeInstanceOf(Date);
  expect(date2).toBeInstanceOf(Date);
  expect(date1).not.toBe(date2); // Different instances in different scopes
});

Deno.test("addScoped with injectable function - complex object caching", () => {
  const container = new Container();
  container.addScoped(createLogger);

  const logger1 = container.getService(createLogger);
  const logger2 = container.getService(createLogger);

  expect(logger1).toBe(logger2); // Same instance

  logger1.log("test message");
  expect(logger2.logs).toEqual(["test message"]); // Shared state
});

Deno.test("addSingleton with injectable function - same instance globally", () => {
  const container = new Container();
  container.addSingleton(createDate);

  const date1 = container.getService(createDate);
  const date2 = container.getService(createDate);

  expect(date1).toBeInstanceOf(Date);
  expect(date2).toBeInstanceOf(Date);
  expect(date1).toBe(date2); // Same instance
});

Deno.test("addSingleton with injectable function - same instance across child containers", () => {
  const parentContainer = new Container();
  parentContainer.addSingleton(createDate);

  const childContainer1 = parentContainer.createChild();
  const childContainer2 = parentContainer.createChild();

  const date1 = childContainer1.getService(createDate);
  const date2 = childContainer2.getService(createDate);
  const date3 = parentContainer.getService(createDate);

  expect(date1).toBe(date2); // Same instance across children
  expect(date1).toBe(date3); // Same instance as parent
});

Deno.test("addSingleton with injectable function - shared state across containers", () => {
  const parentContainer = new Container();
  parentContainer.addSingleton(createLogger);

  const childContainer = parentContainer.createChild();

  const logger1 = parentContainer.getService(createLogger);
  const logger2 = childContainer.getService(createLogger);

  expect(logger1).toBe(logger2); // Same instance

  logger1.log("parent message");
  logger2.log("child message");

  expect(logger1.logs).toEqual(["parent message", "child message"]);
  expect(logger2.logs).toEqual(["parent message", "child message"]);
});

Deno.test("injectable function with parameters - transient scope", () => {
  const container = new Container();
  container.addTransient(createCounter);

  // Test with parameters
  const counter1 = container.getService(createCounter, 123);
  const counter2 = container.getService(createCounter, 456);

  expect(counter1).not.toBe(counter2); // Different instances
  expect(counter1.value).toBe(123); // Should start with the passed parameter
  expect(counter2.value).toBe(456); // Should start with the passed parameter

  counter1.increment();
  expect(counter1.value).toBe(124); // Should increment from 123
  expect(counter2.value).toBe(456); // Separate state, unchanged

  // Test without parameters (using default)
  const counter3 = container.getService(createCounter);
  expect(counter3.value).toBe(0); // Should use default parameter
});

Deno.test("injectable function with parameters - scoped", () => {
  const container = new Container();
  container.addScoped(createCounter);

  // First call with parameter creates the cached instance
  const counter1 = container.getService(createCounter, 100);
  const counter2 = container.getService(createCounter, 200); // This should return the same instance

  expect(counter1).toBe(counter2); // Same instance in scope
  expect(counter1.value).toBe(100); // Should use the first call's parameter
  expect(counter2.value).toBe(100); // Same instance, so same value

  counter1.increment();
  expect(counter1.value).toBe(101);
  expect(counter2.value).toBe(101); // Shared state
});

Deno.test("injectable function with parameters - singleton", () => {
  const container = new Container();
  container.addSingleton(createCounter);

  // First call with parameter creates the singleton instance
  const counter1 = container.getService(createCounter, 500);
  const counter2 = container.getService(createCounter, 600); // This should return the same instance

  expect(counter1).toBe(counter2); // Same instance globally
  expect(counter1.value).toBe(500); // Should use the first call's parameter
  expect(counter2.value).toBe(500); // Same instance, so same value

  counter1.increment();
  counter2.increment();
  expect(counter1.value).toBe(502);
  expect(counter2.value).toBe(502); // Shared state
});

Deno.test("injectable function lifecycle comparison - basic usage example", () => {
  const foo = () => new Date();
  const container = new Container();
  container.addSingleton(foo);

  const a = container.getService(foo).valueOf();
  const b = container.getService(foo).valueOf();

  expect(a).toBe(b); // Same timestamp value due to singleton
});

Deno.test("injectable function lifecycle comparison - all scopes", () => {
  // Create separate functions to avoid registry conflicts
  const createDateTransient = () => new Date();
  const createDateScoped = () => new Date();
  const createDateSingleton = () => new Date();

  const container = new Container();

  container.addTransient(createDateTransient);
  container.addScoped(createDateScoped);
  container.addSingleton(createDateSingleton);

  // Transient - always different
  const transient1 = container.getService(createDateTransient);
  const transient2 = container.getService(createDateTransient);
  expect(transient1).not.toBe(transient2);

  // Scoped - same within container
  const scoped1 = container.getService(createDateScoped);
  const scoped2 = container.getService(createDateScoped);
  expect(scoped1).toBe(scoped2);

  // Singleton - same globally
  const singleton1 = container.getService(createDateSingleton);
  const singleton2 = container.getService(createDateSingleton);
  expect(singleton1).toBe(singleton2);
});

Deno.test("injectable function - complex return types", () => {
  const createComplexService = () => {
    const data = new Map<string, unknown>();
    return {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      data,
      methods: {
        addData: (key: string, value: unknown) => {
          data.set(key, value);
        },
      },
      async asyncMethod() {
        return await Promise.resolve("async result");
      },
    };
  };

  const container = new Container();
  container.addSingleton(createComplexService);

  const service1 = container.getService(createComplexService);
  const service2 = container.getService(createComplexService);

  expect(service1).toBe(service2); // Same instance for singleton
  expect(service1.id).toBe(service2.id); // Same UUID
  expect(service1.createdAt).toBe(service2.createdAt); // Same date object
  expect(service1.data).toBe(service2.data); // Same Map instance
});

Deno.test("injectable function - arrow function vs regular function", () => {
  const arrowFunction = () => ({ type: "arrow" });
  function regularFunction() {
    return { type: "regular" };
  }

  const container = new Container();
  container.addTransient(arrowFunction);
  container.addTransient(regularFunction);

  const arrowResult = container.getService(arrowFunction);
  const regularResult = container.getService(regularFunction);

  expect(arrowResult.type).toBe("arrow");
  expect(regularResult.type).toBe("regular");
});

Deno.test("injectable function - function returning functions", () => {
  const createHandler = () => {
    let callCount = 0;
    return () => {
      callCount++;
      return `Called ${callCount} times`;
    };
  };

  const container = new Container();
  container.addSingleton(createHandler);

  const handler1 = container.getService(createHandler);
  const handler2 = container.getService(createHandler);

  expect(handler1).toBe(handler2); // Same function instance

  expect(handler1()).toBe("Called 1 times");
  expect(handler1()).toBe("Called 2 times");
  expect(handler2()).toBe("Called 3 times"); // Shared closure state
});

Deno.test("injectable function with parameters - passing custom parameters", () => {
  const createCustomCounter = (initialValue: number, step: number = 1) => {
    let count = initialValue;
    return {
      increment: () => count += step,
      get value() {
        return count;
      },
    };
  };

  const container = new Container();
  container.addTransient(createCustomCounter);

  // Test with different parameter combinations
  const counter1 = container.getService(createCustomCounter, 100, 5);
  const counter2 = container.getService(createCustomCounter, 200, 10);
  const counter3 = container.getService(createCustomCounter, 50); // Uses default step of 1

  expect(counter1.value).toBe(100);
  expect(counter2.value).toBe(200);
  expect(counter3.value).toBe(50);

  counter1.increment();
  counter2.increment();
  counter3.increment();

  expect(counter1.value).toBe(105); // 100 + 5
  expect(counter2.value).toBe(210); // 200 + 10
  expect(counter3.value).toBe(51); // 50 + 1
});
