import { inject, Type } from "@brad-jones/deno-net-container";
import { ILogger } from "@brad-jones/deno-net-logging";

export const IPingPong = new Type<IPingPong>("IPingPong");

export interface IPingPong {
  ping(): Record<string, string>;
}

export class PingPong implements IPingPong {
  constructor(private logger = inject(ILogger)(["PingPong"])) {}

  ping(): Record<string, string> {
    this.logger.info("Hello World {foo}", { foo: { bar: "baz" } });
    return { ping: "pong" };
  }
}
