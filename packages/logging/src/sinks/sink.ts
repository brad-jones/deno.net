import { Type } from "@brad-jones/deno-net-container";
import type { LogRecord } from "@logtape/logtape";

/**
 * Injection token for the Sink Interface.
 */
export const ISink: Type<[string, ISink]> = new Type<[string, ISink]>("ISink");

/**
 * Classical Sink Interface, wraps the @logtape/logtape Sink functional interface.
 *
 * @see https://logtape.org/manual/sinks
 */
export interface ISink {
  /**
   * The method that does the sinking.
   *
   * @param record The log record to sink into some underlying writer.
   */
  sink(record: LogRecord): void;
}
