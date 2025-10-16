// deno-lint-ignore-file no-explicit-any

import { expandGlob } from "@std/fs";
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
   * Configuration sources are processed in reverse order of registration,
   * so sources registered earlier will override values from later sources.
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
