import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  vehicle: { findFirst: vi.fn() },
  workOrder: { findFirst: vi.fn(), create: vi.fn() },
  user: { findMany: vi.fn() },
  notification: { createMany: vi.fn() },
}));

vi.mock("./db", () => ({ fleetDb: mocks }));

import { evaluateVehicleMaintenance } from "./automation";

describe("component maintenance automation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a work order and notifies Fleet Manager when an existing vehicle is already overdue", async () => {
    mocks.vehicle.findFirst.mockResolvedValue({
      id: "vehicle-1",
      orgId: "org-1",
      licensePlate: "FLEET-01",
      currentOdometer: 50000,
      components: [{
        id: "component-1",
        name: "Left tire",
        lastServicedOdometer: 10000,
        expectedLifeKm: 40000,
        alertThresholdKm: 38000,
      }],
    });
    mocks.workOrder.findFirst.mockResolvedValue(null);
    mocks.workOrder.create.mockResolvedValue({ id: "work-order-1" });
    mocks.user.findMany.mockResolvedValue([{ id: "fleet-manager-1", role: "FLEET_MANAGER" }]);

    const result = await evaluateVehicleMaintenance("vehicle-1", "org-1");

    expect(result).toEqual({ createdWorkOrders: 1 });
    expect(mocks.workOrder.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      orgId: "org-1",
      vehicleId: "vehicle-1",
      title: "Left tire service threshold reached",
      priority: "CRITICAL",
    }) });
    expect(mocks.notification.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      recipientId: "fleet-manager-1",
      title: "Predictive maintenance alert",
      type: "MAINTENANCE_THRESHOLD",
      referenceId: "work-order-1",
    })] });
  });
});
