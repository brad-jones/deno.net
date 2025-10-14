import type { IFormatter } from "./formatter.ts";
import { getJsonLinesFormatter } from "@logtape/logtape";
import type { JsonLinesFormatterOptions, LogRecord, TextFormatter } from "@logtape/logtape";

/**
 * A formatter that outputs log records as JSON Lines (JSONL) format.
 * Each log record is serialized as a single JSON object on one line, making it ideal
 * for structured logging, log aggregation systems, and automated log processing.
 *
 * The JSON output includes all log record properties such as level, message, timestamp,
 * category, and any additional metadata. This format is particularly useful for:
 * - Log aggregation services (ELK stack, Splunk, etc.)
 * - Automated log analysis
 * - Microservices architectures
 * - Cloud logging platforms
 *
 * @example
 * ```typescript
 * // Default JSON formatting
 * const formatter = new JsonFormatter();
 *
 * // Custom JSON options
 * const customFormatter = new JsonFormatter({
 *   indent: 2,      // Pretty-print with indentation
 *   includeLevel: true,
 *   includeTimestamp: true
 * });
 *
 * // Usage in file sink for structured logging
 * builder.addFile("app.jsonl", {
 *   formatter: new JsonFormatter()
 * });
 * ```
 *
 * This is just a wrapper.
 * @see https://logtape.org/manual/formatters#json-lines-formatter
 */
export class JsonFormatter implements IFormatter {
  /**
   * The internal LogTape JSON Lines formatter function.
   * @private
   */
  #formatter: TextFormatter;

  /**
   * Creates a new JsonFormatter instance.
   *
   * @param options - Configuration options for JSON Lines formatting.
   *                  Controls the structure and content of the JSON output.
   *
   * @example
   * ```typescript
   * // Use default JSON formatting (compact, single line)
   * const formatter = new JsonFormatter();
   *
   * // Pretty-printed JSON with custom options
   * const formatter = new JsonFormatter({
   *   indent: 2,           // Add indentation for readability
   *   includeLevel: true,  // Include log level in output
   *   includeTimestamp: true, // Include timestamp
   *   includeCategory: true   // Include logger category
   * });
   * ```
   */
  constructor(options?: JsonLinesFormatterOptions) {
    this.#formatter = getJsonLinesFormatter(options);
  }

  /**
   * Formats a log record as a JSON string.
   *
   * @param record - The log record to serialize as JSON
   * @returns A JSON string representation of the log record, suitable for structured logging
   *
   * @example
   * ```typescript
   * const formatter = new JsonFormatter();
   * const record = {
   *   level: "info",
   *   message: "User logged in",
   *   timestamp: new Date(),
   *   category: ["auth"],
   *   extra: { userId: 123, sessionId: "abc-123" }
   * } as LogRecord;
   *
   * const formatted = formatter.format(record);
   * // Output: {"level":"info","message":"User logged in","timestamp":"2025-10-12T...","category":["auth"],"extra":{"userId":123,"sessionId":"abc-123"}}
   * ```
   */
  format(record: LogRecord): string {
    return this.#formatter(record);
  }
}
