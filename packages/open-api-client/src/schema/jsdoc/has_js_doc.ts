/**
 * Check if a type string contains JSDoc comments
 * @param typeString - The type string to check
 * @returns True if the string contains JSDoc comments
 */
export function hasJSDoc(typeString: string): boolean {
  return typeString.includes("/**");
}
