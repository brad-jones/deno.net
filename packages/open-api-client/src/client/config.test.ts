import { expect } from "@std/expect";
import { createCustomClient, type OpenAPIClientConfig } from "./config.ts";

Deno.test("createCustomClient - creates client with bound operations", () => {
  const config: OpenAPIClientConfig = {
    baseUrl: "https://api.example.com",
  };

  let getUserCalled = false;
  let listUsersCalled = false;

  const operations = {
    getUser: (cfg: OpenAPIClientConfig, request?: { id: string }) => {
      getUserCalled = true;
      expect(cfg).toBe(config);
      return Promise.resolve({ id: request?.id, name: "John" });
    },
    listUsers: (cfg: OpenAPIClientConfig) => {
      listUsersCalled = true;
      expect(cfg).toBe(config);
      return Promise.resolve([{ id: "1", name: "John" }]);
    },
  };

  const client = createCustomClient(config, operations);

  expect(client).toBeDefined();
  expect(typeof client.getUser).toBe("function");
  expect(typeof client.listUsers).toBe("function");
  expect(getUserCalled).toBe(false);
  expect(listUsersCalled).toBe(false);
});

Deno.test("createCustomClient - bound operations receive config", async () => {
  const config: OpenAPIClientConfig = {
    baseUrl: "https://api.example.com",
    headers: { "X-API-Key": "secret" },
  };

  const operations = {
    getUser: (cfg: OpenAPIClientConfig, request?: { id: string }) => {
      expect(cfg.baseUrl).toBe("https://api.example.com");
      expect(cfg.headers).toEqual({ "X-API-Key": "secret" });
      return Promise.resolve({ id: request?.id, name: "John" });
    },
  };

  const client = createCustomClient(config, operations);
  await client.getUser({ id: "123" });
});

Deno.test("createCustomClient - bound operations receive request parameters", async () => {
  const config: OpenAPIClientConfig = {
    baseUrl: "https://api.example.com",
  };

  const operations = {
    getUser: (_cfg: OpenAPIClientConfig, request?: { id: string }) => {
      expect(request).toBeDefined();
      expect(request?.id).toBe("123");
      return Promise.resolve({ id: request?.id, name: "John" });
    },
    createUser: (
      _cfg: OpenAPIClientConfig,
      request?: { body: { name: string } },
    ) => {
      expect(request).toBeDefined();
      expect(request?.body.name).toBe("Alice");
      return Promise.resolve({ id: "456", name: request?.body.name });
    },
  };

  const client = createCustomClient(config, operations);

  const user1 = await client.getUser({ id: "123" });
  expect(user1.id).toBe("123");
  expect(user1.name).toBe("John");

  const user2 = await client.createUser({ body: { name: "Alice" } });
  expect(user2.id).toBe("456");
  expect(user2.name).toBe("Alice");
});

Deno.test("createCustomClient - handles operations without request parameter", async () => {
  const config: OpenAPIClientConfig = {
    baseUrl: "https://api.example.com",
  };

  const operations = {
    ping: (cfg: OpenAPIClientConfig) => {
      expect(cfg).toBe(config);
      return Promise.resolve({ pong: "pong" });
    },
  };

  const client = createCustomClient(config, operations);
  const result = await client.ping(undefined);
  expect(result.pong).toBe("pong");
});
