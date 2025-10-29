import ky from "ky";
import * as path from "@std/path";
import { encodeHex } from "@std/encoding";

let cacheDir: string | undefined;

export interface Bundle {
  srcCode: string;
  srcMap?: string;
}

export interface IBundler {
  fromUrl(url: string): Promise<Bundle>;
  fromFile(filePath: string): Promise<Bundle>;
  fromSrc(srcCode: string, filePath?: string): Promise<Bundle>;
}

export interface BundlerOptions {
  disableCache?: boolean;
}

export abstract class Bundler implements IBundler {
  constructor(private baseOptions?: BundlerOptions) {}

  async fromUrl(url: string): Promise<Bundle> {
    if (url.startsWith("file://")) {
      return await this.fromFile(path.fromFileUrl(url));
    }
    return await this.fromSrc(await ky.get(url).text());
  }

  async fromFile(filePath: string): Promise<Bundle> {
    const srcCode = await Deno.readTextFile(filePath);
    return this.fromSrc(srcCode, filePath);
  }

  async fromSrc(srcCode: string, filePath?: string): Promise<Bundle> {
    const cacheKey = { srcCode, filePath, ...this.baseOptions };

    let bundle: Bundle | undefined;
    bundle = await this.getCachedItem<Bundle>(cacheKey);
    if (bundle) return bundle;

    bundle = await this.makeBundle(srcCode, filePath);

    return await this.cacheItem(cacheKey, bundle);
  }

  protected abstract makeBundle(srcCode: string, filePath?: string): Promise<Bundle>;

  protected getDefaultFilePath(filePath?: string): string {
    return filePath ? filePath : path.fromFileUrl(Deno.mainModule);
  }

  protected getDefaultBasePath(filePath?: string): string {
    return path.dirname(this.getDefaultFilePath(filePath));
  }

  protected async cacheItem<T>(key: object, value: T): Promise<T> {
    const cacheDir = await this.#getCacheDirectory();
    const cacheKey = await this.#computeHash(JSON.stringify(key));
    const cachedFile = path.join(cacheDir, cacheKey);
    await Deno.writeTextFile(cachedFile, JSON.stringify(value));
    return value;
  }

  protected async getCachedItem<T>(key: object): Promise<T | undefined> {
    if (this.baseOptions?.disableCache === true) return undefined;
    const cacheDir = await this.#getCacheDirectory();
    const cacheKey = await this.#computeHash(JSON.stringify(key));
    const cachedFile = path.join(cacheDir, cacheKey);
    try {
      return JSON.parse(await Deno.readTextFile(cachedFile));
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) {
        throw e;
      }
    }
  }

  async #computeHash(value: string): Promise<string> {
    return encodeHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  }

  async #getCacheDirectory(appName = "deno-net-bundler"): Promise<string> {
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
}
