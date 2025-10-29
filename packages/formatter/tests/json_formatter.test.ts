import { expect } from "@std/expect";
import { JsonFormatter } from "../src/mod.ts";
import { outdent } from "@cspotcode/outdent";

Deno.test("JsonFormatter - smoke test", async () => {
  const formatter = new JsonFormatter({ lineWidth: 50 });
  const input = `{"name":"John","age":30,"city":"New York","hobbies":["reading","swimming","coding"]}`;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    {
      "name": "John",
      "age": 30,
      "city": "New York",
      "hobbies": ["reading", "swimming", "coding"]
    }

  `);
});
