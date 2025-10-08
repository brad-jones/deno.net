// deno-lint-ignore-file no-explicit-any

import { Scope, Type } from "./types.ts";
import { injectionContext } from "./injection.ts";
import type { Constructor, IContainer, ServiceRegistration, Token, ValueProvider } from "./types.ts";

/**
 * @inheritdoc
 */
export class Container implements IContainer {
  #parent: Container | undefined = undefined;
  #scopedValues = new Map<Token<unknown>, unknown>();
  #singletonValues = new Map<Token<unknown>, unknown>();
  #registry = new Map<Token<unknown>, ServiceRegistration<unknown>[]>();

  private get rootContainer(): Container {
    let c: Container;
    c = this;

    while (c.#parent) {
      c = c.#parent;
    }

    return c;
  }

  constructor(parent?: Container) {
    if (parent) {
      this.#parent = parent;
      this.#registry = parent.#registry;
    }
  }

  /**
   * @inheritdoc
   */
  add<T>(scope: Scope, token: Token<T>, provider: ValueProvider<T>): this {
    const services = this.#registry.get(token) ?? [];

    if (provider.useValue) {
      services.push({ scope, factory: () => provider.useValue });
    }

    if (provider.useClass) {
      services.push({ scope, factory: () => new provider.useClass!() });
    }

    if (provider.useFactory) {
      services.push({ scope, factory: provider.useFactory });
    }

    this.#registry.set(token, services);
    return this;
  }

  #addWithScope<T>(scope: Scope, ...args: unknown[]): this {
    if (args.length === 1) {
      return this.add(
        scope,
        args[0] as Token<T>,
        { useClass: args[0] as Constructor<T> },
      );
    }

    if (
      typeof args[1] === "object" &&
      ("useValue" in args[1]! || "useFactory" in args[1]! ||
        "useClass" in args[1]!)
    ) {
      return this.add(
        scope,
        args[0] as Token<T>,
        args[1] as ValueProvider<T>,
      );
    }

    if (typeof args[1] === "function") {
      if (args[1].prototype) {
        const useClass = args[1] as Constructor<T>;
        return this.add(scope, args[0] as Token<T>, { useClass });
      }

      const useFactory = args[1] as (c: IContainer) => T;
      return this.add(scope, args[0] as Token<T>, { useFactory });
    }

    throw new Error("unknown args");
  }

  /**
   * @inheritdoc
   */
  addTransient<T>(klass: new (...args: any[]) => T): this;

  /**
   * @inheritdoc
   */
  addTransient<T>(token: Token<T>, provider: ValueProvider<T>): this;

  /**
   * @inheritdoc
   */
  addTransient<T>(token: Token<T>, klass: Constructor<T>): this;

  /**
   * @inheritdoc
   */
  addTransient<T>(token: Token<T>, factory: (c: Container) => T): this;

  /**
   * @inheritdoc
   */
  addTransient<T>(...args: unknown[]): this {
    return this.#addWithScope<T>(Scope.Transient, ...args);
  }

  /**
   * @inheritdoc
   */
  addScoped<T>(klass: new (...args: any[]) => T): this;

  /**
   * @inheritdoc
   */
  addScoped<T>(token: Token<T>, provider: ValueProvider<T>): this;

  /**
   * @inheritdoc
   */
  addScoped<T>(token: Token<T>, klass: Constructor<T>): this;

  /**
   * @inheritdoc
   */
  addScoped<T>(token: Token<T>, factory: (c: Container) => T): this;

  /**
   * @inheritdoc
   */
  addScoped<T>(...args: unknown[]): this {
    return this.#addWithScope<T>(Scope.Scoped, ...args);
  }

  /**
   * @inheritdoc
   */
  addSingleton<T>(klass: new (...args: any[]) => T): this;

  /**
   * @inheritdoc
   */
  addSingleton<T>(token: Token<T>, provider: ValueProvider<T>): this;

  /**
   * @inheritdoc
   */
  addSingleton<T>(token: Token<T>, klass: Constructor<T>): this;

  /**
   * @inheritdoc
   */
  addSingleton<T>(token: Token<T>, factory: (c: Container) => T): this;

  /**
   * @inheritdoc
   */
  addSingleton<T>(...args: unknown[]): this {
    return this.#addWithScope<T>(Scope.Singleton, ...args);
  }

  /**
   * @inheritdoc
   */
  getService<T>(token: Token<T>): T {
    return injectionContext(this).run(() => {
      const services = this.#getRegisteredServices(token);
      const lastRegisteredService = services[services.length - 1];
      if (!lastRegisteredService) return lastRegisteredService;
      return this.#resolveService(token, lastRegisteredService);
    });
  }

  /**
   * @inheritdoc
   */
  getServices<T>(token: Token<T>): T[] {
    return injectionContext(this).run(() => {
      const services = this.#getRegisteredServices(token);
      const values: T[] = [];
      for (const service of services) {
        values.push(this.#resolveService(token, service));
      }
      return values;
    });
  }

  #getRegisteredServices<T>(token: Token<T>): ServiceRegistration<T>[] {
    const services = this.#registry.get(token) as ServiceRegistration<T>[] | undefined;
    if (!services) {
      if (!(token instanceof Type)) {
        // For constructor tokens, create a default registration
        return [{
          scope: Scope.Transient,
          factory: () => new (token as Constructor<T>)(),
        }];
      }
      throw new TokenNotFound(token);
    }
    return services;
  }

  #resolveService<T>(token: Token<T>, registration: ServiceRegistration<T>): T {
    let value: unknown | undefined = undefined;

    switch (registration.scope) {
      case Scope.Transient:
        value = registration.factory(this);
        break;

      case Scope.Scoped: {
        value = this.#scopedValues.get(token);
        if (!value) {
          value = registration.factory(this);
          this.#scopedValues.set(token, value);
        }
        break;
      }

      case Scope.Singleton: {
        value = this.rootContainer.#singletonValues.get(token);
        if (!value) {
          value = registration.factory(this);
          this.rootContainer.#singletonValues.set(token, value);
        }
        break;
      }
    }

    return value as T;
  }

  /**
   * @inheritdoc
   */
  callFunc<T, Args extends readonly unknown[]>(f: (...args: Args) => T, ...fArgs: Args): T {
    return injectionContext(this).run(() => f(...fArgs));
  }

  /**
   * @inheritdoc
   */
  createChild(_scope?: string): IContainer {
    return new Container(this);
  }
}

/**
 * An error that is returned when a container can not resolve a service from it's self.
 */
export class TokenNotFound<T> extends Error {
  constructor(public readonly token: Token<T>) {
    super(`Token ${token instanceof Type ? String(token.id) : token} not registered in container.`);
  }
}
