import { describe, expect, it } from "vitest";

import { OBJECT_ID_PATTERN, jsonError, jsonOk } from "./http";

describe("api http helpers", () => {
  it("recognizes Mongo ObjectIds", () => {
    expect(OBJECT_ID_PATTERN.test("6a70ea828727a40d7ff99698")).toBe(true);
    expect(OBJECT_ID_PATTERN.test("6a70ea828727a40d7ff9969")).toBe(false);
    expect(OBJECT_ID_PATTERN.test("not-an-id")).toBe(false);
  });

  it("shapes success and error JSON bodies", async () => {
    const ok = jsonOk({ hello: "world" });
    expect(ok.status).toBe(200);
    await expect(ok.json()).resolves.toEqual({ success: true, data: { hello: "world" } });

    const err = jsonError("Nope", 422, { field: "code" });
    expect(err.status).toBe(422);
    await expect(err.json()).resolves.toEqual({
      success: false,
      error: "Nope",
      field: "code",
      details: undefined,
    });
  });
});
