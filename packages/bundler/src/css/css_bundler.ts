import { Type } from "@brad-jones/deno-net-container";
import { Bundler, type IBundler } from "../bundler.ts";

export const ICssBundler: Type<ICssBundler> = new Type<ICssBundler>("ICssBundler");

export interface ICssBundler extends IBundler {}

export abstract class CssBundler extends Bundler implements ICssBundler {}
