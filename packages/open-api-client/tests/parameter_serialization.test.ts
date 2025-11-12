import { expect } from "@std/expect";
import { FunctionalClientGenerator } from "../src/mod.ts";
import { evaluateGeneratedCode, MockApiServer } from "./test_utils.ts";

Deno.test("parameter-serialization: generates and serializes array parameters", async () => {
  const generator = new FunctionalClientGenerator();
  const generatedCode = await generator.generateFromFile(
    `${import.meta.dirname}/../examples/contrived-apis/parameter-serialization.yaml`,
  );

  expect(generatedCode).toContain("export const getPetFindbytags"); // Camel case conversion
  // Parameters use defaults (form, explode:true) so no explicit metadata needed in generated code

  // Evaluate the generated code (includes deno check validation)
  const exports = await evaluateGeneratedCode(generatedCode);

  const mockServer = new MockApiServer();
  mockServer.on("GET", "/pet/findByTags", (req) => {
    const url = new URL(req.url);
    const tags = url.searchParams.getAll("tags");
    expect(tags).toEqual(["red", "blue"]);
    return new Response(
      JSON.stringify([{ id: 1, name: "Red Dog" }, { id: 2, name: "Blue Cat" }]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  // Create client using new API
  const client = (exports.createClient as (config: unknown) => {
    getPetFindbytags: (req: unknown) => Promise<{
      status: number;
      body: Array<{ id: number; name: string }>;
    }>;
  })({
    baseUrl: "https://api.example.com",
    fetch: mockServer.getFetchImpl(),
  });

  const response = await client.getPetFindbytags({
    query: { tags: ["red", "blue"] },
  });

  expect(response.status).toBe(200);
  expect(response.body).toBeInstanceOf(Array);
  expect(response.body.length).toBe(2);
});
