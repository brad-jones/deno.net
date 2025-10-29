import { z } from "jsr:@zod/zod@^4.1.12";
import { BaseClient, type OpenAPIResponses } from "jsr:@brad-jones/deno-net-open-api-client@0.0.0/client";

// Path Schemas
export const PathSchema = {
  "/count": {
    get: { response: { 200: z.object({ currentCount: z.number() }) } },
  },
  "/ping": { get: { response: { 200: z.object({ ping: z.string() }) } } },
};

export class ApiClient extends BaseClient {
  readonly "/count" = {
    get: (): Promise<
      OpenAPIResponses<typeof PathSchema["/count"]["get"]["response"]>
    > => this.sendRequest("/count", "get", PathSchema["/count"]["get"]),
  };

  readonly "/ping" = {
    get: (): Promise<
      OpenAPIResponses<typeof PathSchema["/ping"]["get"]["response"]>
    > => this.sendRequest("/ping", "get", PathSchema["/ping"]["get"]),
  };
}
