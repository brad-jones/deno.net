import type { Child } from "@hono/hono/jsx";
import { hydrateRoot } from "@hono/hono/jsx/dom/client";

export const onClient = globalThis.document ? true : false;

export const onServer = globalThis.document ? false : true;

export function HydrateIsland<T>(id: string, componentFactory: (initialState: T) => Child) {
  const rootElement = document.getElementById(id);
  if (!rootElement) throw new Error(`failed to locate the root element to hydrate`);

  // TODO: This is ultimately where we need to hook in for some kind of HMR.
  // ie: Instead of loading the initial state we need to load whatever the current state it.
  // And the below Island component would be somehow responsible for tracking that state????

  const rawInitialState = rootElement.getAttribute("data-island-initial-state");
  if (!rawInitialState) throw new Error(`initial state not found`);
  const initialState: T = JSON.parse(rawInitialState);
  hydrateRoot(rootElement, componentFactory(initialState));
}

export function Island(
  { id, filePath, initialState, children }: { id?: string; filePath?: string; initialState?: unknown; children: Child },
): Child {
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
