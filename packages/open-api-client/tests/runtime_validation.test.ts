import { expect } from "@std/expect";
import { FunctionalClientGenerator } from "../src/mod.ts";
import { evaluateGeneratedCode, MockApiServer } from "./test_utils.ts";

Deno.test("runtime-validation: generates schemas and validates successfully", async () => {
  const generator = new FunctionalClientGenerator({
    validateRequests: true,
    validateResponses: true,
  });
  const generatedCode = await generator.generateFromFile(
    `${import.meta.dirname}/../examples/contrived-apis/runtime-validation.yaml`,
  );

  expect(generatedCode).toContain("import { z } from");
  expect(generatedCode).toContain("requestSchema:");
  expect(generatedCode).toContain("responseSchema: {");
  expect(generatedCode).toContain("z.string().regex(");
  expect(generatedCode).toContain("new RegExp(");

  // Verify code compiles and can be evaluated
  const exports = await evaluateGeneratedCode(generatedCode);
  expect(exports.postTimesheet).toBeDefined();
  expect(exports.createClient).toBeDefined();

  // Test with valid data
  const mockServer = new MockApiServer();
  mockServer.on("post", "/timesheet", () => {
    return new Response(
      JSON.stringify({
        id: "123e4567-e89b-12d3-a456-426614174000",
        startDate: "2024-01-15",
        endDate: "2024-01-19",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const client = (exports.createClient as (config: unknown) => {
    postTimesheet: (req: unknown) => Promise<unknown>;
  })({
    baseUrl: "https://api.example.com",
    fetch: mockServer.getFetchImpl(),
  });

  // Valid request with proper date format
  const response = await client.postTimesheet({
    body: {
      startDate: "2024-01-15",
      durationInDays: 5,
    },
  });

  expect(response).toBeDefined();
});

Deno.test("runtime-validation: rejects invalid request", async () => {
  const generator = new FunctionalClientGenerator({
    validateRequests: true,
    validateResponses: true,
  });
  const generatedCode = await generator.generateFromFile(
    `${import.meta.dirname}/../examples/contrived-apis/runtime-validation.yaml`,
  );

  const exports = await evaluateGeneratedCode(generatedCode);

  const mockServer = new MockApiServer();

  // Create client using new API
  const client = (exports.createClient as (config: unknown) => {
    postTimesheet: (req: unknown) => Promise<unknown>;
  })({
    baseUrl: "https://api.example.com",
    fetch: mockServer.getFetchImpl(),
  });

  // Invalid request (bad date format)
  try {
    await client.postTimesheet({
      body: {
        startDate: "invalid-date",
        durationInDays: 5,
      },
    });
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    expect((error as Error).message).toContain("validation failed");
  }
});
