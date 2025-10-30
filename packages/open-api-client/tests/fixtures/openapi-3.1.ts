import { z } from "@zod/zod";
import {
  BaseClient,
  type OpenAPIResponses,
} from "@brad-jones/deno-net-open-api-client/client";

// Component Schemas
export const PetSchema = z.object({
  "id": z.number().int(),
  "name": z.string(),
  "tag": z.string().optional(),
});

export const PetsSchema = z.array(PetSchema);

export const ErrorSchema = z.object({
  "code": z.number().int(),
  "message": z.string(),
});

// Path Schemas
export const PathSchema = {
  "/pets": {
    get: {
      request: z.object({
        query: z.object({ limit: z.string().optional() }).optional(),
      }),
      response: { 200: PetsSchema, default: ErrorSchema },
    },
    post: { response: { 201: z.unknown().optional(), default: ErrorSchema } },
  },
  "/pets/{petId}": {
    get: {
      request: z.object({ params: z.object({ petId: z.string() }) }),
      response: { 200: PetSchema, default: ErrorSchema },
    },
  },
};

export class SwaggerPetstoreClient extends BaseClient {
  readonly "/pets" = {
    get: (
      request: z.input<typeof PathSchema["/pets"]["get"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/pets"]["get"]["response"]>
    > => this.sendRequest("/pets", "get", PathSchema["/pets"]["get"], request),
    post: (): Promise<
      OpenAPIResponses<typeof PathSchema["/pets"]["post"]["response"]>
    > => this.sendRequest("/pets", "post", PathSchema["/pets"]["post"]),
  };

  readonly "/pets/{petId}" = {
    get: (
      request: z.input<typeof PathSchema["/pets/{petId}"]["get"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/pets/{petId}"]["get"]["response"]>
    > =>
      this.sendRequest(
        "/pets/{petId}",
        "get",
        PathSchema["/pets/{petId}"]["get"],
        request,
      ),
  };
}
