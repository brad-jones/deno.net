import { ApiAppBuilder } from "@brad-jones/deno-net-app-builder";
import { IPingPong, PingPong } from "./services/ping_pong.ts";
import { httpLogging } from "@brad-jones/deno-net-middleware";

export const builder = new ApiAppBuilder();
builder.logging.addConsole({ formatter: "pretty" });
builder.services.addTransient(IPingPong, PingPong);

builder.routes.openapi
  .writeDoc(`${import.meta.dirname}/openapi.json`)
  .mapDoc("/docs/openapi")
  .mapScalarUi("/docs");

builder.middleware.useModule(httpLogging());

await builder.routes.mapModules(`${import.meta.dirname}/routes/**/*.ts`);

export default await builder.build() satisfies Deno.ServeDefaultExport;
