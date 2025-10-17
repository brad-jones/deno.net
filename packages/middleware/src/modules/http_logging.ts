import { inject, Type } from "@brad-jones/deno-net-container";
import type { IMiddleware, MiddlewareModule } from "../types.ts";
import type { HttpContext, Next } from "@brad-jones/deno-net-http-context";
import { ILogger } from "@brad-jones/deno-net-logging";

const HttpLoggingOptions: Type<HttpLoggingOptions> = new Type<HttpLoggingOptions>("HttpLoggingOptions");

export interface HttpLoggingFields {
  method?: boolean;
  path?: boolean;
  status?: boolean;
  duration?: boolean;
  query?: boolean | { include: string[] } | { exclude: string[] };
  requestHeaders?: boolean | { include: string[] } | { exclude: string[] };
  responseHeaders?: boolean | { include: string[] } | { exclude: string[] };
  body?: boolean;
}

export interface HttpLoggingOptions {
  fields?: "basic" | "full" | HttpLoggingFields;
  combineLogs?: boolean;
  requestLogTpl?: string;
  responseLogTpl?: string;
  combinedLogTpl?: string;
}

interface RequestData {
  method?: string;
  path?: string;
  query?: Record<string, string>;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
}

interface ResponseData {
  status?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
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
    const combineLogs = this.options?.combineLogs === true;

    const id = crypto.randomUUID();
    const request = await this.#extractRequestData(ctx);
    if (!combineLogs) this.logger.info(this.#requestLogTpl, { id, ...request });

    const duration = await this.#measureNext(next);
    const response = await this.#extractResponseData(ctx);

    // deno-lint-ignore no-explicit-any
    let responseData: any = { ...response };
    if (duration) responseData = { ...responseData, duration };
    if (combineLogs) {
      responseData = { ...request, ...responseData };
      this.logger.info(this.#combinedLogTpl, responseData);
    } else {
      responseData = { id, ...responseData };
      this.logger.info(this.#responseLogTpl, responseData);
    }
  }

  get #requestLogTpl() {
    return this.options?.requestLogTpl ?? "Request:{id} {method} {path}";
  }

  get #responseLogTpl() {
    return this.options?.responseLogTpl ?? "Response:{id} {status} ({duration}ms)";
  }

  get #combinedLogTpl() {
    return this.options?.combinedLogTpl ?? "{method} {path} {status} ({duration}ms)";
  }

  async #measureNext(next: Next) {
    if (!this.#fields.duration) {
      await next();
      return undefined;
    }

    const start = performance.now();
    await next();
    const stop = performance.now();
    const duration = stop - start;
    return duration;
  }

  get #fields(): HttpLoggingFields {
    const basic = { method: true, path: true, status: true, duration: true };

    if (typeof this.options?.fields === "undefined") {
      return basic;
    }

    if (typeof this.options?.fields === "string") {
      switch (this.options?.fields) {
        case "basic":
          return basic;

        case "full":
          return {
            method: true,
            path: true,
            status: true,
            duration: true,
            body: true,
            query: true,
            requestHeaders: true,
            responseHeaders: true,
          };
      }
    }

    return this.options?.fields;
  }

  async #extractRequestData(ctx: HttpContext): Promise<RequestData> {
    const data: RequestData = {};

    if (this.#fields?.method) {
      data["method"] = ctx.req.method;
    }

    if (this.#fields?.path) {
      data["path"] = ctx.req.path;
    }

    if (this.#fields?.query === true) {
      data["query"] = ctx.req.query();
    } else if (typeof this.#fields?.query === "object") {
      if ("include" in this.#fields.query) {
        const included = this.#fields.query.include;
        data["query"] = Object.fromEntries(Object.entries(ctx.req.query()).filter(([k]) => included.includes(k)));
      } else if ("exclude" in this.#fields.query) {
        const excluded = this.#fields.query.exclude;
        data["query"] = Object.fromEntries(Object.entries(ctx.req.query()).filter(([k]) => !excluded.includes(k)));
      }
    }

    if (this.#fields?.requestHeaders === true) {
      data["requestHeaders"] = ctx.req.header();
    } else if (typeof this.#fields?.requestHeaders === "object") {
      if ("include" in this.#fields.requestHeaders) {
        const included = this.#fields.requestHeaders.include;
        data["requestHeaders"] = Object.fromEntries(
          Object.entries(ctx.req.header()).filter(([k]) => included.includes(k)),
        );
      } else if ("exclude" in this.#fields.requestHeaders) {
        const excluded = this.#fields.requestHeaders.exclude;
        data["requestHeaders"] = Object.fromEntries(
          Object.entries(ctx.req.header()).filter(([k]) => !excluded.includes(k)),
        );
      }
    }

    if (this.#fields?.body === true) {
      data["requestBody"] = await ctx.req.raw.clone().text();
    }

    return data;
  }

  async #extractResponseData(ctx: HttpContext): Promise<ResponseData> {
    const data: ResponseData = {};

    if (this.#fields.status) {
      data["status"] = ctx.res.status;
    }

    const responseHeaders: Record<string, string> = {};
    for (const [k, v] of ctx.res.headers) {
      responseHeaders[k] = v;
    }
    if (this.#fields.responseHeaders === true) {
      data["responseHeaders"] = responseHeaders;
    } else if (typeof this.#fields?.responseHeaders === "object") {
      if ("include" in this.#fields.responseHeaders) {
        const included = this.#fields.responseHeaders.include;
        data["responseHeaders"] = Object.fromEntries(
          Object.entries(responseHeaders).filter(([k]) => included.includes(k)),
        );
      } else if ("exclude" in this.#fields.responseHeaders) {
        const excluded = this.#fields.responseHeaders.exclude;
        data["responseHeaders"] = Object.fromEntries(
          Object.entries(responseHeaders).filter(([k]) => !excluded.includes(k)),
        );
      }
    }

    if (this.#fields?.body === true) {
      data["responseBody"] = await ctx.res.clone().text();
    }

    return data;
  }
}
