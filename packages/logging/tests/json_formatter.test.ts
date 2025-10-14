import { expect } from "@std/expect";
import { JsonFormatter } from "../src/formatters/json_formatter.ts";

// Helper function to parse JSON and validate structure
function parseAndValidateJson(jsonString: string): Record<string, unknown> {
  const trimmed = jsonString.trim();
  expect(trimmed).not.toBe("");

  const parsed = JSON.parse(trimmed);
  expect(typeof parsed).toBe("object");
  expect(parsed).not.toBeNull();

  return parsed;
}

Deno.test("JsonFormatter - format basic log record", () => {
  const formatter = new JsonFormatter();

  const result = formatter.format({
    category: ["my-app", "my-module"],
    level: "info",
    message: ["Test message {foo}!"],
    rawMessage: "",
    properties: { foo: "bar" },
    timestamp: 0,
  });

  const parsed = parseAndValidateJson(result);
  expect(parsed.level).toBe("INFO");
  expect(parsed.message).toBe("Test message {foo}!");
  expect(parsed.logger).toBe("my-app.my-module");
  expect(parsed.properties).toMatchObject({ foo: "bar" });
  expect(parsed["@timestamp"]).toBe("1970-01-01T00:00:00.000Z");
});
