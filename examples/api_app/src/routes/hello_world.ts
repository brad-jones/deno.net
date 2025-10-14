import { z } from "@zod/zod";
import { fromPath, RouteBuilder, RouteModule } from "@brad-jones/deno-net-app-builder";

export default ((r: RouteBuilder) => {
  r.mapGet("/hello/:name", (ctx, name = fromPath("name")) => ctx.json({ message: `Hello ${name}` }));

  r.openapi.mapPost(
    "/strongly-typed/hello/:name",
    {
      requestParams: {
        path: z.object({ name: z.string() }),
      },
      requestBody: {
        content: {
          "application/json": {
            schema: z.object({
              age: z.number(),
            }),
          },
        },
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
    (ctx) => ctx.response(200, { message: `Hello ${ctx.pathParams.name}, you are ${ctx.body.age} years old.` }),
  );
}) satisfies RouteModule;
