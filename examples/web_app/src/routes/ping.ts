import { z } from "@zod/zod";
import { IPingPong } from "../services/ping_pong.ts";
import { inject } from "@brad-jones/deno-net-container";
import { RouteBuilder } from "@brad-jones/deno-net-app-builder";

export default (r: RouteBuilder) =>
  r.openapi.mapGet(
    "/ping",
    {
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ ping: z.string() }),
            },
          },
        },
      },
    },
    (ctx, pingService = inject(IPingPong)) => ctx.response(200, pingService.ping()),
  );
