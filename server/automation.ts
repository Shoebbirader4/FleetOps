import { fleetDb } from "./db";

async function notifyRoles(orgId: string, roles: string[], title: string, message: string, type: string, referenceId?: string) {
  const recipients = await fleetDb.user.findMany({ where: { orgId, role: { in: roles } } });
  if (recipients.length) await fleetDb.notification.createMany({ data: recipients.map((recipient: any) => ({ orgId, recipientId: recipient.id, title, message, type, referenceId })) });
  return recipients.length;
}

export async function evaluateVehicleMaintenance(vehicleId: string, orgId: string) {
  const vehicle = await fleetDb.vehicle.findFirst({ where: { id: vehicleId, orgId }, include: { components: true } });
  if (!vehicle) return { createdWorkOrders: 0 };
  let createdWorkOrders = 0;
  for (const component of vehicle.components) {
    const consumed = Number(vehicle.currentOdometer) - Number(component.lastServicedOdometer);
    if (consumed < Number(component.alertThresholdKm)) continue;
    const existing = await fleetDb.workOrder.findFirst({ where: { orgId, vehicleId, status: { in: ["OPEN", "IN_PROGRESS"] }, title: { contains: component.name } } });
    if (existing) continue;
    const workOrder = await fleetDb.workOrder.create({ data: { orgId, vehicleId, title: `${component.name} service threshold reached`, description: `${component.name} has consumed ${Math.round((consumed / Number(component.expectedLifeKm)) * 100)}% of expected life.`, priority: consumed >= Number(component.expectedLifeKm) ? "CRITICAL" : "HIGH" } });
    await notifyRoles(orgId, ["SUPERADMIN", "FLEET_MANAGER"], "Predictive maintenance alert", `${vehicle.licensePlate}: ${component.name} crossed its service threshold.`, "MAINTENANCE_THRESHOLD", workOrder.id);
    createdWorkOrders += 1;
  }
  return { createdWorkOrders };
}

export async function evaluateLowInventory(orgId: string) {
  const allParts = await fleetDb.inventoryPart.findMany({ where: { orgId } });
  const lowStock = (allParts as any[]).filter((part) => Number(part.quantityOnHand) <= Number(part.minReorderLevel));
  if (!lowStock.length) return { lowStock: 0, draftPurchaseOrders: 0 };
  let draftPurchaseOrders = 0;
  let vendor = await fleetDb.vendor.findFirst({ where: { orgId, name: "FleetOps auto-reorder queue" } });
  if (!vendor) vendor = await fleetDb.vendor.create({ data: { orgId, name: "FleetOps auto-reorder queue", phone: "SYSTEM" } });
  for (const part of lowStock) {
    const alreadyNotified = await fleetDb.notification.findFirst({ where: { orgId, referenceId: part.id, type: "INVENTORY_LOW", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    if (alreadyNotified) continue;
    const suggestedQty = Math.max(Number(part.minReorderLevel) * 2 - Number(part.quantityOnHand), 1);
    const purchaseOrder = await fleetDb.purchaseOrder.create({ data: { orgId, vendorId: vendor.id, status: "DRAFT", totalCost: suggestedQty * Number(part.unitCost) } });
    await notifyRoles(orgId, ["SUPERADMIN", "INVENTORY_MANAGER"], "Inventory below reorder level", `${part.name} (${part.sku}) has ${part.quantityOnHand} units remaining. Draft PO created for ${suggestedQty} units.`, "INVENTORY_LOW", part.id);
    await notifyRoles(orgId, ["SUPERADMIN", "INVENTORY_MANAGER"], "Draft purchase order created", `Draft PO ${purchaseOrder.id.slice(0, 8).toUpperCase()} was created for ${part.name}.`, "PURCHASE_ORDER_DRAFT", purchaseOrder.id);
    draftPurchaseOrders += 1;
  }
  return { lowStock: lowStock.length, draftPurchaseOrders };
}

export async function evaluateDocumentExpiry(orgId: string) {
  const documents = await fleetDb.document.findMany({ where: { orgId } });
  const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiring = (documents as any[]).filter((document) => new Date(document.expiryDate).getTime() <= horizon.getTime());
  for (const document of expiring) {
    const alreadyNotified = await fleetDb.notification.findFirst({ where: { orgId, referenceId: document.id, type: "DOCUMENT_EXPIRY", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    if (alreadyNotified) continue;
    await notifyRoles(orgId, ["SUPERADMIN", "FLEET_MANAGER"], "Compliance document expiring", `${document.title} expires on ${new Date(document.expiryDate).toLocaleDateString("en-IN")}.`, "DOCUMENT_EXPIRY", document.id);
  }
  return { expiring: expiring.length };
}

export async function evaluateAllOrganizations() {
  const organizations = await fleetDb.organization.findMany({ select: { id: true } });
  let maintenanceOrders = 0;
  let lowStockParts = 0;
  let draftPurchaseOrders = 0;
  let expiringDocuments = 0;
  for (const org of organizations as any[]) {
    const vehicles = await fleetDb.vehicle.findMany({ where: { orgId: org.id }, select: { id: true } });
    for (const vehicle of vehicles as any[]) maintenanceOrders += (await evaluateVehicleMaintenance(vehicle.id, org.id)).createdWorkOrders;
    const inventory = await evaluateLowInventory(org.id); lowStockParts += inventory.lowStock; draftPurchaseOrders += inventory.draftPurchaseOrders;
    expiringDocuments += (await evaluateDocumentExpiry(org.id)).expiring;
  }
  return { organizations: organizations.length, maintenanceOrders, lowStockParts, draftPurchaseOrders, expiringDocuments };
}
