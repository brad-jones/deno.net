import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const IHtmlFormatter: Type<IFormatter> = new Type<IFormatter>();

export const htmlFmt = (options?: HtmlFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    IHtmlFormatter,
    class extends HtmlFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface HtmlFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class HtmlFormatter extends DprintFormatter {
  readonly version = "0.24.0";

  constructor(options?: HtmlFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: new URL("plugin.wasm", import.meta.url),
        wasm256Sha: "4d0c47230e485d9c0503f5b3209df765c9093641f05baee59e1d1c0869209abb",
      },
      options,
    );
  }
}
