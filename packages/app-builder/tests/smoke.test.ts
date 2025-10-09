import { expect } from "@std/expect";
import { ApiAppBuilder } from "../src/mod.ts";

Deno.test("SmokeTest", async () => {
  const builder = new ApiAppBuilder();
  builder.routes.mapGet("/ping", (ctx) => ctx.json({ ping: "pong" }));
  const { server, client } = await builder.run();
  const result = await client.get("ping").json();
  expect(result).toMatchObject({ ping: "pong" });
  await server.shutdown();
});
