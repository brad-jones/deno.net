import { expect } from "@std/expect";
import { Container } from "../src/mod.ts";
import { Database, iDatabase, iLogger, iPlugin, Logger, Plugin1, Plugin2, Service } from "./test-fixtures.ts";

Deno.test("nested dependency injection", () => {
  const container = new Container();

  const logger = new Logger();
  const database = new Database();
  container.addTransient(iLogger, { useValue: logger });
  container.addTransient(iDatabase, { useValue: database });

  const service = container.getService(Service);
  expect(service.logger).toBe(logger);
  expect(service.db).toBe(database);
});

Deno.test("mixed scopes work correctly", () => {
  const container = new Container();

  container.addSingleton(iLogger, Logger);
  container.addScoped(iDatabase, Database);
  container.addTransient(iPlugin, Plugin1);
  container.addTransient(iPlugin, Plugin2);

  const logger1 = container.getService(iLogger);
  const logger2 = container.getService(iLogger);
  expect(logger1).toBe(logger2); // Singleton

  const db1 = container.getService(iDatabase);
  const db2 = container.getService(iDatabase);
  expect(db1).toBe(db2); // Scoped

  const plugins1 = container.getServices(iPlugin);
  const plugins2 = container.getServices(iPlugin);
  expect(plugins1).toHaveLength(2);
  expect(plugins2).toHaveLength(2);
  expect(plugins1[0]).not.toBe(plugins2[0]); // Transient
  expect(plugins1[1]).not.toBe(plugins2[1]); // Transient
});

Deno.test("factory functions receive container parameter", () => {
  const container = new Container();
  let receivedContainer: Container | null = null;

  container.addTransient(iLogger, (c: Container) => {
    receivedContainer = c;
    return new Logger();
  });

  container.getService(iLogger);
  expect(receivedContainer).toBe(container);
});

Deno.test("complete DI setup with interfaces and multiple implementations", () => {
  // Scenario: A web application with multiple plugins and different service lifetimes
  const container = new Container();

  // Register core services as singletons
  container.addSingleton(iLogger, Logger);
  container.addSingleton(iDatabase, Database);

  // Register plugins as transients (each request gets new instances)
  container.addTransient(iPlugin, Plugin1);
  container.addTransient(iPlugin, Plugin2);

  // Register a scoped service that depends on plugins
  container.addScoped(iPlugin, () => new Plugin1()); // Add another plugin

  // Test that singletons are shared
  const logger1 = container.getService(iLogger);
  const logger2 = container.getService(iLogger);
  expect(logger1).toBe(logger2); // Same instance

  // Test that transients are different
  const plugins1 = container.getServices(iPlugin);
  const plugins2 = container.getServices(iPlugin);
  expect(plugins1).toHaveLength(3); // 2 transients + 1 scoped
  expect(plugins2).toHaveLength(3);
  expect(plugins1[0]).not.toBe(plugins2[0]); // Different transient instances
  expect(plugins1[1]).not.toBe(plugins2[1]); // Different transient instances
  expect(plugins2[2]).toBe(plugins2[2]); // Same scoped instance

  // Test child containers inherit configuration
  const childContainer = container.createChild();
  const childLogger = childContainer.getService(iLogger);
  expect(childLogger).toBe(logger1); // Shared singleton

  const childPlugins = childContainer.getServices(iPlugin);
  expect(childPlugins).toHaveLength(3);
  expect(childPlugins[2]).not.toBe(plugins1[2]); // Different scoped instance per container
});

Deno.test("factory with complex dependencies", () => {
  const container = new Container();

  // Setup dependencies
  container.addSingleton(iLogger, Logger);
  container.addSingleton(iDatabase, Database);

  // Factory that creates a service with dependencies resolved from container
  container.addTransient(iPlugin, (c: Container) => {
    const logger = c.getService(iLogger);
    const db = c.getService(iDatabase);

    // Return a custom plugin that has access to logger and db
    return {
      execute(): string {
        logger.log("Plugin executing");
        db.save("plugin data");
        return "custom-plugin-with-deps";
      },
    };
  });

  const plugin = container.getService(iPlugin);
  const result = plugin.execute();

  expect(result).toBe("custom-plugin-with-deps");
});
