// deno-coverage-ignore-file

import { $ } from "@david/dax";
import { encodeHex } from "@std/encoding";
import { expect } from "@std/expect";
import { dirname } from "@std/path/dirname";

/**
 * Compare two TypeScript code strings, ignoring whitespace differences
 */
export function assertCodeEquals(actual: string, expected: string) {
  const normalize = (code: string) => {
    return code
      .replace(/\s+/g, " ") // Collapse whitespace
      .replace(/\s*([{}();,:])\s*/g, "$1") // Remove whitespace around punctuation
      .trim();
  };

  expect(normalize(actual)).toBe(normalize(expected));
}

/**
 * Create a mock HTTP server for testing generated clients
 */
export class MockApiServer {
  private handlers: Map<string, (req: Request) => Response> = new Map();

  on(method: string, path: string, handler: (req: Request) => Response) {
    this.handlers.set(`${method.toUpperCase()} ${path}`, handler);
  }

  handle(request: Request): Response {
    const url = new URL(request.url);
    const key = `${request.method} ${url.pathname}`;
    const handler = this.handlers.get(key);

    if (!handler) {
      return new Response("Not Found", { status: 404 });
    }

    return handler(request);
  }

  /**
   * Returns a custom fetch function that can be injected via setGlobalConfig
   */
  getFetchImpl(): typeof fetch {
    // deno-lint-ignore no-this-alias
    const server = this;
    // deno-lint-ignore require-await
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      return server.handle(request);
    };
    return fetchImpl as typeof fetch;
  }
}

/**
 * Evaluate generated TypeScript code and return the module exports.
 * First validates that the code compiles using deno check, then uses dynamic import.
 * Writes to a local temp directory so coverage can access it later.
 */
// deno-lint-ignore no-explicit-any
export async function evaluateGeneratedCode(code: string): Promise<any> {
  // Write the code to a tmp file
  const hash = encodeHex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)),
  );
  const tempFile = `${import.meta.dirname}/tmp/generated-${hash}.ts`;
  await Deno.mkdir(dirname(tempFile), { recursive: true });
  await Deno.writeTextFile(tempFile, code);

  // First validate that code compiles
  await $`deno check ${tempFile}`;

  // If validation passes, import and return the module
  const module = await import(`file://${tempFile}`);
  return module;

  // Note: We don't delete the temp file here so coverage can access it
  // The entire tests/tmp directory can be gitignored and cleaned manually
}
