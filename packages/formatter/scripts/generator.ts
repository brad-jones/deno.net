#!/usr/bin/env -S deno run -qA --ext=ts
import ky from "ky";
import * as fs from "@std/fs";
import * as path from "@std/path";
import * as semver from "@std/semver";
import { Octokit } from "@octokit/rest";
import { outdent } from "@cspotcode/outdent";
import { compile } from "json-schema-to-typescript";
import { camelCase, pascalCase } from "@mesqueeb/case-anything";

const dprintPlugins = {
  "dockerfile": { owner: "dprint", repo: "dprint-plugin-dockerfile" },
  "html": { owner: "g-plane", repo: "markup_fmt" },
  "javascript": { owner: "dprint", repo: "dprint-plugin-typescript" },
  "json": { owner: "dprint", repo: "dprint-plugin-json" },
  "markdown": { owner: "dprint", repo: "dprint-plugin-markdown" },
  "python": { owner: "dprint", repo: "dprint-plugin-ruff" },
  "toml": { owner: "dprint", repo: "dprint-plugin-toml" },
  "yaml": { owner: "g-plane", repo: "pretty_yaml" },
  "sql": { owner: "dprint", repo: "dprint-plugin-sql" },
};

const octokit = new Octokit({
  auth: Deno.env.get("GH_TOKEN") ??
    Deno.env.get("GITHUB_TOKEN") ??
    Deno.env.get("GITHUB_API_TOKEN"),
});

for (const [fileType, pluginRepo] of Object.entries(dprintPlugins)) {
  const basePath = path.resolve(`${import.meta.dirname}/../src/${fileType}`);
  console.log(`\nemptying ${basePath}`);
  await fs.emptyDir(basePath);

  console.log(`getting latest release for ${JSON.stringify(pluginRepo)}`);
  const release = await octokit.repos.getLatestRelease(pluginRepo);

  const version = semver.parse(release.data.tag_name);
  console.log(`version: ${semver.format(version)}`);

  const wasmAsset = release.data.assets.find((_) => _.name === "plugin.wasm");
  console.log(`downloading ${wasmAsset!.browser_download_url}`);
  await Deno.writeFile(`${basePath}/plugin.wasm`, (await ky.get(wasmAsset!.browser_download_url)).body!);

  const schemaAsset = release.data.assets.find((_) => _.name === "schema.json");
  console.log(`downloading ${schemaAsset!.browser_download_url}`);
  await Deno.writeFile(`${basePath}/schema.json`, (await ky.get(schemaAsset!.browser_download_url)).body!);

  const schema = JSON.parse(await Deno.readTextFile(`${basePath}/schema.json`));
  schema.title = "Schema";
  await Deno.writeTextFile(`${basePath}/schema.ts`, await compile(schema, "-", { additionalProperties: false }));

  await Deno.writeTextFile(
    `${basePath}/${fileType}_formatter.ts`,
    outdent`
      import type { Schema } from "./schema.ts";
      import type { IFormatter } from "../formatter.ts";
      import { Type } from "@brad-jones/deno-net-container";
      import { DprintFormatter } from "../dprint_formatter.ts";
      import type { GlobalConfiguration } from "@dprint/formatter";
      import type { ContainerModule } from "@brad-jones/deno-net-container";

      export const I${pascalCase(fileType)}Formatter: Type<IFormatter> = new Type<IFormatter>();

      export const ${camelCase(fileType)}Fmt = (options?: ${
      pascalCase(fileType)
    }FormatterOptions): ContainerModule => (c) => {
        c.addSingleton(
          I${pascalCase(fileType)}Formatter,
          class extends ${pascalCase(fileType)}Formatter {
            constructor() {
              super(options);
            }
          },
        );
      };

      export interface ${pascalCase(fileType)}FormatterOptions extends Schema {
        globalOptions?: GlobalConfiguration;
      }

      export class ${pascalCase(fileType)}Formatter extends DprintFormatter {
        readonly version = "${semver.format(version)}";

        constructor(options?: ${pascalCase(fileType)}FormatterOptions) {
          super(
            {
              ...options?.globalOptions,
              wasmPath: \`\${import.meta.dirname}/plugin.wasm\`,
            },
            options,
          );
        }
      }
    `,
  );
}

await Deno.writeTextFile(
  path.resolve(`${import.meta.dirname}/../src/mod.ts`),
  outdent`
    export * from "./formatter.ts";
    export * from "./dprint_formatter.ts";
    ${
    Object.entries(dprintPlugins).map(([fileType]) => `export * from "./${fileType}/${fileType}_formatter.ts";`).join(
      "\n",
    )
  }
  `,
);
