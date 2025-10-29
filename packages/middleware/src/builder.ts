import { expandGlob } from "@std/fs";
import { importModule } from "@brad-jones/jsr-dynamic-imports";
import { IMiddleware, type MiddlewareModule } from "./types.ts";
import type { HttpContext, Next } from "@brad-jones/deno-net-http-context";
import { type Constructor, type IContainer, Scope } from "@brad-jones/deno-net-container";

export class MiddlewareBuilder {
  constructor(private services: IContainer) {}

  use<T extends (ctx: HttpContext, next: Next) => Promise<void>>(handler: T): this;
  use<T extends Constructor<IMiddleware>>(handler: T, scope?: Scope): this;
  use(handler: Constructor<IMiddleware> | ((ctx: HttpContext, next: Next) => Promise<void>), scope?: Scope): this {
    let classicalMiddleware;

    if (typeof handler === "function" && handler.prototype && handler.prototype.constructor === handler) {
      classicalMiddleware = handler as Constructor<IMiddleware>;
    } else {
      classicalMiddleware = class implements IMiddleware {
        async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
          await (handler as (ctx: HttpContext, next: Next) => Promise<void>)(ctx, next);
        }
      };
    }

    this.services.addSingleton(IMiddleware, { useValue: classicalMiddleware });
    this.services.add(scope ?? Scope.Scoped, classicalMiddleware, { useClass: classicalMiddleware });
    return this;
  }

  useModule(module: MiddlewareModule): this {
    module(this, this.services);
    return this;
  }

  /**
   * Dynamically loads and adds multiple middleware modules from files matching a glob pattern.
   *
   * @param glob - A glob pattern to match module files
   * @returns A Promise that resolves when all modules have been loaded and added
   *
   * @example
   * ```typescript
   * await builder.addModules("./middleware/**\/*.ts");
   * ```
   *
   * @example
   * Where a middleware module might look like this.
   * ```typescript
   * import { MiddlewareModule } from "@brad-jones/deno-net-middleware";
   *
   * export default ((m, c) => {
   *
   *   m.use(MyCustomMiddleware);
   *
   *   // You also have access to the IoC Container
   *   // should you wish to register any other services.
   *   c.addTransient(IFoo, Foo);
   *   c.addSingleton(IBar, Bar);
   *
   * }) satisfies MiddlewareModule;
   * ```
   */
  async useModules(glob: string): Promise<void> {
    for await (const entry of expandGlob(glob)) {
      if (entry.isFile) {
        const module = await importModule(entry.path);
        this.useModule(module["default"] as MiddlewareModule);
      }
    }
  }
}
