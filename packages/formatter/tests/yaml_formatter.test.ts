import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { YamlFormatter } from "../src/mod.ts";

Deno.test("YamlFormatter - smoke test", async () => {
  const formatter = new YamlFormatter();
  const input = `name: my-project
version: 1.0.0
dependencies:
  - serde
  - tokio
config:
  host: localhost
  port: 8080`;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    name: my-project
    version: 1.0.0
    dependencies:
      - serde
      - tokio
    config:
      host: localhost
      port: 8080

  `);
});
