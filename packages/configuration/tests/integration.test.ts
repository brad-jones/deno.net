import { expect } from "@std/expect";
import { Container, inject } from "@brad-jones/deno-net-container";
import { ConfigurationBuilder } from "../src/configuration_builder.ts";
import { IConfiguration } from "../src/configuration_root.ts";
import type { IConfigurationSource } from "../src/sources/configuration_source.ts";

/**
 * Mock file-based configuration source
 */
class FileConfigurationSource implements IConfigurationSource {
  read(section: string[]): Promise<Record<string, string>> {
    const key = section.join(".");

    // Simulate a config file with default values
    const fileConfig: Record<string, Record<string, string>> = {
      "database": {
        host: "config-file-host",
        port: "3306",
        username: "config-user",
        timeout: "30",
      },
      "logging": {
        level: "info",
        format: "json",
      },
    };

    return Promise.resolve(fileConfig[key] || {});
  }
}

/**
 * Mock environment-specific configuration source
 */
class EnvironmentConfigurationSource implements IConfigurationSource {
  read(section: string[]): Promise<Record<string, string>> {
    const key = section.join(".");

    // Simulate environment variables that should override file config
    const envConfig: Record<string, Record<string, string>> = {
      "database": {
        host: "env-override-host", // This should win over file config
        password: "env-secret-password", // This is only in env
      },
      "logging": {
        level: "debug", // This should override file config
      },
    };

    return Promise.resolve(envConfig[key] || {});
  }
}

Deno.test("ConfigurationBuilder - real-world layered configuration scenario", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Setup typical configuration layering:
  // 1. First register file source (defaults)
  // 2. Then register environment source (overrides)
  // This means environment should win over file for conflicting keys
  builder
    .fromSource(FileConfigurationSource) // Registered first = lower precedence
    .fromSource(EnvironmentConfigurationSource); // Registered second = higher precedence

  const config = container.getService(IConfiguration);

  // Test database configuration merging
  const dbConfig = await config.getSection("database");

  console.log("Database config result:", dbConfig);

  // Environment source should win for host (last registered = higher precedence)
  expect(dbConfig.host).toBe("env-override-host");

  // Values unique to each source should all be present
  expect(dbConfig.port).toBe("3306"); // from file only
  expect(dbConfig.username).toBe("config-user"); // from file only
  expect(dbConfig.timeout).toBe("30"); // from file only
  expect(dbConfig.password).toBe("env-secret-password"); // from env only

  // Test logging configuration
  const logConfig = await config.getSection("logging");

  console.log("Logging config result:", logConfig);

  // Environment source should win for level (last registered = higher precedence)
  expect(logConfig.level).toBe("debug");
  expect(logConfig.format).toBe("json"); // from file only
});

Deno.test("ConfigurationBuilder - options function integration with layered config", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Setup sources: file first (lower precedence), then env
  builder
    .fromSource(FileConfigurationSource)
    .fromSource(EnvironmentConfigurationSource);

  // Define strongly typed options
  const DatabaseOptions = async (config = inject(IConfiguration)("database")) => {
    const raw = await config;
    return {
      host: raw.host || "localhost",
      port: parseInt(raw.port || "5432"),
      username: raw.username || "user",
      password: raw.password || "defaultpass",
      timeout: parseInt(raw.timeout || "10"),
    };
  };

  builder.configureOptions(DatabaseOptions);

  const options = await container.getService(DatabaseOptions);

  console.log("Parsed database options:", options);

  // Verify the layered configuration is properly parsed
  expect(options).toEqual({
    host: "env-override-host", // from env (higher precedence)
    port: 3306, // from file, parsed as number
    username: "config-user", // from file
    password: "env-secret-password", // from env (only source)
    timeout: 30, // from file, parsed as number
  });
});

Deno.test("ConfigurationBuilder - demonstrate typical application setup", async () => {
  const container = new Container();
  const builder = new ConfigurationBuilder(container);

  // Typical real-world scenario:
  // 1. Load defaults from file/embedded config (lower precedence)
  // 2. Load environment-specific overrides (higher precedence)

  builder
    .fromSource(FileConfigurationSource) // Defaults - lower precedence
    .fromSource(EnvironmentConfigurationSource); // Overrides - should win conflicts

  // Define application options
  const AppOptions = async (config = inject(IConfiguration)("logging")) => {
    const raw = await config;
    return {
      logLevel: raw.level || "warn",
      logFormat: raw.format || "text",
      enableDebug: raw.level === "debug",
    };
  };

  builder.configureOptions(AppOptions);

  const appOptions = await container.getService(AppOptions);

  // Environment config should take precedence
  expect(appOptions.logLevel).toBe("debug"); // from env, overriding file's "info"
  expect(appOptions.logFormat).toBe("json"); // from file only
  expect(appOptions.enableDebug).toBe(true); // derived from env's "debug" level
});
