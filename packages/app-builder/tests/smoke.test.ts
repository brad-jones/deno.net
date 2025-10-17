import { expect } from "@std/expect";
import { ApiAppBuilder, fromJson, fromPath } from "../src/mod.ts";
import z from "@zod/zod";

Deno.test("SmokeTest", async () => {
  const builder = new ApiAppBuilder();
  builder.routes.mapGet("/ping", (ctx) => ctx.json({ ping: "pong" }));
  await using app = await builder.run();
  const result = await app.client.get("ping").json();
  expect(result).toMatchObject({ ping: "pong" });
});

Deno.test("fromPath", async () => {
  const builder = new ApiAppBuilder();
  builder.routes.mapGet("/hello/:name", (ctx, name = fromPath("name")) => ctx.json({ message: `Hello ${name}` }));
  await using app = await builder.run();
  const result = await app.client.get("hello/bob").json();
  expect(result).toMatchObject({ message: "Hello bob" });
});

Deno.test("fromJson", async () => {
  const builder = new ApiAppBuilder();
  builder.routes.mapPost(
    "/create",
    async (ctx, payload = fromJson({ schema: z.object({ foo: z.string() }) })) =>
      ctx.json({ receivedPayload: await payload }),
  );
  await using app = await builder.run();
  const result = await app.client.post("create", { json: { foo: "bar" } }).json();
  expect(result).toMatchObject({ receivedPayload: { foo: "bar" } });
});
