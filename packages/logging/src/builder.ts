import { expandGlob } from "@std/fs";
import { IFilter, LevelFilter } from "./filters/mod.ts";
import { importModule } from "@brad-jones/jsr-dynamic-imports";
import type { Filter, LogLevel, LogRecord, Sink } from "@logtape/logtape";
import { configure, dispose, getLogger } from "@logtape/logtape";
import { ConsoleSink, FileSink, FilteredSink, ISink } from "./sinks/mod.ts";
import { ILogger, ILoggerConfig, type LoggingModule } from "./types.ts";
import { type Constructor, type IContainer, type Token, Type } from "@brad-jones/deno-net-container";
import { ColorFormatter, type IFormatter, JsonFormatter, PlainFormatter, PrettyFormatter } from "./formatters/mod.ts";

/**
 * A fluent builder that wraps the LogTape library.
 *
 * @example
 * Used by deno.net to mimic the ASP.NET logging builder.
 * ```typescript
 * builder.logging.setLevel("info")
 *   .addConsole({ formatter: "color" })
 *   .addFile("app.log", { formatter: "json" });
 * ```
 *
 * @see https://logtape.org/
 */
export class LoggingBuilder {
  /**
   * Creates a new LoggingBuilder instance.
   *
   * @param services - The dependency injection container for managing logging services
   */
  constructor(private services: IContainer) {
    this.services.addSingleton(ILogger, { useValue: getLogger });
    this.addCategory(["logtape", "meta"], (category) => category.setLevel("warning"));
  }

  /**
   * Adds a new logging category with a custom configuration.
   *
   * @param category - The category name(s) to configure. Can be a single string or array of strings
   * @param categoryBuilder - A function that receives a CategoryBuilder to configure the category
   * @returns This LoggingBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addCategory("database", (category) => {
   *   category.setLevel("debug")
   *     .addSink(ConsoleSink, { formatter: "json" });
   * });
   * ```
   *
   * @see https://logtape.org/manual/categories
   */
  addCategory(
    category: string | string[],
    categoryBuilder: (cB: Omit<CategoryBuilder, "build">) => void,
  ): Omit<this, "build"> {
    const cB = new CategoryBuilder(this.services, category);
    categoryBuilder(cB);
    this.services.addSingleton(ILoggerConfig, { useValue: cB.build() });
    return this;
  }

  /**
   * Sets the log level for the specified category or the root category if none supplied.
   *
   * @param level - The minimum log level to output. Can be null to disable logging
   * @param options - Optional configuration object
   * @param options.category - The category to set the level for. Defaults to root if not specified
   * @returns This LoggingBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setLevel("info") // Set root level
   *   .setLevel("debug", { category: "database" }); // Set category-specific level
   * ```
   *
   * @see https://logtape.org/manual/levels
   */
  setLevel(level: LogLevel | null, options?: { category?: string | string[] }): Omit<this, "build"> {
    this.addCategory(options?.category ?? [], (category) => category.setLevel(level));
    return this;
  }

  /**
   * Adds a console sink to output logs to the terminal/console.
   *
   * @param options - Optional configuration for the console sink
   * @param options.category - The category to add the sink to. Defaults to root if not specified
   * @param options.lowestLevel - The minimum log level for this sink. (creates a FilteredSink)
   * @param options.formatter - The formatter to use. Can be a preset string or custom IFormatter instance
   * @returns This LoggingBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addConsole({
   *   formatter: "color",
   *   lowestLevel: "info",
   *   category: ["my-app", "my-module"]
   * });
   *
   * // NB: This would be the equivalent, if you setup the category directly.
   * builder.addCategory(["my-app", "my-module"], (category) => {
   *   category.addFilteredSink(
   *     ConsoleSink,
   *     [{ formatter: new JsonFormatter() }],
   *     (f) => f.addFilter(LevelFilter, "info")
   *   );
   * });
   * ```
   */
  addConsole(
    options?: {
      category?: string | string[];
      lowestLevel?: LogLevel | null;
      formatter?: "plain" | "color" | "json" | "pretty" | Token<IFormatter>;
    },
  ): Omit<this, "build"> {
    const formatter = this.#registerFormatter(options?.formatter ?? "plain");

    this.addCategory(options?.category ?? [], (category) => {
      if (typeof options?.lowestLevel === "undefined") {
        category.addSink(ConsoleSink, { formatter });
      } else {
        category.addFilteredSink(
          ConsoleSink,
          [{ formatter }],
          (f) => f.addFilter(LevelFilter, options!.lowestLevel!),
        );
      }
    });

    return this;
  }

  /**
   * Adds a file sink to output logs to a specified file.
   *
   * @param path - The file path where logs should be written
   * @param options - Optional configuration for the file sink
   * @param options.category - The category to add the sink to. Defaults to root if not specified
   * @param options.lowestLevel - The minimum log level for this sink. (creates a FilteredSink)
   * @param options.formatter - The formatter to use. Can be a preset string or custom IFormatter instance
   * @returns This LoggingBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addFile("./logs/app.log", {
   *   formatter: "json",
   *   lowestLevel: "warning",
   *   category: ["my-app", "my-module"]
   * });
   *
   * // NB: This would be the equivalent, if you setup the category directly.
   * builder.addCategory(["my-app", "my-module"], (category) => {
   *   category.addFilteredSink(
   *     FileSink,
   *     ["./logs/app.log", { formatter: new JsonFormatter() }],
   *     (f) => f.addFilter(LevelFilter, "warning")
   *   );
   * });
   * ```
   */
  addFile(
    path: string,
    options?: {
      category?: string | string[];
      lowestLevel?: LogLevel | null;
      formatter?: "plain" | "json" | Token<IFormatter>;
    },
  ): Omit<this, "build"> {
    const formatter = this.#registerFormatter(options?.formatter ?? "plain");

    this.addCategory(options?.category ?? [], (category) => {
      if (typeof options?.lowestLevel === "undefined") {
        category.addSink(FileSink, path, { formatter });
      } else {
        category.addFilteredSink(
          FileSink,
          [path, { formatter }],
          (f) => f.addFilter(LevelFilter, options!.lowestLevel!),
        );
      }
    });

    return this;
  }

  /**
   * Adds a logging module to extend the builder with custom configuration.
   *
   * @param module - A function that receives this LoggingBuilder and configures it
   * @returns This LoggingBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const dbLoggingModule = (filePath: string) => (builder: LoggingBuilder) => {
   *   builder.addCategory("database", (category) => {
   *     category.setLevel("debug").addFile(filePath, { formatter: "json" });
   *   });
   * };
   *
   * builder.addModule(dbLoggingModule("/var/db.log"));
   * ```
   */
  addModule(module: LoggingModule): Omit<this, "build"> {
    module(this, this.services);
    return this;
  }

  /**
   * Dynamically loads and adds multiple logging modules from files matching a glob pattern.
   *
   * @param glob - A glob pattern to match module files
   * @returns A Promise that resolves when all modules have been loaded and added
   *
   * @example
   * ```typescript
   * await builder.addModules("./logging-modules/**\/*.ts");
   * ```
   *
   * @example
   * Where a logging module might look like this.
   * ```typescript
   * import { LoggingModule } from "@brad-jones/deno-net-logging";
   *
   * export default ((l, c) => {
   *
   *   l.addCategory(["my-module"], (category) => {
   *     category.addSink(CustomSink);
   *     category.addFilter(CustomFilter);
   *   });
   *
   *   // You also have access to the IoC Container
   *   // should you wish to register any other services.
   *   c.addTransient(IFoo, Foo);
   *   c.addSingleton(IBar, Bar);
   *
   * }) satisfies LoggingModule;
   * ```
   */
  async addModules(glob: string): Promise<void> {
    for await (const entry of expandGlob(glob)) {
      if (entry.isFile) {
        const module = await importModule(entry.path);
        this.addModule(module["default"] as LoggingModule);
      }
    }
  }

  /**
   * Builds and configures the logging system based on the accumulated configuration.
   *
   * This method processes all registered categories, sinks, and filters to create
   * the final logging configuration and activates it.
   *
   * @param logBuiltConfig - Whether to log the built configuration to console for debugging
   * @returns A Promise that resolves to an AsyncDisposable for cleaning up the logging system
   *
   * @example
   * ```typescript
   * const logger = await builder.build();
   *
   * // Use logger...
   *
   * // Clean up when done
   * await logger[Symbol.asyncDispose]();
   * ```
   */
  async build(options?: { reset?: boolean; logBuiltConfig?: boolean }): Promise<AsyncDisposable> {
    const sinks = Object.fromEntries(
      this.services.getServices(ISink)
        .map(([id, sink]) => [id, (r: LogRecord) => sink.sink(r)]),
    );

    const filters = Object.fromEntries(
      this.services.getServices(IFilter)
        .map(([id, filter]) => [id, (r: LogRecord) => filter.filter(r)]),
    );

    const loggers = this.services.getServices(ILoggerConfig);

    // Merge loggers with same category together
    const mergedLoggers = Array.from(
      loggers.reduce((acc, logger) => {
        const categoryKey = JSON.stringify(logger.category);

        if (acc.has(categoryKey)) {
          const existing = acc.get(categoryKey)!;

          // Merge sinks (remove duplicates)
          const mergedSinks = [...new Set([...existing.sinks, ...logger.sinks])];

          // Merge filters (remove duplicates)
          const mergedFilters = [...new Set([...existing.filters, ...logger.filters])];

          // Use the lowest log level between the two
          let lowestLevel = this.#getLowestLevel(existing.lowestLevel, logger.lowestLevel);
          if (lowestLevel === undefined) {
            lowestLevel = categoryKey === '["logtape","meta"]' ? "warning" : "info";
          }

          acc.set(categoryKey, {
            ...existing,
            sinks: mergedSinks,
            filters: mergedFilters,
            lowestLevel,
          });
        } else {
          if (logger.lowestLevel === undefined) {
            logger.lowestLevel = categoryKey === '["logtape","meta"]' ? "warning" : "info";
          }
          acc.set(categoryKey, logger);
        }

        return acc;
      }, new Map()).values(),
    );

    const config = {
      sinks,
      filters,
      loggers: mergedLoggers,
      reset: false,
    };

    if (options?.reset) {
      config.reset = true;
    }

    if (options?.logBuiltConfig) {
      console.log(config);
    }

    await configure(config);

    return {
      async [Symbol.asyncDispose]() {
        await dispose();
      },
    };
  }

  /**
   * Resolves a formatter from a string name or returns the provided formatter instance.
   *
   * @private
   * @param name - The formatter name or instance to resolve
   * @returns The resolved formatter instance
   */
  #registerFormatter(name: "plain" | "color" | "json" | "pretty" | Token<IFormatter>): Token<IFormatter> {
    if (typeof name !== "string") return name;

    const token = new Type<IFormatter>(name);

    switch (name) {
      case "plain":
        this.services.addSingleton(token, PlainFormatter);
        break;
      case "color":
        this.services.addSingleton(token, ColorFormatter);
        break;
      case "json":
        this.services.addSingleton(token, JsonFormatter);
        break;
      case "pretty":
        this.services.addSingleton(token, {
          useFactory: () => new PrettyFormatter({ timestamp: "date-time-timezone", wordWrap: false }),
        });
        break;
    }

    return token;
  }

  /**
   * Determines the lowest (most verbose) log level between two levels.
   *
   * @private
   * @param level1 - The first log level to compare
   * @param level2 - The second log level to compare
   * @returns The lowest level, or null/undefined if either input is null/undefined
   */
  #getLowestLevel(
    level1: LogLevel | null | undefined,
    level2: LogLevel | null | undefined,
  ): LogLevel | null | undefined {
    if (!level1) return level2;
    if (!level2) return level1;

    const levels: LogLevel[] = ["trace", "debug", "info", "warning", "error", "fatal"];
    const index1 = levels.indexOf(level1);
    const index2 = levels.indexOf(level2);

    return levels[Math.min(index1, index2)];
  }
}

/**
 * Internal builder class for configuring individual logging categories.
 *
 * This class provides methods to set log levels, configure sinks, and add filters
 * for a specific logging category.
 *
 * @internal
 */
class CategoryBuilder {
  #lowestLevel?: LogLevel | null;
  #parentSinks?: "inherit" | "override";
  #sinks: string[] = [];
  #filters: string[] = [];

  /**
   * Creates a new CategoryBuilder instance.
   *
   * @param services - The dependency injection container
   * @param category - The category name(s) this builder configures
   */
  constructor(private services: IContainer, private category: string | string[]) {}

  /**
   * Sets the minimum log level for this category.
   *
   * @param level - The minimum log level, or null to disable logging
   * @returns This CategoryBuilder instance for method chaining
   */
  setLevel(level: LogLevel | null): Omit<this, "build"> {
    this.#lowestLevel = level;
    return this;
  }

  /**
   * Configures how this category handles parent sinks.
   *
   * @param value - "inherit" to use parent sinks in addition to own sinks, "override" to use only own sinks
   * @returns This CategoryBuilder instance for method chaining
   */
  setParentSinks(value: "inherit" | "override"): Omit<this, "build"> {
    this.#parentSinks = value;
    return this;
  }

  /**
   * Adds a sink to this category.
   *
   * @param sink - A LogTape sink function
   * @returns This CategoryBuilder instance for method chaining
   */
  addSink(sink: Sink): Omit<this, "build">;

  /**
   * Adds a sink to this category with a specific ID.
   *
   * @param id - Unique identifier for the sink
   * @param sink - A LogTape sink function
   * @returns This CategoryBuilder instance for method chaining
   */
  addSink(id: string, sink: Sink): Omit<this, "build">;

  /**
   * Adds a sink constructor to this category.
   *
   * @param sink - An ISink constructor
   * @param options - Constructor parameters for the sink
   * @returns This CategoryBuilder instance for method chaining
   */
  addSink<T extends Constructor<ISink>>(sink: T, ...options: ConstructorParameters<T>): Omit<this, "build">;

  /**
   * Adds a sink constructor to this category with a specific ID.
   *
   * @param id - Unique identifier for the sink
   * @param sink - An ISink constructor
   * @param options - Constructor parameters for the sink
   * @returns This CategoryBuilder instance for method chaining
   */
  addSink<T extends Constructor<ISink>>(id: string, sink: T, ...options: ConstructorParameters<T>): Omit<this, "build">;

  addSink<T extends Constructor<ISink>>(idOrSink: string | T | Sink, ...args: unknown[]): Omit<this, "build"> {
    let id: string;
    let sinkFunction: Sink | undefined;
    let sinkConstructor: Constructor<ISink>;
    let options: unknown[] = [];

    if (typeof idOrSink === "string") {
      if (args.length === 1 && typeof args[0] === "function") {
        // Called with: addSink(id, sink) - where sink is a Sink function
        id = idOrSink;
        sinkFunction = args[0] as Sink;
      } else {
        // Called with: addSink(id, sink, ...options) - where sink is a Constructor<ISink>
        id = idOrSink;
        sinkConstructor = args[0] as T;
        options = args.slice(1);
      }
    } else {
      if (typeof idOrSink === "function" && args.length === 0) {
        // Called with: addSink(sink) - where sink is a Sink function
        id = crypto.randomUUID();
        sinkFunction = idOrSink as Sink;
      } else {
        // Called with: addSink(sink, ...options) - where sink is a Constructor<ISink>
        id = crypto.randomUUID();
        sinkConstructor = idOrSink as T;
        options = args;
      }
    }

    if (sinkFunction) {
      sinkConstructor = class implements ISink {
        sink(record: LogRecord): void {
          sinkFunction(record);
        }
      };
    }

    this.services.addSingleton(ISink, { useFactory: () => [id, new sinkConstructor(...options)] });
    this.#sinks.push(id);

    return this;
  }

  /**
   * Adds a filter to this category.
   *
   * @param filter - A LogTape filter function
   * @returns This CategoryBuilder instance for method chaining
   */
  addFilter(filter: Filter): Omit<this, "build">;

  /**
   * Adds a filter to this category with a specific ID.
   *
   * @param id - Unique identifier for the filter
   * @param filter - A LogTape filter function
   * @returns This CategoryBuilder instance for method chaining
   */
  addFilter(id: string, filter: Filter): Omit<this, "build">;

  /**
   * Adds a filter constructor to this category.
   *
   * @param filter - An IFilter constructor
   * @param options - Constructor parameters for the filter
   * @returns This CategoryBuilder instance for method chaining
   */
  addFilter<T extends Constructor<IFilter>>(filter: T, ...options: ConstructorParameters<T>): Omit<this, "build">;

  /**
   * Adds a filter constructor to this category with a specific ID.
   *
   * @param id - Unique identifier for the filter
   * @param filter - An IFilter constructor
   * @param options - Constructor parameters for the filter
   * @returns This CategoryBuilder instance for method chaining
   */
  addFilter<T extends Constructor<IFilter>>(
    id: string,
    filter: T,
    ...options: ConstructorParameters<T>
  ): Omit<this, "build">;

  addFilter<T extends Constructor<IFilter>>(idOrFilter: string | T | Filter, ...args: unknown[]): Omit<this, "build"> {
    let id: string;
    let filterFunction: Filter | undefined;
    let filterConstructor: Constructor<IFilter>;
    let options: unknown[] = [];

    if (typeof idOrFilter === "string") {
      if (args.length === 1 && typeof args[0] === "function") {
        // Called with: addFilter(id, filter) - where filter is a Filter function
        id = idOrFilter;
        filterFunction = args[0] as Filter;
      } else {
        // Called with: addFilter(id, filter, ...options) - where filter is a Constructor<IFilter>
        id = idOrFilter;
        filterConstructor = args[0] as T;
        options = args.slice(1);
      }
    } else {
      if (typeof idOrFilter === "function" && args.length === 0) {
        // Called with: addFilter(filter) - where filter is a Filter function
        id = crypto.randomUUID();
        filterFunction = idOrFilter as Filter;
      } else {
        // Called with: addFilter(filter, ...options) - where filter is a Constructor<IFilter>
        id = crypto.randomUUID();
        filterConstructor = idOrFilter as T;
        options = args;
      }
    }

    if (filterFunction) {
      filterConstructor = class implements IFilter {
        filter(record: LogRecord): boolean {
          return filterFunction(record);
        }
      };
    }

    this.services.addSingleton(IFilter, { useFactory: () => [id, new filterConstructor(...options)] });
    this.#filters.push(id);

    return this;
  }

  /**
   * Adds a sink with custom filters to this category.
   *
   * @param sink - An ISink constructor
   * @param options - Constructor parameters for the sink
   * @param filterBuilder - A function to configure filters for this sink
   * @returns This CategoryBuilder instance for method chaining
   */
  addFilteredSink<T extends Constructor<ISink>>(
    sink: T,
    options: ConstructorParameters<T>,
    filterBuilder: (f: Omit<FilterBuilder, "build">) => void,
  ): Omit<this, "build">;

  /**
   * Adds a sink with custom filters to this category with a specific ID.
   *
   * @param id - Unique identifier for the sink
   * @param sink - An ISink constructor
   * @param options - Constructor parameters for the sink
   * @param filterBuilder - A function to configure filters for this sink
   * @returns This CategoryBuilder instance for method chaining
   */
  addFilteredSink<T extends Constructor<ISink>>(
    id: string,
    sink: T,
    options: ConstructorParameters<T>,
    filterBuilder: (f: Omit<FilterBuilder, "build">) => void,
  ): Omit<this, "build">;

  addFilteredSink<T extends Constructor<ISink>>(
    idOrSink: string | T,
    sinkOrOptions: T | ConstructorParameters<T>,
    optionsOrFilterBuilder: ConstructorParameters<T> | ((f: Omit<FilterBuilder, "build">) => void),
    filterBuilder?: (f: Omit<FilterBuilder, "build">) => void,
  ): Omit<this, "build"> {
    let id: string;
    let sink: T;
    let options: ConstructorParameters<T>;
    let builder: (f: FilterBuilder) => void;

    if (typeof idOrSink === "string") {
      // Called with explicit id: addFilteredSink(id, sink, options, filterBuilder)
      id = idOrSink;
      sink = sinkOrOptions as T;
      options = optionsOrFilterBuilder as ConstructorParameters<T>;
      builder = filterBuilder!;
    } else {
      // Called without id: addFilteredSink(sink, options, filterBuilder)
      id = crypto.randomUUID();
      sink = idOrSink;
      options = sinkOrOptions as ConstructorParameters<T>;
      builder = optionsOrFilterBuilder as (f: FilterBuilder) => void;
    }

    // Register the main sink
    const sinkToken = new Type<ISink>(`addFilteredSink:ISink:${sink.name}`);
    this.services.addSingleton(sinkToken, { useFactory: () => new sink(...options) });

    // Register the sink filters
    const fB = new FilterBuilder(this.services);
    builder(fB);

    // Register the final filtered sink
    this.services.addSingleton(ISink, {
      useFactory: (c) =>
        [
          id,
          new FilteredSink(
            c.getService(sinkToken),
            ...c.getServices(fB.build()),
          ),
        ] as [string, ISink],
    });

    this.#sinks.push(id);
    return this;
  }

  /**
   * Builds the final logger configuration for this category.
   *
   * @returns The logger configuration object
   */
  build(): ILoggerConfig {
    return {
      category: this.category,
      lowestLevel: this.#lowestLevel,
      parentSinks: this.#parentSinks,
      sinks: this.#sinks,
      filters: this.#filters,
    };
  }
}

/**
 * Internal builder class for configuring filters for filtered sinks.
 *
 * This class allows adding multiple filters that will be applied to a sink.
 *
 * @internal
 */
class FilterBuilder {
  #filters: Token<IFilter>[] = [];

  /**
   * Creates a new FilterBuilder instance.
   *
   * @param services - The dependency injection container
   */
  constructor(private services: IContainer) {}

  /**
   * Adds a filter to this filter builder.
   *
   * @param filter - A filter constructor class
   * @param options - Constructor parameters for the filter
   * @returns This FilterBuilder instance for method chaining
   */
  addFilter<T extends Constructor<IFilter>>(filter: T, ...options: ConstructorParameters<T>): Omit<this, "build"> {
    const filterToken = new Type<IFilter>("FilterBuilder");
    this.services.addSingleton(filterToken, { useFactory: () => new filter(...options) });
    this.#filters.push(filterToken);
    return this;
  }

  /**
   * Builds and returns the array of filter tokens.
   *
   * @returns Array of filter tokens for dependency injection
   */
  build(): Token<IFilter>[] {
    return this.#filters;
  }
}
