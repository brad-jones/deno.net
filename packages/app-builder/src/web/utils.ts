import { exists } from "@std/fs";
import type { ScriptSrc, StyleSrc } from "./types.ts";
import { inject } from "@brad-jones/deno-net-container";
import { type Bundle, ICssBundler, IJsBundler } from "@brad-jones/deno-net-bundler";
import { ILogger } from "@brad-jones/deno-net-logging";

export async function bundleScriptSrc(
  src: ScriptSrc,
  scriptUrl: string,
  bundler = inject(IJsBundler),
  logger = inject(ILogger)(["deno.net", "app-builder", "pages", "bundler"]),
): Promise<Bundle> {
  const start = performance.now();
  logger.debug("bundling {scriptUrl}", { scriptUrl, bundler });

  const awaitedSrc = await src;

  let bundle: Bundle;
  if (typeof awaitedSrc === "function") {
    bundle = await bundler.fromFunction(awaitedSrc);
  } else if (await exists(awaitedSrc, { isFile: true })) {
    bundle = await bundler.fromFile(awaitedSrc);
  } else {
    bundle = await bundler.fromSrc(awaitedSrc);
  }

  //bundle.srcCode = transformImports(bundle.srcCode, (path) => `/scripts?import=${path}`);

  const stop = performance.now();
  const duration = stop - start;
  logger.info("bundled {scriptUrl} ({duration}ms)", { scriptUrl, duration, bundler });
  return bundle;
}

export async function bundleStyleSrc(
  src: StyleSrc,
  stylesheetUrl: string,
  bundler = inject(ICssBundler),
  logger = inject(ILogger)(["deno.net", "app-builder", "pages", "bundler"]),
): Promise<Bundle> {
  const start = performance.now();
  logger.debug("bundling {stylesheetUrl}", { stylesheetUrl, bundler });

  const awaitedSrc = await src;

  let bundle: Bundle;
  if (await exists(awaitedSrc, { isFile: true })) {
    bundle = await bundler.fromFile(awaitedSrc);
  } else {
    bundle = await bundler.fromSrc(awaitedSrc);
  }

  const stop = performance.now();
  const duration = stop - start;
  logger.info("bundled {stylesheetUrl} ({duration}ms)", { stylesheetUrl, duration, bundler });
  return bundle;
}

export function injectStyleSheet(body: string, stylesheetUrl: string): string {
  if (body.includes("</head>")) {
    body = body.replace("</head>", `<link rel="stylesheet" href="${stylesheetUrl}"></head>`);
  } else {
    body = `<link rel="stylesheet" href="${stylesheetUrl}">${body}`;
  }
  return body;
}

export function injectScript(body: string, scriptUrl: string): string {
  if (body.includes("</body>")) {
    body = body.replace("</body>", `<script type="module" src="${scriptUrl}"></script></body>`);
  } else {
    body = `${body}<script type="module" src="${scriptUrl}"></script>`;
  }
  return body;
}

/**
 * Transforms import paths in JavaScript/TypeScript code using a callback function.
 * Supports all modern ESM import syntaxes including:
 * - import foo from 'module'
 * - import { foo } from 'module'
 * - import * as foo from 'module'
 * - import 'module'
 * - import('module') - dynamic imports
 * - export { foo } from 'module'
 * - export * from 'module'
 *
 * @param input - The JavaScript/TypeScript code as a string
 * @param pathTransformer - Callback function that receives the original import path and returns the new path
 * @returns The transformed code with updated import paths
 */
export function transformImports(input: string, pathTransformer: (originalPath: string) => string): string {
  // Regex patterns for different ESM import/export syntaxes
  const patterns = [
    // Static imports: import ... from 'path'
    /import\s+(?:(?:\w+(?:\s*,\s*)?)?(?:\{[^}]*\})?(?:\s*,\s*\*\s+as\s+\w+)?|\*\s+as\s+\w+|\w+)\s+from\s+(['"`])([^'"`]+)\1/g,

    // Side-effect imports: import 'path'
    /import\s+(['"`])([^'"`]+)\1/g,

    // Dynamic imports: import('path')
    /import\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,

    // Re-exports: export ... from 'path'
    /export\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+(['"`])([^'"`]+)\1/g,
  ];

  let result = input;

  // Apply each pattern
  for (const pattern of patterns) {
    result = result.replace(pattern, (match, ...args) => {
      // The path is always the second-to-last argument (before the full match offset)
      const pathIndex = args.length - 3;
      const quote = args[pathIndex - 1];
      const originalPath = args[pathIndex];

      // Transform the path
      const newPath = pathTransformer(originalPath);

      // Replace the path in the match, preserving the quote style
      return match.replace(
        new RegExp(`${quote}${escapeRegExp(originalPath)}${quote}`),
        `${quote}${newPath}${quote}`,
      );
    });
  }

  return result;
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
