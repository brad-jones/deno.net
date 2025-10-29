import browserslist from "browserslist";
import type { Bundle } from "../bundler.ts";
import { CssBundler } from "./css_bundler.ts";
import {
  browserslistToTargets,
  bundle,
  type BundleOptions,
  type CustomAtRules,
  transform,
  type TransformResult,
} from "lightningcss-wasm";

type BaseOptions = Omit<BundleOptions<CustomAtRules>, "targets" | "filename">;

export interface LightningBundlerOptions extends BaseOptions {
  targets?: string[];
  disableCache?: boolean;
}

export class LightningBundler extends CssBundler {
  constructor(private options?: LightningBundlerOptions) {
    super(options);
  }

  get #targets() {
    return browserslistToTargets(
      browserslist(this.options?.targets ?? ">= 0.25%"),
    );
  }

  protected override makeBundle(srcCode: string, filePath?: string): Promise<Bundle> {
    let result: TransformResult;

    if (filePath) {
      result = bundle({
        ...this.options,
        filename: filePath,
        targets: this.#targets,
      });
    } else {
      result = transform({
        ...this.options,
        filename: "entrypoint.css",
        code: new TextEncoder().encode(srcCode),
        targets: this.#targets,
      });
    }

    return Promise.resolve({
      srcCode: new TextDecoder().decode(result.code),
      srcMap: result.map ? new TextDecoder().decode(result.map) : undefined,
    });
  }
}
