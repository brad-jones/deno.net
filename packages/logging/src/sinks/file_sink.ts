import type { ISink } from "./sink.ts";
import type { LogRecord, Sink } from "@logtape/logtape";
import type { IFormatter } from "../formatters/formatter.ts";
import { type FileSinkOptions as LogTapeFileSinkOptions, getFileSink } from "@logtape/file";
import { inject, type Token } from "@brad-jones/deno-net-container";

/**
 * Configuration options for the FileSink.
 */
export interface FileSinkOptions extends Omit<LogTapeFileSinkOptions, "formatter"> {
  formatter?: IFormatter | Token<IFormatter>;
}

/**
 * A sink that writes log records to a file on the filesystem.
 * This sink is essential for persistent logging, audit trails, and production environments
 * where log data needs to be preserved for analysis, debugging, or compliance.
 *
 * The file sink supports:
 * - Writing to any file path with automatic directory creation
 * - Custom formatting (JSON, plain text, etc.)
 * - Append or overwrite modes
 * - Buffered writing for performance
 * - Automatic file rotation (when configured)
 *
 * This sink is ideal for:
 * - Production environments requiring persistent logs
 * - Audit logging and compliance requirements
 * - Long-term log storage and analysis
 * - Structured logging with JSON format
 * - Integration with log analysis tools
 *
 * @example
 * ```typescript
 * // Basic file sink
 * const sink = new FileSink("/var/log/app.log");
 *
 * // File sink with JSON formatting for structured logging
 * const jsonSink = new FileSink("/var/log/app.jsonl", {
 *   formatter: new JsonFormatter()
 * });
 *
 * // File sink with custom options
 * const customSink = new FileSink("/var/log/debug.log", {
 *   formatter: new PlainFormatter(),
 *   mode: "append",
 *   bufferSize: 2048
 * });
 *
 * // Usage in logging builder
 * builder.addFile("/var/log/application.log", {
 *   formatter: "json",
 *   lowestLevel: "info"
 * });
 * ```
 *
 * This is just a wrapper.
 * @see https://logtape.org/manual/sinks#file-sink
 */
export class FileSink implements ISink {
  /**
   * The internal LogTape file sink function.
   * @private
   */
  #sink: Sink;

  /**
   * Creates a new FileSink instance.
   *
   * @param path - The file path where log records should be written.
   *               Parent directories will be created automatically if they don't exist.
   * @param options - Configuration options for the file sink
   * @param options.formatter - The formatter to use for log record rendering
   * @param options.mode - File write mode ("append" or "overwrite")
   * @param options.bufferSize - Buffer size for write operations
   *
   * @example
   * ```typescript
   * // Write to a simple log file
   * const sink = new FileSink("/var/log/app.log");
   *
   * // Write structured JSON logs
   * const sink = new FileSink("/var/log/app.jsonl", {
   *   formatter: new JsonFormatter(),
   *   mode: "append"
   * });
   *
   * // Write with custom formatting and buffering
   * const sink = new FileSink("/tmp/debug.log", {
   *   formatter: new PlainFormatter(),
   *   bufferSize: 4096
   * });
   * ```
   */
  constructor(path: string, options?: FileSinkOptions) {
    const possibleFormatter = options?.formatter;
    if (typeof possibleFormatter !== "undefined") {
      if ("format" in possibleFormatter) {
        this.#sink = getFileSink(path, {
          ...options,
          formatter: (r) => possibleFormatter.format(r),
        });
      } else {
        const formatter = inject(possibleFormatter);
        this.#sink = getFileSink(path, {
          ...options,
          formatter: (r) => formatter.format(r),
        });
      }
    } else {
      this.#sink = getFileSink(path, {
        ...options,
        formatter: undefined,
      });
    }
  }

  /**
   * Writes a log record to the file.
   * The record will be formatted using the configured formatter and written
   * to the specified file path. Write operations may be buffered for performance.
   *
   * @param record - The log record to write to the file
   *
   * @example
   * ```typescript
   * const sink = new FileSink("/var/log/app.log", {
   *   formatter: new JsonFormatter()
   * });
   *
   * const record = {
   *   level: "error",
   *   message: "Database connection failed",
   *   timestamp: new Date(),
   *   category: ["db", "connection"],
   *   extra: { host: "localhost", port: 5432 }
   * } as LogRecord;
   *
   * sink.sink(record); // Writes JSON log entry to file
   * ```
   */
  sink(record: LogRecord): void {
    this.#sink(record);
  }
}
