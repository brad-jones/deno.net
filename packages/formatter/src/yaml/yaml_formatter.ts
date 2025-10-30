import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const IYamlFormatter: Type<IFormatter> = new Type<IFormatter>();

export const yamlFmt = (options?: YamlFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    IYamlFormatter,
    class extends YamlFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface YamlFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class YamlFormatter extends DprintFormatter {
  readonly version = "0.5.1";

  constructor(options?: YamlFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: new URL("plugin.wasm", import.meta.url),
        wasm256Sha: "892879491ae3401d612682a492ea7b47e0eeadcbbe73178f6bb183563c277b15",
      },
      options,
    );
  }
}
