import type { ISink } from "./sink.ts";
import type { LogRecord, Sink } from "@logtape/logtape";
import type { IFormatter } from "../formatters/formatter.ts";
import { type ConsoleSinkOptions as LogTapeConsoleSinkOptions, getConsoleSink } from "@logtape/logtape";
import { inject, type Token } from "@brad-jones/deno-net-container";

/**
 * Configuration options for the ConsoleSink.
 */
export interface ConsoleSinkOptions extends Omit<LogTapeConsoleSinkOptions, "formatter"> {
  formatter?: IFormatter | Token<IFormatter>;
}

/**
 * A sink that writes log records to the console (stdout/stderr).
 * This is the most common sink for development and interactive environments,
 * providing immediate visual feedback of log messages.
 *
 * The console sink supports:
 * - Writing to stdout or stderr streams
 * - Custom formatting with any IFormatter implementation
 * - Color output (when using ColorFormatter)
 * - Real-time log display for development and debugging
 *
 * This sink is ideal for:
 * - Development environments where immediate feedback is needed
 * - Interactive terminals and command-line applications
 * - Docker containers where logs are captured via stdout/stderr
 * - Quick debugging and troubleshooting scenarios
 *
 * @example
 * ```typescript
 * // Default console sink
 * const sink = new ConsoleSink();
 *
 * // Console sink with color formatting
 * const colorSink = new ConsoleSink({
 *   formatter: new ColorFormatter()
 * });
 *
 * // Console sink writing to stderr
 * const errorSink = new ConsoleSink({
 *   formatter: new PlainFormatter(),
 *   stream: "stderr"
 * });
 *
 * // Usage in logging builder
 * builder.addSink(ConsoleSink, {
 *   formatter: new PrettyFormatter()
 * });
 * ```
 *
 * This is just a wrapper.
 * @see https://logtape.org/manual/sinks#console-sink
 */
export class ConsoleSink implements ISink {
  /**
   * The internal LogTape console sink function.
   * @private
   */
  #sink: Sink;

  /**
   * Creates a new ConsoleSink instance.
   *
   * @param options - Configuration options for the console sink
   * @param options.formatter - The formatter to use for log record rendering
   * @param options.stream - The stream to write to ("stdout" or "stderr")
   *
   * @example
   * ```typescript
   * // Basic console sink
   * const sink = new ConsoleSink();
   *
   * // Console sink with custom formatting and stream
   * const sink = new ConsoleSink({
   *   formatter: new JsonFormatter(),
   *   stream: "stderr"
   * });
   * ```
   */
  constructor(options?: ConsoleSinkOptions) {
    const possibleFormatter = options?.formatter;
    if (typeof possibleFormatter !== "undefined") {
      if ("format" in possibleFormatter) {
        this.#sink = getConsoleSink({
          ...options,
          formatter: (r) => possibleFormatter.format(r),
        });
      } else {
        const formatter = inject(possibleFormatter);
        this.#sink = getConsoleSink({
          ...options,
          formatter: (r) => formatter.format(r),
        });
      }
    } else {
      this.#sink = getConsoleSink({
        ...options,
        formatter: undefined,
      });
    }
  }

  /**
   * Writes a log record to the console.
   * The record will be formatted using the configured formatter and written
   * to the specified stream (stdout or stderr).
   *
   * @param record - The log record to write to the console
   *
   * @example
   * ```typescript
   * const sink = new ConsoleSink({
   *   formatter: new ColorFormatter()
   * });
   *
   * const record = {
   *   level: "info",
   *   message: "Application started",
   *   timestamp: new Date(),
   *   category: ["app"]
   * } as LogRecord;
   *
   * sink.sink(record); // Outputs colored text to console
   * ```
   */
  sink(record: LogRecord): void {
    this.#sink(record);
  }
}
