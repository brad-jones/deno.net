import { createRoot } from "@hono/hono/jsx/dom/client";
const root = createRoot(document.getElementById("hono-spa-root")!);
root.render(<h1>Hello from Client</h1>);
