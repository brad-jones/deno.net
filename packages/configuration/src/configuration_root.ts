import { inject, Type } from "@brad-jones/deno-net-container";
import { IConfigurationSource } from "./sources/configuration_source.ts";

/**
 * Dependency injection token for IConfiguration.
 * Use this token to inject the configuration service into your classes.
 */
export const IConfiguration: Type<IConfiguration> = new Type<IConfiguration>("IConfiguration");

/**
 * Interface for the main configuration service.
 * This interface provides both callable and method-based access to configuration data.
 *
 * Configuration sections are hierarchical and can be accessed using either:
 * - Dot notation as a string: "myApp.database.host"
 * - Array notation: ["myApp", "database", "host"]
 *
 * @example
 * ```typescript
 * // Inject the configuration service
 * class MyService {
 *   constructor(private config = inject(IConfiguration)) {}
 *
 *   async init() {
 *     // Using callable interface
 *     const dbConfig = await this.config("myApp.database");
 *
 *     // Using method interface
 *     const dbConfig2 = await this.config.getSection(["myApp", "database"]);
 *   }
 * }
 * ```
 */
export type IConfiguration =
  & ((section: string | string[]) => Promise<Record<string, string>>)
  & { getSection(section: string | string[]): Promise<Record<string, string>> };

/**
 * Base class that enables creating classes that can be called as functions.
 *
 * This is used to implement the IConfiguration interface where the same object
 * can be both called as a function and have methods called on it.
 *
 * @internal
 */
class CallableClass extends Function {
  // @ts-ignore: https://stackoverflow.com/a/36871498
  // deno-lint-ignore no-explicit-any
  constructor(f: (...args: any[]) => any) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

/**
 * The main configuration service implementation that aggregates values from multiple sources.
 *
 * This class implements both the callable and method-based interfaces of IConfiguration.
 * It reads configuration values from all registered sources and merges them together,
 * with later registered sources taking precedence over earlier ones.
 *
 * The class uses a callable pattern where it can be invoked directly as a function
 * while also exposing methods. This provides a convenient API for accessing configuration.
 *
 * Configuration values are not cached, allowing for runtime reloading when sources
 * are registered with appropriate dependency injection scopes.
 *
 * @example
 * ```typescript
 * // As a callable
 * const dbConfig = await config("database");
 *
 * // As a method
 * const dbConfig = await config.getSection(["database"]);
 * ```
 */
// @ts-ignore: This is a callable class and actually does implement the interface
export class ConfigurationRoot extends CallableClass implements IConfiguration {
  /**
   * Creates a new ConfigurationRoot instance.
   *
   * @param sources - Array of configuration sources injected by the DI container
   */
  constructor(
    private sources: () => IConfigurationSource[] = inject(IConfigurationSource, { multi: true, lazy: true }),
  ) {
    super((section: string | string[]) => this.getSection(section));
  }

  /**
   * Retrieves configuration values for a specific section from all registered sources.
   *
   * @param section - The configuration section to retrieve, either as a dot-separated
   *                  string ("app.database") or an array of parts (["app", "database"])
   * @returns A Promise that resolves to a record of configuration key-value pairs
   *
   * @example
   * ```typescript
   * // Using dot notation
   * const dbConfig = await config.getSection("myApp.database");
   * // Returns: { host: "localhost", port: "5432", ... }
   *
   * // Using array notation
   * const dbConfig = await config.getSection(["myApp", "database"]);
   * // Returns the same result
   * ```
   */
  async getSection(section: string | string[]): Promise<Record<string, string>> {
    const resolvedSection = this.#resolveDotNotation(section);

    let values: Record<string, string> = {};
    for (const source of this.sources()) {
      values = { ...values, ...await source.read(resolvedSection) };
    }

    return values;
  }

  /**
   * Converts section notation to a normalized array format.
   *
   * This private method handles both dot notation strings and array inputs,
   * ensuring consistent internal representation of configuration sections.
   *
   * @param section - The section identifier in either string or array format
   * @returns An array of section parts
   *
   * @example
   * ```typescript
   * this.#resolveDotNotation("app.database.host") // ["app", "database", "host"]
   * this.#resolveDotNotation(["app", "database", "host"]) // ["app", "database", "host"]
   * ```
   */
  #resolveDotNotation(section: string | string[]): string[] {
    return Array.isArray(section) ? section : section.split(".");
  }
}
