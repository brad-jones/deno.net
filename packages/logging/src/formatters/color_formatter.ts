import type { IFormatter } from "./formatter.ts";
import { getAnsiColorFormatter } from "@logtape/logtape";
import type { AnsiColorFormatterOptions, LogRecord, TextFormatter } from "@logtape/logtape";

/**
 * A formatter that outputs log records with ANSI color codes for enhanced readability in terminals.
 * This formatter adds color coding to different log levels and components to improve visual distinction.
 *
 * Colors are typically applied as follows:
 * - Trace: Gray/dim
 * - Debug: Cyan
 * - Info: Blue
 * - Warning: Yellow
 * - Error: Red
 * - Fatal: Bright red/bold
 *
 * @example
 * ```typescript
 * // Default color formatting
 * const formatter = new ColorFormatter();
 *
 * // Custom color options
 * const customFormatter = new ColorFormatter({
 *   level: true,
 *   timestamp: true,
 *   category: true
 * });
 *
 * // Usage in console sink
 * builder.addConsole({
 *   formatter: new ColorFormatter()
 * });
 * ```
 *
 * This is just a wrapper.
 * @see https://logtape.org/manual/formatters#ansi-color-formatter
 */
export class ColorFormatter implements IFormatter {
  /**
   * The internal LogTape ANSI color formatter function.
   * @private
   */
  #formatter: TextFormatter;

  /**
   * Creates a new ColorFormatter instance.
   *
   * @param options - Configuration options for ANSI color formatting.
   *                  Controls which parts of the log record should be colored.
   *
   * @example
   * ```typescript
   * // Use default coloring
   * const formatter = new ColorFormatter();
   *
   * // Customize which elements are colored
   * const formatter = new ColorFormatter({
   *   level: true,      // Color the log level
   *   timestamp: false, // Don't color timestamps
   *   category: true,   // Color the category/logger name
   *   message: true     // Color the message content
   * });
   * ```
   */
  constructor(options?: AnsiColorFormatterOptions) {
    this.#formatter = getAnsiColorFormatter(options);
  }

  /**
   * Formats a log record with ANSI color codes.
   *
   * @param record - The log record to format with colors
   * @returns A formatted string with ANSI color escape sequences suitable for terminal output
   *
   * @example
   * ```typescript
   * const formatter = new ColorFormatter();
   * const record = {
   *   level: "error",
   *   message: "Something went wrong",
   *   timestamp: new Date(),
   *   category: ["app", "database"]
   * } as LogRecord;
   *
   * const formatted = formatter.format(record);
   * console.log(formatted); // Outputs colored text to terminal
   * ```
   */
  format(record: LogRecord): string {
    return this.#formatter(record);
  }
}
