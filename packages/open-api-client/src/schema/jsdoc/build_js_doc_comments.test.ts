import { expect } from "@std/expect";
import { buildJsDocComments, escapeForJsDoc } from "./build_js_doc_comments.ts";

// Tests for escapeForJsDoc
Deno.test("escapeForJsDoc - escapes */ sequence", () => {
  const input = "release/*/*";
  const result = escapeForJsDoc(input);
  expect(result).toBe("release/*\\/*");
});

Deno.test("escapeForJsDoc - does not escape /* sequence", () => {
  const input = "/* comment */";
  const result = escapeForJsDoc(input);
  expect(result).toBe("/* comment *\\/");
});

Deno.test("escapeForJsDoc - handles string without special characters", () => {
  const input = "Simple description text";
  const result = escapeForJsDoc(input);
  expect(result).toBe("Simple description text");
});

Deno.test("escapeForJsDoc - escapes multiple */ sequences", () => {
  const input = "First */ and second */ sequence";
  const result = escapeForJsDoc(input);
  expect(result).toBe("First *\\/ and second *\\/ sequence");
});

Deno.test("escapeForJsDoc - handles empty string", () => {
  const input = "";
  const result = escapeForJsDoc(input);
  expect(result).toBe("");
});

Deno.test("escapeForJsDoc - handles complex example from issue", () => {
  const input =
    "Wildcard characters will not match `/`. For example, to match branches that begin with `release/` and contain an additional single slash, use `release/*/*`.";
  const result = escapeForJsDoc(input);
  expect(result).toBe(
    "Wildcard characters will not match `/`. For example, to match branches that begin with `release/` and contain an additional single slash, use `release/*\\/*`.",
  );
});

Deno.test("escapeForJsDoc - handles text with both /* and */", () => {
  const input = "Start /* middle */ end";
  const result = escapeForJsDoc(input);
  expect(result).toBe("Start /* middle *\\/ end");
});

Deno.test("escapeForJsDoc - preserves newlines", () => {
  const input = "Line 1\nLine 2\nLine 3";
  const result = escapeForJsDoc(input);
  expect(result).toBe("Line 1\nLine 2\nLine 3");
});

Deno.test("escapeForJsDoc - handles asterisk without slash", () => {
  const input = "This * is * fine";
  const result = escapeForJsDoc(input);
  expect(result).toBe("This * is * fine");
});

Deno.test("escapeForJsDoc - handles slash without asterisk", () => {
  const input = "path/to/file";
  const result = escapeForJsDoc(input);
  expect(result).toBe("path/to/file");
});

// Tests for buildJsDocComments
Deno.test("buildJsDocComments - returns null when no documentation", () => {
  const schema = {
    type: "string",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBeNull();
});

Deno.test("buildJsDocComments - returns null for empty schema", () => {
  const schema = {};

  const result = buildJsDocComments(schema);
  expect(result).toBeNull();
});

Deno.test("buildJsDocComments - handles format only", () => {
  const schema = {
    type: "string",
    format: "email",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe("/** @format email */");
});

Deno.test("buildJsDocComments - handles single-line description only", () => {
  const schema = {
    type: "string",
    description: "User email address",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe("/** User email address */");
});

Deno.test("buildJsDocComments - handles single-line description with format", () => {
  const schema = {
    type: "string",
    description: "User email address",
    format: "email",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * User email address
 *
 * @format email
 */`,
  );
});

Deno.test("buildJsDocComments - handles multi-line description", () => {
  const schema = {
    type: "string",
    description: "User email address\nMust be a valid email format",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * User email address
 * Must be a valid email format
 */`,
  );
});

Deno.test("buildJsDocComments - handles multi-line description with format", () => {
  const schema = {
    type: "string",
    description: "User email address\nMust be a valid email format",
    format: "email",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * User email address
 * Must be a valid email format
 *
 * @format email
 */`,
  );
});

Deno.test("buildJsDocComments - handles summary and description", () => {
  const schema = {
    type: "object",
    summary: "User Profile",
    description: "Contains user information and preferences",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * User Profile
 *
 * Contains user information and preferences
 */`,
  );
});

Deno.test("buildJsDocComments - handles summary, description, and format", () => {
  const schema = {
    type: "string",
    summary: "Email Field",
    description: "User email address",
    format: "email",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * Email Field
 *
 * User email address
 *
 * @format email
 */`,
  );
});

Deno.test("buildJsDocComments - handles summary only", () => {
  const schema = {
    type: "object",
    summary: "User Profile",
  };

  const result = buildJsDocComments(schema);
  // Summary without description results in empty JSDoc
  expect(result).toBe("");
});

Deno.test("buildJsDocComments - handles summary with format but no description", () => {
  const schema = {
    type: "string",
    summary: "Email Field",
    format: "email",
  };

  const result = buildJsDocComments(schema);
  // Summary without description results in only format tag
  expect(result).toBe("/** @format email */");
});

Deno.test("buildJsDocComments - handles description with multiple newlines", () => {
  const schema = {
    type: "string",
    description: "Line 1\nLine 2\nLine 3",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * Line 1
 * Line 2
 * Line 3
 */`,
  );
});

Deno.test("buildJsDocComments - handles empty description", () => {
  const schema = {
    type: "string",
    description: "",
  };

  const result = buildJsDocComments(schema);
  // Empty description is treated as no documentation
  expect(result).toBeNull();
});

Deno.test("buildJsDocComments - handles description with empty lines", () => {
  const schema = {
    type: "string",
    description: "Line 1\n\nLine 3",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * Line 1
 * 
 * Line 3
 */`,
  );
});

Deno.test("buildJsDocComments - handles format with special characters", () => {
  const schema = {
    type: "string",
    format: "date-time",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe("/** @format date-time */");
});

Deno.test("buildJsDocComments - handles description with special characters", () => {
  const schema = {
    type: "string",
    description: "User's email & contact information",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe("/** User's email & contact information */");
});

Deno.test("buildJsDocComments - ignores other schema properties", () => {
  const schema = {
    type: "string",
    minLength: 5,
    maxLength: 100,
    pattern: "^[a-z]+$",
    description: "Username",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe("/** Username */");
});

Deno.test("buildJsDocComments - handles numeric format value", () => {
  const schema = {
    type: "string",
    format: 123,
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe("/** @format 123 */");
});

Deno.test("buildJsDocComments - handles description with leading/trailing spaces", () => {
  const schema = {
    type: "string",
    description: "  User email  ",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe("/**   User email   */");
});

Deno.test("buildJsDocComments - handles very long single-line description", () => {
  const schema = {
    type: "string",
    description:
      "This is a very long description that contains a lot of information about the field and its purpose in the system",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    "/** This is a very long description that contains a lot of information about the field and its purpose in the system */",
  );
});

Deno.test("buildJsDocComments - escapes */ in description", () => {
  const schema = {
    type: "string",
    description: "Use release/*/* pattern",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe("/** Use release/*\\/* pattern */");
});

Deno.test("buildJsDocComments - escapes /* and */ in multi-line description", () => {
  const schema = {
    type: "string",
    description: "Line 1 with /*\nLine 2 with */\nLine 3",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * Line 1 with /*
 * Line 2 with *\\/
 * Line 3
 */`,
  );
});

Deno.test("buildJsDocComments - escapes */ in summary", () => {
  const schema = {
    type: "string",
    summary: "Pattern */",
    description: "Branch pattern",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * Pattern *\\/
 *
 * Branch pattern
 */`,
  );
});

Deno.test("buildJsDocComments - escapes */ in format", () => {
  const schema = {
    type: "string",
    description: "Test value",
    format: "custom-*/",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * Test value
 *
 * @format custom-*\\/
 */`,
  );
});

Deno.test("buildJsDocComments - handles real-world example from issue", () => {
  const schema = {
    type: "string",
    description:
      "The name pattern that branches must match in order to deploy to the environment.\n\nWildcard characters will not match `/`. For example, to match branches that begin with `release/` and contain an additional single slash, use `release/*/*`.\nFor more information about pattern matching syntax, see the [Ruby File.fnmatch documentation](https://ruby-doc.org/core-2.5.1/File.html#method-c-fnmatch).",
  };

  const result = buildJsDocComments(schema);
  expect(result).toBe(
    `/**
 * The name pattern that branches must match in order to deploy to the environment.
 * 
 * Wildcard characters will not match \`/\`. For example, to match branches that begin with \`release/\` and contain an additional single slash, use \`release/*\\/*\`.
 * For more information about pattern matching syntax, see the [Ruby File.fnmatch documentation](https://ruby-doc.org/core-2.5.1/File.html#method-c-fnmatch).
 */`,
  );
});
