import type { ContainerModule } from "@brad-jones/deno-net-container";
import type { ClientGeneratorOptions } from "@brad-jones/deno-net-open-api-client";
import { ClassicalClientGenerator } from "./classical_client_generator.ts";
import { FunctionalClientGenerator } from "./functional_client_generator.ts";
import { IClientGenerator } from "./i_client_generator.ts";

/**
 * Configuration options for the OpenAPI client module.
 *
 * Extends `ClientGeneratorOptions` with additional container-specific settings.
 */
export interface OpenAPIClientModuleOptions extends ClientGeneratorOptions {
  /** The type of client to generate. Defaults to "classical". */
  clientType?: "classical" | "functional";
}

/**
 * Creates a container module for registering OpenAPI client generators.
 *
 * This module registers an `IClientGenerator` implementation based on the specified
 * client type. The generator can produce either classical class-based or functional
 * TypeScript clients from OpenAPI specifications.
 *
 * @param options Configuration options for the client generator
 * @returns A container module that registers the appropriate client generator
 *
 * @example
 * ```ts
 * import { Container } from "@brad-jones/deno-net-container";
 * import { openAPIClientModule } from "@brad-jones/deno-net-open-api-client";
 *
 * const container = new Container();
 * container.useModule(openAPIClientModule({ clientType: "classical" }));
 * ```
 */
export function openAPIClientModule(options?: OpenAPIClientModuleOptions): ContainerModule {
  return (c) => {
    const clientType = options?.clientType ?? "classical";

    switch (clientType) {
      case "classical":
        c.addTransient(
          IClientGenerator,
          class extends ClassicalClientGenerator {
            constructor() {
              super(options);
            }
          },
        );
        break;

      case "functional":
        c.addTransient(
          IClientGenerator,
          class extends FunctionalClientGenerator {
            constructor() {
              super(options);
            }
          },
        );
        break;
    }
  };
}
