import * as path from "@std/path";
import { camelCase } from "@mesqueeb/case-anything";
import type { ScriptSrc, StyleSrc } from "./types.ts";
import type { JSX } from "@hono/hono/jsx/jsx-runtime";
import { ILogger } from "@brad-jones/deno-net-logging";
import type { RouteBuilder } from "../api/route_builder.ts";
import { HttpContext } from "@brad-jones/deno-net-http-context";
import { type IContainer, inject } from "@brad-jones/deno-net-container";
import { islandDiscoveryUrl } from "@brad-jones/deno-net-islands/server";
import { type IFormatter, IHtmlFormatter } from "@brad-jones/deno-net-formatter";
import { bundleScriptSrc, bundleStyleSrc, injectScript, injectStyleSheet } from "./utils.ts";

export type ExternalPageHandlerBuilder = Omit<PageHandlerBuilder, "bundles" | "islands">;

export class PageHandlerBuilder {
  #styleUrls: string[] = [];
  #scriptUrls: string[] = [];
  readonly islands: (() => Promise<void>)[] = [];
  readonly bundles: (() => Promise<void>)[] = [];

  constructor(
    private path: string,
    private method: string | string[],
    private services: IContainer,
    private routeBuilder: RouteBuilder,
    private htmlFormatter: IFormatter | undefined = inject(IHtmlFormatter, { optional: true }),
  ) {}

  #normalizePathParams(path: string): string {
    return path.replace(/:([a-zA-Z0-9-_]+)\??(\{.*?\})?/g, "$1");
  }

  #assetUrl(ext: "js" | "css", path?: string) {
    let assetPath;

    if (path) {
      assetPath = path;
    } else {
      if (this.path === "/") {
        switch (ext) {
          case "js":
            assetPath = "/script";
            break;
          case "css":
            assetPath = "/styles";
            break;
        }
      } else {
        assetPath = this.#normalizePathParams(this.path);
      }

      let assetNo;
      switch (ext) {
        case "js":
          assetNo = this.#scriptUrls.length;
          break;
        case "css":
          assetNo = this.#styleUrls.length;
          break;
      }

      assetPath = `${assetPath}.${assetNo}.${ext}`;
    }

    switch (ext) {
      case "js":
        this.#scriptUrls.push(assetPath);
        break;
      case "css":
        this.#styleUrls.push(assetPath);
        break;
    }

    return assetPath;
  }

  styles(value: StyleSrc, path?: string): ExternalPageHandlerBuilder {
    let bundled: string = "";
    const styleUrl = this.#assetUrl("css", path);
    this.bundles.push(async () => {
      bundled = (await this.services.callFunc(bundleStyleSrc, value, styleUrl)).srcCode;
    });
    this.routeBuilder.mapGet(styleUrl, (ctx) => {
      return ctx.body(bundled, 200, { "content-type": "text/css" });
    });
    return this;
  }

  script(value: ScriptSrc, path?: string): ExternalPageHandlerBuilder {
    let bundled: string = "";
    const scriptUrl = this.#assetUrl("js", path);
    this.bundles.push(async () => {
      bundled = (await this.services.callFunc(bundleScriptSrc, value, scriptUrl)).srcCode;
    });
    this.routeBuilder.mapGet(scriptUrl, (ctx) => {
      return ctx.body(bundled, 200, { "content-type": "application/javascript" });
    });
    return this;
  }

  mount(id: string, componentPath: string): ExternalPageHandlerBuilder {
    return this.script(
      `import ${camelCase(id)} from "${path.resolve(componentPath)}"; ${camelCase(id)}("${id}");`,
      `${this.path === "/" ? `/${id}` : `${this.#normalizePathParams(this.path)}-${id}`}.js`,
    );
  }

  body(handler: () => string | Promise<string> | JSX.Element): void {
    this.islands.push(() => this.#discoverIslands(handler));

    const wrappedHandler = async (ctx: HttpContext) =>
      await this.#injectAssets(
        await ctx.html(ctx.get<IContainer>("services").callFunc(handler)),
      );

    if (this.method === "all") {
      this.routeBuilder.mapAll(this.path, wrappedHandler);
    } else {
      this.routeBuilder.mapCustom(this.method, this.path, wrappedHandler);
    }
  }

  async #injectAssets(response: Response): Promise<Response> {
    let body = await response.text();

    if (!body.toUpperCase().startsWith("<!DOCTYPE")) {
      body = `<!DOCTYPE html>${body}`;
    }

    for (const stylesheetUrl of this.#styleUrls) {
      body = injectStyleSheet(body, stylesheetUrl);
    }

    for (const scriptUrl of this.#scriptUrls) {
      body = injectScript(body, scriptUrl);
    }

    body = body.replaceAll(/data-island-filepath=".*?"/g, "");

    if (this.htmlFormatter) {
      body = await this.htmlFormatter.fmt(body);
    }

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  async #discoverIslands(handler: () => string | Promise<string> | JSX.Element) {
    const logger = this.services.getService(ILogger)([
      "deno.net",
      "app-builder",
      "pages",
      "islands",
    ]);

    logger.debug("discovering islands for {method} {path}", {
      method: this.method,
      path: this.path,
    });

    const start = performance.now();

    // TODO: Need to make our own mock
    const honoCtxImport = "https://jsr.io/@hono/hono/4.10.3/src/context.ts";
    const { Context } = await import(honoCtxImport);
    const mockCtx: HttpContext = new Context(new Request(islandDiscoveryUrl));
    await using mockContainer = this.services.createChild();
    mockContainer.addScoped(HttpContext, { useValue: mockCtx });
    mockCtx.set("services", mockContainer);
    const mockResponse = await mockCtx.html(this.services.callFunc(handler));
    const body = await mockResponse.text();

    const islands: Record<string, string[]> = {};
    for (
      const match of body.matchAll(/<div id="([^"]*)" data-island-filepath="([^"]*)"[^>]*>/g)
    ) {
      const islandId = match[1];
      const islandFilePath = match[2];
      if (!islands[islandFilePath]) islands[islandFilePath] = [];
      islands[islandFilePath].push(islandId);
    }

    if (Object.keys(islands).length > 0) {
      let hydrationScript = "";
      for (const [islandFilePath, islandIds] of Object.entries(islands)) {
        const importName = camelCase(islandFilePath);
        hydrationScript = `${hydrationScript}\nimport ${importName} from "${path.resolve(islandFilePath)}";\n`;
        for (const islandId of islandIds) {
          hydrationScript = `${hydrationScript}${importName}("${islandId}");\n`;
        }
      }

      // TODO: We might need to split the islands script up into individual scripts, one per island to enable HMR.

      this.script(
        hydrationScript,
        `${this.path === "/" ? "/islands" : `${this.#normalizePathParams(this.path)}-islands`}.js`,
      );
    }

    const stop = performance.now();
    const duration = stop - start;

    logger.info("discovered {islands} for {method} {path} ({duration}ms)", {
      method: this.method,
      path: this.path,
      duration,
      islands: Object.entries(islands).map(([_, v]) => v).flat(),
    });
  }
}
