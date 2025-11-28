export function coerceValue(value: unknown, schema?: { type?: string; items?: unknown }): unknown {
  if (Array.isArray(value)) {
    return value;
  }

  if (schema?.type === "number" || schema?.type === "integer") {
    if (typeof value === "string") {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
  } else if (schema?.type === "boolean") {
    if (typeof value === "string") {
      return value === "true";
    }
  }
  return value;
}
