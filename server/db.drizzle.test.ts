import { describe, expect, it } from "vitest";
import { db, fleetDb } from "./db";
import { organizations, users, vehicles, workOrders, inventoryParts } from "../drizzle/fleetops-schema";

describe("Drizzle FleetOps data layer", () => {
  it("exposes the PostgreSQL client and FleetOps table definitions", () => {
    expect(typeof db.execute).toBe("function");
    expect(fleetDb).toBeDefined();
    expect(organizations).toBeDefined();
    expect(users).toBeDefined();
    expect(vehicles).toBeDefined();
    expect(workOrders).toBeDefined();
    expect(inventoryParts).toBeDefined();
  });
});
