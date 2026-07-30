import { describe, expect, it } from "vitest";
import app from "./app.js";

describe("GET /", () => {
  it("returns Hello Hono!", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello Hono!");
  });
});
