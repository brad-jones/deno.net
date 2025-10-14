import type { MiddlewareBuilder } from "./builder.ts";
import type { HttpContext, Next } from "@brad-jones/deno-net-http-context";
import { type Constructor, type IContainer, Type } from "@brad-jones/deno-net-container";

export type MiddlewareModule = (m: MiddlewareBuilder, c: IContainer) => void;

export const IMiddleware: Type<Constructor<IMiddleware>> = new Type<Constructor<IMiddleware>>();

export interface IMiddleware {
  invokeAsync(ctx: HttpContext, next: Next): Promise<void>;
}
