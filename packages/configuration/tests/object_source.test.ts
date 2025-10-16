import { expect } from "@std/expect";
import { Container, inject } from "@brad-jones/deno-net-container";
import { ConfigurationBuilder } from "../src/configuration_builder.ts";
import { IConfiguration } from "../src/configuration_root.ts";
import { EnvironmentSource } from "../src/sources/environment_source.ts";

Deno.test("fromObject - reads nested object configuration", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  const testConfig = {
    database: {
      host: "localhost",
      port: 5432,
      ssl: true,
    },
    api: {
      endpoint: "https://api.example.com",
      timeout: 30000,
    },
  };

  builder.fromObject(testConfig);

  const config = container.getService(IConfiguration);

  const databaseConfig = await config.getSection(["database"]);
  expect(databaseConfig).toEqual({
    host: "localhost",
    port: "5432",
    ssl: "true",
  });

  const apiConfig = await config.getSection(["api"]);
  expect(apiConfig).toEqual({
    endpoint: "https://api.example.com",
    timeout: "30000",
  });
});

Deno.test("fromObject - handles top-level configuration", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  const testConfig = {
    appName: "MyApp",
    version: "1.0.0",
    debug: false,
  };

  builder.fromObject(testConfig);

  const config = container.getService(IConfiguration);

  const topLevelConfig = await config.getSection([]);
  expect(topLevelConfig).toEqual({
    appName: "MyApp",
    version: "1.0.0",
    debug: "false",
  });
});

Deno.test("fromObject - returns empty object for non-existent sections", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  builder.fromObject({
    database: { host: "localhost" },
  });

  const config = container.getService(IConfiguration);

  const nonExistentConfig = await config.getSection(["nonexistent"]);
  expect(nonExistentConfig).toEqual({});

  const deepNonExistentConfig = await config.getSection(["database", "nonexistent"]);
  expect(deepNonExistentConfig).toEqual({});
});

Deno.test("fromObject - handles null and undefined values", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  const testConfig = {
    section: {
      validValue: "test",
      nullValue: null,
      undefinedValue: undefined,
      emptyString: "",
      zero: 0,
    },
  };

  builder.fromObject(testConfig);

  const config = container.getService(IConfiguration);

  const sectionConfig = await config.getSection(["section"]);
  expect(sectionConfig).toEqual({
    validValue: "test",
    emptyString: "",
    zero: "0",
    // nullValue and undefinedValue should be excluded
  });
});

Deno.test("fromObject - works with source precedence (last registered wins)", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Register sources in order - last should win
  builder.fromObject({
    shared: {
      value: "from-first-source",
      onlyInFirst: "first",
    },
  });

  builder.fromObject({
    shared: {
      value: "from-second-source",
      onlyInSecond: "second",
    },
  });

  const config = container.getService(IConfiguration);

  const sharedConfig = await config.getSection(["shared"]);
  expect(sharedConfig).toEqual({
    value: "from-second-source", // Second source wins
    onlyInFirst: "first",
    onlyInSecond: "second",
  });
});

Deno.test("fromObject - perfect for testing overrides", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Setup environment first
  Deno.env.set("DATABASE__HOST", "prod-host");
  Deno.env.set("DATABASE__PORT", "5432");

  builder.fromEnv();

  // Override with test config - should win because it's registered last
  builder.fromObject({
    database: {
      host: "test-host",
      timeout: "5000",
    },
  });

  const config = container.getService(IConfiguration);
  const dbConfig = await config.getSection(["database"]);

  // Test override should win for host, env should provide port
  expect(dbConfig.host).toBe("test-host"); // fromObject wins
  expect(dbConfig.port).toBe("5432"); // from env
  expect(dbConfig.timeout).toBe("5000"); // fromObject only

  // Cleanup
  Deno.env.delete("DATABASE__HOST");
  Deno.env.delete("DATABASE__PORT");
});

Deno.test("fromObject - integration with strongly typed options", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Base configuration
  builder.fromObject({
    server: {
      port: "3000",
      host: "localhost",
      ssl: "false",
    },
  });

  // Test overrides
  builder.fromObject({
    server: {
      port: "8080",
      ssl: "true",
    },
  });

  // Define strongly typed options
  const ServerOptions = async (config = inject(IConfiguration)("server")) => {
    const raw = await config;
    return {
      port: parseInt(raw.port || "3000"),
      host: raw.host || "localhost",
      ssl: raw.ssl === "true",
      workers: parseInt(raw.workers || "1"),
    };
  };

  builder.configureOptions(ServerOptions);

  const options = await container.getService(ServerOptions);

  // Verify overrides took effect
  expect(options).toEqual({
    port: 8080, // overridden by second fromObject
    host: "localhost", // from first fromObject
    ssl: true, // overridden by second fromObject
    workers: 1, // default value
  });
});
