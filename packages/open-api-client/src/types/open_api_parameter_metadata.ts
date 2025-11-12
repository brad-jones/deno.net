/**
 * Metadata describing an OpenAPI parameter's location and serialization style.
 *
 * This type represents the metadata needed to serialize parameters in different parts
 * of an HTTP request (path, query, header, or cookie). Each location supports specific
 * serialization styles as defined by the OpenAPI specification.
 *
 * The type is a discriminated union based on the `location` property, which determines
 * the valid serialization styles available for that location.
 *
 * @property name - The parameter name
 * @property explode - Whether to use exploded serialization for arrays and objects
 * @property location - Where the parameter appears in the request (path, query, header, or cookie)
 * @property style - The serialization style, which varies based on location
 *
 * @example
 * ```ts
 * // Path parameter with simple style
 * const pathParam: OpenAPIParameterMetadata = {
 *   name: "userId",
 *   location: "path",
 *   style: "simple",
 *   explode: false
 * };
 *
 * // Query parameter with form style
 * const queryParam: OpenAPIParameterMetadata = {
 *   name: "filter",
 *   location: "query",
 *   style: "form",
 *   explode: true
 * };
 *
 * // Header parameter (only supports simple style)
 * const headerParam: OpenAPIParameterMetadata = {
 *   name: "X-API-Key",
 *   location: "header",
 *   style: "simple",
 *   explode: false
 * };
 *
 * // Cookie parameter (only supports form style)
 * const cookieParam: OpenAPIParameterMetadata = {
 *   name: "sessionId",
 *   location: "cookie",
 *   style: "form",
 *   explode: false
 * };
 * ```
 */
export type OpenAPIParameterMetadata =
  & {
    name: string;
    explode: boolean;
  }
  & (
    | {
      location: "path";
      style: "simple" | "label" | "matrix";
    }
    | {
      location: "query";
      style: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
    }
    | {
      location: "header";
      style: "simple";
    }
    | {
      location: "cookie";
      style: "form";
    }
  );
