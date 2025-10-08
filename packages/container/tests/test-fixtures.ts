import { inject, Type } from "../src/mod.ts";

// Test interfaces and tokens
export const iLogger = new Type<ILogger>("iLogger");
export interface ILogger {
  log(message: string): void;
}

export const iDatabase = new Type<IDatabase>("iDatabase");
export interface IDatabase {
  save(data: string): void;
}

export const iPlugin = new Type<IPlugin>("iPlugin");
export interface IPlugin {
  execute(): string;
}

// Test classes
export class Logger implements ILogger {
  log(message: string): void {
    console.log(message);
  }
}

export class Database implements IDatabase {
  save(data: string): void {
    console.log(`Saving: ${data}`);
  }
}

export class Plugin1 implements IPlugin {
  execute(): string {
    return "plugin1";
  }
}

export class Plugin2 implements IPlugin {
  execute(): string {
    return "plugin2";
  }
}

export class Service {
  constructor(
    public logger: ILogger = inject(iLogger),
    public db: IDatabase = inject(iDatabase),
  ) {}
}

export class ServiceWithPlugins {
  constructor(
    public plugins: IPlugin[] = inject(iPlugin, { multi: true }),
  ) {}
}

// Test utilities
let callCount = 0;

export function factoryFunction(): Logger {
  callCount++;
  return new Logger();
}

export function resetFactoryCallCount() {
  callCount = 0;
}

export function getFactoryCallCount(): number {
  return callCount;
}
