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
        wasmPath: `${import.meta.dirname}/plugin.wasm`,
      },
      options,
    );
  }
}
