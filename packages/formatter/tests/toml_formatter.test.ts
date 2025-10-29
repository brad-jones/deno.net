import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { TomlFormatter } from "../src/mod.ts";

Deno.test("TomlFormatter - smoke test", async () => {
  const formatter = new TomlFormatter();
  const input = `[package]
name="my-project"
version="1.0.0"
authors=["John Doe <john@example.com>"]

[dependencies]
serde="1.0"`;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    [package]
    name = "my-project"
    version = "1.0.0"
    authors = ["John Doe <john@example.com>"]

    [dependencies]
    serde = "1.0"

  `);
});
