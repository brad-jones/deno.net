// deno-lint-ignore-file no-explicit-any

import { expandGlob } from "@std/fs";
import { Scope, Type } from "./types.ts";
import { injectionContext } from "./injection.ts";
import { importModule } from "@brad-jones/jsr-dynamic-imports";
import { isClass, isFunc, isToken, isValueProvider } from "./utils.ts";
import type {
  AbstractConstructor,
  Constructor,
  ContainerModule,
  IContainer,
  InjectableFunction,
  ServiceRegistration,
  Token,
  ValueProvider,
} from "./types.ts";

export class Container implements IContainer {
  #parent: Container | undefined = undefined;
  #scopedValues = new Map<ServiceRegistration<unknown>, unknown>();
  #singletonValues = new Map<ServiceRegistration<unknown>, unknown>();
  #registry = new Map<Token<unknown>, ServiceRegistration<unknown>[]>();
  #scopedAndTransientDisposables: (Disposable | AsyncDisposable)[] = [];
  #singletonDisposables: (Disposable | AsyncDisposable)[] = [];

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

  async [Symbol.asyncDispose](): Promise<void> {
    // Dispose scoped resources
    for (const disposable of this.#scopedAndTransientDisposables) {
      if (Symbol.asyncDispose in disposable) {
        await disposable[Symbol.asyncDispose]();
      } else if (Symbol.dispose in disposable) {
        disposable[Symbol.dispose]();
      }
    }

    // Dispose singleton resources (only for root container)
    if (!this.#parent) {
      for (const disposable of this.#singletonDisposables) {
        if (Symbol.asyncDispose in disposable) {
          await disposable[Symbol.asyncDispose]();
        } else if (Symbol.dispose in disposable) {
          disposable[Symbol.dispose]();
        }
      }
    }
  }

  add<T>(scope: Scope, token: Token<T>, provider: ValueProvider<T>): this {
    const services = this.#registry.get(token!) ?? [];

    if (provider!.useValue) {
      services.push({ scope, factory: () => provider!.useValue });
    }

    if (provider!.useClass) {
      services.push({ scope, factory: (_, additionalParameters) => new provider!.useClass!(...additionalParameters) });
    }

    if (provider!.useFunc) {
      services.push({ scope, factory: (_, additionalParameters) => provider!.useFunc!(...additionalParameters) });
    }

    if (provider!.useFactory) {
      services.push({ scope, factory: provider!.useFactory });
    }

    this.#registry.set(token!, services);
    return this;
  }

  addModule(module: ContainerModule): this {
    module(this);
    return this;
  }

  async addModules(glob: string): Promise<void> {
    for await (const entry of expandGlob(glob)) {
      if (entry.isFile) {
        const module = await importModule(entry.path);
        this.addModule(module["default"] as ContainerModule);
      }
    }
  }

  addTransient<T>(func: InjectableFunction<T>): this;
  addTransient<T>(klass: new (...args: any[]) => T): this;
  addTransient<T>(token: Token<T>, provider: ValueProvider<T>): this;
  addTransient<T>(token: Token<T>, klass: Constructor<T>): this;
  addTransient<T>(token: Token<T>, factory: (c: Container) => T): this;
  addTransient<T>(...args: unknown[]): this {
    return this.#addWithScope<T>(Scope.Transient, ...args);
  }

  addScoped<T>(func: InjectableFunction<T>): this;
  addScoped<T>(klass: new (...args: any[]) => T): this;
  addScoped<T>(token: Token<T>, provider: ValueProvider<T>): this;
  addScoped<T>(token: Token<T>, klass: Constructor<T>): this;
  addScoped<T>(token: Token<T>, factory: (c: Container) => T): this;
  addScoped<T>(...args: unknown[]): this {
    return this.#addWithScope<T>(Scope.Scoped, ...args);
  }

  addSingleton<T>(func: InjectableFunction<T>): this;
  addSingleton<T>(klass: new (...args: any[]) => T): this;
  addSingleton<T>(token: Token<T>, provider: ValueProvider<T>): this;
  addSingleton<T>(token: Token<T>, klass: Constructor<T>): this;
  addSingleton<T>(token: Token<T>, factory: (c: Container) => T): this;
  addSingleton<T>(...args: unknown[]): this {
    return this.#addWithScope<T>(Scope.Singleton, ...args);
  }

  getService<T>(token: Token<T>): T;
  getService<T extends InjectableFunction>(token: T, ...options: Parameters<T>): ReturnType<T>;
  getService<T extends AbstractConstructor>(token: T, ...options: ConstructorParameters<T>): InstanceType<T>;
  getService<T>(token: Token<T>, ...options: unknown[]): T {
    return injectionContext(this).run(() => {
      const services = this.#getRegisteredServices(token);
      if (services.length === 0) throw new TokenNotFound(token);
      const lastRegisteredService = services[services.length - 1];
      if (!lastRegisteredService) return lastRegisteredService;
      return this.#resolveService(lastRegisteredService, options);
    });
  }

  getServices<T>(token: Token<T>): T[];
  getServices<T>(tokens: Token<T>[]): T[];
  getServices<T>(tokens: Token<T> | Token<T>[]): T[] {
    return injectionContext(this).run(() => {
      const values: T[] = [];
      if (!Array.isArray(tokens)) tokens = [tokens];
      for (const token of tokens) {
        const services = this.#getRegisteredServices(token);
        for (const service of services) {
          values.push(this.#resolveService(service));
        }
      }
      return values;
    });
  }

  callFunc<T, Args extends readonly unknown[]>(f: (...args: Args) => T, ...fArgs: Args): T {
    return injectionContext(this).run(() => f(...fArgs));
  }

  createChild(_scope?: string): IContainer {
    return new Container(this);
  }

  #addWithScope<T>(scope: Scope, ...args: unknown[]): this {
    if (args.length === 1) {
      if (isClass(args[0])) {
        return this.add(scope, args[0], { useClass: args[0] });
      }
      if (isFunc(args[0])) {
        return this.add(scope, args[0], { useFunc: args[0] });
      }
    }

    if (isToken<T>(args[0])) {
      if (isValueProvider<T>(args[1])) {
        return this.add(scope, args[0], args[1]);
      }

      if (isClass(args[1])) {
        return this.add(scope, args[0], { useClass: args[1] });
      }

      if (isFunc(args[1])) {
        return this.add(scope, args[0], { useFactory: args[1] });
      }
    }

    throw new Error("unknown args");
  }

  #getRegisteredServices<T>(token: Token<T>): ServiceRegistration<T>[] {
    const services = this.#registry.get(token) as ServiceRegistration<T>[] | undefined;
    if (!services) {
      if (isFunc(token)) {
        return [{
          scope: Scope.Transient,
          factory: (_, additionalParameters) => token(...additionalParameters),
        }];
      }
      if (isClass(token)) {
        return [{
          scope: Scope.Transient,
          factory: (_, additionalParameters) => new token(...additionalParameters),
        }];
      }
      return [];
    }
    return services;
  }

  #trackDisposeable<T extends object>(scope: Scope, value: T): T {
    if (Symbol.asyncDispose in value || Symbol.dispose in value) {
      switch (scope) {
        case Scope.Transient:
        case Scope.Scoped:
          this.#scopedAndTransientDisposables.push(value as Disposable | AsyncDisposable);
          break;
        case Scope.Singleton:
          this.rootContainer.#singletonDisposables.push(value as Disposable | AsyncDisposable);
          break;
      }
    }
    return value;
  }

  #resolveService<T>(registration: ServiceRegistration<T>, additionalConstructorParameters?: unknown[]): T {
    let value: unknown | undefined = undefined;

    switch (registration.scope) {
      case Scope.Transient:
        value = registration.factory(this, additionalConstructorParameters ?? []);
        break;

      case Scope.Scoped: {
        value = this.#scopedValues.get(registration);
        if (!value) {
          value = registration.factory(this, additionalConstructorParameters ?? []);
          this.#scopedValues.set(registration, value);
        }
        break;
      }

      case Scope.Singleton: {
        value = this.rootContainer.#singletonValues.get(registration);
        if (!value) {
          value = registration.factory(this, additionalConstructorParameters ?? []);
          this.rootContainer.#singletonValues.set(registration, value);
        }
        break;
      }
    }

    if (value && typeof value === "object") {
      this.#trackDisposeable(registration.scope, value);
    }

    return value as T;
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
