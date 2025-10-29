import * as path from "@std/path";
import { deepMerge } from "@std/collections";
import { LockedDenoConfig } from "./deno_config.ts";
import { inject, Type } from "@brad-jones/deno-net-container";
import { type DenoConfigFile, IDenoConfigFactory } from "@brad-jones/deno-config";
import { type Bundle, Bundler, type BundlerOptions, type IBundler } from "../bundler.ts";

export const IJsBundler: Type<IJsBundler> = new Type<IJsBundler>("IJsBundler");

export interface IJsBundler extends IBundler {
  fromFunction(func: () => void): Promise<Bundle>;
}

export interface JsBundlerOptions extends BundlerOptions {
  denoConfigOverrides?: DenoConfigFile;
}

export abstract class JsBundler extends Bundler implements IJsBundler {
  constructor(
    private jsOptions?: JsBundlerOptions,
    private denoConfigFactory: IDenoConfigFactory | undefined = inject(IDenoConfigFactory, { optional: true }),
  ) {
    super(jsOptions);
    this.denoConfigFactory ??= (tsFilePath: string) => new LockedDenoConfig(tsFilePath);
  }

  fromFunction(func: () => void): Promise<Bundle> {
    const bodyScript = func.toString();
    const awaitScript = bodyScript.startsWith("async ()=>") ? "await " : "";
    return this.fromSrc(`${awaitScript}(${bodyScript})()`);
  }

  override async fromSrc(srcCode: string, filePath?: string): Promise<Bundle> {
    const cacheKey = { srcCode, filePath, ...this.jsOptions };

    let bundle: Bundle | undefined;
    bundle = await this.getCachedItem<Bundle>(cacheKey);
    if (bundle) return bundle;

    // If the src code did not come from an existing file (ie: it was generated)
    // we need to write it to a temporary file in order to execute js bundlers.
    // And the file must be with-in a valid deno project so that it can use it's
    // import map as one might expect.
    let entrypoint = filePath!;
    let writtenEntryPoint = false;
    if (!filePath || filePath.endsWith("deno.json")) {
      const basePath = this.getDefaultBasePath(filePath);
      entrypoint = path.join(basePath, `entrypoint_${crypto.randomUUID()}.tsx`);
      await Deno.writeTextFile(entrypoint, srcCode);
      writtenEntryPoint = true;
    }

    await using _cleanUpEntrypoint = {
      async [Symbol.asyncDispose]() {
        if (writtenEntryPoint) {
          await Deno.remove(entrypoint);
        }
      },
    };

    // Inject any deno config overrides & reset the file back to it's current state
    await using denoConfig = this.denoConfigFactory!(entrypoint);
    if (this.jsOptions?.denoConfigOverrides) {
      const currentConfig = await denoConfig.readConfig();
      if (!currentConfig) throw new Error(`config not found for ${entrypoint}`);
      await denoConfig.writeConfig(deepMerge(currentConfig, this.jsOptions.denoConfigOverrides));
    }

    bundle = await this.makeBundle(srcCode, entrypoint);

    return await this.cacheItem(cacheKey, bundle);
  }

  protected abstract override makeBundle(srcCode: string, filePath: string): Promise<Bundle>;
}
