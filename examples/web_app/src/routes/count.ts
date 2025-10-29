import { z } from "@zod/zod";
import { RouteBuilder } from "@brad-jones/deno-net-app-builder";

export default (r: RouteBuilder) =>
  r.openapi.mapGet(
    "/count",
    {
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ currentCount: z.number() }),
            },
          },
        },
      },
    },
    (ctx) => ctx.response(200, { currentCount: Math.random() }),
  );
