import { z } from "@zod/zod";

/**
 * Base Configuration for the client.
 *
 * At minimum a base url must be configured, the opportunity to provide default
 * headers exists amongst other options that are applied at a global level
 * across all OpenAPI operations.
 */
export type OpenAPIClientConfig = z.input<typeof OpenAPIClientConfig>;

export const OpenAPIClientConfig = z.object({
  baseUrl: z.union([z.url(), z.instanceof(URL)]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  fetch: z.custom<typeof fetch>((v) => typeof v === "function").optional(),
});

/**
 * A function that binds a configuration object to a given set of OpenAPI operation functions.
 *
 * @param config The configuration object
 * @param operations The set operations
 * @returns A new object with the bound operation methods.
 *
 * @example
 * ```ts
 * import { createCustomClient, getUser, listUsers } from './generated-client.ts';
 *
 * const client = createCustomClient(config, {
 *   getUser,
 *   listUsers,
 * });
 *
 * await client.getUser();
 * ```
 */
export function createCustomClient<T extends OpenAPIOperations>(
  config: OpenAPIClientConfig,
  operations: T,
): OpenAPIClient<T> {
  // deno-lint-ignore no-explicit-any
  const client: any = {};

  for (const [k, v] of Object.entries(operations)) {
    // deno-lint-ignore no-explicit-any
    client[k] = (request?: any) => v(config, request);
  }

  return client as OpenAPIClient<T>;
}

type OpenAPIOperations = Record<
  string,
  // deno-lint-ignore no-explicit-any
  (config: OpenAPIClientConfig, request?: any) => any
>;

type ClientFunction<T> = T extends (config: OpenAPIClientConfig, request: infer R) => infer Return
  ? (request: R) => Return
  : T extends (config: OpenAPIClientConfig, request?: infer R) => infer Return ? (request?: R) => Return
  : never;

type OpenAPIClient<T extends OpenAPIOperations> = {
  [K in keyof T]: ClientFunction<T[K]>;
};
