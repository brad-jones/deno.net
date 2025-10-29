import { type Child, useEffect } from "@hono/hono/jsx";
import type { JSX } from "@hono/hono/jsx/jsx-runtime";
import { hydrateRoot } from "@hono/hono/jsx/dom/client";

export const onClient = globalThis.document ? true : false;

export const onServer = globalThis.document ? false : true;

const islandStateRegistry = new Map<string, unknown>();

export function setIslandState<T>(id: string, state: T) {
  islandStateRegistry.set(id, state);
}

export function getIslandState<T>(id: string): T | null {
  return islandStateRegistry.get(id) as T | null;
}

export function trackIslandState<T>(id: string, state: T) {
  useEffect(() => {
    if (onClient) {
      setIslandState(id, state);
    }
  }, [id, state]);
}

export function hydrateIsland<T>(id: string, componentFactory: (initialState: T) => Child) {
  const rootElement = document.getElementById(id);
  if (!rootElement) throw new Error(`failed to locate the root element to hydrate`);

  let initialState: T;
  const persistedState = getIslandState<T>(id);
  if (persistedState) {
    initialState = persistedState;
  } else {
    const rawInitialState = rootElement.getAttribute("data-island-initial-state");
    if (!rawInitialState) throw new Error(`initial state not found`);
    initialState = JSON.parse(rawInitialState);
  }

  hydrateRoot(rootElement, componentFactory(initialState));
}

export function Island(
  { id, filePath, initialState, children }: {
    id?: string;
    filePath?: string;
    initialState?: unknown;
    children: Child;
  },
): JSX.Element {
  // If we are rendering in the client, do not wrap the children.
  if (globalThis.document) return <>{children}</>;

  // If we are rendering on the server, wrap the children with an island container.
  return (
    <div
      id={id ?? crypto.randomUUID()}
      data-island-filepath={filePath}
      data-island-initial-state={JSON.stringify(initialState)}
    >
      {children}
    </div>
  );
}
