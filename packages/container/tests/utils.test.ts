import { expect } from "@std/expect";
import { Type } from "../src/types.ts";
import { isClass, isFunc, isToken, isType, isValueProvider } from "../src/utils.ts";

class Foo {}

function bar() {}

const baz = new Type<string>();

Deno.test("isClass", () => {
  expect(isClass(Foo)).toBe(true);
  expect(isClass(new Foo())).toBe(false);
  expect(isClass(bar)).toBe(false);
});

Deno.test("isFunc", () => {
  expect(isFunc(bar)).toBe(true);
  expect(isFunc(Foo)).toBe(false);
});

Deno.test("isType", () => {
  expect(isType(baz)).toBe(true);
});

Deno.test("isToken", () => {
  expect(isToken(baz)).toBe(true);
  expect(isToken(bar)).toBe(true);
  expect(isToken(Foo)).toBe(true);
});

Deno.test("isValueProvider", () => {
  expect(isValueProvider({ useValue: "" })).toBe(true);
  expect(isValueProvider({ useClass: Foo })).toBe(true);
  expect(isValueProvider({ useFunc: () => {} })).toBe(true);
  expect(isValueProvider({ useFactory: () => {} })).toBe(true);
});
