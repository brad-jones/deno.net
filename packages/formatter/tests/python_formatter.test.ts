import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { PythonFormatter } from "../src/mod.ts";

Deno.test("PythonFormatter - smoke test", async () => {
  const formatter = new PythonFormatter();
  const input = `def hello(name):
    return f"Hello, {name}!"

result=hello("World")
print(result)`;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    def hello(name):
        return f"Hello, {name}!"


    result = hello("World")
    print(result)

  `);
});
