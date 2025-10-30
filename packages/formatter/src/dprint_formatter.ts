import ky from "ky";
import * as path from "@std/path";
import { encodeHex } from "@std/encoding";
import type { IFormatter } from "./formatter.ts";
import { createFromBuffer, type Formatter as BaseDprintFormatter, type GlobalConfiguration } from "@dprint/formatter";

let cacheDir: string | undefined;

export interface DprintFormatterOptions extends GlobalConfiguration {
  wasmPath: URL;
  wasm256Sha: string;
  fileExt?: string;
}

export abstract class DprintFormatter implements IFormatter {
  #cachedFormatter: BaseDprintFormatter | undefined;

  // deno-lint-ignore no-explicit-any
  constructor(private baseOptions: DprintFormatterOptions, private pluginOptions?: any) {}

  protected async loadWasmFormatter(): Promise<BaseDprintFormatter> {
    if (this.#cachedFormatter) return this.#cachedFormatter;

    const buffer = new Uint8Array(
      await (this.baseOptions.wasmPath.protocol === "file:"
        ? Deno.readFile(this.baseOptions.wasmPath)
        : this.downloadWasmFormatter(this.baseOptions.wasmPath)),
    );

    if (await this.computeHashFromBytes(buffer) !== this.baseOptions.wasm256Sha) {
      throw new Error("wasm module checksum invalid");
    }

    this.#cachedFormatter = createFromBuffer(buffer);
    this.#cachedFormatter.setConfig(this.baseOptions, this.pluginOptions ?? {});
    return this.#cachedFormatter;
  }

  protected async downloadWasmFormatter(url: URL): Promise<Uint8Array> {
    const cachedFile = path.join(
      await this.getCacheDirectory(),
      await this.computeHashFromString(url.href),
    );

    try {
      return await Deno.readFile(cachedFile);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        const wasmModuleBytes = await ky.get(url).bytes();
        await Deno.writeFile(cachedFile, wasmModuleBytes);
        return wasmModuleBytes;
      }

      throw e;
    }
  }

  protected async computeHashFromString(value: string): Promise<string> {
    return encodeHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  }

  protected async computeHashFromBytes(value: Uint8Array<ArrayBuffer>): Promise<string> {
    return encodeHex(await crypto.subtle.digest("SHA-256", value));
  }

  protected async getCacheDirectory(appName = "deno-net-formatter"): Promise<string> {
    if (cacheDir) return cacheDir;

    if (Deno.build.os === "windows") {
      const localAppData = Deno.env.get("LOCALAPPDATA");
      if (localAppData) {
        cacheDir = path.join(localAppData, appName);
      } else {
        const userProfile = Deno.env.get("USERPROFILE");
        if (userProfile) {
          cacheDir = path.join(userProfile, "AppData/Local", appName);
        } else {
          const tempDir = Deno.env.get("TEMP");
          if (tempDir) {
            cacheDir = path.join(tempDir, appName);
          } else {
            cacheDir = path.join("C:\\Windows\\Temp", appName);
          }
        }
      }
    }

    const xdgCacheHome = Deno.env.get("XDG_CACHE_HOME");
    if (xdgCacheHome) {
      cacheDir = path.join(xdgCacheHome, appName);
    } else {
      const homeDir = Deno.env.get("HOME");
      if (homeDir) {
        cacheDir = path.join(homeDir, ".cache", appName);
      } else {
        cacheDir = path.join("/tmp", appName);
      }
    }

    await Deno.mkdir(cacheDir, { recursive: true });

    return cacheDir;
  }

  async fmt(srcCode: string): Promise<string> {
    return (await this.loadWasmFormatter()).formatText({
      filePath: this.baseOptions?.fileExt ? `-.${this.baseOptions.fileExt}` : `-`,
      fileText: srcCode,
    });
  }
}
