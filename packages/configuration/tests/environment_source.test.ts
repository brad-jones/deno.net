import { expect } from "@std/expect";
import { EnvironmentSource } from "../src/mod.ts";

Deno.test("EnvironmentSource - reads environment variables with hierarchical naming", async () => {
  // Setup test environment variables
  Deno.env.set("MY_APP__DATABASE_HOST", "localhost");
  Deno.env.set("MY_APP__DATABASE_PORT", "5432");
  Deno.env.set("MY_APP__DATABASE_SSL_ENABLED", "true");
  Deno.env.set("OTHER_VAR", "should-be-ignored");

  const source = new EnvironmentSource();

  // Test reading a section
  const result = await source.read(["myApp", "database"]);

  expect(result).toEqual({
    host: "localhost",
    port: "5432",
    sslEnabled: "true",
  });

  // Cleanup
  Deno.env.delete("MY_APP__DATABASE_HOST");
  Deno.env.delete("MY_APP__DATABASE_PORT");
  Deno.env.delete("MY_APP__DATABASE_SSL_ENABLED");
  Deno.env.delete("OTHER_VAR");
});

Deno.test("EnvironmentSource - returns empty object for non-matching section", async () => {
  const source = new EnvironmentSource();

  const result = await source.read(["nonexistent", "section"]);

  expect(result).toEqual({});
});

Deno.test("EnvironmentSource - handles single section level", async () => {
  Deno.env.set("APP_NAME", "test-app");
  Deno.env.set("APP_VERSION", "1.0.0");

  const source = new EnvironmentSource();

  const result = await source.read(["app"]);

  expect(result).toEqual({
    name: "test-app",
    version: "1.0.0",
  });

  // Cleanup
  Deno.env.delete("APP_NAME");
  Deno.env.delete("APP_VERSION");
});

Deno.test("EnvironmentSource - camelCase conversion works correctly", async () => {
  Deno.env.set("TEST__MULTI_WORD_KEY", "value1");
  Deno.env.set("TEST__ANOTHER_LONG_KEY_NAME", "value2");
  Deno.env.set("TEST__SIMPLE", "value3");

  const source = new EnvironmentSource();

  const result = await source.read(["test"]);

  expect(result).toEqual({
    multiWordKey: "value1",
    anotherLongKeyName: "value2",
    simple: "value3",
  });

  // Cleanup
  Deno.env.delete("TEST__MULTI_WORD_KEY");
  Deno.env.delete("TEST__ANOTHER_LONG_KEY_NAME");
  Deno.env.delete("TEST__SIMPLE");
});
