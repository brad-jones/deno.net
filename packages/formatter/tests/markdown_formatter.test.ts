import { expect } from "@std/expect";
import { MarkdownFormatter } from "../src/mod.ts";
import { outdent } from "@cspotcode/outdent";

Deno.test("MarkdownFormatter - smoke test", async () => {
  const formatter = new MarkdownFormatter();
  const input = `# Hello World

This is a **markdown** document with some *formatting*.

- List item 1
- List item 2
  - Nested item

\`\`\`javascript
const hello = "world";
\`\`\``;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    # Hello World

    This is a **markdown** document with some _formatting_.

    - List item 1
    - List item 2
      - Nested item

    \`\`\`javascript
    const hello = "world";
    \`\`\`

    `);
});
