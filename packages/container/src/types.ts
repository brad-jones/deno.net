// deno-lint-ignore-file no-explicit-any

/**
 * Refer to the `addModule` method on `IContainer` for more info.
 */
export type ContainerModule = (c: IContainer) => void;

/**
 * The container requires a key to map constructed values to.
 */
export type Token<T = any> = Type<T> | Constructor<T> | AbstractConstructor<T> | InjectableFunction<T>;
export type Constructor<T = any> = new (...args: any[]) => T;
export type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;
export type InjectableFunction<T = any> = (...args: any[]) => T;

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
  factory: (c: IContainer, additionalConstructorParameters: unknown[]) => T;
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
   * Allows one to register individual functions into the container.
   */
  useFunc?: InjectableFunction<T>;

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
   * Register services using a module function that configures the container.
   * This method allows for organized service registration by grouping related
   * services together in reusable modules.
   *
   * @param module - A function that receives the container instance and registers services on it
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * // Define a module for database-related services
   * function databaseModule(connectionString: string) {
   *   return (container: IContainer) => {
   *     container.addSingleton(DatabaseConnection, () => new DatabaseConnection(connectionString));
   *     container.addScoped(IUserRepository, UserRepository);
   *     container.addScoped(IOrderRepository, OrderRepository);
   *   };
   * }
   *
   * // Register the module with the container
   * container.addModule(databaseModule("postgres://localhost:5432"));
   * ```
   */
  addModule(module: ContainerModule): this;

  /**
   * Dynamically loads and adds multiple container modules from files matching a glob pattern.
   *
   * @param glob - A glob pattern to match module files
   * @returns A Promise that resolves when all modules have been loaded and added
   *
   * @example
   * ```typescript
   * await container.addModules("./service-modules/**\/*.ts");
   * ```
   *
   * @example
   * Where a service module might look like this.
   * ```typescript
   * import { ContainerModule } from "@brad-jones/deno-net-container";
   *
   * export default ((c) => {
   *
   *   c.addTransient(IFoo, Foo);
   *   c.addSingleton(IBar, Bar);
   *
   * }) satisfies ContainerModule;
   * ```
   */
  addModules(glob: string): Promise<void>;

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
   *     register concrete classes that are not explicitly registered
   *     with the container.
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
   * Bind a function to the container with transient lifetime.
   *
   * NB: This is not strictly required for transient scoped services.
   *     The container includes functionality that will automatically
   *     register functions that are not explicitly registered with
   *     the container.
   *
   * @param func - The function to register
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * function parseConfig(logger = inject(ILogger)("config")) {
   *   logger.info("parsing app config");
   *   return {
   *     debugMode: Deno.env.get('DEBUG_MODE') ? true : false,
   *   };
   * }
   *
   * container.addTransient(parseConfig);
   *
   * container.getService(parseConfig).debugMode;
   * ```
   */
  addTransient<T>(func: InjectableFunction<T>): this;

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
   * Bind a function to the container with scoped lifetime.
   * One instance will be created per scope (typically per request in web applications).
   *
   * @param func - The function to register
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * function parseConfig(logger = inject(ILogger)("config")) {
   *   logger.info("parsing app config");
   *   return {
   *     debugMode: Deno.env.get('DEBUG_MODE') ? true : false,
   *   };
   * }
   *
   * container.addScoped(parseConfig);
   *
   * container.getService(parseConfig).debugMode;
   * ```
   */
  addScoped<T>(func: InjectableFunction<T>): this;

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
   * Bind a function to the container with singleton lifetime.
   * One instance will be created for the entire application lifetime.
   *
   * @param func - The function to register
   * @returns The container instance for method chaining
   *
   * @example
   * ```ts
   * function parseConfig(logger = inject(ILogger)("config")) {
   *   logger.info("parsing app config");
   *   return {
   *     debugMode: Deno.env.get('DEBUG_MODE') ? true : false,
   *   };
   * }
   *
   * container.addSingleton(parseConfig);
   *
   * container.getService(parseConfig).debugMode;
   * ```
   */
  addSingleton<T>(func: InjectableFunction<T>): this;

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
   * Resolve a single service instance using an injectable function with optional function parameters.
   * This overload allows you to pass specific parameters when resolving services registered as functions,
   * which is useful for functions that require runtime parameters or when you want to provide
   * specific arguments to the function being resolved.
   *
   * When a function is registered with scoped or singleton lifetime, the result of calling the function
   * is cached according to the lifetime scope. The function parameters are only considered during
   * the initial invocation that creates the cached result.
   *
   * @template T - The function type that extends a function signature
   * @param token - The injectable function to resolve and call
   * @param options - Optional parameters to pass to the function when it's invoked.
   *                  These parameters must match the function's parameter signature.
   * @returns The result of calling the injectable function with the provided parameters
   *
   * @example
   * Basic usage with a parameterless function:
   * ```ts
   * const createTimestamp = () => new Date();
   * container.addSingleton(createTimestamp);
   *
   * const timestamp1 = container.getService(createTimestamp);
   * const timestamp2 = container.getService(createTimestamp);
   * // timestamp1 === timestamp2 (same instance due to singleton caching)
   * ```
   *
   * @example
   * Usage with function parameters:
   * ```ts
   * const createCounter = (initialValue: number, step: number = 1) => {
   *   let count = initialValue;
   *   return {
   *     increment: () => count += step,
   *     get value() { return count; }
   *   };
   * };
   *
   * container.addTransient(createCounter);
   *
   * // Pass parameters to the function
   * const counter1 = container.getService(createCounter, 100, 5);
   * const counter2 = container.getService(createCounter, 200, 10);
   *
   * console.log(counter1.value); // 100
   * console.log(counter2.value); // 200
   * ```
   *
   * @example
   * Scoped lifetime with parameters (first call determines the cached result):
   * ```ts
   * const createSessionData = (userId: string) => ({
   *   userId,
   *   sessionId: crypto.randomUUID(),
   *   createdAt: new Date()
   * });
   *
   * container.addScoped(createSessionData);
   *
   * // First call creates and caches the result
   * const session1 = container.getService(createSessionData, "user123");
   * // Second call returns the cached result (ignores new parameters)
   * const session2 = container.getService(createSessionData, "user456");
   *
   * console.log(session1 === session2); // true
   * console.log(session1.userId); // "user123" (from first call)
   * ```
   */
  getService<T extends InjectableFunction>(token: T, ...options: Parameters<T>): ReturnType<T>;

  /**
   * Resolve a single service instance using a constructor with optional constructor parameters.
   * This overload allows you to pass specific constructor arguments when resolving services,
   * which is useful for services that require runtime parameters or when you want to override
   * the default dependency injection behavior for specific constructor parameters.
   *
   * @template T - The constructor type that extends Constructor<T>
   * @param token - The constructor function to use for creating the service instance
   * @param options - Optional constructor parameters to pass to the constructor.
   *                  If provided, these will be used instead of dependency injection for those parameters.
   * @returns The resolved service instance of type InstanceType<T>
   *
   * @example
   * ```ts
   * class DatabaseService {
   *   #connection: PostgresConnection;
   *
   *   constructor(connectionString: string, timeout: number, connector = inject(PostgresConnector)) {
   *     this.#connection = connector.connect(connectionString, timeout);
   *   }
   * }
   *
   * // Resolve with specific constructor arguments, leaving remaining arguments to be injected
   * const dbService = container.getService(DatabaseService, "postgresql://localhost:5432/mydb", 5000);
   * ```
   */
  getService<T extends AbstractConstructor>(token: T, ...options: ConstructorParameters<T>): InstanceType<T>;

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
   * Resolve all service instances for multiple tokens at once.
   * This overload allows you to efficiently resolve services from multiple tokens
   * in a single call, returning a flattened array of all resolved instances.
   *
   * @param tokens - An array of tokens identifying the services to resolve
   * @returns An array containing all resolved service instances from all provided tokens
   *
   * @example
   * ```ts
   * interface ITransformer {
   *   transform(data: unknown): unknown;
   * }
   *
   * const transformer1 = new Type<ITransformer>();
   * const transformer2 = new Type<ITransformer>();
   *
   * container.addTransient(transformer1, { useFactory: () = new Transformer({format: "json"}) });
   * container.addTransient(transformer2, { useFactory: () = new Transformer({format: "csv"}) });
   *
   * // Resolve all unique transformers in one call
   * const transformers = container.getServices([transformer1, transformer2]);
   * ```
   *
   * @example
   * Technically it is also possible to resolve many different types at once.
   * ```ts
   * const transformer = new Type<ITransformer>();
   * const validator = new Type<IValidator>();
   *
   * container.addTransient(transformer, JsonTransformer);
   * container.addTransient(validator, JsonValidator);
   *
   * for (const service of container.getServices<unknown>([transformer, validator])) {
   *   if (service instanceof JsonTransformer) {
   *     // transform the json
   *   }
   *
   *   if (service instanceof JsonValidator) {
   *     // validate the json
   *   }
   * }
   * ```
   */
  getServices<T>(tokens: Token<T>[]): T[];

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
   *
   * NB: If you want to cache the value returned from the function
   *     you can register the function into the container.
   *
   *     See: `addScoped<T>(func: InjectableFunction<T>)`
   *     & `addSingleton<T>(func: InjectableFunction<T>)`
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
