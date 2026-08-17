import { fleetDb } from "./db";

export async function evaluateVehicleMaintenance(vehicleId: string, orgId: string) {
  const vehicle = await fleetDb.vehicle.findFirst({ where: { id: vehicleId, orgId }, include: { components: true } });
  if (!vehicle) return { createdWorkOrders: 0 };

  let createdWorkOrders = 0;
  for (const component of vehicle.components) {
    const consumed = Number(vehicle.currentOdometer) - Number(component.lastServicedOdometer);
    const shouldAlert = consumed >= Number(component.alertThresholdKm);
    if (!shouldAlert) continue;

    const existing = await fleetDb.workOrder.findFirst({
      where: {
        orgId,
        vehicleId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        title: { contains: component.name },
      },
    });
    if (existing) continue;

    const workOrder = await fleetDb.workOrder.create({
      data: {
        orgId,
        vehicleId,
        title: `${component.name} service threshold reached`,
        description: `${component.name} has consumed ${Math.round((consumed / Number(component.expectedLifeKm)) * 100)}% of expected life.`,
        priority: consumed >= Number(component.expectedLifeKm) ? "CRITICAL" : "HIGH",
      },
    });

    const admins = await fleetDb.user.findMany({ where: { orgId, role: "SUPERADMIN" } });
    if (admins.length) {
      await fleetDb.notification.createMany({
        data: admins.map((admin: any) => ({
          orgId,
          recipientId: admin.id,
          title: "Predictive maintenance alert",
          message: `${vehicle.licensePlate}: ${component.name} crossed its service threshold.`,
          type: "MAINTENANCE_THRESHOLD",
          referenceId: workOrder.id,
        })),
      });
    }
    createdWorkOrders += 1;
  }
  return { createdWorkOrders };
}

export async function evaluateLowInventory(orgId: string) {
  const lowStock = await fleetDb.inventoryPart.findMany({ where: { orgId, quantityOnHand: { lte: 5 } } });
  if (!lowStock.length) return { lowStock: 0 };

  const admins = await fleetDb.user.findMany({ where: { orgId, role: { in: ["SUPERADMIN", "INVENTORY_MANAGER"] } } });
  for (const part of lowStock) {
    const alreadyNotified = await fleetDb.notification.findFirst({ where: { orgId, referenceId: part.id, type: "INVENTORY_LOW", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    if (alreadyNotified) continue;
    if (admins.length) await fleetDb.notification.createMany({ data: admins.map((admin: any) => ({ orgId, recipientId: admin.id, title: "Inventory below reorder level", message: `${part.name} (${part.sku}) has ${part.quantityOnHand} units remaining.`, type: "INVENTORY_LOW", referenceId: part.id })) });
  }
  return { lowStock: lowStock.length };
}

export async function evaluateAllOrganizations() {
  const organizations = await fleetDb.organization.findMany({ select: { id: true } });
  let maintenanceOrders = 0;
  let lowStockParts = 0;
  for (const org of organizations) {
    const vehicles = await fleetDb.vehicle.findMany({ where: { orgId: org.id }, select: { id: true } });
    for (const vehicle of vehicles) maintenanceOrders += (await evaluateVehicleMaintenance(vehicle.id, org.id)).createdWorkOrders;
    lowStockParts += (await evaluateLowInventory(org.id)).lowStock;
  }
  return { organizations: organizations.length, maintenanceOrders, lowStockParts };
}
