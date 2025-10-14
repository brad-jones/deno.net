import { inject, Type } from "@brad-jones/deno-net-container";
import type { IMiddleware, MiddlewareModule } from "../types.ts";
import type { HttpContext, Next } from "@brad-jones/deno-net-http-context";
import { ILogger } from "@brad-jones/deno-net-logging";

const HttpLoggingOptions: Type<HttpLoggingOptions> = new Type<HttpLoggingOptions>("HttpLoggingOptions");

export interface HttpLoggingOptions {
  foo?: string;
}

export function httpLogging(options?: HttpLoggingOptions): MiddlewareModule {
  return (m, c) => {
    if (options) {
      c.addSingleton(HttpLoggingOptions, { useValue: options });
    }
    m.use(HttpLogging);
  };
}

export class HttpLogging implements IMiddleware {
  constructor(
    private options = inject(HttpLoggingOptions, { optional: true }),
    private logger = inject(ILogger)(["deno.net", "http"]),
  ) {}

  async invokeAsync(ctx: HttpContext, next: Next): Promise<void> {
    const request = { method: ctx.req.method, path: ctx.req.path };
    this.logger.info("Inbound {request}", { request });
    await next();
    const response = { status: ctx.res.status, statusText: ctx.res.statusText };
    this.logger.info("Outbound {response}", { response });
  }
}
