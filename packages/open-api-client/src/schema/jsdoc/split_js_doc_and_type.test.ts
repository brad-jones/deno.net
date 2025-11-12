import { expect } from "@std/expect";
import { splitJSDocAndType } from "./split_js_doc_and_type.ts";

Deno.test("splitJSDocAndType - splits single-line JSDoc and type", () => {
  const typeString = "/** User email address */\nstring";
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual(["/** User email address */"]);
  expect(result.typeLine).toBe("string");
});

Deno.test("splitJSDocAndType - splits multi-line JSDoc and type", () => {
  const typeString = `/**
 * User email address
 * @format email
 */
string`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/**",
    " * User email address",
    " * @format email",
    " */",
  ]);
  expect(result.typeLine).toBe("string");
});

Deno.test("splitJSDocAndType - handles type without JSDoc", () => {
  const typeString = "string";
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([]);
  expect(result.typeLine).toBe("string");
});

Deno.test("splitJSDocAndType - handles empty string", () => {
  const typeString = "";
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([]);
  expect(result.typeLine).toBe("");
});

Deno.test("splitJSDocAndType - handles JSDoc without following type", () => {
  const typeString = `/**
 * Description
 */`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/**",
    " * Description",
    " */",
  ]);
  expect(result.typeLine).toBe("");
});

Deno.test("splitJSDocAndType - handles multi-line type after JSDoc", () => {
  const typeString = `/**
 * User object
 */
{
  name: string;
  age: number;
}`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/**",
    " * User object",
    " */",
  ]);
  expect(result.typeLine).toBe(`{
  name: string;
  age: number;
}`);
});

Deno.test("splitJSDocAndType - trims whitespace from type line", () => {
  const typeString = `/**
 * Description
 */

string`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/**",
    " * Description",
    " */",
  ]);
  expect(result.typeLine).toBe("string");
});

Deno.test("splitJSDocAndType - handles JSDoc with empty lines", () => {
  const typeString = `/**
 * Line 1
 *
 * Line 3
 */
string`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/**",
    " * Line 1",
    " *",
    " * Line 3",
    " */",
  ]);
  expect(result.typeLine).toBe("string");
});

Deno.test("splitJSDocAndType - handles multi-line type with braces", () => {
  const typeString = `/**
 * Complex type
 */
Array<{
  id: number;
  data: string;
}>`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/**",
    " * Complex type",
    " */",
  ]);
  expect(result.typeLine).toBe(`Array<{
  id: number;
  data: string;
}>`);
});

Deno.test("splitJSDocAndType - handles JSDoc with special characters", () => {
  const typeString = `/**
 * User's email & contact
 * @format email
 */
string`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/**",
    " * User's email & contact",
    " * @format email",
    " */",
  ]);
  expect(result.typeLine).toBe("string");
});

Deno.test("splitJSDocAndType - handles block comment (not JSDoc)", () => {
  const typeString = `/*
 * Not a JSDoc
 */
string`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/*",
    " * Not a JSDoc",
    " */",
  ]);
  expect(result.typeLine).toBe("string");
});

Deno.test("splitJSDocAndType - handles type line with multiple lines and newlines", () => {
  const typeString = `/**
 * Union type
 */
string |
number |
boolean`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "/**",
    " * Union type",
    " */",
  ]);
  expect(result.typeLine).toBe(`string |
number |
boolean`);
});

Deno.test("splitJSDocAndType - handles indented JSDoc", () => {
  const typeString = `  /**
   * Indented description
   */
  string`;
  const result = splitJSDocAndType(typeString);

  expect(result.jsdocLines).toEqual([
    "  /**",
    "   * Indented description",
    "   */",
  ]);
  expect(result.typeLine).toBe("string");
});
