import { z } from "@zod/zod";
import { BaseClient, type OpenAPIResponses } from "@brad-jones/deno-net-open-api-client/client";

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
