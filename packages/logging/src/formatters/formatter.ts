import type { LogRecord } from "@logtape/logtape";
import { Type } from "@brad-jones/deno-net-container";

/**
 * Injection token for the IFormatter Interface.
 */
export const IFormatter = new Type<IFormatter>("IFormatter");

/**
 * Classical Formatter Interface, wraps the @logtape/logtape TextFormatter functional interface.
 *
 * @see https://logtape.org/manual/formatters
 */
export interface IFormatter {
  /**
   * The method that does the formatting.
   *
   * @param record The log record to format.
   *
   * @returns The resulting log record serialized into a plain string.
   */
  format(record: LogRecord): string;
}
