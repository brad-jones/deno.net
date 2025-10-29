import type { Schema } from "./schema.ts";
import type { IFormatter } from "../formatter.ts";
import { Type } from "@brad-jones/deno-net-container";
import { DprintFormatter } from "../dprint_formatter.ts";
import type { GlobalConfiguration } from "@dprint/formatter";
import type { ContainerModule } from "@brad-jones/deno-net-container";

export const IDockerfileFormatter: Type<IFormatter> = new Type<IFormatter>();

export const dockerfileFmt = (options?: DockerfileFormatterOptions): ContainerModule => (c) => {
  c.addSingleton(
    IDockerfileFormatter,
    class extends DockerfileFormatter {
      constructor() {
        super(options);
      }
    },
  );
};

export interface DockerfileFormatterOptions extends Schema {
  globalOptions?: GlobalConfiguration;
}

export class DockerfileFormatter extends DprintFormatter {
  readonly version = "0.3.3";

  constructor(options?: DockerfileFormatterOptions) {
    super(
      {
        ...options?.globalOptions,
        wasmPath: `${import.meta.dirname}/plugin.wasm`,
      },
      options,
    );
  }
}
