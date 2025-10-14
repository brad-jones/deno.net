import { TokenNotFound } from "./container.ts";
import type { IContainer, Token } from "./types.ts";

/*
  Credit goes to https://github.com/needle-di/needle-di/blob/main/packages/core/src/context.ts
  Much of the following code was copied almost as is.
*/

/**
 * Resolves a dependency from the current injection context.
 *
 * This function can only be used within an "injection context", typically as
 * default parameter values for class constructors or other field initializers.
 *
 * Using this function outside of these contexts will throw an error, as the DI container
 * needs to establish the injection context before dependencies can be resolved.
 *
 * @param token The token used to identify the service in the container
 * @returns The service instance of type T
 * @throws {Error} When called outside of an injection context
 *
 * @example
 * Constructor Injection:
 * ```typescript
 * class UserService {
 *   constructor(
 *     private logger = inject(LoggerToken),
 *     private db = inject(DatabaseToken)
 *   ) {}
 * }
 * ```
 *
 * @example
 * Property Injection:
 * ```typescript
 * class UserService {
 *   private logger = inject(LoggerToken);
 *   private db = inject(DatabaseToken);
 * }
 * ```
 *
 * @example
 * Parameter Injection:
 * ```typescript
 * function authenticateUser(username: string, password: string, userService = inject(UserService)) {
 *   return userService.db.query(`SELECT password FROM Users WHERE username = ${username}`).password === password;
 * }
 *
 * // Call the function like this, to correctly set the injection context.
 * container.callFunc(authenticateUser, "john", "secret")
 * ```
 */
export function inject<T>(token: Token<T>): T;
export function inject<T>(token: Token<T>, options: { multi: true }): T[];
export function inject<T>(token: Token<T>, options: { optional: true }): T | undefined;
export function inject<T>(token: Token<T>, options: { multi: true; optional: true }): T[] | undefined;
export function inject<T>(token: Token<T>, options: { lazy: true }): () => T;
export function inject<T>(token: Token<T>, options: { lazy: true; multi: true }): () => T[];
export function inject<T>(token: Token<T>, options: { lazy: true; optional: true }): () => T | undefined;
export function inject<T>(token: Token<T>, options: { lazy: true; multi: true; optional: true }): () => T[] | undefined;
export function inject<T>(
  token: Token<T>,
  options?: { optional?: boolean; multi?: boolean; lazy?: boolean },
): T | T[] | undefined | (() => T | T[] | undefined) {
  const resolver = (ctx: Context) => {
    try {
      return ctx.run((container) => {
        if (options?.multi) {
          const result = container.getServices(token);
          if (options?.optional === true && result.length === 0) return undefined;
          return result;
        }
        return container.getService(token);
      });
    } catch (error) {
      if (
        (error instanceof NeedsInjectionContextError || error instanceof TokenNotFound) && options?.optional === true
      ) {
        return undefined;
      }

      throw error;
    }
  };

  // Capture the current injection context when the lazy function is created
  if (options?.lazy) {
    const capturedContext = _currentContext;
    return () => resolver(capturedContext);
  }

  // Non-lazy path - resolve immediately
  return resolver(_currentContext);
}

/**
 * Creates a new injection context.
 *
 * @internal
 */
export function injectionContext(container: IContainer): Context {
  return new InjectionContext(container);
}

/**
 * A context has a specific container associated to it.
 *
 * @internal
 */
interface Context {
  run<T>(block: (container: IContainer) => T): T;
}

/**
 * The global context does not allow dependency injection.
 *
 * @internal
 */
class GlobalContext implements Context {
  run<T>(): T {
    throw new NeedsInjectionContextError();
  }
}

/**
 * An injection context allows to perform dependency injection with `inject()` and `injectAll()`.
 *
 * @internal
 */
class InjectionContext implements Context {
  constructor(private readonly container: IContainer) {}

  run<T>(block: (container: IContainer) => T): T {
    const originalContext = _currentContext;
    try {
      _currentContext = this;
      return block(this.container);
    } finally {
      _currentContext = originalContext;
    }
  }
}

/**
 * An error that occurs when `inject()` or `injectAll()` is used outside an injection context.
 */
export class NeedsInjectionContextError extends Error {
  constructor() {
    super(`You can only invoke inject() or injectAll() within an injection context`);
  }
}

let _currentContext: GlobalContext | InjectionContext = new GlobalContext();
