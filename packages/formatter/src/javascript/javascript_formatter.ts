import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const IJavascriptFormatter: Type<IFormatter> = new Type<IFormatter>();

export const javascriptFmt = (options?: JavascriptFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    IJavascriptFormatter,
    class extends JavascriptFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface JavascriptFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class JavascriptFormatter extends DprintFormatter {
  readonly version = "0.95.12";

  constructor(options?: JavascriptFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: new URL("plugin.wasm", import.meta.url),
        wasm256Sha: "801631db7302e818b3f0520864b056ddded23b1b699829a5e0deb9e785a1d0f7",
        fileExt: "tsx",
      },
      options,
    );
  }
}
