import { LoggingBuilder } from "@brad-jones/deno-net-logging";
import { EnvironmentBuilder } from "./environment_builder.ts";
import { ConfigurationBuilder } from "@brad-jones/deno-net-configuration";
import { Container, type IContainer } from "@brad-jones/deno-net-container";

/**
 * The base builder class, provides an IoC Container & other primitives.
 */
export abstract class AppBuilder<T> {
  readonly services: IContainer = new Container();

  readonly environment: EnvironmentBuilder = new EnvironmentBuilder(this.services);

  readonly configuration: ConfigurationBuilder = new ConfigurationBuilder(this.services);

  readonly logging: Omit<LoggingBuilder, "build"> = new LoggingBuilder(this.services);

  protected async initLogging(...args: Parameters<LoggingBuilder["build"]>): Promise<AsyncDisposable> {
    return await (this.logging as LoggingBuilder).build(...args);
  }

  abstract build(): Promise<T>;
}
