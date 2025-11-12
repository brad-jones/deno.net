import { expect } from "@std/expect";
import { isObject, isPrimitive, valueToString } from "./utils.ts";

Deno.test("valueToString", () => {
  expect(valueToString(123)).toBe("123");
  expect(valueToString("hello")).toBe("hello");
  expect(valueToString(true)).toBe("true");
  expect(valueToString(null)).toBe("");
  expect(valueToString(undefined)).toBe("");
});

Deno.test("isPrimitive", () => {
  expect(isPrimitive("test")).toBe(true);
  expect(isPrimitive(123)).toBe(true);
  expect(isPrimitive(true)).toBe(true);
  expect(isPrimitive([])).toBe(false);
  expect(isPrimitive({})).toBe(false);
});

Deno.test("isObject", () => {
  expect(isObject({})).toBe(true);
  expect(isObject([])).toBe(false);
});
