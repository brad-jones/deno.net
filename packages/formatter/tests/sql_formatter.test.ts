import { expect } from "@std/expect";
import { SqlFormatter } from "../src/mod.ts";
import { outdent } from "@cspotcode/outdent";

Deno.test("SqlFormatter - smoke test", async () => {
  const formatter = new SqlFormatter();
  const input =
    `SELECT u.name,u.email,p.title FROM users u JOIN posts p ON u.id=p.user_id WHERE u.active=true ORDER BY p.created_at DESC;`;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    SELECT
      u.name,
      u.email,
      p.title
    FROM
      users u
      JOIN posts p ON u.id = p.user_id
    WHERE
      u.active = true
    ORDER BY
      p.created_at DESC;

    `);
});
