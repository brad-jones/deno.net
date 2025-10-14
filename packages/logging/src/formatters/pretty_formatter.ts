import type { IFormatter } from "./formatter.ts";
import type { LogRecord, TextFormatter } from "@logtape/logtape";
import { getPrettyFormatter, type PrettyFormatterOptions } from "@logtape/pretty";

/**
 * A formatter that outputs log records with enhanced visual formatting for improved readability.
 * This formatter provides a more sophisticated layout than plain text, with better spacing,
 * alignment, and visual hierarchy. It's designed for development and debugging scenarios
 * where maximum readability is important.
 *
 * The pretty formatter typically includes:
 * - Enhanced spacing and alignment
 * - Better visual separation between log components
 * - Improved timestamp formatting
 * - Structured display of metadata
 * - Optional syntax highlighting for structured data
 *
 * This formatter is ideal for:
 * - Development and debugging environments
 * - Console output during development
 * - Interactive terminals where readability is paramount
 * - Detailed log analysis sessions
 *
 * @example
 * ```typescript
 * // Default pretty formatting
 * const formatter = new PrettyFormatter();
 *
 * // Custom pretty options
 * const customFormatter = new PrettyFormatter({
 *   colors: true,       // Enable colors if supported
 *   timestamp: true,    // Show timestamps
 *   level: true,        // Show log levels
 *   multiline: true     // Use multi-line format for complex objects
 * });
 *
 * // Usage in console sink for development
 * builder.addConsole({
 *   formatter: new PrettyFormatter()
 * });
 * ```
 *
 * This is just a wrapper.
 * @see https://logtape.org/manual/formatters#pretty-formatter
 */
export class PrettyFormatter implements IFormatter {
  /**
   * The internal LogTape pretty formatter function from @logtape/pretty.
   * @private
   */
  #formatter: TextFormatter;

  /**
   * Creates a new PrettyFormatter instance.
   *
   * @param options - Configuration options for pretty formatting.
   *                  Controls the visual appearance and layout of the output.
   *
   * @example
   * ```typescript
   * // Use default pretty formatting
   * const formatter = new PrettyFormatter();
   *
   * // Customize the pretty output
   * const formatter = new PrettyFormatter({
   *   colors: true,           // Enable color output
   *   timestamp: true,        // Include timestamps
   *   level: true,            // Show log levels
   *   category: true,         // Show logger categories
   *   multiline: true,        // Use multi-line format for objects
   *   indent: 2,              // Indentation for nested structures
   *   maxDepth: 3             // Maximum nesting depth for objects
   * });
   * ```
   */
  constructor(options?: PrettyFormatterOptions) {
    this.#formatter = getPrettyFormatter(options);
  }

  /**
   * Formats a log record with enhanced visual styling for improved readability.
   *
   * @param record - The log record to format with pretty styling
   * @returns A formatted string with enhanced visual layout and spacing
   *
   * @example
   * ```typescript
   * const formatter = new PrettyFormatter({ colors: true, multiline: true });
   * const record = {
   *   level: "info",
   *   message: "User action completed",
   *   timestamp: new Date(),
   *   category: ["api", "users"],
   *   extra: {
   *     userId: 123,
   *     action: "profile_update",
   *     metadata: { ip: "192.168.1.1", userAgent: "..." }
   *   }
   * } as LogRecord;
   *
   * const formatted = formatter.format(record);
   * // Output: Nicely formatted multi-line output with proper spacing and colors
   * ```
   */
  format(record: LogRecord): string {
    return this.#formatter(record);
  }
}
