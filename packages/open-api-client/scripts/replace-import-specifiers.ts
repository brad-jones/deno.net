#!/usr/bin/env -S deno run -qA --ext=ts
import { readDenoConfigFile } from "@brad-jones/deno-config";

const config = await readDenoConfigFile(import.meta.filename!);

let tsSrc = await Deno.readTextFile(`${import.meta.dirname}/../src/generator.ts`);

tsSrc = tsSrc.replace(
  /importSpecifiers.zod = ".*?";/,
  `importSpecifiers.zod = "${config!.imports!["@zod/zod"]}";`,
);

tsSrc = tsSrc.replace(
  /importSpecifiers.baseClient = ".*?";/,
  `importSpecifiers.baseClient = "jsr:${config!.name}@${config!.version}";`,
);

await Deno.writeTextFile(`${import.meta.dirname}/../src/generator.ts`, tsSrc);
