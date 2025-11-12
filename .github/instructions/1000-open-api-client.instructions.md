---
applyTo: "packages/open-api-client/**/*"
---

# Overview of @brad-jones/deno-net-open-api-client

This projects purpose is to take an OpenAPI specification as input
& output a strongly typed TypeScript client for the described API.

This project **MUST** provide support for OpenAPI versions 3.0 & 3.1
It **COULD** provide support for OpenAPI 3.2
It **DOES NOT** need to support Open API 2.0

The specifications can be found at:

- <https://spec.openapis.org/oas/v3.2.0.html>
- <https://spec.openapis.org/oas/v3.1.2.html>
- <https://spec.openapis.org/oas/v3.0.4.html>

This project **MUST** provide support for `application/json` content types.
This project **COULD** provide support for other content types.
