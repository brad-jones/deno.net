import { expect } from "@std/expect";
import { FilteredSink } from "../src/sinks/filtered_sink.ts";
import type { ISink } from "../src/sinks/sink.ts";
import type { IFilter } from "../src/filters/filter.ts";
import type { LogLevel, LogRecord } from "@logtape/logtape";

// Helper function to create mock LogRecord objects
function createLogRecord(
  level: LogLevel,
  message = "Test message",
  category = ["test"],
  timestamp?: Date,
  properties = {},
): LogRecord {
  return {
    level,
    message: Array.isArray(message) ? message : [message],
    timestamp: (timestamp ?? new Date("2024-01-01T12:00:00.000Z")).valueOf(),
    category,
    rawMessage: Array.isArray(message) ? message.join(" ") : message,
    properties,
  };
}

// Mock sink implementation for testing
class MockSink implements ISink {
  public records: LogRecord[] = [];

  sink(record: LogRecord): void {
    this.records.push(record);
  }

  clear(): void {
    this.records = [];
  }

  get callCount(): number {
    return this.records.length;
  }
}

// Mock filter implementation for testing
class MockFilter implements IFilter {
  private shouldPass: boolean;
  public filterCallCount = 0;
  public lastRecord: LogRecord | null = null;

  constructor(shouldPass = true) {
    this.shouldPass = shouldPass;
  }

  filter(record: LogRecord): boolean {
    this.filterCallCount++;
    this.lastRecord = record;
    return this.shouldPass;
  }

  setShouldPass(shouldPass: boolean): void {
    this.shouldPass = shouldPass;
  }

  reset(): void {
    this.filterCallCount = 0;
    this.lastRecord = null;
  }
}

// Level filter implementation for testing
class TestLevelFilter implements IFilter {
  private minLevel: LogLevel;
  private levelOrder: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warning: 3,
    error: 4,
    fatal: 5,
  };

  constructor(minLevel: LogLevel) {
    this.minLevel = minLevel;
  }

  filter(record: LogRecord): boolean {
    return this.levelOrder[record.level] >= this.levelOrder[this.minLevel];
  }
}

// Category filter implementation for testing
class TestCategoryFilter implements IFilter {
  private allowedCategories: string[];

  constructor(allowedCategories: string[]) {
    this.allowedCategories = allowedCategories;
  }

  filter(record: LogRecord): boolean {
    return record.category.some((cat) => this.allowedCategories.includes(cat));
  }
}

Deno.test("FilteredSink - constructor with single filter", () => {
  const mockSink = new MockSink();
  const mockFilter = new MockFilter();
  const filteredSink = new FilteredSink(mockSink, mockFilter);

  expect(filteredSink).toBeInstanceOf(FilteredSink);
});

Deno.test("FilteredSink - constructor with multiple filters", () => {
  const mockSink = new MockSink();
  const filter1 = new MockFilter();
  const filter2 = new MockFilter();
  const filter3 = new MockFilter();
  const filteredSink = new FilteredSink(mockSink, filter1, filter2, filter3);

  expect(filteredSink).toBeInstanceOf(FilteredSink);
});

Deno.test("FilteredSink - constructor with no filters", () => {
  const mockSink = new MockSink();
  const filteredSink = new FilteredSink(mockSink);

  expect(filteredSink).toBeInstanceOf(FilteredSink);
});

Deno.test("FilteredSink - single filter passes - record should reach sink", () => {
  const mockSink = new MockSink();
  const passingFilter = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, passingFilter);

  const record = createLogRecord("info", "Test message");
  filteredSink.sink(record);

  expect(passingFilter.filterCallCount).toBe(1);
  expect(passingFilter.lastRecord).toBe(record);
  expect(mockSink.callCount).toBe(1);
  expect(mockSink.records[0]).toBe(record);
});

Deno.test("FilteredSink - single filter rejects - record should not reach sink", () => {
  const mockSink = new MockSink();
  const rejectingFilter = new MockFilter(false);
  const filteredSink = new FilteredSink(mockSink, rejectingFilter);

  const record = createLogRecord("info", "Test message");
  filteredSink.sink(record);

  expect(rejectingFilter.filterCallCount).toBe(1);
  expect(rejectingFilter.lastRecord).toBe(record);
  expect(mockSink.callCount).toBe(0);
  expect(mockSink.records).toHaveLength(0);
});

Deno.test("FilteredSink - multiple filters all pass - record should reach sink", () => {
  const mockSink = new MockSink();
  const filter1 = new MockFilter(true);
  const filter2 = new MockFilter(true);
  const filter3 = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, filter1, filter2, filter3);

  const record = createLogRecord("info", "Test message");
  filteredSink.sink(record);

  expect(filter1.filterCallCount).toBe(1);
  expect(filter2.filterCallCount).toBe(1);
  expect(filter3.filterCallCount).toBe(1);
  expect(mockSink.callCount).toBe(1);
  expect(mockSink.records[0]).toBe(record);
});

Deno.test("FilteredSink - first filter rejects - later filters not called", () => {
  const mockSink = new MockSink();
  const rejectingFilter = new MockFilter(false);
  const passingFilter1 = new MockFilter(true);
  const passingFilter2 = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, rejectingFilter, passingFilter1, passingFilter2);

  const record = createLogRecord("info", "Test message");
  filteredSink.sink(record);

  expect(rejectingFilter.filterCallCount).toBe(1);
  expect(passingFilter1.filterCallCount).toBe(0); // Should not be called
  expect(passingFilter2.filterCallCount).toBe(0); // Should not be called
  expect(mockSink.callCount).toBe(0);
});

Deno.test("FilteredSink - middle filter rejects - later filters not called", () => {
  const mockSink = new MockSink();
  const passingFilter1 = new MockFilter(true);
  const rejectingFilter = new MockFilter(false);
  const passingFilter2 = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, passingFilter1, rejectingFilter, passingFilter2);

  const record = createLogRecord("info", "Test message");
  filteredSink.sink(record);

  expect(passingFilter1.filterCallCount).toBe(1);
  expect(rejectingFilter.filterCallCount).toBe(1);
  expect(passingFilter2.filterCallCount).toBe(0); // Should not be called
  expect(mockSink.callCount).toBe(0);
});

Deno.test("FilteredSink - no filters - record always reaches sink", () => {
  const mockSink = new MockSink();
  const filteredSink = new FilteredSink(mockSink);

  const record = createLogRecord("info", "Test message");
  filteredSink.sink(record);

  expect(mockSink.callCount).toBe(1);
  expect(mockSink.records[0]).toBe(record);
});

Deno.test("FilteredSink - level filter integration", () => {
  const mockSink = new MockSink();
  const levelFilter = new TestLevelFilter("warning"); // warning and above
  const filteredSink = new FilteredSink(mockSink, levelFilter);

  // Test records below warning level - should be rejected
  filteredSink.sink(createLogRecord("trace"));
  filteredSink.sink(createLogRecord("debug"));
  filteredSink.sink(createLogRecord("info"));

  expect(mockSink.callCount).toBe(0);

  // Test records at or above warning level - should pass
  filteredSink.sink(createLogRecord("warning"));
  filteredSink.sink(createLogRecord("error"));
  filteredSink.sink(createLogRecord("fatal"));

  expect(mockSink.callCount).toBe(3);
  expect(mockSink.records[0].level).toBe("warning");
  expect(mockSink.records[1].level).toBe("error");
  expect(mockSink.records[2].level).toBe("fatal");
});

Deno.test("FilteredSink - category filter integration", () => {
  const mockSink = new MockSink();
  const categoryFilter = new TestCategoryFilter(["api", "auth"]);
  const filteredSink = new FilteredSink(mockSink, categoryFilter);

  // Test records with allowed categories - should pass
  filteredSink.sink(createLogRecord("info", "API message", ["api"]));
  filteredSink.sink(createLogRecord("info", "Auth message", ["auth"]));
  filteredSink.sink(createLogRecord("info", "Mixed categories", ["api", "database"]));

  expect(mockSink.callCount).toBe(3);

  // Test records with disallowed categories - should be rejected
  filteredSink.sink(createLogRecord("info", "Database message", ["database"]));
  filteredSink.sink(createLogRecord("info", "UI message", ["ui"]));

  expect(mockSink.callCount).toBe(3); // Should still be 3
});

Deno.test("FilteredSink - combined level and category filters", () => {
  const mockSink = new MockSink();
  const levelFilter = new TestLevelFilter("info"); // info and above
  const categoryFilter = new TestCategoryFilter(["api"]);
  const filteredSink = new FilteredSink(mockSink, levelFilter, categoryFilter);

  // Should pass both filters
  filteredSink.sink(createLogRecord("info", "API info", ["api"]));
  filteredSink.sink(createLogRecord("error", "API error", ["api"]));

  expect(mockSink.callCount).toBe(2);

  // Should fail level filter
  filteredSink.sink(createLogRecord("debug", "API debug", ["api"]));

  expect(mockSink.callCount).toBe(2);

  // Should fail category filter
  filteredSink.sink(createLogRecord("info", "DB info", ["database"]));

  expect(mockSink.callCount).toBe(2);

  // Should fail both filters
  filteredSink.sink(createLogRecord("debug", "DB debug", ["database"]));

  expect(mockSink.callCount).toBe(2);
});

Deno.test("FilteredSink - multiple records processing", () => {
  const mockSink = new MockSink();
  const filter = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, filter);

  const records = [
    createLogRecord("info", "Message 1"),
    createLogRecord("warning", "Message 2"),
    createLogRecord("error", "Message 3"),
  ];

  records.forEach((record) => filteredSink.sink(record));

  expect(filter.filterCallCount).toBe(3);
  expect(mockSink.callCount).toBe(3);
  expect(mockSink.records).toEqual(records);
});

Deno.test("FilteredSink - filter behavior can change dynamically", () => {
  const mockSink = new MockSink();
  const dynamicFilter = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, dynamicFilter);

  // Initially passing
  filteredSink.sink(createLogRecord("info", "Message 1"));
  expect(mockSink.callCount).toBe(1);

  // Change filter to reject
  dynamicFilter.setShouldPass(false);
  filteredSink.sink(createLogRecord("info", "Message 2"));
  expect(mockSink.callCount).toBe(1); // Should still be 1

  // Change filter back to pass
  dynamicFilter.setShouldPass(true);
  filteredSink.sink(createLogRecord("info", "Message 3"));
  expect(mockSink.callCount).toBe(2);
});

Deno.test("FilteredSink - handles filter exceptions gracefully", () => {
  const mockSink = new MockSink();

  class ThrowingFilter implements IFilter {
    filter(_record: LogRecord): boolean {
      throw new Error("Filter error");
    }
  }

  const throwingFilter = new ThrowingFilter();
  const filteredSink = new FilteredSink(mockSink, throwingFilter);

  const record = createLogRecord("info", "Test message");

  expect(() => {
    filteredSink.sink(record);
  }).toThrow("Filter error");

  // Sink should not have been called due to filter exception
  expect(mockSink.callCount).toBe(0);
});

Deno.test("FilteredSink - handles sink exceptions gracefully", () => {
  class ThrowingSink implements ISink {
    sink(_record: LogRecord): void {
      throw new Error("Sink error");
    }
  }

  const throwingSink = new ThrowingSink();
  const passingFilter = new MockFilter(true);
  const filteredSink = new FilteredSink(throwingSink, passingFilter);

  const record = createLogRecord("info", "Test message");

  expect(() => {
    filteredSink.sink(record);
  }).toThrow("Sink error");

  // Filter should have been called
  expect(passingFilter.filterCallCount).toBe(1);
});

Deno.test("FilteredSink - preserves record data integrity", () => {
  const mockSink = new MockSink();
  const filter = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, filter);

  const originalRecord = createLogRecord(
    "error",
    "Complex message with data",
    ["api", "auth"],
    new Date("2024-01-01T12:00:00.000Z"),
    { userId: 123, sessionId: "abc-123" },
  );

  filteredSink.sink(originalRecord);

  expect(mockSink.callCount).toBe(1);
  const sinkRecord = mockSink.records[0];

  expect(sinkRecord).toBe(originalRecord); // Same reference
  expect(sinkRecord.level).toBe("error");
  expect(sinkRecord.message).toEqual(["Complex message with data"]);
  expect(sinkRecord.category).toEqual(["api", "auth"]);
  // Record integrity is preserved - same reference passed through
  expect(sinkRecord.timestamp).toEqual(originalRecord.timestamp);
});

Deno.test("FilteredSink - performance with many filters", () => {
  const mockSink = new MockSink();
  const filters: MockFilter[] = [];

  // Create 10 filters, all passing
  for (let i = 0; i < 10; i++) {
    filters.push(new MockFilter(true));
  }

  const filteredSink = new FilteredSink(mockSink, ...filters);
  const record = createLogRecord("info", "Performance test");

  const startTime = performance.now();
  filteredSink.sink(record);
  const endTime = performance.now();

  // All filters should have been called
  filters.forEach((filter) => {
    expect(filter.filterCallCount).toBe(1);
  });

  expect(mockSink.callCount).toBe(1);
  expect(endTime - startTime).toBeLessThan(10); // Should be very fast
});

Deno.test("FilteredSink - short circuit performance optimization", () => {
  const mockSink = new MockSink();

  // Create first filter that rejects, then many more filters
  const rejectingFilter = new MockFilter(false);
  const manyFilters: MockFilter[] = [];

  for (let i = 0; i < 100; i++) {
    manyFilters.push(new MockFilter(true));
  }

  const filteredSink = new FilteredSink(mockSink, rejectingFilter, ...manyFilters);
  const record = createLogRecord("info", "Short circuit test");

  filteredSink.sink(record);

  // Only first filter should have been called
  expect(rejectingFilter.filterCallCount).toBe(1);
  manyFilters.forEach((filter) => {
    expect(filter.filterCallCount).toBe(0);
  });

  expect(mockSink.callCount).toBe(0);
});

Deno.test("FilteredSink - works with different log levels", () => {
  const mockSink = new MockSink();
  const filter = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, filter);

  const levels: LogLevel[] = ["trace", "debug", "info", "warning", "error", "fatal"];

  levels.forEach((level) => {
    filteredSink.sink(createLogRecord(level, `${level} message`));
  });

  expect(mockSink.callCount).toBe(6);
  expect(filter.filterCallCount).toBe(6);

  // Verify all levels were processed
  levels.forEach((level, index) => {
    expect(mockSink.records[index].level).toBe(level);
  });
});

Deno.test("FilteredSink - works with different message types", () => {
  const mockSink = new MockSink();
  const filter = new MockFilter(true);
  const filteredSink = new FilteredSink(mockSink, filter);

  // Test different message scenarios
  const testCases = [
    { message: "Simple string" },
    { message: "" }, // Empty string
    { message: "Message with special chars: @#$%^&*()" },
    { message: "Multi\nline\nmessage" },
    { message: "Unicode: 你好 🌟 café" },
  ];

  testCases.forEach(({ message }) => {
    filteredSink.sink(createLogRecord("info", message));
  });

  expect(mockSink.callCount).toBe(testCases.length);
  expect(filter.filterCallCount).toBe(testCases.length);
});
