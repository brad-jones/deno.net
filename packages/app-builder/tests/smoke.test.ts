import { expect } from "@std/expect";
import { ApiAppBuilder, fromJson, fromPath } from "../src/mod.ts";
import z from "@zod/zod";

Deno.test("SmokeTest", async () => {
  const builder = new ApiAppBuilder();
  builder.routes.mapGet("/ping", (ctx) => ctx.json({ ping: "pong" }));
  const { server, client } = await builder.run();
  const result = await client.get("ping").json();
  expect(result).toMatchObject({ ping: "pong" });
  await server.shutdown();
});

Deno.test("fromPath", async () => {
  const builder = new ApiAppBuilder();
  builder.routes.mapGet("/hello/:name", (ctx, name = fromPath("name")) => ctx.json({ message: `Hello ${name}` }));
  const { server, client } = await builder.run();
  const result = await client.get("hello/bob").json();
  expect(result).toMatchObject({ message: "Hello bob" });
  await server.shutdown();
});

Deno.test("fromJson", async () => {
  const builder = new ApiAppBuilder();
  builder.routes.mapPost(
    "/create",
    async (ctx, payload = fromJson({ schema: z.object({ foo: z.string() }) })) =>
      ctx.json({ receivedPayload: await payload }),
  );
  const { server, client } = await builder.run();
  const result = await client.post("create", { json: { foo: "bar" } }).json();
  expect(result).toMatchObject({ receivedPayload: { foo: "bar" } });
  await server.shutdown();
});
