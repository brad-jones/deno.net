#!/usr/bin/env -S deno run -qA --ext=ts
import { readDenoConfigFile } from "@brad-jones/deno-config";

const config = await readDenoConfigFile(import.meta.filename!);

let tsSrc = await Deno.readTextFile(`${import.meta.dirname}/../src/base_generator.ts`);

tsSrc = tsSrc.replace(
  /const _DEFAULT_ZOD_IMPORT_SPECIFIER = ".*?";/,
  `const _DEFAULT_ZOD_IMPORT_SPECIFIER = "${config!.imports!["@zod/zod"]}";`,
);

tsSrc = tsSrc.replace(
  /const _DEFAULT_CLIENT_IMPORT_SPECIFIER = ".*?";/,
  `const _DEFAULT_CLIENT_IMPORT_SPECIFIER = "jsr:${config!.name}@${config!.version}/client";`,
);

await Deno.writeTextFile(`${import.meta.dirname}/../src/base_generator.ts`, tsSrc);
