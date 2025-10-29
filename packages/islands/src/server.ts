import { inject } from "@brad-jones/deno-net-container";
import { HttpContext } from "@brad-jones/deno-net-http-context";

export const islandDiscoveryUrl = "https://github.com/brad-jones/deno.net/blob/master/docs/island-discovery.md";

export function isIslandDiscoveryRequest(ctx: HttpContext = inject(HttpContext)): boolean {
  return ctx.req.url === islandDiscoveryUrl;
}
