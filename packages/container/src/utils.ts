// deno-lint-ignore-file no-explicit-any

import { type Token, Type, type ValueProvider } from "./types.ts";

export function isFunc(thing: unknown): thing is (...args: any[]) => any {
  return typeof thing === "function" && !isClass(thing);
}

export function isClass(thing: unknown): thing is new (...args: any[]) => any {
  return (
    typeof thing === "function" &&
    (
      /^class\s/.test(Function.prototype.toString.call(thing)) ||
      (thing.prototype && Object.getOwnPropertyNames(thing.prototype).length > 1)
    )
  );
}

export function isType<T>(thing: unknown): thing is Type<T> {
  return thing instanceof Type;
}

export function isToken<T>(thing: unknown): thing is Token<T> {
  return isType(thing) || isClass(thing) || isFunc(thing);
}

export function isValueProvider<T>(thing: unknown): thing is ValueProvider<T> {
  return typeof thing === "object" && thing !== null &&
    ("useValue" in thing || "useFactory" in thing || "useClass" in thing || "useFunc" in thing);
}
