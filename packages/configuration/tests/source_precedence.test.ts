import { expect } from "@std/expect";
import { Container } from "@brad-jones/deno-net-container";
import { IConfigurationSource } from "../src/sources/configuration_source.ts";
import { ConfigurationRoot } from "../src/configuration_root.ts";

/**
 * Mock sources to test precedence order
 */
class FirstSource implements IConfigurationSource {
  read(section: string[]): Promise<Record<string, string>> {
    const key = section.join(".");
    if (key === "app") {
      return Promise.resolve({
        name: "first-name",
        onlyInFirst: "first-value",
        version: "1.0.0",
      });
    }
    return Promise.resolve({});
  }
}

class SecondSource implements IConfigurationSource {
  read(section: string[]): Promise<Record<string, string>> {
    const key = section.join(".");
    if (key === "app") {
      return Promise.resolve({
        name: "second-name", // This should be overridden by first
        onlyInSecond: "second-value",
        environment: "development",
      });
    }
    return Promise.resolve({});
  }
}

class ThirdSource implements IConfigurationSource {
  read(section: string[]): Promise<Record<string, string>> {
    const key = section.join(".");
    if (key === "app") {
      return Promise.resolve({
        name: "third-name", // This should be overridden by first and second
        onlyInThird: "third-value",
        debug: "true",
      });
    }
    return Promise.resolve({});
  }
}

Deno.test("Configuration source precedence - first registered wins", async () => {
  const container = new Container();

  // Register sources in order: first, second, third
  // The key test: first registered should override later ones
  container.addSingleton(IConfigurationSource, FirstSource);
  container.addSingleton(IConfigurationSource, SecondSource);
  container.addSingleton(IConfigurationSource, ThirdSource);

  // Create configuration root with these sources
  const sources = container.getServices(IConfigurationSource);
  const configRoot = new ConfigurationRoot(sources);

  // Test the merged configuration
  const result = await configRoot.getSection("app");

  console.log("Sources processing order:", sources.map((s) => s.constructor.name));
  console.log("Final merged result:", result);

  // The critical assertion: first source should win for conflicting keys
  expect(result.name).toBe("first-name");

  // All unique keys should be present
  expect(result.onlyInFirst).toBe("first-value");
  expect(result.onlyInSecond).toBe("second-value");
  expect(result.onlyInThird).toBe("third-value");
  expect(result.version).toBe("1.0.0");
  expect(result.environment).toBe("development");
  expect(result.debug).toBe("true");
});

Deno.test("Understanding the source reversal logic", async () => {
  const container = new Container();

  // Register in order: A, B, C
  container.addSingleton(IConfigurationSource, FirstSource);
  container.addSingleton(IConfigurationSource, SecondSource);
  container.addSingleton(IConfigurationSource, ThirdSource);

  const sources = container.getServices(IConfigurationSource);
  console.log("Original order:", sources.map((s) => s.constructor.name));

  const reversed = sources.toReversed();
  console.log("Reversed order:", reversed.map((s) => s.constructor.name));

  // Simulate the merging logic step by step
  let values: Record<string, string> = {};

  for (const source of reversed) {
    const sourceData = await source.read(["app"]);
    console.log(`Processing ${source.constructor.name}:`, sourceData);
    values = { ...values, ...sourceData };
    console.log("Values after merge:", values);
  }

  // This demonstrates that later in the loop (which is earlier in registration) wins
  expect(values.name).toBe("first-name");
});
