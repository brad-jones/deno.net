import { Container, type IContainer } from "@brad-jones/deno-net-container";

/**
 * The base builder class, provides an IoC Container & other primitives.
 */
export abstract class AppBuilder<T> {
  readonly services: IContainer = new Container();

  abstract build(): T;
}
