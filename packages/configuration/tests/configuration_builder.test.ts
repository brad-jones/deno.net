import { expect } from "@std/expect";
import { Container } from "@brad-jones/deno-net-container";
import {
  ConfigurationBuilder,
  type ConfigurationModule,
  EnvironmentSource,
  IConfiguration,
  type OptionsFunction,
} from "../src/mod.ts";

Deno.test("ConfigurationBuilder - constructor registers IConfiguration", () => {
  const container = new Container();
  new ConfigurationBuilder(container);

  // Verify IConfiguration is registered
  const config = container.getService(IConfiguration);
  expect(config).toBeDefined();
});

Deno.test("ConfigurationBuilder - fromSource registers configuration source", () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  builder.fromSource(EnvironmentSource);

  // Verify source is registered (we can't easily test this without exposing internals)
  const config = container.getService(IConfiguration);
  expect(config).toBeDefined();
});

Deno.test("ConfigurationBuilder - fromEnv registers EnvironmentSource", () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  const result = builder.fromEnv();

  // Should return the builder for chaining
  expect(result).toBe(builder);
});

Deno.test("ConfigurationBuilder - configureOptions registers options function", () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  const mockOptionsFunction: OptionsFunction<{ test: string }> = (_config) => Promise.resolve({ test: "default" });

  const result = builder.configureOptions(mockOptionsFunction);

  // Should return the builder for chaining
  expect(result).toBe(builder);

  // Verify the options function is registered
  const resolvedOptions = container.getService(mockOptionsFunction);
  expect(resolvedOptions).toBeDefined();
});

Deno.test("ConfigurationBuilder - fromModule executes configuration module", () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  let moduleExecuted = false;
  const mockModule: ConfigurationModule = (builderArg, containerArg) => {
    moduleExecuted = true;
    expect(builderArg).toBe(builder);
    expect(containerArg).toBe(container);
  };

  const result = builder.fromModule(mockModule);

  // Should return the builder for chaining
  expect(result).toBe(builder);
  // Module should have been executed
  expect(moduleExecuted).toBe(true);
});

Deno.test("ConfigurationBuilder - method chaining works", () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  const mockOptionsFunction: OptionsFunction<{ test: string }> = (_config) => Promise.resolve({ test: "default" });
  const mockModule: ConfigurationModule = () => {};

  // All methods should return the builder for chaining
  const result = builder
    .fromEnv()
    .fromSource(EnvironmentSource)
    .configureOptions(mockOptionsFunction)
    .fromModule(mockModule);

  expect(result).toBe(builder);
});
