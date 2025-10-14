import type { LoggingBuilder } from "./builder.ts";
import { type IContainer, Type } from "@brad-jones/deno-net-container";
import type { Logger as TapeLogger, LogLevel } from "@logtape/logtape";

/**
 * This is the actual logger interface that this library wraps.
 * Re-exported here for convenience.
 *
 * @see https://logtape.org
 */
export type Logger = TapeLogger;

/**
 * The logger factory.
 *
 * dotnet developers should find this pattern familiar.
 * @see https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/#create-logs
 *
 * @example
 * ```ts
 * class MyService {
 *   constructor(private logger = inject(ILogger)("MyService")) {
 *     this.logger.info("Hello World");
 *   }
 * }
 * ```
 */
export const ILogger: Type<ILogger> = new Type<ILogger>("ILogger");
export type ILogger = (category: string | string[]) => Logger;

/**
 * A function that configures LogTape using a LoggingBuilder instance.
 *
 * @param l - The LoggingBuilder instance to configure LogTape with
 *
 * @example
 * ```typescript
 * export MySink implements ISink {}
 *
 * export MyFilter implements ISink {}
 *
 * export function MyCustomLogModule(category: string | string[], level: LogLevel): LoggingModule {
 *   return (l: LoggingBuilder) => {
 *     l.addSink(MySink);
 *     l.addFilter(MyFilter);
 *     l.addLoggerConfig({
 *       category,
 *       sinks: [MySink],
 *       filters: [MyFilter],
 *       lowestLevel: level,
 *     });
 *   };
 * };
 *
 * loggingBuilder.addModule(MyCustomLogModule("app", "info"));
 * ```
 */
export type LoggingModule = (l: LoggingBuilder, c: IContainer) => void;

/**
 * Loggers are where you bring everything together.
 * You can set up different loggers for different parts of your application.
 *
 * @see https://logtape.org/manual/config#configuring-loggers
 *
 * dotnet developers should find this similar to how log levels & categories work.
 * @also https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/#configure-logging
 */
export const ILoggerConfig: Type<ILoggerConfig> = new Type<ILoggerConfig>("ILoggerConfig");
export interface ILoggerConfig {
  category: string | string[];
  sinks: string[];
  filters: string[];
  parentSinks?: "inherit" | "override";
  lowestLevel?: LogLevel | null;
}
