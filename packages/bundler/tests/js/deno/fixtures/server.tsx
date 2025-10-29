import { Hono } from "@hono/hono";

const app = new Hono();

app.get("/", (c) => c.html(<h1>Hello from Server</h1>));

export default app;
