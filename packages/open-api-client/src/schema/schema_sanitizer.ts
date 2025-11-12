import { pascalCase } from "@mesqueeb/case-anything";
import type { OpenAPISchemaObjectSchema } from "../types/mod.ts";

/**
 * Utility class for sanitizing and organizing OpenAPI schema names for TypeScript generation.
 *
 * This class handles the transformation of OpenAPI schema names into valid TypeScript identifiers
 * and performs topological sorting to ensure schemas are ordered correctly based on their dependencies.
 * It also detects and tracks schemas with circular dependencies.
 *
 * @example
 * ```ts
 * const schemas = {
 *   "user.profile": { type: "object", properties: { name: { type: "string" } } },
 *   "event_list": { type: "array", items: { $ref: "#/components/schemas/event" } },
 *   "event": { type: "object", properties: { id: { type: "number" } } }
 * };
 *
 * const sanitizer = new SchemaSanitizer(schemas);
 * console.log(sanitizer.sanitizeSchemaName("user.profile")); // "UserProfile"
 * console.log(sanitizer.orderedSchemaNames); // ["event", "event_list", "user.profile"]
 * ```
 */
export class SchemaSanitizer {
  readonly #sanitizedNames = new Map<string, string>();

  /**
   * Array of schema names ordered topologically based on their dependencies.
   * Schemas that have no dependencies come first, followed by schemas that depend on them.
   * Schemas with circular dependencies appear at the end in alphabetical order.
   */
  readonly orderedSchemaNames: string[] = [];

  /**
   * Set of schema names that are part of circular dependency chains.
   * These schemas reference each other directly or indirectly, forming a cycle.
   * Will be undefined if no schemas were provided to the constructor.
   */
  readonly cyclicSchemas: Set<string> | undefined;

  /**
   * Creates a new SchemaSanitizer instance.
   *
   * @param schemas - Optional record of OpenAPI schema objects to analyze and sort
   */
  constructor(public schemas?: Record<string, OpenAPISchemaObjectSchema>) {
    if (schemas) {
      const { cyclicSchemas, orderedSchemaNames } = this.#topologicalSort(
        schemas,
      );
      this.cyclicSchemas = cyclicSchemas;
      this.orderedSchemaNames = orderedSchemaNames;
    }
  }

  /**
   * Sanitizes a schema name to be a valid TypeScript identifier.
   *
   * This method transforms OpenAPI schema names into valid TypeScript type names by:
   * - Converting to PascalCase for TypeScript convention
   * - Replacing dots, hyphens, and other invalid characters with underscores
   * - Prefixing with underscore if the name starts with a number
   * - Handling duplicate names by appending numeric suffixes
   * - Caching results to ensure consistent transformations
   *
   * @param name - The original OpenAPI schema name (e.g., "user.profile", "event-list")
   * @returns A valid TypeScript identifier (e.g., "UserProfile", "EventList")
   *
   * @example
   * ```ts
   * const sanitizer = new SchemaSanitizer();
   * sanitizer.sanitizeSchemaName("user.profile"); // "UserProfile"
   * sanitizer.sanitizeSchemaName("event-list"); // "EventList"
   * sanitizer.sanitizeSchemaName("123invalid"); // "_123Invalid"
   * sanitizer.sanitizeSchemaName("event_list"); // "EventList"
   * sanitizer.sanitizeSchemaName("EventList"); // "EventList_1" (if "EventList" already exists)
   * ```
   */
  sanitizeSchemaName(name: string): string {
    let sanitizedName = this.#sanitizedNames.get(name);

    if (!sanitizedName) {
      // Type names in TypeScript generally use PascalCase
      sanitizedName = pascalCase(name);

      // This should already be done by pascalCase but let just make sure to
      // replace dots, hyphens, and other non-alphanumeric characters
      // (except underscores) with underscores.
      sanitizedName = sanitizedName.replace(/[^a-zA-Z0-9_]/g, "_");

      // If it starts with a number, prefix with underscore
      if (/^[0-9]/.test(sanitizedName)) {
        sanitizedName = "_" + sanitizedName;
      }

      // If it's now empty or just underscores, use a default
      if (!sanitizedName || /^_+$/.test(sanitizedName)) {
        sanitizedName = "Schema";
      }

      // Handle duplicates
      //
      // In the wild we have seen real specifications that contain schema names like:
      // - #/components/schemas/EventList
      // - #/components/schemas/event_list
      //
      // Which would inevitably result in duplicate TypeScript identifiers
      // if we didn't do anything about it.
      let counter = 1;
      let finalName = sanitizedName;
      const usedNames = new Set<string>(this.#sanitizedNames.values());
      while (usedNames.has(finalName)) {
        finalName = `${sanitizedName}_${counter}`;
        counter++;
      }
      sanitizedName = finalName;

      // Finally cache the resulting name for future use
      this.#sanitizedNames.set(name, sanitizedName);
    }

    return sanitizedName;
  }

  /**
   * Topologically sorts schemas based on their dependencies.
   * Schemas that depend on others come after their dependencies.
   * Returns schemas with circular dependencies separately.
   */
  #topologicalSort(
    schemas: Record<string, OpenAPISchemaObjectSchema>,
  ): { orderedSchemaNames: string[]; cyclicSchemas: Set<string> } {
    const dependents = new Map<string, Set<string>>(); // who depends on me
    const inDegree = new Map<string, number>(); // how many schemas do I depend on

    // Initialize
    for (const schemaName of Object.keys(schemas)) {
      dependents.set(schemaName, new Set());
      inDegree.set(schemaName, 0);
    }

    // Build the dependency graph
    // If A depends on B, then B has A as a dependent, and A has inDegree++
    for (const [schemaName, schema] of Object.entries(schemas)) {
      const deps = this.#extractDependencies(schema);

      for (const dep of deps) {
        // Only add edge if the dependency is a component schema
        if (dependents.has(dep)) {
          dependents.get(dep)!.add(schemaName); // dep is depended upon by schemaName
          inDegree.set(schemaName, inDegree.get(schemaName)! + 1); // schemaName depends on dep
        }
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // Find all schemas with no dependencies (inDegree === 0)
    for (const [schemaName, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(schemaName);
      }
    }

    while (queue.length > 0) {
      // Sort alphabetically for deterministic output
      queue.sort();
      const current = queue.shift()!;
      result.push(current);

      // For all schemas that depend on current, reduce their in-degree
      for (const dependent of dependents.get(current)!) {
        const newDegree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // Schemas that remain have cycles
    const cyclicSchemas = new Set<string>();
    const remaining = Object.keys(schemas).filter((name) => !result.includes(name));

    if (remaining.length > 0) {
      // These schemas are part of circular dependencies
      for (const name of remaining) {
        cyclicSchemas.add(name);
      }
      // Add them in alphabetical order
      remaining.sort();
      result.push(...remaining);
    }

    return { orderedSchemaNames: result, cyclicSchemas };
  }

  /**
   * Extracts schema dependencies from a schema object.
   */
  #extractDependencies(schema: OpenAPISchemaObjectSchema): Set<string> {
    const deps = new Set<string>();

    const extract = (obj: unknown): void => {
      if (typeof obj !== "object" || obj === null) return;

      const record = obj as Record<string, unknown>;

      // Handle $ref
      if (record.$ref && typeof record.$ref === "string") {
        const ref = record.$ref;
        if (ref.startsWith("#/components/schemas/")) {
          deps.add(ref.substring("#/components/schemas/".length));
        }
      }

      // Recursively search in all values
      for (const value of Object.values(record)) {
        if (typeof value === "object" && value !== null) {
          if (Array.isArray(value)) {
            for (const item of value) {
              extract(item);
            }
          } else {
            extract(value);
          }
        }
      }
    };

    extract(schema);
    return deps;
  }
}
