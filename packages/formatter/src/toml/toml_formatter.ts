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
        wasmPath: new URL("plugin.wasm", import.meta.url),
        wasm256Sha: "0126c8112691542d30b52a639076ecc83e07bace877638cee7c6915fd36b8629",
      },
      options,
    );
  }
}
