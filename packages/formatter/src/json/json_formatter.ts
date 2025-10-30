import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const IJsonFormatter: Type<IFormatter> = new Type<IFormatter>();

export const jsonFmt = (options?: JsonFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    IJsonFormatter,
    class extends JsonFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface JsonFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class JsonFormatter extends DprintFormatter {
  readonly version = "0.21.0";

  constructor(options?: JsonFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: new URL("plugin.wasm", import.meta.url),
        wasm256Sha: "188a08916eeccf2414e06c8b51d8f44d3695f055a0d63cef39eace0a11e247bc",
      },
      options,
    );
  }
}
