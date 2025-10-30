import { z } from "@zod/zod";
import {
  BaseClient,
  type OpenAPIResponses,
} from "@brad-jones/deno-net-open-api-client/client";

// Component Schemas
export const OrderSchema = z.object({
  "id": z.number().int().optional(),
  "petId": z.number().int().optional(),
  "quantity": z.number().int().optional(),
  "shipDate": z.string().optional(),
  "status": z.enum(["placed", "approved", "delivered"]).optional(),
  "complete": z.boolean().optional(),
});

export const CategorySchema = z.object({
  "id": z.number().int().optional(),
  "name": z.string().optional(),
});

export const UserSchema = z.object({
  "id": z.number().int().optional(),
  "username": z.string().optional(),
  "firstName": z.string().optional(),
  "lastName": z.string().optional(),
  "email": z.string().optional(),
  "password": z.string().optional(),
  "phone": z.string().optional(),
  "userStatus": z.number().int().optional(),
});

export const TagSchema = z.object({
  "id": z.number().int().optional(),
  "name": z.string().optional(),
});

export const PetSchema = z.object({
  "id": z.number().int().optional(),
  "name": z.string(),
  "category": CategorySchema.optional(),
  "photoUrls": z.array(z.string()),
  "tags": z.array(TagSchema).optional(),
  "status": z.enum(["available", "pending", "sold"]).optional(),
});

export const ApiResponseSchema = z.object({
  "code": z.number().int().optional(),
  "type": z.string().optional(),
  "message": z.string().optional(),
});

// Path Schemas
export const PathSchema = {
  "/pet": {
    post: {
      request: z.object({ body: PetSchema }),
      response: {
        200: PetSchema,
        400: z.unknown().optional(),
        422: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
    put: {
      request: z.object({ body: PetSchema }),
      response: {
        200: PetSchema,
        400: z.unknown().optional(),
        404: z.unknown().optional(),
        422: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/pet/findByStatus": {
    get: {
      request: z.object({ query: z.object({ status: z.string() }).optional() }),
      response: {
        200: z.array(PetSchema),
        400: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/pet/findByTags": {
    get: {
      request: z.object({ query: z.object({ tags: z.string() }).optional() }),
      response: {
        200: z.array(PetSchema),
        400: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/pet/{petId}": {
    get: {
      request: z.object({ params: z.object({ petId: z.string() }) }),
      response: {
        200: PetSchema,
        400: z.unknown().optional(),
        404: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
    post: {
      request: z.object({
        params: z.object({ petId: z.string() }),
        query: z.object({
          name: z.string().optional(),
          status: z.string().optional(),
        }).optional(),
      }),
      response: {
        200: PetSchema,
        400: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
    delete: {
      request: z.object({
        params: z.object({ petId: z.string() }),
        headers: z.object({ api_key: z.string().optional() }).optional(),
      }),
      response: {
        200: z.unknown().optional(),
        400: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/pet/{petId}/uploadImage": {
    post: {
      request: z.object({
        params: z.object({ petId: z.string() }),
        query: z.object({ additionalMetadata: z.string().optional() })
          .optional(),
        body: z.string().optional(),
      }),
      response: {
        200: ApiResponseSchema,
        400: z.unknown().optional(),
        404: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/store/inventory": {
    get: { response: { 200: z.object({}), default: z.unknown().optional() } },
  },
  "/store/order": {
    post: {
      request: z.object({ body: OrderSchema.optional() }),
      response: {
        200: OrderSchema,
        400: z.unknown().optional(),
        422: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/store/order/{orderId}": {
    get: {
      request: z.object({ params: z.object({ orderId: z.string() }) }),
      response: {
        200: OrderSchema,
        400: z.unknown().optional(),
        404: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
    delete: {
      request: z.object({ params: z.object({ orderId: z.string() }) }),
      response: {
        200: z.unknown().optional(),
        400: z.unknown().optional(),
        404: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/user": {
    post: {
      request: z.object({ body: UserSchema.optional() }),
      response: { 200: UserSchema, default: z.unknown().optional() },
    },
  },
  "/user/createWithList": {
    post: {
      request: z.object({ body: z.array(UserSchema).optional() }),
      response: { 200: UserSchema, default: z.unknown().optional() },
    },
  },
  "/user/login": {
    get: {
      request: z.object({
        query: z.object({
          username: z.string().optional(),
          password: z.string().optional(),
        }).optional(),
      }),
      response: {
        200: z.string(),
        400: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/user/logout": {
    get: {
      response: {
        200: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
  "/user/{username}": {
    get: {
      request: z.object({ params: z.object({ username: z.string() }) }),
      response: {
        200: UserSchema,
        400: z.unknown().optional(),
        404: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
    put: {
      request: z.object({
        params: z.object({ username: z.string() }),
        body: UserSchema.optional(),
      }),
      response: {
        200: z.unknown().optional(),
        400: z.unknown().optional(),
        404: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
    delete: {
      request: z.object({ params: z.object({ username: z.string() }) }),
      response: {
        200: z.unknown().optional(),
        400: z.unknown().optional(),
        404: z.unknown().optional(),
        default: z.unknown().optional(),
      },
    },
  },
};

export class SwaggerPetstoreClient extends BaseClient {
  readonly "/pet" = {
    post: (
      request: z.input<typeof PathSchema["/pet"]["post"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/pet"]["post"]["response"]>
    > => this.sendRequest("/pet", "post", PathSchema["/pet"]["post"], request),
    put: (
      request: z.input<typeof PathSchema["/pet"]["put"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/pet"]["put"]["response"]>
    > => this.sendRequest("/pet", "put", PathSchema["/pet"]["put"], request),
  };

  readonly "/pet/findByStatus" = {
    get: (
      request: z.input<
        typeof PathSchema["/pet/findByStatus"]["get"]["request"]
      >,
    ): Promise<
      OpenAPIResponses<
        typeof PathSchema["/pet/findByStatus"]["get"]["response"]
      >
    > =>
      this.sendRequest(
        "/pet/findByStatus",
        "get",
        PathSchema["/pet/findByStatus"]["get"],
        request,
      ),
  };

  readonly "/pet/findByTags" = {
    get: (
      request: z.input<typeof PathSchema["/pet/findByTags"]["get"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/pet/findByTags"]["get"]["response"]>
    > =>
      this.sendRequest(
        "/pet/findByTags",
        "get",
        PathSchema["/pet/findByTags"]["get"],
        request,
      ),
  };

  readonly "/pet/{petId}" = {
    get: (
      request: z.input<typeof PathSchema["/pet/{petId}"]["get"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/pet/{petId}"]["get"]["response"]>
    > =>
      this.sendRequest(
        "/pet/{petId}",
        "get",
        PathSchema["/pet/{petId}"]["get"],
        request,
      ),
    post: (
      request: z.input<typeof PathSchema["/pet/{petId}"]["post"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/pet/{petId}"]["post"]["response"]>
    > =>
      this.sendRequest(
        "/pet/{petId}",
        "post",
        PathSchema["/pet/{petId}"]["post"],
        request,
      ),
    delete: (
      request: z.input<typeof PathSchema["/pet/{petId}"]["delete"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/pet/{petId}"]["delete"]["response"]>
    > =>
      this.sendRequest(
        "/pet/{petId}",
        "delete",
        PathSchema["/pet/{petId}"]["delete"],
        request,
      ),
  };

  readonly "/pet/{petId}/uploadImage" = {
    post: (
      request: z.input<
        typeof PathSchema["/pet/{petId}/uploadImage"]["post"]["request"]
      >,
    ): Promise<
      OpenAPIResponses<
        typeof PathSchema["/pet/{petId}/uploadImage"]["post"]["response"]
      >
    > =>
      this.sendRequest(
        "/pet/{petId}/uploadImage",
        "post",
        PathSchema["/pet/{petId}/uploadImage"]["post"],
        request,
      ),
  };

  readonly "/store/inventory" = {
    get: (): Promise<
      OpenAPIResponses<typeof PathSchema["/store/inventory"]["get"]["response"]>
    > =>
      this.sendRequest(
        "/store/inventory",
        "get",
        PathSchema["/store/inventory"]["get"],
      ),
  };

  readonly "/store/order" = {
    post: (
      request: z.input<typeof PathSchema["/store/order"]["post"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/store/order"]["post"]["response"]>
    > =>
      this.sendRequest(
        "/store/order",
        "post",
        PathSchema["/store/order"]["post"],
        request,
      ),
  };

  readonly "/store/order/{orderId}" = {
    get: (
      request: z.input<
        typeof PathSchema["/store/order/{orderId}"]["get"]["request"]
      >,
    ): Promise<
      OpenAPIResponses<
        typeof PathSchema["/store/order/{orderId}"]["get"]["response"]
      >
    > =>
      this.sendRequest(
        "/store/order/{orderId}",
        "get",
        PathSchema["/store/order/{orderId}"]["get"],
        request,
      ),
    delete: (
      request: z.input<
        typeof PathSchema["/store/order/{orderId}"]["delete"]["request"]
      >,
    ): Promise<
      OpenAPIResponses<
        typeof PathSchema["/store/order/{orderId}"]["delete"]["response"]
      >
    > =>
      this.sendRequest(
        "/store/order/{orderId}",
        "delete",
        PathSchema["/store/order/{orderId}"]["delete"],
        request,
      ),
  };

  readonly "/user" = {
    post: (
      request: z.input<typeof PathSchema["/user"]["post"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/user"]["post"]["response"]>
    > =>
      this.sendRequest("/user", "post", PathSchema["/user"]["post"], request),
  };

  readonly "/user/createWithList" = {
    post: (
      request: z.input<
        typeof PathSchema["/user/createWithList"]["post"]["request"]
      >,
    ): Promise<
      OpenAPIResponses<
        typeof PathSchema["/user/createWithList"]["post"]["response"]
      >
    > =>
      this.sendRequest(
        "/user/createWithList",
        "post",
        PathSchema["/user/createWithList"]["post"],
        request,
      ),
  };

  readonly "/user/login" = {
    get: (
      request: z.input<typeof PathSchema["/user/login"]["get"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/user/login"]["get"]["response"]>
    > =>
      this.sendRequest(
        "/user/login",
        "get",
        PathSchema["/user/login"]["get"],
        request,
      ),
  };

  readonly "/user/logout" = {
    get: (): Promise<
      OpenAPIResponses<typeof PathSchema["/user/logout"]["get"]["response"]>
    > =>
      this.sendRequest(
        "/user/logout",
        "get",
        PathSchema["/user/logout"]["get"],
      ),
  };

  readonly "/user/{username}" = {
    get: (
      request: z.input<typeof PathSchema["/user/{username}"]["get"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/user/{username}"]["get"]["response"]>
    > =>
      this.sendRequest(
        "/user/{username}",
        "get",
        PathSchema["/user/{username}"]["get"],
        request,
      ),
    put: (
      request: z.input<typeof PathSchema["/user/{username}"]["put"]["request"]>,
    ): Promise<
      OpenAPIResponses<typeof PathSchema["/user/{username}"]["put"]["response"]>
    > =>
      this.sendRequest(
        "/user/{username}",
        "put",
        PathSchema["/user/{username}"]["put"],
        request,
      ),
    delete: (
      request: z.input<
        typeof PathSchema["/user/{username}"]["delete"]["request"]
      >,
    ): Promise<
      OpenAPIResponses<
        typeof PathSchema["/user/{username}"]["delete"]["response"]
      >
    > =>
      this.sendRequest(
        "/user/{username}",
        "delete",
        PathSchema["/user/{username}"]["delete"],
        request,
      ),
  };
}
