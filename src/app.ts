import { Hono } from "hono";
import { auth } from "./lib/auth.js";

const app = new Hono();

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/", (c) => c.text("Hello Hono!"));

export default app;
