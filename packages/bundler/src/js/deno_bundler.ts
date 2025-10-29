import * as path from "@std/path";
import { deepMerge } from "@std/collections";
import type { Bundle } from "../bundler.ts";
import { $ } from "@david/dax";
import { outdent } from "@cspotcode/outdent";
import { JsBundler, type JsBundlerOptions } from "./js_bundler.ts";

export interface DenoBundlerOptions extends JsBundlerOptions {
  denoBundlerOverrides?: Omit<Deno.bundle.Options, "entrypoints" | "write">;
}

export class DenoBundler extends JsBundler {
  constructor(private options?: DenoBundlerOptions) {
    super(options);
  }

  protected override async makeBundle(_: string, filePath: string): Promise<Bundle> {
    const bundler = path.join(path.dirname(filePath), `bundler_${crypto.randomUUID()}.ts`);

    const bundlerOptions = JSON.stringify(
      deepMerge(
        {
          entrypoints: [filePath],
          platform: "browser",
          write: false,
        },
        this.options?.denoBundlerOverrides ?? {},
      ),
      null,
      2,
    );

    await Deno.writeTextFile(
      bundler,
      outdent`
        const result = await Deno.bundle(${bundlerOptions});
        if (!result.success) {
          const { warnings, errors } = result;
          console.error(JSON.stringify({warnings, errors}));
          Deno.exit(1);
        }

        console.log(result.outputFiles[0].text());
      `,
    );

    await using _cleanup = {
      async [Symbol.asyncDispose]() {
        await Deno.remove(bundler);
      },
    };

    const result = await $`${Deno.execPath()} run --unstable-bundle ${bundler}`
      .stdout("piped").stderr("piped")
      .cwd(path.dirname(filePath))
      .noThrow();
    if (result.code !== 0) {
      throw new Error(result.stderr);
    }

    return {
      srcCode: result.stdout,
    };
  }
}
