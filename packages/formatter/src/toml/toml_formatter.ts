import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const ITomlFormatter: Type<IFormatter> = new Type<IFormatter>();

export const tomlFmt = (options?: TomlFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    ITomlFormatter,
    class extends TomlFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface TomlFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class TomlFormatter extends DprintFormatter {
  readonly version = "0.7.0";

  constructor(options?: TomlFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: `${import.meta.dirname}/plugin.wasm`,
      },
      options,
    );
  }
}
