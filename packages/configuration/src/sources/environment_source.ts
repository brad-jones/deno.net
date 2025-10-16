import { camelCase, constantCase } from "@mesqueeb/case-anything";
import type { IConfigurationSource } from "./configuration_source.ts";

/**
 * Configuration source that reads values from environment variables.
 *
 * This source implements a hierarchical naming convention for environment variables
 * where configuration sections are represented using double underscores as separators
 * and the section prefix is converted to uppercase.
 *
 * The naming convention follows this pattern:
 * `SECTION1__SECTION2_KEY_NAME=value`
 *
 * Where:
 * - `SECTION1__SECTION2` represents the hierarchical section path
 * - `KEY_NAME` is converted to camelCase in the returned configuration
 * - Double underscores (`__`) separate section levels
 * - Single underscores (`_`) separate words within key names
 *
 * @example
 * ```typescript
 * // Environment variables:
 * // MY_APP__DATABASE_HOST=localhost
 * // MY_APP__DATABASE_PORT=5432
 * // MY_APP__DATABASE_SSL_ENABLED=true
 *
 * const source = new EnvironmentSource();
 * const config = await source.read(["myApp", "database"]);
 * // Returns: {
 * //   host: "localhost",
 * //   port: "5432",
 * //   sslEnabled: "true"
 * // }
 * ```
 */
export class EnvironmentSource implements IConfigurationSource {
  /**
   * Reads configuration values from environment variables for a specific section.
   *
   * Environment variables are matched using a hierarchical naming convention where
   * section parts are joined with double underscores and converted to uppercase.
   * The remaining part after the section prefix is converted to camelCase.
   *
   * @param section - Array of section parts (e.g., ["foo", "bar"])
   * @returns Promise resolving to a record of configuration key-value pairs
   *
   * @example
   * ```typescript
   * // Given environment variables:
   * // FOO__BAR_BAZ_QUX=value1
   * // FOO__BAR_HELLO_WORLD=value2
   * // OTHER_VAR=ignored
   *
   * const source = new EnvironmentSource();
   * const config = await source.read(["foo", "bar"]);
   * // Returns: { bazQux: "value1", helloWorld: "value2" }
   * ```
   */
  read(section: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    const sectionPrefix = section.map((s) => constantCase(s)).join("__") + "_";
    for (const [key, value] of Object.entries(Deno.env.toObject())) {
      if (key.startsWith(sectionPrefix)) {
        result[camelCase(key.substring(sectionPrefix.length))] = value;
      }
    }

    return Promise.resolve(result);
  }
}
