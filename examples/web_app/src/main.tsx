import { httpLogging } from "@brad-jones/deno-net-middleware";
import { WebAppBuilder } from "@brad-jones/deno-net-app-builder";
import { IPingPong, PingPong } from "./services/ping_pong.ts";

export const builder = new WebAppBuilder();

builder.services.addTransient(IPingPong, PingPong);

builder.logging.addConsole({
  formatter: builder.environment.isDevelopment() ? "color" : "json",
});

builder.middleware.useModule(
  httpLogging({
    fields: builder.environment.isDevelopment() ? "full" : "basic",
    combineLogs: true,
  }),
);

builder.routes.mapModules(`${import.meta.dirname}/routes/**/*.ts`)
  .openapi.writeClient(`${import.meta.dirname}/client.ts`, {
    importSpecifiers: { zod: "@zod/zod", baseClient: "@brad-jones/deno-net-open-api-client" },
  })
  .mapDoc("/docs/openapi")
  .mapScalarUi("/docs");

if (builder.environment.isDevelopment()) {
  builder.pages.formatHtml({ globalOptions: { lineWidth: 120, newLineKind: "lf" } });
}

builder.pages.mapModules(`${import.meta.dirname}/pages/**/*.tsx`)
  //.hmr(builder.environment.isDevelopment())
  .bundleStylesWithTailwind({ optimize: !builder.environment.isDevelopment() })
  .bundleScriptWithDeno({
    disableCache: builder.environment.isDevelopment(),
    denoBundlerOverrides: {
      minify: !builder.environment.isDevelopment(),
      //inlineImports: false,
    },
    denoConfigOverrides: {
      compilerOptions: {
        jsx: "react-jsx",
        jsxImportSource: "@hono/hono/jsx/dom",
      },
    },
  });

export default () => builder.run({ hostname: "127.0.0.1", port: 80 });
