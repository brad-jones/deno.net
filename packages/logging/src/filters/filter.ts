import { Type } from "@brad-jones/deno-net-container";
import type { LogRecord } from "@logtape/logtape";

/**
 * Injection token for the Filter Interface.
 */
export const IFilter = new Type<[string, IFilter]>("IFilter");

/**
 * Classical Filter Interface, wraps the @logtape/logtape Filter functional interface.
 *
 * @see https://logtape.org/manual/filters
 */
export interface IFilter {
  /**
   * The method that does the filtering.
   *
   * @param record The log record to inspect.
   *
   * @returns True if the record is allowed to be sunk into a sink,
   *          otherwise false and the record will be dropped.
   */
  filter(record: LogRecord): boolean;
}
