import { ApiClient } from "./examples/contrived-apis/hello-world.classical.ts";
import { ResponseError } from "./src/mod.ts";

const client = new ApiClient({ baseUrl: "http://example" });

// Normal usage
const response = await client["/hello/{name}"].get({ path: { name: "Brad" } });
if (response.is(200)) {
  response.body.message; // string | undefined
}

/**
 * Body Shortcut Pattern.
 *
 * The body method should accept any valid status code from the operation
 * specification, including the "default" response.
 *
 * But it should default to 200.
 *
 * Or if the operation does not define a 200 response, it should default to the
 * "default" response if that is defined.
 *
 * Or if the "default" response is not defined, it should just assume you want
 * the body of whatever the first defined response is.
 *
 * The body parameter must be strongly typed, along with the return value of course.
 *
 * When the actual response does not match the status code, an appropriate error object should be thrown instead.
 */
try {
  const body = await client["/hello/{name}"].get({ path: { name: "Brad" } }).body();
  body.message; // Should also be typed as 'string | undefined' just as per the normal usage example above.
} catch (e) {
  if (e instanceof ResponseError) {
    e.message; // string: a descriptive error message
    e.response; // Response: the raw response returned from the fetch call
  }
}
