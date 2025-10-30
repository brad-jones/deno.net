import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const ISqlFormatter: Type<IFormatter> = new Type<IFormatter>();

export const sqlFmt = (options?: SqlFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    ISqlFormatter,
    class extends SqlFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface SqlFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class SqlFormatter extends DprintFormatter {
  readonly version = "0.2.0";

  constructor(options?: SqlFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: new URL("plugin.wasm", import.meta.url),
        wasm256Sha: "05138c7cd3651e57d70603cd5cc45fe3a0ed2c439b5ce3dee0a2b31103849871",
      },
      options,
    );
  }
}
