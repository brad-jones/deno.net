import type { HttpContext, Next } from "./types.ts";

export interface Middleware {
  handler: (ctx: HttpContext, next: Next, ...args: unknown[]) => Promise<void>;
}

export class MiddlewareBuilder {
  readonly middleware: Middleware[] = [];

  use(handler: (ctx: HttpContext, next: Next) => Promise<void>): this {
    this.middleware.push({ handler });
    return this;
  }
}
