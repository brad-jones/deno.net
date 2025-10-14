import type { IFilter } from "./filter.ts";
import { getLevelFilter } from "@logtape/logtape";
import type { Filter, LogLevel, LogRecord } from "@logtape/logtape";

/**
 * A filter that allows log records based on their log level.
 * This filter will only allow log records that meet or exceed the configured minimum level.
 *
 * The log level hierarchy (from lowest to highest) is:
 * trace → debug → info → warning → error → fatal
 *
 * For example, if the filter is set to "warning", it will allow warning, error, and fatal
 * log records to pass through, but will block trace, debug, and info records.
 *
 * @example
 * ```typescript
 * // Only allow warning level and above
 * const filter = new LevelFilter("warning");
 *
 * // Allow all levels (no filtering)
 * const noFilter = new LevelFilter(null);
 *
 * // Usage in logging builder
 * builder.addFilter(LevelFilter, "error");
 * ```
 *
 * This is just a wrapper.
 * @see https://logtape.org/manual/filters#level-filter
 */
export class LevelFilter implements IFilter {
  #filter: Filter;

  /**
   * Creates a new LevelFilter instance.
   *
   * @param level - The minimum log level to allow through the filter.
   *                If null, all log levels will be allowed (no filtering).
   *                Valid levels are: "trace", "debug", "info", "warning", "error", "fatal".
   */
  constructor(level: LogLevel | null) {
    this.#filter = getLevelFilter(level);
  }

  /**
   * Filters a log record based on its level.
   *
   * @param record - The log record to evaluate
   * @returns true if the record should be allowed (meets minimum level requirement),
   *          false if it should be filtered out
   *
   * @example
   * ```typescript
   * const filter = new LevelFilter("warning");
   *
   * const infoRecord = { level: "info", message: "Info message" } as LogRecord;
   * const errorRecord = { level: "error", message: "Error message" } as LogRecord;
   *
   * console.log(filter.filter(infoRecord));  // false - info is below warning
   * console.log(filter.filter(errorRecord)); // true - error is at or above warning
   * ```
   */
  filter(record: LogRecord): boolean {
    return this.#filter(record);
  }
}
