import { expect } from "@std/expect";
import { z } from "@zod/zod";
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
      validateRequests: true,
      validateResponses: true,
      importSpecifiers: {
        zod: "@zod/zod",
        client: "@brad-jones/deno-net-open-api-client",
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
      (ctx) => ctx.response(200, { message: `counter: ${ctx.path.bar}` }),
    );

  await using app = await builder.run();

  const { ApiClient } = await import("./client.ts");
  const client = new ApiClient({ baseUrl: app.serverUrl });
  const response = await client["/foo/{bar}"].get({ path: { bar: "123" } });
  expect(response.status).toBe(200);
  expect(response.body.message).toBe("counter: 123");
});

Deno.test("OpenAPI with Default Response", async () => {
  const builder = new ApiAppBuilder();

  builder.routes.openapi.mapGet(
    "/foo",
    {
      responses: {
        default: {
          description: "Unknown",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
    },
    (ctx) => ctx.response(404, {}, { message: `not found` }),
  );

  await using app = await builder.run();
  const response = await app.client.get("foo", { throwHttpErrors: false });
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ message: "not found" });
});

Deno.test("OpenAPI with Default Response, without schema", async () => {
  const builder = new ApiAppBuilder();

  builder.routes.openapi.mapGet(
    "/foo",
    {
      responses: {
        default: {
          description: "Unknown",
        },
      },
    },
    (ctx) => ctx.response(404, {}, { message: `not found` }),
  );

  await using app = await builder.run();
  const response = await app.client.get("foo", { throwHttpErrors: false });
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ message: "not found" });
});

// see: https://swagger.io/docs/specification/v3_0/serialization/
Deno.test("OpenAPI array parameters (single)", async () => {
  const builder = new ApiAppBuilder();

  builder.routes.openapi.mapGet(
    "/foo",
    {
      requestParams: {
        query: z.object({ name: z.array(z.string()) }),
      },
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
    },
    (ctx) => ctx.response(200, { message: `given names: ${JSON.stringify(ctx.query.name)}` }),
  );

  await using app = await builder.run();
  const response = await app.client.get("foo?name=Bob", { throwHttpErrors: false });
  const body = await response.json();
  console.log(body);
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ message: 'given names: ["Bob"]' });
});

Deno.test("OpenAPI array parameters (multiple)", async () => {
  const builder = new ApiAppBuilder();

  builder.routes.openapi.mapGet(
    "/foo",
    {
      requestParams: {
        query: z.object({ name: z.array(z.string()) }),
      },
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
    },
    (ctx) => ctx.response(200, { message: `given names: ${JSON.stringify(ctx.query.name)}` }),
  );

  await using app = await builder.run();
  const response = await app.client.get("foo?name=Bob,Fred", { throwHttpErrors: false });
  const body = await response.json();
  console.log(body);
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ message: 'given names: ["Bob,Fred"]' });
});

Deno.test("OpenAPI path array parameters", async () => {
  const builder = new ApiAppBuilder();

  builder.routes.openapi.mapGet(
    "/items/:ids",
    {
      requestParams: {
        path: z.object({ ids: z.array(z.string()) }),
      },
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
    },
    (ctx) => ctx.response(200, { message: `item ids: ${JSON.stringify(ctx.path.ids)}` }),
  );

  await using app = await builder.run();
  const response = await app.client.get("items/1,2,3", { throwHttpErrors: false });
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ message: 'item ids: ["1","2","3"]' });
});

Deno.test("OpenAPI header array parameters", async () => {
  const builder = new ApiAppBuilder();

  builder.routes.openapi.mapGet(
    "/foo",
    {
      requestParams: {
        header: z.object({ "x-tags": z.array(z.string()) }),
      },
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
    },
    (ctx) => ctx.response(200, { message: `tags: ${JSON.stringify(ctx.headers["x-tags"])}` }),
  );

  await using app = await builder.run();
  const response = await app.client.get("foo", {
    throwHttpErrors: false,
    headers: { "x-tags": "red,blue,green" },
  });
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ message: 'tags: ["red","blue","green"]' });
});

Deno.test("OpenAPI cookie array parameters", async () => {
  const builder = new ApiAppBuilder();

  builder.routes.openapi.mapGet(
    "/foo",
    {
      requestParams: {
        cookie: z.object({ preferences: z.array(z.string()) }),
      },
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
    },
    (ctx) => ctx.response(200, { message: `prefs: ${JSON.stringify(ctx.cookies.preferences)}` }),
  );

  await using app = await builder.run();
  const response = await app.client.get("foo", {
    throwHttpErrors: false,
    headers: { cookie: "preferences=dark,compact,minimal" },
  });
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ message: 'prefs: ["dark","compact","minimal"]' });
});
