import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { requireRole } from "./routers";

describe("Milestone 1 operational contracts", () => {
  it("keeps organization audit history Superadmin-only", () => {
    expect(() => requireRole("SUPERADMIN", ["SUPERADMIN"])).not.toThrow();
    expect(() => requireRole("FLEET_MANAGER", ["SUPERADMIN"])).toThrowError(TRPCError);
    expect(() => requireRole("ACCOUNTANT", ["SUPERADMIN"])).toThrowError(TRPCError);
  });

  it("keeps driver issue triage inside management roles", () => {
    expect(() => requireRole("FLEET_MANAGER", ["SUPERADMIN", "FLEET_MANAGER"])).not.toThrow();
    expect(() => requireRole("SUPERADMIN", ["SUPERADMIN", "FLEET_MANAGER"])).not.toThrow();
    expect(() => requireRole("DRIVER", ["SUPERADMIN", "FLEET_MANAGER"])).toThrowError(TRPCError);
  });

  it("keeps inventory movement history available to inventory and maintenance operators", () => {
    for (const role of ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"]) {
      expect(() => requireRole(role, ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"])).not.toThrow();
    }
    expect(() => requireRole("DRIVER", ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"])).toThrowError(TRPCError);
  });

  it("keeps compliance documents more restricted than maintenance evidence", () => {
    expect(() => requireRole("FLEET_MANAGER", ["SUPERADMIN", "FLEET_MANAGER"])).not.toThrow();
    expect(() => requireRole("MECHANIC", ["SUPERADMIN", "FLEET_MANAGER"])).toThrowError(TRPCError);
    expect(() => requireRole("MECHANIC", ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"])).not.toThrow();
  });
});
