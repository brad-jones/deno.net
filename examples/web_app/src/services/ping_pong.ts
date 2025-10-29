import { ILogger } from "@brad-jones/deno-net-logging";
import { inject, Type } from "@brad-jones/deno-net-container";

export const IPingPong = new Type<IPingPong>("IPingPong");

export interface IPingPong {
  ping(): { ping: string };
}

export class PingPong implements IPingPong {
  constructor(private logger = inject(ILogger)(["PingPong"])) {}

  ping(): { ping: string } {
    this.logger.info("The Ping, Ponged");
    return { ping: "pong" };
  }
}
