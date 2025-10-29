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
        wasmPath: `${import.meta.dirname}/plugin.wasm`,
      },
      options,
    );
  }
}
