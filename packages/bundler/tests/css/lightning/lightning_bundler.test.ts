import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { LightningBundler } from "../../../src/mod.ts";

Deno.test("LightningBundler", async () => {
  const bundler = new LightningBundler({ disableCache: true });
  const bundle = await bundler.fromFile(`${import.meta.dirname}/fixtures/main.css`);
  expect(bundle.srcCode).not.toContain("@import");
  expect(bundle.srcCode).toContain(".foo {\n  color: red;\n}");
});

Deno.test("LightningBundler - minify", async () => {
  const bundler = new LightningBundler({ disableCache: true, minify: true });
  const bundle = await bundler.fromFile(`${import.meta.dirname}/fixtures/main.css`);
  expect(bundle.srcCode).not.toContain("@import");
  expect(bundle.srcCode).toContain(".foo{color:red}");
});

Deno.test("LightningBundler - fromSrc", async () => {
  const bundler = new LightningBundler({ disableCache: true, minify: true });
  const bundle = await bundler.fromSrc(outdent`
    .foo {
      color: red;
    }
  `);
  expect(bundle.srcCode).not.toContain("@import");
  expect(bundle.srcCode).toContain(".foo{color:red}");
});
