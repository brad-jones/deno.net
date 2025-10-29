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

builder.routes.openapi
  .writeClient(`${import.meta.dirname}/client.ts`)
  .mapDoc("/docs/openapi")
  .mapScalarUi("/docs");

if (builder.environment.isDevelopment()) {
  builder.pages.formatHtml({ globalOptions: { lineWidth: 120, newLineKind: "lf" } });
}

builder.pages
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

await builder.routes.mapModules(`${import.meta.dirname}/routes/**/*.ts`);
await builder.pages.mapModules(`${import.meta.dirname}/pages/**/*.tsx`);

export default () => builder.run({ hostname: "127.0.0.1", port: 80 });
