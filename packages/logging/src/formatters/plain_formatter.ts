import type { IFormatter } from "./formatter.ts";
import { getTextFormatter } from "@logtape/logtape";
import type { LogRecord, TextFormatter, TextFormatterOptions } from "@logtape/logtape";

/**
 * A formatter that outputs log records as plain text without any styling or colors.
 * This is the most basic formatter, providing clean, readable text output suitable for
 * file logging, plain terminals, or environments where ANSI colors are not supported.
 *
 * The output typically follows a format like:
 * `[TIMESTAMP] LEVEL CATEGORY: MESSAGE`
 *
 * This formatter is ideal for:
 * - File-based logging where colors are not needed
 * - Environments that don't support ANSI colors
 * - Log files that will be processed by other tools
 * - Simple console output in production environments
 *
 * @example
 * ```typescript
 * // Default plain text formatting
 * const formatter = new PlainFormatter();
 *
 * // Custom text options
 * const customFormatter = new PlainFormatter({
 *   timestamp: true,
 *   level: true,
 *   category: true
 * });
 *
 * // Usage in file sink
 * builder.addFile("app.log", {
 *   formatter: new PlainFormatter()
 * });
 * ```
 *
 * This is just a wrapper.
 * @see https://logtape.org/manual/formatters#default-text-formatter
 */
export class PlainFormatter implements IFormatter {
  /**
   * The internal LogTape text formatter function.
   * @private
   */
  #formatter: TextFormatter;

  /**
   * Creates a new PlainFormatter instance.
   *
   * @param options - Configuration options for text formatting.
   *                  Controls which components are included in the output.
   *
   * @example
   * ```typescript
   * // Use default formatting
   * const formatter = new PlainFormatter();
   *
   * // Customize which elements are included
   * const formatter = new PlainFormatter({
   *   timestamp: true,    // Include timestamp
   *   level: true,        // Include log level
   *   category: true,     // Include logger category
   *   message: true,      // Include message (usually always true)
   *   format: "{timestamp} [{level}] {category}: {message}" // Custom format template
   * });
   * ```
   */
  constructor(options?: TextFormatterOptions) {
    this.#formatter = getTextFormatter(options);
  }

  /**
   * Formats a log record as plain text.
   *
   * @param record - The log record to format as plain text
   * @returns A plain text string representation of the log record
   *
   * @example
   * ```typescript
   * const formatter = new PlainFormatter();
   * const record = {
   *   level: "info",
   *   message: "Application started",
   *   timestamp: new Date(),
   *   category: ["app", "startup"]
   * } as LogRecord;
   *
   * const formatted = formatter.format(record);
   * // Output: "2025-10-12T10:30:45.123Z [INFO] app.startup: Application started"
   * ```
   */
  format(record: LogRecord): string {
    return this.#formatter(record);
  }
}
