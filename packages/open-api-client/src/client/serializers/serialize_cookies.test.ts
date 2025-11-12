import { expect } from "@std/expect";
import { serializeCookies } from "./serialize_cookies.ts";

Deno.test("serializeCookies - Single primitive string", () => {
  const result = serializeCookies(
    { sessionId: "abc123" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "sessionId",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("sessionId=abc123");
});

Deno.test("serializeCookies - Single primitive number", () => {
  const result = serializeCookies(
    { userId: 42 },
    {
      path: "",
      method: "",
      parameters: [{
        name: "userId",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("userId=42");
});

Deno.test("serializeCookies - Single boolean", () => {
  const result = serializeCookies(
    { loggedIn: true },
    {
      path: "",
      method: "",
      parameters: [{
        name: "loggedIn",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("loggedIn=true");
});

Deno.test("serializeCookies - Multiple cookies", () => {
  const result = serializeCookies(
    { sessionId: "abc123", userId: "42", theme: "dark" },
    {
      path: "",
      method: "",
      parameters: [
        {
          name: "sessionId",
          location: "cookie",
          style: "form",
          explode: false,
        },
        { name: "userId", location: "cookie", style: "form", explode: false },
        { name: "theme", location: "cookie", style: "form", explode: false },
      ],
    },
  );

  expect(result).toBe("sessionId=abc123; userId=42; theme=dark");
});

Deno.test("serializeCookies - Array (explode: false)", () => {
  const result = serializeCookies(
    { preferences: ["dark", "compact", "sound"] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "preferences",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("preferences=dark%2Ccompact%2Csound");
});

Deno.test("serializeCookies - Array with numbers", () => {
  const result = serializeCookies(
    { values: [1, 2, 3] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "values",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("values=1%2C2%2C3");
});

Deno.test("serializeCookies - Array (explode: true)", () => {
  const result = serializeCookies(
    { preferences: ["dark", "compact"] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "preferences",
        location: "cookie",
        style: "form",
        explode: true,
      }],
    },
  );

  // With explode: true, still uses comma-separated (not practical to split in cookies)
  expect(result).toBe("preferences=dark%2Ccompact");
});

Deno.test("serializeCookies - Object (explode: false)", () => {
  const result = serializeCookies(
    { user: { id: "123", role: "admin" } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "user",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("user=id%2C123%2Crole%2Cadmin");
});

Deno.test("serializeCookies - Object (explode: true) as JSON", () => {
  const result = serializeCookies(
    { user: { id: "123", role: "admin" } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "user",
        location: "cookie",
        style: "form",
        explode: true,
      }],
    },
  );

  // With explode: true, serialize as JSON
  expect(result).toBe(
    "user=%7B%22id%22%3A%22123%22%2C%22role%22%3A%22admin%22%7D",
  );
});

Deno.test("serializeCookies - Object with numbers (explode: true)", () => {
  const result = serializeCookies(
    { metadata: { count: 42, active: true } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "metadata",
        location: "cookie",
        style: "form",
        explode: true,
      }],
    },
  );

  // JSON serialization
  expect(result).toBe("metadata=%7B%22count%22%3A42%2C%22active%22%3Atrue%7D");
});

Deno.test("serializeCookies - Empty values object", () => {
  const result = serializeCookies(
    {},
    {
      path: "",
      method: "",
      parameters: [{
        name: "sessionId",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("");
});

Deno.test("serializeCookies - Empty parameters array", () => {
  const result = serializeCookies(
    { sessionId: "abc123" },
    {
      path: "",
      method: "",
      parameters: [],
    },
  );

  expect(result).toBe("");
});

Deno.test("serializeCookies - Empty array value", () => {
  const result = serializeCookies(
    { empty: [] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "empty",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("empty=");
});

Deno.test("serializeCookies - Empty object value (explode: false)", () => {
  const result = serializeCookies(
    { empty: {} },
    {
      path: "",
      method: "",
      parameters: [{
        name: "empty",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("empty=");
});

Deno.test("serializeCookies - Empty object value (explode: true)", () => {
  const result = serializeCookies(
    { empty: {} },
    {
      path: "",
      method: "",
      parameters: [{
        name: "empty",
        location: "cookie",
        style: "form",
        explode: true,
      }],
    },
  );

  // JSON serialization of empty object
  expect(result).toBe("empty=%7B%7D");
});

Deno.test("serializeCookies - Special characters are encoded", () => {
  const result = serializeCookies(
    { message: "hello, world; test" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "message",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  // Commas, semicolons, and spaces should be percent-encoded
  expect(result).toBe("message=hello%2C%20world%3B%20test");
});

Deno.test("serializeCookies - Backslash and quotes encoded", () => {
  const result = serializeCookies(
    { path: 'C:\\Users\\test"file"' },
    {
      path: "",
      method: "",
      parameters: [{
        name: "path",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("path=C%3A%5CUsers%5Ctest%22file%22");
});

Deno.test("serializeCookies - Percent sign encoded", () => {
  const result = serializeCookies(
    { discount: "50% off" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "discount",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("discount=50%25%20off");
});

Deno.test("serializeCookies - Rejects non-form style", () => {
  expect(() => {
    serializeCookies(
      { test: "value" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "test",
          location: "cookie",
          // deno-lint-ignore no-explicit-any
          style: "simple" as any,
          explode: false,
        }],
      },
    );
  }).toThrow("Unsupported cookie parameter style: simple");
});

Deno.test("serializeCookies - Rejects matrix style", () => {
  expect(() => {
    serializeCookies(
      { test: "value" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "test",
          location: "cookie",
          // deno-lint-ignore no-explicit-any
          style: "matrix" as any,
          explode: false,
        }],
      },
    );
  }).toThrow("Unsupported cookie parameter style: matrix");
});

Deno.test("serializeCookies - Default style is form", () => {
  const result = serializeCookies(
    { testCookie: "test-value" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "testCookie",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  // Defaults to form style
  expect(result).toBe("testCookie=test-value");
});

Deno.test("serializeCookies - Undefined value skipped", () => {
  // deno-lint-ignore no-explicit-any
  const values: any = { sessionId: "abc123", userId: undefined, theme: "dark" };
  const result = serializeCookies(
    values,
    {
      path: "",
      method: "",
      parameters: [
        {
          name: "sessionId",
          location: "cookie",
          style: "form",
          explode: false,
        },
        { name: "userId", location: "cookie", style: "form", explode: false },
        { name: "theme", location: "cookie", style: "form", explode: false },
      ],
    },
  );

  expect(result).toBe("sessionId=abc123; theme=dark");
});

Deno.test("serializeCookies - Invalid cookie name with space throws error", () => {
  expect(() => {
    serializeCookies(
      { "invalid name": "test" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "invalid name",
          location: "cookie",
          style: "form",
          explode: false,
        }],
      },
    );
  }).toThrow("Invalid cookie name: invalid name");
});

Deno.test("serializeCookies - Invalid cookie name with comma throws error", () => {
  expect(() => {
    serializeCookies(
      { "invalid,name": "test" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "invalid,name",
          location: "cookie",
          style: "form",
          explode: false,
        }],
      },
    );
  }).toThrow("Invalid cookie name: invalid,name");
});

Deno.test("serializeCookies - Invalid cookie name with semicolon throws error", () => {
  expect(() => {
    serializeCookies(
      { "invalid;name": "test" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "invalid;name",
          location: "cookie",
          style: "form",
          explode: false,
        }],
      },
    );
  }).toThrow("Invalid cookie name: invalid;name");
});

Deno.test("serializeCookies - Invalid cookie name with equals throws error", () => {
  expect(() => {
    serializeCookies(
      { "invalid=name": "test" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "invalid=name",
          location: "cookie",
          style: "form",
          explode: false,
        }],
      },
    );
  }).toThrow("Invalid cookie name: invalid=name");
});

Deno.test("serializeCookies - Real-world session cookie", () => {
  const result = serializeCookies(
    { JSESSIONID: "A1B2C3D4E5F6G7H8I9J0" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "JSESSIONID",
        location: "cookie",
        style: "form",
        explode: false,
      }],
    },
  );

  expect(result).toBe("JSESSIONID=A1B2C3D4E5F6G7H8I9J0");
});

Deno.test("serializeCookies - Real-world multiple auth cookies", () => {
  const result = serializeCookies(
    {
      sessionId: "xyz789",
      csrfToken: "abc123def456",
      rememberMe: true,
    },
    {
      path: "",
      method: "",
      parameters: [
        {
          name: "sessionId",
          location: "cookie",
          style: "form",
          explode: false,
        },
        {
          name: "csrfToken",
          location: "cookie",
          style: "form",
          explode: false,
        },
        {
          name: "rememberMe",
          location: "cookie",
          style: "form",
          explode: false,
        },
      ],
    },
  );

  expect(result).toBe(
    "sessionId=xyz789; csrfToken=abc123def456; rememberMe=true",
  );
});

Deno.test("serializeCookies - Mixed value types", () => {
  const result = serializeCookies(
    {
      session: "abc123",
      userId: 42,
      active: true,
      preferences: ["dark", "compact"],
    },
    {
      path: "",
      method: "",
      parameters: [
        { name: "session", location: "cookie", style: "form", explode: false },
        { name: "userId", location: "cookie", style: "form", explode: false },
        { name: "active", location: "cookie", style: "form", explode: false },
        {
          name: "preferences",
          location: "cookie",
          style: "form",
          explode: false,
        },
      ],
    },
  );

  expect(result).toBe(
    "session=abc123; userId=42; active=true; preferences=dark%2Ccompact",
  );
});
