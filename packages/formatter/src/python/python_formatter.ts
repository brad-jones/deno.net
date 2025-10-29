import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const IPythonFormatter: Type<IFormatter> = new Type<IFormatter>();

export const pythonFmt = (options?: PythonFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    IPythonFormatter,
    class extends PythonFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface PythonFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class PythonFormatter extends DprintFormatter {
  readonly version = "0.6.2";

  constructor(options?: PythonFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: `${import.meta.dirname}/plugin.wasm`,
      },
      options,
    );
  }
}
