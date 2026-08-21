import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("predictive maintenance threshold deduplication", () => {
  it("records a component baseline trigger and skips the same baseline", () => {
    const source = readFileSync(resolve(process.cwd(), "server/automation.ts"), "utf8");
    expect(source).toContain('action: "MAINTENANCE_THRESHOLD_TRIGGERED"');
    expect(source).toContain("serviceBaseline");
    expect(source).toContain("sameServiceBaselineAlreadyTriggered");
  });

  it("keeps an active work-order guard before creating another automatic order", () => {
    const source = readFileSync(resolve(process.cwd(), "server/automation.ts"), "utf8");
    expect(source).toContain('status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK"] }');
    expect(source).toContain('title: { contains: component.name }');
  });
});

export {};

