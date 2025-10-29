import * as path from "@std/path";
import { expandGlob } from "@std/fs";
import { ILogger } from "@brad-jones/deno-net-logging";
import type { RouteBuilder } from "../api/route_builder.ts";
import { bundleScriptSrc, bundleStyleSrc, injectScript, injectStyleSheet, transformImports } from "./utils.ts";
import { importModule } from "@brad-jones/jsr-dynamic-imports";
import type { IContainer } from "@brad-jones/deno-net-container";
import type { PageModule, ScriptSrc, StyleSrc } from "./types.ts";
import type { MiddlewareBuilder } from "@brad-jones/deno-net-middleware";
import { type ExternalPageHandlerBuilder, PageHandlerBuilder } from "./page_handler_builder.ts";
import { htmlFmt, type HtmlFormatterOptions } from "@brad-jones/deno-net-formatter";
import { ResolutionMode, Workspace } from "@deno/loader";
import type {
  DenoBundlerOptions,
  LightningBundlerOptions,
  RolldownBundlerOptions,
  TailwindBundlerOptions,
} from "@brad-jones/deno-net-bundler";
import {
  DenoBundler,
  ICssBundler,
  IJsBundler,
  LightningBundler,
  RolldownBundler,
  TailwindBundler,
} from "@brad-jones/deno-net-bundler";
import { ServerErrorProblem } from "@brad-jones/deno-net-problem-details";

export type ExternalPageRouteBuilder = Omit<PageRouteBuilder, "build">;

export class PageRouteBuilder {
  #pages: PageHandlerBuilder[] = [];
  #defaultBundles: (() => Promise<void>)[] = [];

  constructor(private services: IContainer, private middleware: MiddlewareBuilder, private routeBuilder: RouteBuilder) {
    this.services.addSingleton(IJsBundler, DenoBundler);
    this.services.addSingleton(ICssBundler, LightningBundler);
  }

  formatHtml(options?: HtmlFormatterOptions): ExternalPageRouteBuilder {
    this.services.addModule(htmlFmt(options));
    return this;
  }

  hmr(enable?: boolean): ExternalPageRouteBuilder {
    if (enable === true || typeof enable === "undefined") {
      this.routeBuilder.mapGet(
        "/scripts",
        async (ctx) => {
          const originalImport = ctx.req.query("import");
          if (!originalImport) throw new ServerErrorProblem();

          const bundler = ctx.get<IContainer>("services").getService(IJsBundler);

          let bundle;

          // TODO: consider the security implications of this????
          if (originalImport.startsWith("/")) {
            bundle = await bundler.fromFile(originalImport);
          } else if (originalImport.startsWith("./")) {
            bundle = await bundler.fromFile(
              path.resolve(path.dirname(path.fromFileUrl(Deno.mainModule)), originalImport),
            );
          } else {
            const referer = new URL(ctx.req.header("Referer")!).searchParams.get("import");
            if (!referer) throw new ServerErrorProblem();

            const workspace = new Workspace();
            const loader = await workspace.createLoader();
            const resolvedUrl = await loader.resolve(originalImport, referer, ResolutionMode.Import);

            try {
              bundle = await bundler.fromUrl(resolvedUrl);
            } catch (e) {
              console.log(originalImport, resolvedUrl);
              throw e;
            }
          }

          bundle.srcCode = transformImports(
            bundle.srcCode,
            (path) => `/scripts?import=${path}`,
          );

          return ctx.body(bundle.srcCode, 200, {
            "Content-Type": "application/javascript",
          });
        },
      );
    }
    return this;
  }

  #injectDefaultStylesheet(defaultStylesheet?: StyleSrc) {
    if (!defaultStylesheet) return this;
    const stylesheetUrl = "/default-styles.css";
    let bundled: string = "";
    this.#defaultBundles.push(async () => {
      bundled = (await this.services.callFunc(bundleStyleSrc, defaultStylesheet, stylesheetUrl)).srcCode;
    });
    this.routeBuilder.mapGet(stylesheetUrl, (ctx) => {
      return ctx.body(bundled, 200, { "content-type": "text/css" });
    });
    this.middleware.use(async (ctx, next) => {
      await next();
      if (ctx.res.headers.get("content-type")?.startsWith("text/html")) {
        const res = ctx.res.clone();
        ctx.res = new Response(injectStyleSheet(await res.text(), stylesheetUrl), {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      }
    });
    return this;
  }

  bundleStylesWithLightning(
    options?: LightningBundlerOptions & { defaultStyleSheet?: StyleSrc },
  ): ExternalPageRouteBuilder {
    this.services.addSingleton(
      ICssBundler,
      class extends LightningBundler {
        constructor() {
          super(options);
        }
      },
    );

    return this.#injectDefaultStylesheet(options?.defaultStyleSheet);
  }

  bundleStylesWithTailwind(
    options?: Partial<TailwindBundlerOptions> & { defaultStyleSheet?: StyleSrc },
  ): ExternalPageRouteBuilder {
    this.services.addSingleton(
      ICssBundler,
      class extends TailwindBundler {
        constructor() {
          super(options);
        }
      },
    );

    return this.#injectDefaultStylesheet(options?.defaultStyleSheet ?? `@import "tailwindcss";`);
  }

  #injectDefaultScript(defaultScript?: ScriptSrc) {
    if (!defaultScript) return this;
    const scriptUrl = "/default-script.js";
    let bundled: string = "";
    this.#defaultBundles.push(async () => {
      bundled = (await this.services.callFunc(bundleScriptSrc, defaultScript, scriptUrl)).srcCode;
    });
    this.routeBuilder.mapGet(scriptUrl, (ctx) => {
      return ctx.body(bundled, 200, { "content-type": "application/javascript" });
    });
    this.middleware.use(async (ctx, next) => {
      await next();
      if (ctx.res.headers.get("content-type")?.startsWith("text/html")) {
        const res = ctx.res.clone();
        ctx.res = new Response(injectScript(await res.text(), scriptUrl), {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      }
    });
    return this;
  }

  bundleScriptWithDeno(options?: DenoBundlerOptions & { defaultScript?: ScriptSrc }): ExternalPageRouteBuilder {
    this.services.addSingleton(
      IJsBundler,
      class extends DenoBundler {
        constructor() {
          super(options);
        }
      },
    );

    return this.#injectDefaultScript(options?.defaultScript);
  }

  bundleScriptWithRolldown(options?: RolldownBundlerOptions & { defaultScript?: ScriptSrc }): ExternalPageRouteBuilder {
    this.services.addSingleton(
      IJsBundler,
      class extends RolldownBundler {
        constructor() {
          super(options);
        }
      },
    );

    return this.#injectDefaultScript(options?.defaultScript);
  }

  #map(path: string, method: string | string[], pageFactory: (page: PageHandlerBuilder) => void) {
    const page = this.services.getService(PageHandlerBuilder, path, method, this.services, this.routeBuilder);
    pageFactory(page);
    this.#pages.push(page);
    return this;
  }

  mapGet(path: string, pageFactory: (page: ExternalPageHandlerBuilder) => void): ExternalPageRouteBuilder {
    return this.#map(path, "get", pageFactory);
  }

  mapPost(path: string, pageFactory: (page: ExternalPageHandlerBuilder) => void): ExternalPageRouteBuilder {
    return this.#map(path, "post", pageFactory);
  }

  mapPut(path: string, pageFactory: (page: ExternalPageHandlerBuilder) => void): ExternalPageRouteBuilder {
    return this.#map(path, "put", pageFactory);
  }

  mapPatch(path: string, pageFactory: (page: ExternalPageHandlerBuilder) => void): ExternalPageRouteBuilder {
    return this.#map(path, "patch", pageFactory);
  }

  mapDelete(path: string, pageFactory: (page: ExternalPageHandlerBuilder) => void): ExternalPageRouteBuilder {
    return this.#map(path, "delete", pageFactory);
  }

  mapAll(path: string, pageFactory: (page: ExternalPageHandlerBuilder) => void): ExternalPageRouteBuilder {
    return this.#map(path, "all", pageFactory);
  }

  mapCustom(
    method: string | string[],
    path: string,
    pageFactory: (page: ExternalPageHandlerBuilder) => void,
  ): ExternalPageRouteBuilder {
    return this.#map(path, method, pageFactory);
  }

  mapModule(module: PageModule): this {
    module(this, this.services);
    return this;
  }

  async mapModules(glob: string): Promise<void> {
    for await (const entry of expandGlob(glob)) {
      if (entry.isFile) {
        const module = await importModule(entry.path);
        this.mapModule(module["default"] as PageModule);
      }
    }
  }

  async build(): Promise<void> {
    const logger = this.services.getService(ILogger)(["deno.net", "app-builder", "pages"]);

    logger.debug("Discovering islands");
    let start = performance.now();
    await Promise.all(this.#pages.map((page) => page.islands.map((_) => _())).flat());
    let stop = performance.now();
    let duration = stop - start;
    logger.info("Discovered islands ({duration}ms)", { duration });

    logger.debug("Running registered bundlers");
    start = performance.now();
    await Promise.all(this.#defaultBundles.map((_) => _()));
    await Promise.all(this.#pages.map((page) => page.bundles.map((_) => _())).flat());
    stop = performance.now();
    duration = stop - start;
    logger.info("Bundlers finished ({duration}ms)", { duration });
  }
}
