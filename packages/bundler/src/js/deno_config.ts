import { createMutex, type Mutex } from "@117/mutex";
import type { ContainerModule, IContainer } from "@brad-jones/deno-net-container";
import { DenoConfig, type DenoConfigFile, IDenoConfigFactory } from "@brad-jones/deno-config";

const mutexLocks: Record<string, Mutex> = {};

export const denoConfigFactory: ContainerModule = (c: IContainer) => {
  c.addSingleton(IDenoConfigFactory, {
    useValue: (tsFilePath: string) => new LockedDenoConfig(tsFilePath),
  });
};

export class LockedDenoConfig extends DenoConfig {
  override async readConfig(): Promise<DenoConfigFile | undefined> {
    const configFile = await this.findConfigFile();
    if (!configFile) return undefined;
    if (!mutexLocks[configFile]) mutexLocks[configFile] = createMutex();
    await mutexLocks[configFile].acquire();
    return await super.readConfig();
  }

  override async resetConfig(): Promise<void> {
    await super.resetConfig();
    const configFile = this.configFilePath!;
    if (mutexLocks[configFile]) {
      mutexLocks[configFile].release();
      //delete mutexLocks[configFile];
    }
  }
}
