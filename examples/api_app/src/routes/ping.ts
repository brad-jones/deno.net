import { IPingPong } from "../services/ping_pong.ts";
import { inject } from "@brad-jones/deno-net-container";
import { RouteBuilder, RouteModule } from "@brad-jones/deno-net-app-builder";

export default ((r: RouteBuilder) => {
  r.mapGet("/ping", (ctx, pingService = inject(IPingPong)) => ctx.json(pingService.ping()));
}) satisfies RouteModule;
