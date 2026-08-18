import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("./index.html", import.meta.url), "utf8");

describe("FleetOps boot resilience", () => {
  it("keeps a visible boot shell before the React bundle loads", () => {
    expect(indexHtml).toContain('id="root"><div');
    expect(indexHtml).toContain("Loading your fleet ledger");
    expect(indexHtml).toContain("FleetOps requires JavaScript");
  });
});

export {};

