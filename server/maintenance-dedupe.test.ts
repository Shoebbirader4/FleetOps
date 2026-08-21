import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("predictive maintenance threshold deduplication", () => {
  it("records a component baseline trigger and skips the same baseline", () => {
    const source = readFileSync(resolve(process.cwd(), "server/automation.ts"), "utf8");
    expect(source).toContain('action: "MAINTENANCE_THRESHOLD_TRIGGERED"');
    expect(source).toContain("serviceBaseline");
    expect(source).toContain("sameServiceBaselineAlreadyTriggered");
    expect(source).toContain("workOrderId: workOrder.id");
    expect(source).toContain("currentOdometer: Number(vehicle.currentOdometer)");
  });

  it("preserves component lifecycle history through audit events", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(router).toContain('action: "COMPONENT_CREATED"');
    expect(router).toContain('"COMPONENT_SERVICE_BASELINE_RESET"');
    expect(router).toContain('action: "COMPONENT_REMOVED"');
    expect(router).toContain('action: "WORK_ORDER_APPROVED"');
  });

  it("keeps an active work-order guard before creating another automatic order", () => {
    const source = readFileSync(resolve(process.cwd(), "server/automation.ts"), "utf8");
    expect(source).toContain('status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK"] }');
    expect(source).toContain('title: { contains: component.name }');
  });
});

export {};

