import type { ISink } from "./sink.ts";
import type { LogRecord } from "@logtape/logtape";
import type { IFilter } from "../filters/filter.ts";

/**
 * A decorator sink that applies filters to log records before passing them to an underlying sink.
 * This sink acts as a middleware layer, allowing you to selectively control which log records
 * reach specific sinks based on custom filtering logic.
 *
 * The FilteredSink evaluates filters in the order they were provided. If any filter returns false,
 * the log record is rejected and will not be passed to the underlying sink. All filters must
 * return true for the record to be processed.
 *
 * This pattern is useful for:
 * - Applying different log levels to different sinks
 * - Filtering sensitive information from specific outputs
 * - Creating specialized log streams (e.g., errors only to email, debug to file)
 * - Implementing complex routing logic based on log content
 * - Performance optimization by reducing writes to expensive sinks
 *
 * @example
 * ```typescript
 * // Create a file sink that only receives error logs
 * const errorFileFilter = new LevelFilter("error");
 * const errorFileSink = new FilteredSink(
 *   new FileSink("/var/log/errors.log"),
 *   errorFileFilter
 * );
 *
 * // Create a console sink that excludes debug logs in production
 * const productionConsole = new FilteredSink(
 *   new ConsoleSink({ formatter: new ColorFormatter() }),
 *   new LevelFilter("info")  // info and above only
 * );
 *
 * // Multiple filters - category AND level filtering
 * const apiErrorSink = new FilteredSink(
 *   new FileSink("/var/log/api-errors.log"),
 *   new CategoryFilter(["api"]),     // Only API-related logs
 *   new LevelFilter("warning")       // Warning level and above
 * );
 * ```
 */
export class FilteredSink implements ISink {
  /**
   * The underlying sink that will receive filtered log records.
   * @private
   */
  #sink: ISink;

  /**
   * Array of filters to apply to each log record.
   * All filters must return true for the record to be processed.
   * @private
   */
  #filters: IFilter[] = [];

  /**
   * Creates a new FilteredSink instance.
   *
   * @param sink - The underlying sink that will receive log records that pass all filters
   * @param filters - One or more filters to apply. Records must pass ALL filters to be processed.
   *
   * @example
   * ```typescript
   * // Single filter - only errors
   * const errorSink = new FilteredSink(
   *   new FileSink("/var/log/errors.log"),
   *   new LevelFilter("error")
   * );
   *
   * // Multiple filters - API errors only
   * const apiErrorSink = new FilteredSink(
   *   new ConsoleSink(),
   *   new CategoryFilter(["api", "auth"]),  // API or auth categories
   *   new LevelFilter("warning")            // Warning level and above
   * );
   *
   * // Custom filter logic
   * const customFilteredSink = new FilteredSink(
   *   new FileSink("/var/log/custom.log"),
   *   new CustomFilter((record) => record.message.includes("important"))
   * );
   * ```
   */
  constructor(sink: ISink, ...filters: IFilter[]) {
    this.#sink = sink;
    this.#filters.push(...filters);
  }

  /**
   * Processes a log record through all filters and forwards it to the underlying sink if accepted.
   *
   * The filtering process works as follows:
   * 1. Each filter is evaluated in the order they were provided
   * 2. If any filter returns false, the record is rejected immediately
   * 3. If all filters return true, the record is passed to the underlying sink
   * 4. Short-circuit evaluation means later filters won't be called if an earlier one rejects
   *
   * @param record - The log record to filter and potentially sink
   *
   * @example
   * ```typescript
   * const filteredSink = new FilteredSink(
   *   new ConsoleSink(),
   *   new LevelFilter("info"),
   *   new CategoryFilter(["app"])
   * );
   *
   * // This record will be processed (info level, app category)
   * const infoRecord = {
   *   level: "info",
   *   message: "App started",
   *   category: ["app"]
   * } as LogRecord;
   * filteredSink.sink(infoRecord); // ✅ Passes both filters
   *
   * // This record will be rejected (debug level fails first filter)
   * const debugRecord = {
   *   level: "debug",
   *   message: "Debug info",
   *   category: ["app"]
   * } as LogRecord;
   * filteredSink.sink(debugRecord); // ❌ Rejected by level filter
   * ```
   */
  sink(record: LogRecord): void {
    for (const filter of this.#filters) {
      if (!filter.filter(record)) {
        return;
      }
    }
    this.#sink.sink(record);
  }
}
