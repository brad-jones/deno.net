# @brad-jones/deno-net-problem-details

A comprehensive TypeScript/Deno implementation of [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457), featuring pre-built problem classes based on the [SmartBear Problems Registry](https://problems-registry.smartbear.com/).

## Features

✅ **RFC 9457 Compliant** - Full implementation of the Problem Details specification\
✅ **Type Safe** - Built with TypeScript and Zod schema validation\
✅ **Pre-built Problems** - 20+ common problem classes from SmartBear registry\
✅ **HTTP Response Ready** - Built-in `toResponse()` method for instant HTTP responses\
✅ **Flexible** - Extend existing classes or create custom problem types\
✅ **Zero Dependencies** - Only requires Zod for validation\
✅ **Well Tested** - Comprehensive test suite with 25+ tests

## Installation

```sh
deno add jsr:@brad-jones/deno-net-problem-details
```

## Quick Start

### Basic Usage

```typescript
import { NotFoundProblem, ProblemDetails, ValidationError } from "@brad-jones/problem-details";

// Create a custom problem
const problem = new ProblemDetails({
  type: "https://example.com/problems/out-of-credit",
  title: "You do not have enough credit.",
  detail: "Your current balance is 30, but that costs 50.",
  status: 403,
  instance: "/account/12345/msgs/abc",
});

// Use pre-built problem classes
const notFound = new NotFoundProblem();
const validation = new ValidationError();

// Return as HTTP Response (perfect for Deno/Node.js APIs)
return problem.toResponse();
```

### With Specific Parameters

Many problem classes accept specific parameters to generate detailed error messages:

```typescript
import {
  InvalidBodyPropertyValueProblem,
  MissingBodyPropertyProblem,
  MissingRequestParameterProblem,
} from "@brad-jones/problem-details";

// Missing parameter with specific details
const missingParam = new MissingRequestParameterProblem("userId", "path");
// Result: "The request is missing the required path parameter 'userId'."
// Instance: "#/pathParameters/userId"

// Invalid property value with valid options
const invalidValue = new InvalidBodyPropertyValueProblem(
  "status",
  "invalid",
  ["active", "inactive", "pending"],
);
// Result: "The request body property 'status' has an invalid value 'invalid'. Valid values are: active, inactive, pending."

// Missing body property
const missingProp = new MissingBodyPropertyProblem("email");
// Result: "The request body is missing the required property 'email'."
// Instance: "#/email"
```

## Available Problem Classes

### Client Error Problems (4xx)

| Class                                  | Status | Use Case                        |
| -------------------------------------- | ------ | ------------------------------- |
| `ValidationError`                      | 400    | Request validation failed       |
| `BadRequestProblem`                    | 400    | Generic malformed request       |
| `InvalidParametersProblem`             | 400    | Invalid request parameters      |
| `MissingBodyPropertyProblem`           | 400    | Required body property missing  |
| `MissingRequestHeaderProblem`          | 400    | Required header missing         |
| `MissingRequestParameterProblem`       | 400    | Required parameter missing      |
| `InvalidBodyPropertyFormatProblem`     | 400    | Body property malformed         |
| `InvalidBodyPropertyValueProblem`      | 400    | Body property value invalid     |
| `InvalidRequestParameterFormatProblem` | 400    | Parameter malformed             |
| `InvalidRequestParameterValueProblem`  | 400    | Parameter value invalid         |
| `InvalidRequestHeaderFormatProblem`    | 400    | Header malformed                |
| `UnauthorizedProblem`                  | 401    | Missing/invalid credentials     |
| `ForbiddenProblem`                     | 403    | Not authorized for resource     |
| `NotFoundProblem`                      | 404    | Resource not found              |
| `AlreadyExistsProblem`                 | 409    | Resource already exists         |
| `BusinessRuleViolationProblem`         | 422    | Business rule validation failed |

### Server Error Problems (5xx)

| Class                       | Status | Use Case                        |
| --------------------------- | ------ | ------------------------------- |
| `ServerErrorProblem`        | 500    | Unexpected server error         |
| `ServiceUnavailableProblem` | 503    | Service temporarily unavailable |
| `LicenseExpiredProblem`     | 503    | Client license expired          |
| `LicenseCancelledProblem`   | 503    | Client license cancelled        |

## API Reference

### ProblemDetails

The base class for all problem details.

```typescript
class ProblemDetails {
  constructor(problem: ProblemDetailsInput);
  toJSON(): ProblemDetailsOutput;
  toResponse(additionalHeaders?: HeadersInit): Response;
}
```

#### Methods

- **`toJSON()`** - Returns the problem as a plain object (automatically called by `JSON.stringify()`)
- **`toResponse(additionalHeaders?)`** - Creates an HTTP Response with proper content-type and status

### Problem Schema

All problems conform to this Zod schema:

```typescript
const ProblemDetailsSchema = z.looseObject({
  type: z.url(), // URI identifying the problem type
  title: z.string(), // Short, human-readable summary
  detail: z.string(), // Human-readable explanation
  status: z.number(), // HTTP status code
  instance: z.string().optional(), // URI identifying specific occurrence
});
```

The schema uses `looseObject()` to allow additional properties as per RFC 9457.

## Creating Custom Problems

### Extend Existing Classes

```typescript
import { ProblemDetails } from "@brad-jones/problem-details";

export class PaymentRequiredProblem extends ProblemDetails {
  constructor(problem?: Partial<ProblemDetailsInput>) {
    super({
      type: "https://example.com/problems/payment-required",
      title: "Payment Required",
      detail: "This resource requires payment to access.",
      status: 402,
      ...problem,
    });
  }
}
```

### Parameter-Specific Problems

```typescript
export class InsufficientCreditProblem extends ProblemDetails {
  constructor(
    currentBalance: number,
    requiredAmount: number,
    additionalProblem?: Partial<ProblemDetailsInput>,
  ) {
    super({
      type: "https://example.com/problems/insufficient-credit",
      title: "Insufficient Credit",
      detail: `Your current balance is ${currentBalance}, but this action requires ${requiredAmount}.`,
      status: 402,
      instance: "#/account/balance",
      ...additionalProblem,
    });
  }
}

// Usage
const problem = new InsufficientCreditProblem(30, 50);
```

## Error Handling

The library uses Zod for runtime validation. Invalid problem details will throw a `ZodError`:

```typescript
try {
  const problem = new ProblemDetails({
    type: "not-a-valid-url", // Invalid URL
    title: "Test",
    detail: "Test detail",
    status: 400,
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Invalid problem details:", error.errors);
  }
}
```

## Standards Compliance

This library implements:

- ✅ [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- ✅ [SmartBear Problems Registry](https://problems-registry.smartbear.com/) problem types
- ✅ Proper `application/problem+json` content-type
- ✅ JSON Pointer format for `instance` references

## Links

- [RFC 9457 Specification](https://www.rfc-editor.org/rfc/rfc9457.html)
- [SmartBear Problems Registry](https://problems-registry.smartbear.com/)
- [Problem Details JSON Schema](https://github.com/SmartBear-DevRel/problems-registry)
