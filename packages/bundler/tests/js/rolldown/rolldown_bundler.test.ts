import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { RolldownBundler } from "../../../src/mod.ts";

Deno.test("RolldownBundler - zod-example.ts", async () => {
  const bundler = new RolldownBundler({
    disableCache: true,
  });

  const bundle = await bundler.fromFile(`${import.meta.dirname}/fixtures/zod-example.ts`);

  expect(bundle.srcCode).toContain(outdent`
    console.log(string().parse("foo"));

    //#endregion
  `);
});

Deno.test("RolldownBundler - client.tsx", async () => {
  const bundler = new RolldownBundler({
    disableCache: true,
    denoConfigOverrides: {
      compilerOptions: {
        jsx: "react-jsx",
      },
    },
  });

  const bundle = await bundler.fromFile(`${import.meta.dirname}/../deno/fixtures/client.tsx`);

  expect(bundle.srcCode).toContain(outdent`
    createRoot(document.getElementById("hono-spa-root")).render(/* @__PURE__ */ jsxDEV("h1", { children: "Hello from Client" }));

    //#endregion
  `);
});
