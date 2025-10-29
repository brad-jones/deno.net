import type { IContainer } from "@brad-jones/deno-net-container";
import type { PageRouteBuilder } from "./page_route_builder.ts";

export type PageModule = (p: PageRouteBuilder, c: IContainer) => void;

export type ScriptSrc = Promise<string> | string | (() => Promise<void> | void);

export type StyleSrc = Promise<string> | string;
