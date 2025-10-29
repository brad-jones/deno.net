import type { Bundle } from "../bundler.ts";
import { deepMerge } from "@std/collections";
import { JsBundler, type JsBundlerOptions } from "./js_bundler.ts";
import { type InputOptions, type OutputOptions, rolldown } from "rolldown";
import denoPlugin, { type DenoPluginOptions } from "@deno/rolldown-plugin";

export interface RolldownBundlerOptions extends JsBundlerOptions {
  rolldownInputOverrides?: InputOptions;
  rolldownOutputOverrides?: InputOptions;
  denoPluginOverrides?: DenoPluginOptions;
}

export class RolldownBundler extends JsBundler {
  constructor(private options?: RolldownBundlerOptions) {
    super(options);
  }

  protected override async makeBundle(_: string, filePath: string): Promise<Bundle> {
    const rolldownBuild = await rolldown(deepMerge(
      {
        input: filePath,
        platform: "browser",
        plugins: denoPlugin(this.options?.denoPluginOverrides),
      },
      // deno-lint-ignore no-explicit-any
      (this.options?.rolldownInputOverrides ?? {}) as any,
    ) as InputOptions);

    const rolldownResult = await rolldownBuild.generate(
      deepMerge(
        { format: "esm" },
        // deno-lint-ignore no-explicit-any
        (this.options?.rolldownOutputOverrides ?? {}) as any,
      ) as OutputOptions,
    );

    return {
      srcCode: rolldownResult.output[0].code,
      srcMap: rolldownResult.output[0].map?.toString(),
    };
  }
}
