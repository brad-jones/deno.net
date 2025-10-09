#!/usr/bin/env -S deno run -qA --ext=ts
import { $ } from "@david/dax";
import { Command } from "@cliffy/command";

await new Command()
  .name("try-cog-bump")
  .option("-p, --project <value:string>", "Specify which package to bump for monorepo", { required: true })
  .action(async ({ project }) => {
    const dryRunResult = await $`cog bump -d --skip-untracked --auto --package ${project}`
      .captureCombined().noThrow();

    if (dryRunResult.code > 0) {
      if (dryRunResult.combined.includes("cause: No conventional commit found to bump current version.")) {
        console.log("nothing to do, no conventional commit found to bump current version.");
        Deno.exit(0);
      }

      console.error(dryRunResult.combined);
      Deno.exit(dryRunResult.code);
    }

    const result = await $`cog bump --auto --package ${project}`.noThrow();
    Deno.exit(result.code);
  })
  .parse();
