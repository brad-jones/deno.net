import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { DenoBundler } from "../../../src/mod.ts";

Deno.test("DenoBundler", async () => {
  const bundler = new DenoBundler({
    disableCache: true,
    denoConfigOverrides: {
      compilerOptions: {
        jsx: "react-jsx",
      },
    },
  });

  const bundle = await bundler.fromFile(`${import.meta.dirname}/fixtures/client.tsx`);

  expect(bundle.srcCode).not.toContain(outdent`
    // client.tsx
    var $$_tpl_1 = [
      "<h1>Hello from Client</h1>"
    ];
    var root = createRoot(document.getElementById("hono-spa-root"));
    root.render(html($$_tpl_1));
  `);

  expect(bundle.srcCode).toContain(outdent`
    // client.tsx
    var root = createRoot(document.getElementById("hono-spa-root"));
    root.render(/* @__PURE__ */ jsxDEV("h1", {
      children: "Hello from Client"
    }));
  `);

  expect(JSON.parse(await Deno.readTextFile(`${import.meta.dirname}/fixtures/deno.json`)).compilerOptions.jsx).toBe(
    "precompile",
  );
});

Deno.test("DenoBundler - fromSrc", async () => {
  const bundler = new DenoBundler({
    disableCache: true,
    denoConfigOverrides: {
      compilerOptions: {
        jsx: "react-jsx",
      },
    },
  });

  const bundle = await bundler.fromSrc(
    outdent`
      import { createRoot } from "@hono/hono/jsx/dom/client";
      const root = createRoot(document.getElementById("hono-spa-root")!);
      root.render(<h1>Hello from Client</h1>);
    `,
    `${import.meta.dirname}/fixtures/deno.json`,
  );

  expect(bundle.srcCode).not.toContain(outdent`
    var $$_tpl_1 = [
      "<h1>Hello from Client</h1>"
    ];
    var root = createRoot(document.getElementById("hono-spa-root"));
    root.render(html($$_tpl_1));
  `);

  expect(bundle.srcCode).toContain(outdent`
    var root = createRoot(document.getElementById("hono-spa-root"));
    root.render(/* @__PURE__ */ jsxDEV("h1", {
      children: "Hello from Client"
    }));
  `);

  expect(JSON.parse(await Deno.readTextFile(`${import.meta.dirname}/fixtures/deno.json`)).compilerOptions.jsx).toBe(
    "precompile",
  );
});

Deno.test("DenoBundler - fromFunction", async () => {
  const bundler = new DenoBundler({ disableCache: true });
  const bundle = await bundler.fromFunction(() => console.log("Hello World"));
  expect(bundle.srcCode).toContain('(() => console.log("Hello World"))();');
});
