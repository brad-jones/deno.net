// deno-lint-ignore-file no-explicit-any
import { parse as parseYaml } from "@std/yaml";
import { parse as parseToml } from "@std/toml";
import { camelCase } from "@mesqueeb/case-anything";
import type { IConfigurationSource } from "./configuration_source.ts";

/**
 * Configuration source that reads from files in JSON, YAML, or TOML format.
 *
 * The file format is automatically detected based on the file extension:
 * - `.json` - JSON format
 * - `.yaml`, `.yml` - YAML format
 * - `.toml` - TOML format
 *
 * The file content is parsed and flattened into a hierarchical structure
 * where nested objects can be accessed using section paths.
 *
 * @example
 * ```typescript
 * // config.json
 * {
 *   "database": {
 *     "host": "localhost",
 *     "port": 5432
 *   },
 *   "logging": {
 *     "level": "info"
 *   }
 * }
 *
 * const source = new FileSource("config.json");
 * const dbConfig = await source.read(["database"]);
 * // Returns: { host: "localhost", port: "5432" }
 * ```
 */
export class FileSource implements IConfigurationSource {
  private configData: Record<string, any> | null = null;

  /**
   * Creates a new FileSource instance.
   *
   * @param filePath - Absolute or relative path to the configuration file
   */
  constructor(private filePath: string) {}

  /**
   * Reads configuration values for a specific section from the file.
   *
   * The file is loaded and parsed on first access and cached for subsequent reads.
   * If the file doesn't exist or cannot be parsed, returns empty configuration.
   *
   * @param section - Array of section path components (e.g., ["database", "connection"])
   * @returns A Promise that resolves to a record of configuration key-value pairs
   *
   * @example
   * ```typescript
   * // Access nested configuration
   * const dbConfig = await source.read(["database"]);
   * const logConfig = await source.read(["logging"]);
   *
   * // Access top-level configuration
   * const allConfig = await source.read([]);
   * ```
   */
  async read(section: string[]): Promise<Record<string, string>> {
    // Load and parse file on first access
    if (this.configData === null) {
      try {
        this.configData = await this.loadAndParseFile();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to load configuration file ${this.filePath}:`, errorMessage);
        this.configData = {};
      }
    }

    // Navigate to the requested section
    let current = this.configData;
    for (const sectionName of section) {
      if (current && typeof current === "object" && sectionName in current) {
        current = current[sectionName];
      } else {
        return {}; // Section not found
      }
    }

    // Flatten the current section to string key-value pairs
    return this.flattenToStrings(current);
  }

  /**
   * Loads and parses the configuration file based on its extension.
   *
   * @private
   * @returns The parsed configuration object
   */
  private async loadAndParseFile(): Promise<Record<string, any>> {
    const fileContent = await Deno.readTextFile(this.filePath);
    const extension = this.getFileExtension(this.filePath);

    switch (extension) {
      case ".json":
        return JSON.parse(fileContent);

      case ".yaml":
      case ".yml": {
        const yamlResult = parseYaml(fileContent);
        return typeof yamlResult === "object" && yamlResult !== null ? yamlResult as Record<string, any> : {};
      }

      case ".toml":
        return parseToml(fileContent) as Record<string, any>;

      default:
        throw new Error(`Unsupported file format: ${extension}. Supported formats: .json, .yaml, .yml, .toml`);
    }
  }

  /**
   * Extracts the file extension from a file path.
   *
   * @private
   * @param filePath - The file path
   * @returns The file extension including the dot (e.g., ".json")
   */
  private getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf(".");
    return lastDotIndex === -1 ? "" : filePath.slice(lastDotIndex).toLowerCase();
  }

  /**
   * Recursively flattens an object into string key-value pairs.
   * Only processes immediate children of the current level.
   * Converts keys to camelCase for consistency.
   *
   * @private
   * @param obj - The object to flatten
   * @returns Record of string key-value pairs
   */
  private flattenToStrings(obj: any): Record<string, string> {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return {};
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = camelCase(key);
      if (typeof value === "string") {
        result[camelKey] = value;
      } else if (value !== null && value !== undefined) {
        result[camelKey] = String(value);
      }
    }
    return result;
  }
}
