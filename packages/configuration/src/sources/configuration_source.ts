import { Type } from "@brad-jones/deno-net-container";

/**
 * Dependency injection token for IConfigurationSource.
 * Use this token to register and inject configuration sources.
 */
export const IConfigurationSource: Type<IConfigurationSource> = new Type<IConfigurationSource>("IConfigurationSource");

/**
 * Interface that all configuration sources must implement.
 *
 * Configuration sources are responsible for reading configuration values from
 * specific locations or systems (environment variables, files, remote services, etc.).
 * Each source receives a hierarchical section path and returns all configuration
 * values that belong to that section.
 *
 * Sources are processed in reverse order of registration, meaning sources registered
 * earlier will override values from sources registered later. This allows for a
 * layered configuration approach where environment-specific values can override
 * default values.
 */
export interface IConfigurationSource {
  /**
   * Reads configuration values for a specific section.
   *
   * The section parameter represents a hierarchical path through the configuration
   * structure. Implementations should return all key-value pairs that belong to
   * the specified section.
   *
   * @param section - Array of section path components (e.g., ["app", "database"])
   * @returns A Promise that resolves to a record of configuration key-value pairs
   *
   * @example
   * ```typescript
   * // For section ["app", "database"], might return:
   * // { host: "localhost", port: "5432", username: "user" }
   * await source.read(["app", "database"]);
   * ```
   */
  read(section: string[]): Promise<Record<string, string>>;
}
