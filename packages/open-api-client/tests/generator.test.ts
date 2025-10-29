import { $ } from "@david/dax";
import { expect } from "@std/expect";
import { OpenAPIClientGenerator } from "../src/generator.ts";

Deno.test("3.0 smoke test", async () => {
  const generator = new OpenAPIClientGenerator({
    importSpecifiers: {
      zod: "@zod/zod",
      baseClient: "@brad-jones/deno-net-open-api-client",
    },
  });

  const inputSpec = `${import.meta.dirname}/fixtures/openapi-3.0.json`;
  const generatedSrcCode = await generator.generateFromFile(inputSpec);
  const generatedOutput = `${import.meta.dirname}/fixtures/openapi-3.0.ts`;
  await Deno.writeTextFile(generatedOutput, generatedSrcCode);

  const result = await $`deno check ${generatedOutput}`.noThrow();
  expect(result.code).toBe(0);
});

Deno.test("3.1 smoke test", async () => {
  const generator = new OpenAPIClientGenerator({
    importSpecifiers: {
      zod: "@zod/zod",
      baseClient: "@brad-jones/deno-net-open-api-client",
    },
  });

  const inputSpec = `${import.meta.dirname}/fixtures/openapi-3.1.json`;
  const generatedSrcCode = await generator.generateFromFile(inputSpec);
  const generatedOutput = `${import.meta.dirname}/fixtures/openapi-3.1.ts`;
  await Deno.writeTextFile(generatedOutput, generatedSrcCode);

  const result = await $`deno check ${generatedOutput}`.noThrow();
  expect(result.code).toBe(0);
});
