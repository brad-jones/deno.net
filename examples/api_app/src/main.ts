import { ApiAppBuilder } from "@brad-jones/deno-net-app-builder";
import { httpLogging } from "@brad-jones/deno-net-middleware";
import { IPingPong, PingPong } from "./services/ping_pong.ts";

export const builder = new ApiAppBuilder();
builder.logging.addConsole({ formatter: "pretty" });
builder.services.addTransient(IPingPong, PingPong);

builder.middleware.useModule(httpLogging({ fields: "full", combineLogs: false }));

builder.routes.mapModules(`${import.meta.dirname}/routes/**/*.ts`)
  .openapi.writeDoc(`${import.meta.dirname}/openapi.json`)
  .writeClient(`${import.meta.dirname}/client.ts`)
  .mapDoc("/docs/openapi")
  .mapScalarUi("/docs");

export default await builder.build() satisfies Deno.ServeDefaultExport;
