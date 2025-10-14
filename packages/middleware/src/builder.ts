import { expandGlob } from "@std/fs";
import { IMiddleware, type MiddlewareModule } from "./types.ts";
import type { HttpContext, Next } from "@brad-jones/deno-net-http-context";
import { type Constructor, type IContainer, Scope } from "@brad-jones/deno-net-container";

export class MiddlewareBuilder {
  constructor(private services: IContainer) {}

  use<T extends Constructor<IMiddleware>>(handler: T, scope?: Scope): this;
  use<T extends (ctx: HttpContext, next: Next) => Promise<void>>(handler: T): this;
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

  async useModules(glob: string): Promise<void> {
    for await (const entry of expandGlob(glob)) {
      if (entry.isFile) {
        const module = await import(entry.path);
        this.useModule(module["default"] as MiddlewareModule);
      }
    }
  }
}
