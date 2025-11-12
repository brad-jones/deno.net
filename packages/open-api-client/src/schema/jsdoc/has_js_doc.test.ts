import { expect } from "@std/expect";
import { hasJSDoc } from "./has_js_doc.ts";

Deno.test("hasJSDoc - returns true for single-line JSDoc", () => {
  const typeString = "/** User email address */ string";
  expect(hasJSDoc(typeString)).toBe(true);
});

Deno.test("hasJSDoc - returns true for multi-line JSDoc", () => {
  const typeString = `/**
 * User email address
 * @format email
 */
string`;
  expect(hasJSDoc(typeString)).toBe(true);
});

Deno.test("hasJSDoc - returns true for JSDoc at start of string", () => {
  const typeString = "/** Description */";
  expect(hasJSDoc(typeString)).toBe(true);
});

Deno.test("hasJSDoc - returns true for JSDoc in middle of string", () => {
  const typeString = "type User = /** User object */ { name: string }";
  expect(hasJSDoc(typeString)).toBe(true);
});

Deno.test("hasJSDoc - returns false for string without JSDoc", () => {
  const typeString = "string";
  expect(hasJSDoc(typeString)).toBe(false);
});

Deno.test("hasJSDoc - returns false for empty string", () => {
  const typeString = "";
  expect(hasJSDoc(typeString)).toBe(false);
});

Deno.test("hasJSDoc - returns false for regular comments", () => {
  const typeString = "// This is a regular comment\nstring";
  expect(hasJSDoc(typeString)).toBe(false);
});

Deno.test("hasJSDoc - returns false for block comments", () => {
  const typeString = "/* This is a block comment */ string";
  expect(hasJSDoc(typeString)).toBe(false);
});

Deno.test("hasJSDoc - returns true for multiple JSDoc blocks", () => {
  const typeString = "/** First */ string | /** Second */ number";
  expect(hasJSDoc(typeString)).toBe(true);
});

Deno.test("hasJSDoc - returns false for incomplete JSDoc marker", () => {
  const typeString = "/* This is not a JSDoc */ string";
  expect(hasJSDoc(typeString)).toBe(false);
});

Deno.test("hasJSDoc - returns true for JSDoc with special characters", () => {
  const typeString = "/** User's email & info */ string";
  expect(hasJSDoc(typeString)).toBe(true);
});

Deno.test("hasJSDoc - returns true for JSDoc with tags", () => {
  const typeString = "/** @format date-time */ string";
  expect(hasJSDoc(typeString)).toBe(true);
});
