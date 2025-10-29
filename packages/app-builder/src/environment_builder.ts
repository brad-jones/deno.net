import { type IContainer, Type } from "@brad-jones/deno-net-container";

export const IEnvironment: Type<IEnvironment> = new Type<IEnvironment>("IEnvironment");

export interface IEnvironment {
  name: "Development" | "Staging" | "Production";
  additionalMetaData?: Record<string, string>;
}

export class EnvironmentBuilder {
  constructor(private services: IContainer) {
    const value = Deno.env.get("DENO_NET_ENVIRONMENT");
    if (value) {
      if (!["Development", "Staging", "Production"].includes(value)) {
        throw new Error(`DENO_NET_ENVIRONMENT must be set to one of "Development", "Staging", "Production".`);
      }
      // deno-lint-ignore no-explicit-any
      this.setEnv({ name: value as any });
    } else {
      this.setEnv({ name: "Development" });
    }
  }

  setEnv(value: IEnvironment): void {
    this.services.addSingleton(IEnvironment, { useValue: value });
  }

  is(...values: IEnvironment["name"][]): boolean {
    return values.includes(this.services.getService(IEnvironment).name);
  }

  isDevelopment(): boolean {
    return this.services.getService(IEnvironment).name === "Development";
  }

  isStaging(): boolean {
    return this.services.getService(IEnvironment).name === "Staging";
  }

  isProduction(): boolean {
    return this.services.getService(IEnvironment).name === "Production";
  }
}
