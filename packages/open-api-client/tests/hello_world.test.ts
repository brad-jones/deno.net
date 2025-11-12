import { expect } from "@std/expect";
import { FunctionalClientGenerator } from "../src/mod.ts";
import { evaluateGeneratedCode, MockApiServer } from "./test_utils.ts";

Deno.test("hello-world: generates and executes correct client", async () => {
  // Generate client from file
  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generateFromFile(
    `${import.meta.dirname}/../examples/contrived-apis/hello-world.yaml`,
  );

  // Verify it contains expected exports
  expect(generatedCode).toContain("export const getHelloName");
  expect(generatedCode).not.toContain("setGlobalConfig"); // Removed in new API
  expect(generatedCode).toContain("export function createClient");
  expect(generatedCode).toContain('path: "/hello/{name}"');
  expect(generatedCode).toContain('method: "get"');

  // Verify types are correct (with correct formatting)
  expect(generatedCode).toMatch(
    /path:\s*\{\s*\/\*\*.*name.*\*\/\s*name:\s*string/s,
  );
  expect(generatedCode).toMatch(/query\?:\s*\{[\s\S]*lastName/);
  expect(generatedCode).toMatch(/200:\s*\{\s*body:\s*\{[\s\S]*message/);
  expect(generatedCode).toMatch(/400:\s*\{\s*body:\s*\{[\s\S]*error/);

  // Evaluate the generated code (includes deno check validation)
  const exports = await evaluateGeneratedCode(generatedCode);

  // Set up mock server
  const mockServer = new MockApiServer();
  mockServer.on("GET", "/hello/John", (req) => {
    const url = new URL(req.url);
    const lastName = url.searchParams.get("lastName");
    return new Response(
      JSON.stringify({ message: `Hello, John ${lastName || ""}` }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  // Create client with config using new API
  const client = (exports.createClient as (config: unknown) => {
    getHelloName: (
      req: unknown,
    ) => Promise<{ status: number; body: { message: string } }>;
  })({
    baseUrl: "https://api.example.com",
    fetch: mockServer.getFetchImpl(),
  });

  // Make request
  const response = await client.getHelloName({
    path: { name: "John" },
    query: { lastName: "Doe" },
  });

  expect(response.status).toBe(200);
  expect(response.body.message).toBe("Hello, John Doe");
});
