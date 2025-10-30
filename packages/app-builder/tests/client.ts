import { z } from "@zod/zod";
import { BaseClient, type OpenAPIResponses } from "@brad-jones/deno-net-open-api-client/client";

// Path Schemas
export const PathSchema = {
  "/foo/{bar}": {
    get: {
      request: z.object({ params: z.object({ bar: z.string() }) }),
      response: { 200: z.object({ "message": z.string() }) },
    },
  },
};

export class ApiClient extends BaseClient {
  readonly "/foo/{bar}" = {
    get: (
      request: z.input<typeof PathSchema["/foo/{bar}"]["get"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/foo/{bar}"]["get"]["response"]>
    > =>
      this.sendRequest(
        "/foo/{bar}",
        "get",
        PathSchema["/foo/{bar}"]["get"],
        request,
      ),
  };
}
