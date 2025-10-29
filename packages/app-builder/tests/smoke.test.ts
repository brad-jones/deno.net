import { z } from "@zod/zod";
import { expect } from "@std/expect";
import { ApiAppBuilder, fromJson, fromPath } from "../src/mod.ts";

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

Deno.test("OpenAPI Client Smoke Test", async () => {
  const builder = new ApiAppBuilder();

  builder.routes.openapi
    .writeClient(`${import.meta.dirname}/client.ts`, {
      importSpecifiers: {
        zod: "@zod/zod",
        baseClient: "@brad-jones/deno-net-open-api-client",
      },
    })
    .mapGet(
      "/foo/:bar",
      {
        requestParams: {
          path: z.object({ bar: z.string() }),
        },
        responses: {
          200: {
            content: {
              "application/json": {
                schema: z.object({ message: z.string() }),
              },
            },
          },
        },
      },
      (ctx) => ctx.response(200, { message: `counter: ${ctx.pathParams.bar}` }),
    );

  await using app = await builder.run();

  const { ApiClient } = await import("./client.ts");
  const client = new ApiClient({ baseUrl: app.serverUrl });
  const response = await client["/foo/{bar}"].get({ params: { bar: "123" } });
  expect(response.status).toBe(200);
  expect(response.body.message).toBe("counter: 123");
});
