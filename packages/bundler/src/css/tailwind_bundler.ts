import ky from "ky";
import * as path from "@std/path";
import { compile } from "tailwindcss";
import browserslist from "browserslist";
import type { Bundle } from "../bundler.ts";
import { CssBundler } from "./css_bundler.ts";
import { toSourceMap } from "@tailwindcss/node";
import { Scanner, type SourceEntry } from "@tailwindcss/oxide";
import { browserslistToTargets, transform } from "lightningcss-wasm";

export const tailwindCDN = "https://cdn.jsdelivr.net/npm/tailwindcss";

export interface TailwindBundlerOptions {
  sources?: SourceEntry[];
  version?: string;
  optimize?: boolean;
  targets?: string[];
  disableCache?: boolean;
  buildSrcMap?: boolean;
}

export class TailwindBundler extends CssBundler {
  constructor(private options?: TailwindBundlerOptions) {
    super(options);
  }

  get #tailwindVersion() {
    return this.options?.version ? `@${this.options.version}` : "";
  }

  get #targets() {
    return browserslistToTargets(
      browserslist(this.options?.targets ?? ">= 0.25%"),
    );
  }

  #runScanner(basePath: string): string[] {
    const scanner = new Scanner({
      sources: this.options?.sources ?? [
        { base: basePath, pattern: "**/*", negated: false },
      ],
    });
    return scanner.scan();
  }

  #isFromCdn(specifier: string): boolean {
    return specifier.startsWith("npm:") ||
      specifier.startsWith("gh:") ||
      specifier.startsWith("https://cdn.jsdelivr.net/npm/") ||
      specifier.startsWith("https://cdn.jsdelivr.net/gh/");
  }

  #getFile(specifier: string): string {
    if (specifier.startsWith("npm:")) {
      return specifier.replace("npm:", "https://cdn.jsdelivr.net/npm/");
    } else if (specifier.startsWith("gh:")) {
      return specifier.replace("gh:", "https://cdn.jsdelivr.net/gh/");
    } else if (
      specifier.startsWith("https://cdn.jsdelivr.net/npm/") ||
      specifier.startsWith("https://cdn.jsdelivr.net/gh/")
    ) {
      return specifier;
    } else {
      throw new Error(`Invalid specifier: ${specifier}`);
    }
  }

  override async fromSrc(srcCode: string, filePath?: string): Promise<Bundle> {
    const candidates = this.#runScanner(this.getDefaultBasePath(filePath));
    const cacheKey = { srcCode, filePath, candidates, ...this.options };

    let bundle: Bundle | undefined;
    bundle = await this.getCachedItem<Bundle>(cacheKey);
    if (bundle) return bundle;

    bundle = await this.makeBundle(srcCode, filePath, candidates);

    return await this.cacheItem(cacheKey, bundle);
  }

  /**
   * @credit https://github.com/lumeland/lume/blob/main/plugins/tailwindcss.ts
   */
  protected override async makeBundle(srcCode: string, filePath?: string, candidates?: string[]): Promise<Bundle> {
    const compiler = await compile(srcCode, {
      from: filePath,
      base: this.getDefaultBasePath(filePath),
      async loadModule(id, base, resourceHint) {
        if (id.startsWith(".")) {
          id = path.join(base, id);
          const mod = await import(id);
          return {
            base,
            path: id,
            module: mod.default,
          };
        }

        if (resourceHint === "plugin") {
          const mod = await import(`npm:${id}`);
          return {
            base,
            path: id,
            module: mod.default,
          };
        }

        throw new Error(`unhandled loadModule(${id}, ${base}, ${resourceHint})`);
      },
      loadStylesheet: async (id, base) => {
        if (id === "tailwindcss") {
          const path = `${tailwindCDN}${this.#tailwindVersion}/index.css`;
          const content = await ky.get(path).text();
          return { content, path, base };
        }

        if (id.startsWith("tailwindcss/")) {
          const filename = id.replace("tailwindcss/", "");
          const path = `${tailwindCDN}${this.#tailwindVersion}/${filename}`;
          const content = await ky.get(path).text();
          return { content, path, base };
        }

        if (this.#isFromCdn(id)) {
          id = this.#getFile(id);
          const content = await ky.get(id).text();
          return { content, path: id, base };
        }

        if (!base && id.startsWith(".")) {
          base = this.getDefaultBasePath(filePath);
        }

        try {
          const fP = path.join(base, id);
          return {
            content: await Deno.readTextFile(fP),
            base: path.dirname(fP),
            path: fP,
          };
        } catch (e) {
          if (!(e instanceof Deno.errors.NotFound)) {
            throw e;
          }
        }

        throw new Error(`unhandled loadStylesheet(${id}, ${base})`);
      },
    });

    const bundle: Bundle = {
      srcCode: compiler.build(candidates!),
      srcMap: this.options?.buildSrcMap ? toSourceMap(compiler.buildSourceMap()).raw : undefined,
    };

    if (this.options?.optimize) {
      const result = transform({
        minify: true,
        filename: "tailwind.css",
        code: new TextEncoder().encode(bundle.srcCode),
        inputSourceMap: bundle.srcMap,
        sourceMap: this.options?.buildSrcMap,
        targets: this.#targets,
      });
      bundle.srcCode = new TextDecoder().decode(result.code);
      if (result.map) {
        bundle.srcMap = new TextDecoder().decode(result.map);
      }
    }

    return bundle;
  }
}
