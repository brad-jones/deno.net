import { Container } from "@brad-jones/deno-net-container";

/**
 * The base builder class, provides an IoC Container & other primitives.
 */
export abstract class AppBuilder<T> {
  readonly services = new Container();

  abstract build(): T;
}
