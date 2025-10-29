import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { JavascriptFormatter } from "../src/mod.ts";

Deno.test("JavascriptFormatter - smoke test", async () => {
  const formatter = new JavascriptFormatter();
  const input = `function hello(name){return "Hello, "+name+"!"}const result=hello("World");console.log(result);`;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    function hello(name) {
      return "Hello, " + name + "!";
    }
    const result = hello("World");
    console.log(result);

  `);
});
