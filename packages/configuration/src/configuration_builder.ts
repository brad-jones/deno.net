// deno-lint-ignore-file no-explicit-any

import { expandGlob } from "@std/fs";
import { FileSource } from "./sources/file_source.ts";
import { importModule } from "@brad-jones/jsr-dynamic-imports";
import { EnvironmentSource } from "./sources/environment_source.ts";
import { IConfigurationSource } from "./sources/configuration_source.ts";
import { ConfigurationRoot, IConfiguration } from "./configuration_root.ts";
import { type Constructor, type IContainer, Scope } from "@brad-jones/deno-net-container";

/**
 * A function type that represents a configuration module.
 * Configuration modules are used to encapsulate configuration setup logic.
 *
 * @param l - The ConfigurationBuilder instance
 * @param c - The dependency injection container
 */
export type ConfigurationModule = (l: ConfigurationBuilder, c: IContainer) => void;

/**
 * A function type that transforms raw configuration data into strongly typed options.
 * These functions typically use validation libraries like Zod to parse and validate configuration.
 *
 * @template T - The type of the parsed configuration object
 * @param config - Raw configuration data as key-value pairs
 * @returns The parsed and validated configuration object
 *
 * @example
 * ```typescript
 * const MyOptions = async (config = inject(IConfiguration)("MyOptions")) =>
 *   z.object({ foo: z.string() }).parse(await config);
 * ```
 */
export type OptionsFunction<T = any> = (config: Promise<Record<string, string>>) => Promise<T>;

/**
 * A builder class for configuring application configuration sources and options.
 *
 * The ConfigurationBuilder provides a fluent API for:
 * - Registering configuration sources (environment variables, files, etc.)
 * - Setting up strongly typed configuration options
 * - Loading configuration modules
 * - Integrating with dependency injection containers
 */
export class ConfigurationBuilder {
  /**
   * Creates a new ConfigurationBuilder instance.
   *
   * @param services - The dependency injection container to register services with
   */
  constructor(private services: IContainer) {
    // @ts-ignore: This is a callable class and actually does implement the interface
    this.services.addSingleton(IConfiguration, ConfigurationRoot);
  }

  /**
   * Registers a configuration source with the builder.
   *
   * Configuration sources are processed in registration order,
   * so sources registered later will override values from earlier sources.
   *
   * @param source - The constructor for the configuration source class
   * @param scope - The dependency injection scope (defaults to Singleton)
   * @returns The ConfigurationBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.fromSource(FileSource, Scope.Transient);
   * ```
   */
  fromSource(source: Constructor<IConfigurationSource>, scope?: Scope): this {
    this.services.add(scope ?? Scope.Singleton, IConfigurationSource, { useClass: source });
    return this;
  }

  /**
   * Registers the environment variables configuration source.
   *
   * This is a convenience method equivalent to calling `fromSource(EnvironmentSource)`.
   * Environment variables are read using a hierarchical naming convention where
   * sections are separated by double underscores.
   *
   * @returns The ConfigurationBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.fromEnv();
   * // Now environment variables like MY_APP__DATABASE_HOST can be read
   * // using config.getSection(["myApp", "database"]) -> { host: "..." }
   * ```
   */
  fromEnv(): this {
    return this.fromSource(EnvironmentSource);
  }

  /**
   * Registers a file-based configuration source.
   *
   * This method creates a configuration source that reads from a file in JSON, YAML, or TOML format.
   * The file format is automatically detected based on the file extension:
   * - `.json` - JSON format
   * - `.yaml`, `.yml` - YAML format
   * - `.toml` - TOML format
   *
   * By default, the file is loaded and parsed once, then cached for subsequent reads (Singleton scope).
   * When `allowReloading` is true, the source is registered as Transient, allowing runtime configuration updates.
   * If the file doesn't exist or cannot be parsed, the source will return empty configuration.
   *
   * @param filePath - Absolute or relative path to the configuration file
   * @param options.allowReloading - Whether to allow runtime reloading (defaults to false for performance)
   * @returns The ConfigurationBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Load from JSON file (cached, high performance)
   * builder.fromFile("./config/app.json");
   *
   * // Load with reloading enabled (allows runtime updates)
   * builder.fromFile("./config/dynamic.json", { allowReloading: true });
   *
   * // Load from YAML file
   * builder.fromFile("./config/database.yaml");
   *
   * // Load from TOML file
   * builder.fromFile("./config/server.toml");
   *
   * // Chaining with precedence (TOML overrides YAML overrides JSON)
   * builder
   *   .fromFile("./config/defaults.json")
   *   .fromFile("./config/environment.yaml")
   *   .fromFile("./config/local.toml", { allowReloading: true }); // Only local config allows reloading
   * ```
   */
  fromFile(filePath: string, options?: { allowReloading?: boolean }): this {
    return this.fromSource(
      class extends FileSource {
        constructor() {
          super(filePath);
        }
      },
      options?.allowReloading ? Scope.Transient : Scope.Singleton,
    );
  }

  /**
   * Registers an object-based configuration source.
   *
   * This method creates a configuration source from a plain JavaScript object.
   * It's particularly useful for testing scenarios where you want to override
   * configuration values or provide mock configuration data.
   *
   * The object structure should match the hierarchical section structure,
   * and all values will be converted to strings as required by the configuration system.
   *
   * @param source - A plain object containing configuration data
   * @returns The ConfigurationBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Override configuration for testing
   * builder.fromObject({
   *   database: {
   *     host: "localhost",
   *     port: 5432,
   *     ssl: false
   *   },
   *   api: {
   *     endpoint: "https://test-api.example.com"
   *   }
   * });
   *
   * // Later access with: config.getSection(["database"]) -> { host: "localhost", port: "5432", ssl: "false" }
   * ```
   */
  fromObject(source: Record<string, unknown>): this {
    return this.fromSource(
      class implements IConfigurationSource {
        read(section: string[]): Promise<Record<string, string>> {
          if (section.length === 0) {
            // Return all top-level keys as strings
            const result: Record<string, string> = {};
            for (const [key, value] of Object.entries(source)) {
              if (typeof value === "string") {
                result[key] = value;
              } else if (value !== null && value !== undefined) {
                result[key] = String(value);
              }
            }
            return Promise.resolve(result);
          }

          // Navigate through the object hierarchy using the section path
          let current: any = source;
          for (const sectionName of section) {
            if (current && typeof current === "object" && sectionName in current) {
              current = current[sectionName];
            } else {
              return Promise.resolve({}); // Section not found
            }
          }

          // If we found the section, flatten it to string key-value pairs
          if (current && typeof current === "object" && !Array.isArray(current)) {
            const result: Record<string, string> = {};
            for (const [key, value] of Object.entries(current)) {
              if (typeof value === "string") {
                result[key] = value;
              } else if (value !== null && value !== undefined) {
                result[key] = String(value);
              }
            }
            return Promise.resolve(result);
          }

          return Promise.resolve({});
        }
      },
    );
  }

  /**
   * Registers a strongly typed options function with the dependency injection container.
   *
   * The options function should take raw configuration data and return a parsed,
   * validated configuration object. This is typically done using validation libraries
   * like Zod, Joi, or similar.
   *
   * @param optionsFunc - The function that parses raw config into typed options
   * @param scope - The dependency injection scope (defaults to Singleton)
   * @returns The ConfigurationBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const DatabaseOptions = async (config = inject(IConfiguration)("database")) =>
   *   z.object({ host: z.string(), port: z.number() }).parse(await config);
   *
   * builder.configureOptions(DatabaseOptions);
   *
   * // Later, inject DatabaseOptions into your services
   * class DatabaseService {
   *   constructor(private options = inject(DatabaseOptions)) {}
   *
   *   async connect() {
   *     // Options will need to be awaited as they may come from
   *     // sources that requires async I/O to read the values.
   *     const { host, port } = await this.options;
   *   }
   * }
   * ```
   */
  configureOptions(optionsFunc: OptionsFunction, scope?: Scope): this {
    this.services.add(scope ?? Scope.Singleton, optionsFunc, { useFunc: optionsFunc });
    return this;
  }

  /**
   * Loads configuration from a configuration module.
   *
   * Configuration modules are functions that encapsulate configuration setup logic.
   * They receive the ConfigurationBuilder and container instances and can perform
   * any configuration setup operations.
   *
   * @param module - The configuration module function to execute
   * @returns The ConfigurationBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const databaseModule: ConfigurationModule = (builder, container) => {
   *   builder.configureOptions(DatabaseOptions);
   *   container.addSingleton(DatabaseService);
   * };
   *
   * builder.fromModule(databaseModule);
   * ```
   */
  fromModule(module: ConfigurationModule): this {
    module(this, this.services);
    return this;
  }

  /**
   * Loads configuration modules from files matching a glob pattern.
   *
   * This method dynamically imports all modules matching the provided glob pattern
   * and executes their default export as a configuration module. This is useful
   * for organizing configuration into multiple files and loading them automatically.
   *
   * @param glob - A glob pattern to match configuration module files
   * @returns A Promise that resolves when all modules have been loaded
   *
   * @example
   * ```typescript
   * // Load all .config.ts files from the config directory
   * await builder.fromModules("./config/*.config.ts");
   *
   * // Example module file: config/database.config.ts
   * export default (builder: ConfigurationBuilder, container: IContainer) => {
   *   builder.configureOptions(DatabaseOptions);
   * };
   * ```
   */
  async fromModules(glob: string): Promise<void> {
    for await (const entry of expandGlob(glob)) {
      if (entry.isFile) {
        const module = await importModule(entry.path);
        this.fromModule(module["default"] as ConfigurationModule);
      }
    }
  }
}
