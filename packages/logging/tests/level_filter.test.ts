import { expect } from "@std/expect";
import { LevelFilter } from "../src/filters/level_filter.ts";
import type { LogLevel, LogRecord } from "@logtape/logtape";

// Helper function to create mock LogRecord objects
function createLogRecord(level: LogLevel, message = "Test message"): LogRecord {
  return {
    level,
    message: [message],
    timestamp: new Date(),
    category: ["test"],
    rawMessage: message,
    extra: {},
    properties: {},
  } as unknown as LogRecord;
}

Deno.test("LevelFilter - constructor with null level blocks all records", () => {
  const filter = new LevelFilter(null);

  // Test all log levels should be dropped
  const levels: LogLevel[] = ["trace", "debug", "info", "warning", "error", "fatal"];

  for (const level of levels) {
    const record = createLogRecord(level);
    expect(filter.filter(record)).toBe(false);
  }
});

Deno.test("LevelFilter - constructor with specific level filters correctly", () => {
  const filter = new LevelFilter("warning");

  // Test records below warning level are filtered out
  expect(filter.filter(createLogRecord("trace"))).toBe(false);
  expect(filter.filter(createLogRecord("debug"))).toBe(false);
  expect(filter.filter(createLogRecord("info"))).toBe(false);

  // Test records at or above warning level are allowed
  expect(filter.filter(createLogRecord("warning"))).toBe(true);
  expect(filter.filter(createLogRecord("error"))).toBe(true);
  expect(filter.filter(createLogRecord("fatal"))).toBe(true);
});

Deno.test("LevelFilter - trace level allows all records", () => {
  const filter = new LevelFilter("trace");

  const levels: LogLevel[] = ["trace", "debug", "info", "warning", "error", "fatal"];

  for (const level of levels) {
    const record = createLogRecord(level);
    expect(filter.filter(record)).toBe(true);
  }
});

Deno.test("LevelFilter - debug level filters trace only", () => {
  const filter = new LevelFilter("debug");

  expect(filter.filter(createLogRecord("trace"))).toBe(false);
  expect(filter.filter(createLogRecord("debug"))).toBe(true);
  expect(filter.filter(createLogRecord("info"))).toBe(true);
  expect(filter.filter(createLogRecord("warning"))).toBe(true);
  expect(filter.filter(createLogRecord("error"))).toBe(true);
  expect(filter.filter(createLogRecord("fatal"))).toBe(true);
});

Deno.test("LevelFilter - info level filters trace and debug", () => {
  const filter = new LevelFilter("info");

  expect(filter.filter(createLogRecord("trace"))).toBe(false);
  expect(filter.filter(createLogRecord("debug"))).toBe(false);
  expect(filter.filter(createLogRecord("info"))).toBe(true);
  expect(filter.filter(createLogRecord("warning"))).toBe(true);
  expect(filter.filter(createLogRecord("error"))).toBe(true);
  expect(filter.filter(createLogRecord("fatal"))).toBe(true);
});

Deno.test("LevelFilter - warning level filters trace, debug, and info", () => {
  const filter = new LevelFilter("warning");

  expect(filter.filter(createLogRecord("trace"))).toBe(false);
  expect(filter.filter(createLogRecord("debug"))).toBe(false);
  expect(filter.filter(createLogRecord("info"))).toBe(false);
  expect(filter.filter(createLogRecord("warning"))).toBe(true);
  expect(filter.filter(createLogRecord("error"))).toBe(true);
  expect(filter.filter(createLogRecord("fatal"))).toBe(true);
});

Deno.test("LevelFilter - error level filters all except error and fatal", () => {
  const filter = new LevelFilter("error");

  expect(filter.filter(createLogRecord("trace"))).toBe(false);
  expect(filter.filter(createLogRecord("debug"))).toBe(false);
  expect(filter.filter(createLogRecord("info"))).toBe(false);
  expect(filter.filter(createLogRecord("warning"))).toBe(false);
  expect(filter.filter(createLogRecord("error"))).toBe(true);
  expect(filter.filter(createLogRecord("fatal"))).toBe(true);
});

Deno.test("LevelFilter - fatal level only allows fatal records", () => {
  const filter = new LevelFilter("fatal");

  expect(filter.filter(createLogRecord("trace"))).toBe(false);
  expect(filter.filter(createLogRecord("debug"))).toBe(false);
  expect(filter.filter(createLogRecord("info"))).toBe(false);
  expect(filter.filter(createLogRecord("warning"))).toBe(false);
  expect(filter.filter(createLogRecord("error"))).toBe(false);
  expect(filter.filter(createLogRecord("fatal"))).toBe(true);
});

Deno.test("LevelFilter - handles different LogRecord properties correctly", () => {
  const filter = new LevelFilter("info");

  // Test with different message types and metadata
  const recordWithArrayMessage = {
    level: "info" as LogLevel,
    message: ["Multiple", "message", "parts"],
    timestamp: new Date(),
    category: ["api", "database"],
    rawMessage: "Multiple message parts",
    extra: { userId: 123, requestId: "abc-def" },
    properties: {},
  } as unknown as LogRecord;

  const recordWithSingleMessage = {
    level: "error" as LogLevel,
    message: ["Single error message"],
    timestamp: new Date(),
    category: ["error-handler"],
    rawMessage: "Single error message",
    extra: {},
    properties: {},
  } as unknown as LogRecord;

  expect(filter.filter(recordWithArrayMessage)).toBe(true);
  expect(filter.filter(recordWithSingleMessage)).toBe(true);
});

Deno.test("LevelFilter - works with edge case LogRecord structures", () => {
  const filter = new LevelFilter("warning");

  // Test with minimal LogRecord structure
  const minimalRecord = {
    level: "error" as LogLevel,
    message: ["Error occurred"],
    timestamp: new Date(),
    category: ["test"],
    rawMessage: "Error occurred",
    extra: {},
    properties: {},
  } as unknown as LogRecord;

  expect(filter.filter(minimalRecord)).toBe(true);

  // Test with LogRecord that has level below threshold
  const belowThresholdRecord = {
    level: "debug" as LogLevel,
    message: ["Debug info"],
    timestamp: new Date(),
    category: ["test"],
    rawMessage: "Debug info",
    extra: {},
    properties: {},
  } as unknown as LogRecord;

  expect(filter.filter(belowThresholdRecord)).toBe(false);
});

Deno.test("LevelFilter - consistent behavior across multiple calls", () => {
  const filter = new LevelFilter("info");
  const infoRecord = createLogRecord("info", "Info message");
  const debugRecord = createLogRecord("debug", "Debug message");

  // Test multiple calls with same records produce consistent results
  for (let i = 0; i < 5; i++) {
    expect(filter.filter(infoRecord)).toBe(true);
    expect(filter.filter(debugRecord)).toBe(false);
  }
});

Deno.test("LevelFilter - level hierarchy validation", () => {
  // Test the documented level hierarchy: trace → debug → info → warning → error → fatal
  const testCases = [
    { filterLevel: "trace" as LogLevel, allowedLevels: ["trace", "debug", "info", "warning", "error", "fatal"] },
    { filterLevel: "debug" as LogLevel, allowedLevels: ["debug", "info", "warning", "error", "fatal"] },
    { filterLevel: "info" as LogLevel, allowedLevels: ["info", "warning", "error", "fatal"] },
    { filterLevel: "warning" as LogLevel, allowedLevels: ["warning", "error", "fatal"] },
    { filterLevel: "error" as LogLevel, allowedLevels: ["error", "fatal"] },
    { filterLevel: "fatal" as LogLevel, allowedLevels: ["fatal"] },
  ];

  const allLevels: LogLevel[] = ["trace", "debug", "info", "warning", "error", "fatal"];

  for (const testCase of testCases) {
    const filter = new LevelFilter(testCase.filterLevel);

    for (const level of allLevels) {
      const record = createLogRecord(level);
      const shouldAllow = testCase.allowedLevels.includes(level);
      expect(filter.filter(record)).toBe(shouldAllow);
    }
  }
});
