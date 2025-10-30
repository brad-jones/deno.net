import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const IMarkdownFormatter: Type<IFormatter> = new Type<IFormatter>();

export const markdownFmt = (options?: MarkdownFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    IMarkdownFormatter,
    class extends MarkdownFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface MarkdownFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class MarkdownFormatter extends DprintFormatter {
  readonly version = "0.20.0";

  constructor(options?: MarkdownFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: new URL("plugin.wasm", import.meta.url),
        wasm256Sha: "5eb4e23248231ce0fc6b6379229b3bf7e0f649b337eacf47764ee8fe2c062257",
      },
      options,
    );
  }
}
