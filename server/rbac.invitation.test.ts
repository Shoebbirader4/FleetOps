import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { count: vi.fn() },
  invitation: { create: vi.fn() },
  vehicleAssignment: { findFirst: vi.fn() },
  inventoryPart: { findMany: vi.fn() },
}));

vi.mock("./db", () => ({ fleetDb: mocks }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const baseContext = {
  user: null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
  fleetopsUser: {
    id: "00000000-0000-4000-8000-000000000001",
    orgId: "00000000-0000-4000-8000-000000000002",
    role: "SUPERADMIN",
    org: {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Fleet",
      subscriptionTier: "TRIAL_FREE",
      trialEndsAt: new Date(Date.now() + 86400000),
      maxVehicles: 3,
      maxUsers: 10,
    },
  },
} as TrpcContext;

describe("RBAC and invitation procedures", () => {
  it("allows only the Superadmin to create invitations", async () => {
    const fleetManagerContext = {
      ...baseContext,
      fleetopsUser: { ...baseContext.fleetopsUser!, role: "FLEET_MANAGER" },
    } as TrpcContext;
    await expect(appRouter.createCaller(fleetManagerContext).team.invite({ email: "driver@example.com", role: "DRIVER" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.invitation.create).not.toHaveBeenCalled();
  });

  it("denies a Driver inspection for a vehicle that is not assigned", async () => {
    mocks.vehicleAssignment.findFirst.mockResolvedValue(null);
    const driverContext = { ...baseContext, fleetopsUser: { ...baseContext.fleetopsUser!, role: "DRIVER" } } as TrpcContext;
    await expect(appRouter.createCaller(driverContext).driver.createInspection({ vehicleId: "00000000-0000-4000-8000-000000000003", inspectionType: "PRE_TRIP", status: "PASS" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies an Accountant from inventory pricing data", async () => {
    const accountantContext = { ...baseContext, fleetopsUser: { ...baseContext.fleetopsUser!, role: "ACCOUNTANT" } } as TrpcContext;
    await expect(appRouter.createCaller(accountantContext).inventory.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns a persisted manual-token invitation with explicit audit fields", async () => {
    mocks.user.count.mockResolvedValue(1);
    mocks.invitation.create.mockResolvedValue({ id: "inv-1", email: "driver@example.com", role: "DRIVER", tokenHash: "token-1" });
    const result = await appRouter.createCaller(baseContext).team.invite({ email: "driver@example.com", role: "DRIVER" });
    expect(result).toMatchObject({ id: "inv-1", delivery: "MANUAL_TOKEN" });
    expect(mocks.invitation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: expect.any(String), createdAt: expect.any(Date), updatedAt: expect.any(Date), tokenHash: expect.any(String) }) });
  });
});
