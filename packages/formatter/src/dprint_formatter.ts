import type { IFormatter } from "./formatter.ts";
import { createFromBuffer, type Formatter as BaseDprintFormatter, type GlobalConfiguration } from "@dprint/formatter";

export interface DprintFormatterOptions extends GlobalConfiguration {
  wasmPath: string;
  fileExt?: string;
}

export abstract class DprintFormatter implements IFormatter {
  #cachedFormatter: BaseDprintFormatter | undefined;

  // deno-lint-ignore no-explicit-any
  constructor(private baseOptions: DprintFormatterOptions, private pluginOptions?: any) {}

  protected async loadWasmFormatter(): Promise<BaseDprintFormatter> {
    if (this.#cachedFormatter) return this.#cachedFormatter;
    this.#cachedFormatter = createFromBuffer(await Deno.readFile(this.baseOptions.wasmPath));
    this.#cachedFormatter.setConfig(this.baseOptions, this.pluginOptions ?? {});
    return this.#cachedFormatter;
  }

  async fmt(srcCode: string): Promise<string> {
    return (await this.loadWasmFormatter()).formatText({
      filePath: this.baseOptions?.fileExt ? `-.${this.baseOptions.fileExt}` : `-`,
      fileText: srcCode,
    });
  }
}
