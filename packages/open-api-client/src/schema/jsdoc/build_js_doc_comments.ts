/**
 * Utility for generating JSDoc comments from OpenAPI schema metadata
 *
 * @param schema - The OpenAPI schema object
 * @returns JSDoc comment string (multi-line) or null if no documentation
 */
export function buildJsDocComments(
  schema: Record<string, unknown>,
): string | null {
  const format = schema.format as string | undefined;
  const description = schema.description as string | undefined;
  const summary = schema.summary as string | undefined;

  // If no JSDoc information, return null
  if (!format && !description && !summary) {
    return null;
  }

  // Escape values for safe use in JSDoc
  const escapedFormat = format ? escapeForJsDoc(String(format)) : undefined;
  const escapedDescription = description ? escapeForJsDoc(description) : undefined;
  const escapedSummary = summary ? escapeForJsDoc(summary) : undefined;

  const jsdocLines: string[] = [];

  // Add summary and description
  if (escapedSummary && escapedDescription) {
    jsdocLines.push(`/**`);
    jsdocLines.push(` * ${escapedSummary}`);
    jsdocLines.push(` *`);
    jsdocLines.push(` * ${escapedDescription}`);
    if (escapedFormat) {
      jsdocLines.push(` *`);
      jsdocLines.push(` * @format ${escapedFormat}`);
    }
    jsdocLines.push(` */`);
  } else if (escapedDescription) {
    if (escapedDescription.includes("\n")) {
      // Multi-line description
      jsdocLines.push(`/**`);
      const lines = escapedDescription.split("\n");
      lines.forEach((line) => {
        jsdocLines.push(` * ${line}`);
      });
      if (escapedFormat) {
        jsdocLines.push(` *`);
        jsdocLines.push(` * @format ${escapedFormat}`);
      }
      jsdocLines.push(` */`);
    } else {
      // Single-line description
      if (escapedFormat) {
        jsdocLines.push(`/**`);
        jsdocLines.push(` * ${escapedDescription}`);
        jsdocLines.push(` *`);
        jsdocLines.push(` * @format ${escapedFormat}`);
        jsdocLines.push(` */`);
      } else {
        jsdocLines.push(`/** ${escapedDescription} */`);
      }
    }
  } else if (escapedFormat) {
    jsdocLines.push(`/** @format ${escapedFormat} */`);
  }

  return jsdocLines.join("\n");
}

/**
 * Escapes special characters in a string for safe use in JSDoc comments
 *
 * @param value - The string to escape
 * @returns The escaped string safe for use in JSDoc
 */
export function escapeForJsDoc(value: string): string {
  // Escape */ sequence to prevent premature comment termination
  // We need to escape the * before / to get *\/
  return value.replace(/\*\//g, "*\\/");
}
