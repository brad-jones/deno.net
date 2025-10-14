import { expect } from "@std/expect";
import { spy } from "@std/testing/mock";
import { Container, inject } from "@brad-jones/deno-net-container";
import { ILogger, type Logger, LoggingBuilder } from "../src/mod.ts";

Deno.test("integration tests", { sanitizeResources: false }, async (t) => {
  await t.step("addConsole - basic smoke test", async () => {
    using infoSpy = spy(console, "info");

    const c = new Container();
    const l = new LoggingBuilder(c);
    l.addConsole({ formatter: "json" });
    await using _l = await l.build({ reset: true });

    c.callFunc((logger: Logger = inject(ILogger)("foo")) => {
      logger.info("bar");
    });

    expect(JSON.parse(infoSpy.calls[0].args[0]).message).toBe("bar");
  });

  await t.step("addFile - basic smoke test", async () => {
    const logFilePath = `${import.meta.dirname}/logs.json`;
    await using _cleanUp = {
      async [Symbol.asyncDispose]() {
        await Deno.remove(logFilePath);
      },
    };

    const c = new Container();
    const l = new LoggingBuilder(c);
    l.addFile(logFilePath, { formatter: "json" });
    await using _l = await l.build({ reset: true });

    c.callFunc((logger: Logger = inject(ILogger)("foo")) => {
      logger.info("bar");
    });

    const logs = JSON.parse(await Deno.readTextFile(logFilePath));
    expect(logs.message).toBe("bar");
  });
});
