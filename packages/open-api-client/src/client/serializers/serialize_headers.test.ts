import { expect } from "@std/expect";
import { serializeHeaders } from "./serialize_headers.ts";

Deno.test("serializeHeaders - Single header", () => {
  const result = serializeHeaders(
    { "X-API-Key": "sk_test_123456" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-API-Key",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("X-API-Key")).toBe("sk_test_123456");
});

Deno.test("serializeHeaders - Multiple headers", () => {
  const result = serializeHeaders(
    { "X-API-Key": "secret", "X-Request-ID": "12345" },
    {
      path: "",
      method: "",
      parameters: [
        {
          name: "X-API-Key",
          location: "header",
          style: "simple",
          explode: false,
        },
        {
          name: "X-Request-ID",
          location: "header",
          style: "simple",
          explode: false,
        },
      ],
    },
  );

  expect(result.get("X-API-Key")).toBe("secret");
  expect(result.get("X-Request-ID")).toBe("12345");
});

Deno.test("serializeHeaders - Number value", () => {
  const result = serializeHeaders(
    { "X-Rate-Limit": 42 },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-Rate-Limit",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("X-Rate-Limit")).toBe("42");
});

Deno.test("serializeHeaders - Boolean value", () => {
  const result = serializeHeaders(
    { "X-Debug": true },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-Debug",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("X-Debug")).toBe("true");
});

Deno.test("serializeHeaders - Array value (explode: false)", () => {
  const result = serializeHeaders(
    { "Accept": ["application/json", "text/plain"] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "Accept",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("Accept")).toBe("application/json,text/plain");
});

Deno.test("serializeHeaders - Array value (explode: true)", () => {
  const result = serializeHeaders(
    { "Accept": ["application/json", "text/plain"] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "Accept",
        location: "header",
        style: "simple",
        explode: true,
      }],
    },
  );

  // For arrays in simple style, explode has no effect
  expect(result.get("Accept")).toBe("application/json,text/plain");
});

Deno.test("serializeHeaders - Array with numbers", () => {
  const result = serializeHeaders(
    { "X-Values": [1, 2, 3] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-Values",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("X-Values")).toBe("1,2,3");
});

Deno.test("serializeHeaders - Object value (explode: false)", () => {
  const result = serializeHeaders(
    { "X-User-Context": { role: "admin", level: "5" } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-User-Context",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("X-User-Context")).toBe("role,admin,level,5");
});

Deno.test("serializeHeaders - Object value (explode: true)", () => {
  const result = serializeHeaders(
    { "X-User-Context": { role: "admin", level: "5" } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-User-Context",
        location: "header",
        style: "simple",
        explode: true,
      }],
    },
  );

  expect(result.get("X-User-Context")).toBe("role=admin,level=5");
});

Deno.test("serializeHeaders - Object with numbers (explode: true)", () => {
  const result = serializeHeaders(
    { "X-Metadata": { count: 42, active: true } },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-Metadata",
        location: "header",
        style: "simple",
        explode: true,
      }],
    },
  );

  expect(result.get("X-Metadata")).toBe("count=42,active=true");
});

Deno.test("serializeHeaders - Special characters preserved", () => {
  const result = serializeHeaders(
    { "Authorization": "Bearer abc-123_xyz.456" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "Authorization",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("Authorization")).toBe("Bearer abc-123_xyz.456");
});

Deno.test("serializeHeaders - Spaces in values preserved", () => {
  const result = serializeHeaders(
    { "User-Agent": "My Application v1.0" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "User-Agent",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("User-Agent")).toBe("My Application v1.0");
});

Deno.test("serializeHeaders - Empty array", () => {
  const result = serializeHeaders(
    { "X-Empty": [] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-Empty",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("X-Empty")).toBe("");
});

Deno.test("serializeHeaders - Empty object (explode: false)", () => {
  const result = serializeHeaders(
    { "X-Empty": {} },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-Empty",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("X-Empty")).toBe("");
});

Deno.test("serializeHeaders - Empty object (explode: true)", () => {
  const result = serializeHeaders(
    { "X-Empty": {} },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-Empty",
        location: "header",
        style: "simple",
        explode: true,
      }],
    },
  );

  expect(result.get("X-Empty")).toBe("");
});

Deno.test("serializeHeaders - Empty values", () => {
  const result = serializeHeaders({}, {
    path: "",
    method: "",
    parameters: [],
  });

  expect(Array.from(result.keys()).length).toBe(0);
});

Deno.test("serializeHeaders - Default style (no metadata)", () => {
  const result = serializeHeaders(
    { "X-Custom": "value", "X-Array": [1, 2] },
    {
      path: "",
      method: "",
      parameters: [],
    },
  );

  // Should default to simple style with explode false
  expect(result.get("X-Custom")).toBe("value");
  expect(result.get("X-Array")).toBe("1,2");
});

Deno.test("serializeHeaders - Mixed value types", () => {
  const result = serializeHeaders(
    {
      "X-API-Key": "sk_123",
      "Accept": ["application/json", "text/plain"],
      "X-Context": { role: "admin", id: 42 },
      "X-Debug": true,
    },
    {
      path: "",
      method: "",
      parameters: [
        {
          name: "X-API-Key",
          location: "header",
          style: "simple",
          explode: false,
        },
        { name: "Accept", location: "header", style: "simple", explode: false },
        {
          name: "X-Context",
          location: "header",
          style: "simple",
          explode: true,
        },
        {
          name: "X-Debug",
          location: "header",
          style: "simple",
          explode: false,
        },
      ],
    },
  );

  expect(result.get("X-API-Key")).toBe("sk_123");
  expect(result.get("Accept")).toBe("application/json,text/plain");
  expect(result.get("X-Context")).toBe("role=admin,id=42");
  expect(result.get("X-Debug")).toBe("true");
});

Deno.test("serializeHeaders - Case sensitivity preserved", () => {
  const result = serializeHeaders(
    { "X-Custom-Header": "Value" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "X-Custom-Header",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  // Header names preserve case (though HTTP is case-insensitive)
  expect(result.get("X-Custom-Header")).toBe("Value");
  expect(result.get("x-custom-header")).toBe("Value"); // Case-insensitive lookup
});

Deno.test("serializeHeaders - Undefined values are skipped", () => {
  // deno-lint-ignore no-explicit-any
  const values: any = {
    "X-Key": "value",
    "X-Skip": undefined,
    "X-Other": "data",
  };
  const result = serializeHeaders(
    values,
    {
      path: "",
      method: "",
      parameters: [
        { name: "X-Key", location: "header", style: "simple", explode: false },
        { name: "X-Skip", location: "header", style: "simple", explode: false },
        {
          name: "X-Other",
          location: "header",
          style: "simple",
          explode: false,
        },
      ],
    },
  );

  expect(result.get("X-Key")).toBe("value");
  expect(result.get("X-Skip")).toBe(null);
  expect(result.get("X-Other")).toBe("data");
});

Deno.test("serializeHeaders - Rejects non-simple style", () => {
  expect(() => {
    serializeHeaders(
      { "X-Custom": "value" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "X-Custom",
          location: "header",
          // deno-lint-ignore no-explicit-any
          style: "matrix" as any,
          explode: false,
        }],
      },
    );
  }).toThrow("Unsupported header parameter style: matrix");
});

Deno.test("serializeHeaders - Rejects label style", () => {
  expect(() => {
    serializeHeaders(
      { "X-Custom": "value" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "X-Custom",
          location: "header",
          // deno-lint-ignore no-explicit-any
          style: "label" as any,
          explode: false,
        }],
      },
    );
  }).toThrow("Unsupported header parameter style: label");
});

Deno.test("serializeHeaders - Rejects newlines in values", () => {
  expect(() => {
    serializeHeaders(
      { "X-Custom": "value\nwith\nnewlines" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "X-Custom",
          location: "header",
          style: "simple",
          explode: false,
        }],
      },
    );
  }).toThrow("Header values cannot contain newlines or null bytes");
});

Deno.test("serializeHeaders - Rejects carriage returns in values", () => {
  expect(() => {
    serializeHeaders(
      { "X-Custom": "value\rwith\rreturns" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "X-Custom",
          location: "header",
          style: "simple",
          explode: false,
        }],
      },
    );
  }).toThrow("Header values cannot contain newlines or null bytes");
});

Deno.test("serializeHeaders - Rejects null bytes in values", () => {
  expect(() => {
    serializeHeaders(
      { "X-Custom": "value\0with\0null" },
      {
        path: "",
        method: "",
        parameters: [{
          name: "X-Custom",
          location: "header",
          style: "simple",
          explode: false,
        }],
      },
    );
  }).toThrow("Header values cannot contain newlines or null bytes");
});

Deno.test("serializeHeaders - Real-world Authorization header", () => {
  const result = serializeHeaders(
    { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" },
    {
      path: "",
      method: "",
      parameters: [{
        name: "Authorization",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("Authorization")).toBe(
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  );
});

Deno.test("serializeHeaders - Real-world Accept header with multiple types", () => {
  const result = serializeHeaders(
    { "Accept": ["application/json", "application/xml", "text/plain"] },
    {
      path: "",
      method: "",
      parameters: [{
        name: "Accept",
        location: "header",
        style: "simple",
        explode: false,
      }],
    },
  );

  expect(result.get("Accept")).toBe(
    "application/json,application/xml,text/plain",
  );
});
