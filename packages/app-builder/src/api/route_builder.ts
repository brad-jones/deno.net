import type { HttpContext } from "./types.ts";

export interface Route {
  method?: "get" | "post" | "put" | "patch" | "delete";
  allMethods?: boolean;
  customMethod?: string | string[];
  path: string;
  handler: (ctx: HttpContext, ...args: unknown[]) => Promise<Response> | Response;
}

export class RouteBuilder {
  readonly routes: Route[] = [];

  mapGet(path: string, handler: (ctx: HttpContext) => Promise<Response> | Response): this {
    this.routes.push({ method: "get", path, handler });
    return this;
  }

  mapPost(path: string, handler: (ctx: HttpContext) => Promise<Response> | Response): this {
    this.routes.push({ method: "post", path, handler });
    return this;
  }

  mapPut(path: string, handler: (ctx: HttpContext) => Promise<Response> | Response): this {
    this.routes.push({ method: "put", path, handler });
    return this;
  }

  mapPatch(path: string, handler: (ctx: HttpContext) => Promise<Response> | Response): this {
    this.routes.push({ method: "patch", path, handler });
    return this;
  }

  mapDelete(path: string, handler: (ctx: HttpContext) => Promise<Response> | Response): this {
    this.routes.push({ method: "delete", path, handler });
    return this;
  }

  mapAll(path: string, handler: (ctx: HttpContext) => Promise<Response> | Response): this {
    this.routes.push({ allMethods: true, path, handler });
    return this;
  }

  mapCustom(
    method: string | string[],
    path: string,
    handler: (ctx: HttpContext) => Promise<Response> | Response,
  ): this {
    this.routes.push({ customMethod: method, path, handler });
    return this;
  }
}
