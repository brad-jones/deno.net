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
        wasmPath: `${import.meta.dirname}/plugin.wasm`,
      },
      options,
    );
  }
}
