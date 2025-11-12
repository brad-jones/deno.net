/**
 * Split a type string with JSDoc into JSDoc lines and type line
 *
 * @param typeString - The type string with JSDoc
 * @returns Object with jsdocLines and typeLine
 */
export function splitJSDocAndType(
  typeString: string,
): { jsdocLines: string[]; typeLine: string } {
  const lines = typeString.split("\n");

  // Find where JSDoc ends
  let jsdocEndIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().endsWith("*/")) {
      jsdocEndIndex = i;
      break;
    }
  }

  if (jsdocEndIndex === -1) {
    // No JSDoc found, return as-is
    return {
      jsdocLines: [],
      typeLine: typeString,
    };
  }

  const jsdocLines = lines.slice(0, jsdocEndIndex + 1);
  const typeLine = lines.slice(jsdocEndIndex + 1).join("\n").trim();

  return { jsdocLines, typeLine };
}
