// deno-lint-ignore-file no-explicit-any

/**
 * The container requires a key to map constructed values to.
 */
export type Token<T> = Type<T> | Constructor<T> | AbstractConstructor<T>;
export type Constructor<T> = new (...args: any[]) => T;
export type AbstractConstructor<T> = abstract new (...args: any[]) => T;

/**
 * Use this as a runtime type to stand-in for interfaces.
 *
 * @example
 * ```ts
 * export const iFoo = new Type<IFoo>("iFoo");
 *
 * export interface IFoo {
 *   foo(): string;
 * }
 *
 * export class Foo implements IFoo {
 *   foo(): string {
 *     return "bar";
 *   }
 * }
 *
 * container.addTransient(iFoo, Foo);
 *
 * container.getService(iFoo).foo();
 * ```
 */
export class Type<T> {
  readonly id: symbol;

  constructor(id?: string) {
    this.id = Symbol(id);
  }
}

/**
 * Token<T> is the key of the container, this is the type used for the value.
 *
 * @internal
 */
export interface ServiceRegistration<T> {
  scope: Scope;
  factory: (c: IContainer) => T;
}

/**
 * The container supports 3 scopes.
 */
export enum Scope {
  /**
   * Upon every request for a service, a brand new value will be created & returned.
   */
  Transient,

  /**
   * Values are cached against the Container instance, to create a new scope, create a child container.
   */
  Scoped,

  /**
   * Values are cached globally for the entire lifetime of a Deno process.
   */
  Singleton,
}

/**
 * There are 3 ways to bind tokens to values.
 */
export interface ValueProvider<T> {
  /**
   * The container will use whatever pre constructed value you provide.
   * Effectively this becomes a singleton, regardless of the scope you set.
   */
  useValue?: T;

  /**
   * The typical use case is to bind an interface to a class that implements the interface.
   */
  useClass?: Constructor<T>;

  /**
   * For complex scenarios you can supply your own factory function.
   */
  useFactory?: (c: IContainer) => T;
}

/**
 * Represents a dependency injection container that manages service registration and resolution.
 *
 * The container supports three different service lifetimes:
 * - **Transient**: A new instance is created each time the service is requested
 * - **Scoped**: One instance per scope (typically per request in web applications)
 * - **Singleton**: One instance for the entire application lifetime
 *
 * @example
 * ```ts
 * const container = new Container();
 *
 * // Register services with different lifetimes
 * container.addSingleton(DatabaseConnection);
 * container.addScoped(UserService);
 * container.addTransient(Logger);
 *
 * // Resolve services
 * const userService = container.getService(UserService);
 * ```
 */
export interface IContainer {
  /**
   * This is the core registration method that all other registration methods delegate to.
   *
   * @param scope - The lifetime scope for the service
   * @param token - The token to bind the provider to
   * @param provider - The value provider that will create instances
   * @returns The container instance for method chaining
   */
  add<T>(scope: Scope, token: Token<T>, provider: ValueProvider<T>): this;

  /**
   * Bind a token to a custom value provider with transient lifetime.
   * A new instance will be created each time the service is requested.
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param provider - The value provider
   * @returns The container instance for method chaining
   */
  addTransient<T>(token: Token<T>, provider: ValueProvider<T>): this;

  /**
   * Bind a concrete class to the container with transient lifetime.
   *
   * NB: This is not strictly required for transient scoped services.
   *     The container includes functionality that will automatically
   *     construct concrete classes that not explicitly registered with
   *     the container.
   *
   * @param klass - The constructor function for the class
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * class Foo {
   *    bar() {
   *      return "baz";
   *    }
   * }
   *
   * container.addTransient(Foo);
   *
   * container.getService(Foo).bar();
   * ```
   */
  addTransient<T>(klass: new (...args: any[]) => T): this;

  /**
   * Bind a token to a class with transient lifetime.
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param klass - The concrete constructor to bind to the token
   * @returns The container instance for method chaining
   *
   * @example
   * This example shows the use of an abstract class as the token.
   * ```ts
   * abstract class BaseFoo {}
   *
   * class Foo extends BaseFoo {
   *    bar() {
   *      return "baz";
   *    }
   * }
   *
   * container.addTransient(BaseFoo, Foo);
   *
   * container.getService(BaseFoo).bar();
   * ```
   */
  addTransient<T>(token: Token<T>, klass: Constructor<T>): this;

  /**
   * Bind a token to a custom factory with transient lifetime.
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param factory - A factory function that creates instances
   * @returns The container instance for method chaining
   *
   * @example
   * The container supports any kind of type, not just classes.
   * This example shows a UUID being bound to the container.
   * ```ts
   * const specialId = new Type<string>("specialId");
   * container.addTransient(specialId, () => crypto.randomUUID());
   * ```
   *
   * @example
   * You may also use the container in your factory function
   * to resolve other services already bound.
   * ```ts
   * const specialNumber = new Type<number>("specialNumber");
   * container.addTransient(specialNumber, (c) => c.getService(specialId).length);
   * ```
   */
  addTransient<T>(token: Token<T>, factory: (c: IContainer) => T): this;

  /**
   * Bind a token to a custom value provider with scoped lifetime.
   * One instance will be created per scope (typically per request in web applications).
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param provider - The value provider
   * @returns The container instance for method chaining
   */
  addScoped<T>(token: Token<T>, provider: ValueProvider<T>): this;

  /**
   * Bind a concrete class to the container with scoped lifetime.
   * One instance will be created per scope (typically per request in web applications).
   *
   * @param klass - The constructor function for the class
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * class RequestContext {
   *   constructor(public userId: string) {}
   * }
   *
   * container.addScoped(RequestContext);
   * ```
   */
  addScoped<T>(klass: new (...args: any[]) => T): this;

  /**
   * Bind a token to a class with scoped lifetime.
   * One instance will be created per scope (typically per request in web applications).
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param klass - The concrete constructor to bind to the token
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * interface IUserRepository {
   *   findById(id: string): Promise<User>;
   * }
   *
   * const IUserRepository = new Type<IUserRepository>("IUserRepository");
   * container.addScoped(IUserRepository, DatabaseUserRepository);
   * ```
   */
  addScoped<T>(token: Token<T>, klass: Constructor<T>): this;

  /**
   * Bind a token to a custom factory with scoped lifetime.
   * One instance will be created per scope (typically per request in web applications).
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param factory - A factory function that creates instances
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * const currentTime = new Type<Date>("currentTime");
   * container.addScoped(currentTime, () => new Date()); // Same timestamp for entire request
   * ```
   */
  addScoped<T>(token: Token<T>, factory: (c: IContainer) => T): this;

  /**
   * Bind a token to a custom value provider with singleton lifetime.
   * One instance will be created for the entire application lifetime.
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param provider - The value provider
   * @returns The container instance for method chaining
   */
  addSingleton<T>(token: Token<T>, provider: ValueProvider<T>): this;

  /**
   * Bind a concrete class to the container with singleton lifetime.
   * One instance will be created for the entire application lifetime.
   *
   * @param klass - The constructor function for the class
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * class DatabaseConnection {
   *   connect() { ...expensive operation... }
   * }
   *
   * container.addSingleton(DatabaseConnection);
   * ```
   */
  addSingleton<T>(klass: new (...args: any[]) => T): this;

  /**
   * Bind a token to a class with singleton lifetime.
   * One instance will be created for the entire application lifetime.
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param klass - The concrete constructor to bind to the token
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * interface ILogger {
   *   log(message: string): void;
   * }
   *
   * const ILogger = new Type<ILogger>("ILogger");
   * container.addSingleton(ILogger, ConsoleLogger);
   * ```
   */
  addSingleton<T>(token: Token<T>, klass: Constructor<T>): this;

  /**
   * Bind a token to a custom factory with singleton lifetime.
   * One instance will be created for the entire application lifetime.
   *
   * @param token - The token to bind (often an interface or abstract class)
   * @param factory - A factory function that creates the single instance
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * const appConfig = new Type<Config>("appConfig");
   * container.addSingleton(appConfig, () => loadConfigFromFile("./config.json"));
   * ```
   */
  addSingleton<T>(token: Token<T>, factory: (c: IContainer) => T): this;

  /**
   * Resolve a single service instance by its token.
   * Throws an error if the service is not registered or cannot be constructed.
   *
   * @param token - The token identifying the service to resolve
   * @returns The resolved service instance
   *
   * @example
   * ```ts
   * const userService = container.getService(UserService);
   * const config = container.getService(appConfigToken);
   * ```
   */
  getService<T>(token: Token<T>): T;

  /**
   * Resolve all service instances registered for a given token.
   * Useful for implementing plugin architectures or multi-implementation patterns.
   *
   * @param token - The token identifying the services to resolve
   * @returns An array of all resolved service instances
   *
   * @example
   * ```ts
   * interface INotificationHandler {
   *   handle(notification: Notification): Promise<void>;
   * }
   *
   * const handlers = container.getServices(INotificationHandler);
   * await Promise.all(handlers.map(h => h.handle(notification)));
   * ```
   */
  getServices<T>(token: Token<T>): T[];

  /**
   * Call a function with dependency injection for its parameters.
   *
   * The function must use the `inject()/injectAll()` methods as default values.
   * And then the container will resolve dependencies based on parameter types
   * and inject them automatically.
   *
   * Additional arguments can be provided to override specific parameters.
   *
   * @param f - The function to call with dependency injection
   * @param fArgs - Additional arguments to pass to the function
   * @returns The return value of the called function
   *
   * @example
   * ```ts
   * function processUser(userId: string, userService = inject(UserService)) {
   *   return userService.getById(userId);
   * }
   *
   * const user = container.callFunc(processUser, "user123");
   * ```
   */
  callFunc<T, Args extends readonly unknown[]>(f: (...args: Args) => T, ...fArgs: Args): T;

  /**
   * Create a child container that inherits from this container.
   * Child containers can override parent registrations and have their own scoped instances.
   * Useful for creating request-specific or test-specific container scopes.
   *
   * @param scope - Optional name for the child scope (currently unused)
   * @returns A new child container instance
   *
   * @example
   * ```ts
   * const requestContainer = rootContainer.createChild();
   * requestContainer.addScoped(RequestContext, () => new RequestContext(request.userId));
   *
   * // Child can access parent services but has its own scoped instances
   * const userService = requestContainer.getService(UserService);
   * ```
   */
  createChild(scope?: string): IContainer;
}
