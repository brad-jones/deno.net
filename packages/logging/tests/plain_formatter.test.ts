import { expect } from "@std/expect";
import { PlainFormatter } from "../src/formatters/plain_formatter.ts";

Deno.test("PlainFormatter - format basic log record", () => {
  const formatter = new PlainFormatter();

  const result = formatter.format({
    category: ["my-app", "my-module"],
    level: "info",
    message: ["Test message {foo}!"],
    rawMessage: "",
    properties: { foo: "bar" },
    timestamp: 0,
  });

  // Should contain the basic elements (LogTape uses abbreviated levels)
  expect(result).toContain("[INF]");
  expect(result).toContain("Test message");
  expect(typeof result).toBe("string");
  expect(result.length).toBeGreaterThan(0);
});
