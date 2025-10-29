import { expect } from "@std/expect";
import { TailwindBundler } from "../../../src/mod.ts";

Deno.test("TailwindBundler", async () => {
  const bundler = new TailwindBundler({ disableCache: true });
  const bundle = await bundler.fromFile(`${import.meta.dirname}/fixtures/main.css`);
  expect(bundle.srcCode.split("\n")[0]).toMatch(
    /\/*! tailwindcss v(.*?) | MIT License | https:\/\/tailwindcss.com *\//,
  );
  expect(bundle.srcCode).toContain("text-3xl");
  expect(bundle.srcCode).toContain(".foo {\n  color: red;\n}");
});

Deno.test("TailwindBundler - optimized", async () => {
  const bundler = new TailwindBundler({ disableCache: true, optimize: true });
  const bundle = await bundler.fromFile(`${import.meta.dirname}/fixtures/main.css`);
  expect(bundle.srcCode.split("\n")[0]).toMatch(
    /\/*! tailwindcss v(.*?) | MIT License | https:\/\/tailwindcss.com *\//,
  );
  expect(bundle.srcCode).toContain("text-3xl");
  expect(bundle.srcCode).toContain(".foo{color:red}");
});

Deno.test("TailwindBundler - fromSrc", async () => {
  const bundler = new TailwindBundler({ disableCache: true });
  const bundle = await bundler.fromSrc(`@import "tailwindcss";`);
  expect(bundle.srcCode.split("\n")[0]).toMatch(
    /\/*! tailwindcss v(.*?) | MIT License | https:\/\/tailwindcss.com *\//,
  );
  expect(bundle.srcCode).toContain("text-3xl");
});
