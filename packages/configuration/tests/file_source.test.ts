import { join } from "@std/path";
import { expect } from "@std/expect";
import { Container } from "@brad-jones/deno-net-container";
import { FileSource } from "../src/sources/file_source.ts";
import { IConfiguration } from "../src/configuration_root.ts";
import { ConfigurationBuilder } from "../src/configuration_builder.ts";

const fixturesDir = join(import.meta.dirname!, "fixtures");

Deno.test("FileSource - reads JSON configuration", async () => {
  const source = new FileSource(join(fixturesDir, "test-config.json"));

  const databaseConfig = await source.read(["database"]);
  expect(databaseConfig).toEqual({
    host: "localhost",
    port: "5432",
    ssl: "true",
    timeout: "30",
  });

  const loggingConfig = await source.read(["logging"]);
  expect(loggingConfig).toEqual({
    level: "info",
    format: "json",
  });
});

Deno.test("FileSource - reads YAML configuration", async () => {
  const source = new FileSource(join(fixturesDir, "test-config.yaml"));

  const databaseConfig = await source.read(["database"]);
  expect(databaseConfig).toEqual({
    host: "yaml-host",
    port: "3306",
    ssl: "false",
  });

  const cacheConfig = await source.read(["cache"]);
  expect(cacheConfig).toEqual({
    redisUrl: "redis://localhost:6379",
    ttl: "3600",
  });
});

Deno.test("FileSource - reads TOML configuration", async () => {
  const source = new FileSource(join(fixturesDir, "test-config.toml"));

  const databaseConfig = await source.read(["database"]);
  expect(databaseConfig).toEqual({
    host: "toml-host",
    port: "5433",
    ssl: "true",
  });

  const serverConfig = await source.read(["server"]);
  expect(serverConfig).toEqual({
    port: "8080",
    workers: "4",
  });

  const featuresConfig = await source.read(["features"]);
  expect(featuresConfig).toEqual({
    enableAuth: "true",
    enableMetrics: "false",
  });
});

Deno.test("FileSource - handles non-existent file gracefully", async () => {
  const source = new FileSource(join(fixturesDir, "non-existent.json"));

  const config = await source.read(["database"]);
  expect(config).toEqual({});
});

Deno.test("FileSource - handles non-existent sections", async () => {
  const source = new FileSource(join(fixturesDir, "test-config.json"));

  const config = await source.read(["nonexistent"]);
  expect(config).toEqual({});

  const nestedConfig = await source.read(["database", "nonexistent"]);
  expect(nestedConfig).toEqual({});
});

Deno.test("FileSource - handles unsupported file format", async () => {
  // Create a temporary file with unsupported extension
  const testFile = join(fixturesDir, "test.txt");
  await Deno.writeTextFile(testFile, "some content");

  const source = new FileSource(testFile);

  const config = await source.read(["section"]);
  expect(config).toEqual({}); // Should return empty config on error

  // Cleanup
  await Deno.remove(testFile);
});

Deno.test("FileSource - caches file content", async () => {
  const source = new FileSource(join(fixturesDir, "test-config.json"));

  // First read
  const config1 = await source.read(["database"]);

  // Second read should use cached content
  const config2 = await source.read(["database"]);

  expect(config1).toEqual(config2);
  expect(config1).toEqual({
    host: "localhost",
    port: "5432",
    ssl: "true",
    timeout: "30",
  });
});

Deno.test("ConfigurationBuilder.fromFile - integrates with builder", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  builder.fromFile(join(fixturesDir, "test-config.json"));

  const config = container.getService(IConfiguration);

  const databaseConfig = await config.getSection(["database"]);
  expect(databaseConfig).toEqual({
    host: "localhost",
    port: "5432",
    ssl: "true",
    timeout: "30",
  });
});

Deno.test("ConfigurationBuilder.fromFile - supports chaining and precedence", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Register files in order - later should override earlier
  builder
    .fromFile(join(fixturesDir, "test-config.json")) // JSON: host="localhost"
    .fromFile(join(fixturesDir, "test-config.yaml")); // YAML: host="yaml-host"

  const config = container.getService(IConfiguration);

  const databaseConfig = await config.getSection(["database"]);

  // YAML should win for host (registered later)
  expect(databaseConfig.host).toBe("yaml-host");

  // JSON-only values should still be present
  expect(databaseConfig.timeout).toBe("30");

  // YAML values should be present
  expect(databaseConfig.port).toBe("3306"); // YAML overrides JSON
  expect(databaseConfig.ssl).toBe("false"); // YAML overrides JSON
});

Deno.test("ConfigurationBuilder.fromFile - works with multiple formats", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Chain multiple file formats
  builder
    .fromFile(join(fixturesDir, "test-config.json"))
    .fromFile(join(fixturesDir, "test-config.yaml"))
    .fromFile(join(fixturesDir, "test-config.toml"));

  const config = container.getService(IConfiguration);

  // Test that TOML (last registered) wins for database.host
  const databaseConfig = await config.getSection(["database"]);
  expect(databaseConfig.host).toBe("toml-host");

  // Test unique sections from each format
  const apiConfig = await config.getSection(["api"]);
  expect(apiConfig.endpoint).toBe("https://api.example.com"); // from JSON only

  const cacheConfig = await config.getSection(["cache"]);
  expect(cacheConfig.redisUrl).toBe("redis://localhost:6379"); // from YAML only

  const serverConfig = await config.getSection(["server"]);
  expect(serverConfig.port).toBe("8080"); // from TOML only
});

Deno.test("ConfigurationBuilder.fromFile - allowReloading=false (default) caches content", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Register without reloading (default behavior)
  builder.fromFile(join(fixturesDir, "test-config.json"));

  const config = container.getService(IConfiguration);

  // First read
  const config1 = await config.getSection(["database"]);

  // Second read from same service instance should use cached content
  const config2 = await config.getSection(["database"]);

  expect(config1).toEqual(config2);
  expect(config1).toEqual({
    host: "localhost",
    port: "5432",
    ssl: "true",
    timeout: "30",
  });
});

Deno.test("ConfigurationBuilder.fromFile - allowReloading=true creates new instances", async () => {
  const tempFile = join(fixturesDir, "reloading-test.json");

  // Create initial config file
  const initialConfig = {
    database: {
      host: "initial-host",
      port: 5432,
    },
  };
  await Deno.writeTextFile(tempFile, JSON.stringify(initialConfig, null, 2));

  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Register with reloading enabled (Transient scope)
  builder.fromFile(tempFile, { allowReloading: true });

  const config = container.getService(IConfiguration);

  // Read initial configuration
  const config1 = await config.getSection(["database"]);
  expect(config1).toEqual({
    host: "initial-host",
    port: "5432",
  });

  // Modify the file
  const updatedConfig = {
    database: {
      host: "updated-host",
      port: 3306,
    },
  };
  await Deno.writeTextFile(tempFile, JSON.stringify(updatedConfig, null, 2));

  // Get a new service instance (Transient scope creates new instances)
  const newConfig = container.getService(IConfiguration);

  // Read again - should pick up the changes because it's a new FileSource instance
  const config2 = await newConfig.getSection(["database"]);
  expect(config2).toEqual({
    host: "updated-host",
    port: "3306",
  });

  // Cleanup
  await Deno.remove(tempFile);
});
