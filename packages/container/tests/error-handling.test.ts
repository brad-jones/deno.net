import { expect } from "@std/expect";
import { type ILogger, iLogger } from "./test-fixtures.ts";
import { Container, inject, TokenNotFound } from "../src/mod.ts";

Deno.test("inject throw not found with unregistered token", () => {
  const container = new Container();

  expect(() => {
    container.callFunc(() => inject(iLogger));
  }).toThrow(TokenNotFound);
});

Deno.test("container handles null/undefined gracefully", () => {
  const container = new Container();
  container.addTransient(iLogger, { useValue: undefined as unknown as ILogger });

  const service = container.getService(iLogger);
  expect(service).toBeUndefined();
});
