export const roleNavAccess: Record<string, string[]> = {
  SUPERADMIN: ["Command center", "Vehicles", "Components", "Work orders", "Inventory", "Vendors", "Purchase orders", "Notifications", "Compliance vault", "P&L analytics", "Billing", "Team"],
  FLEET_MANAGER: ["Fleet manager workspace", "Vehicles", "Components", "Work orders", "Notifications"],
  INVENTORY_MANAGER: ["Inventory manager workspace", "Inventory", "Vendors", "Purchase orders", "Notifications"],
  MECHANIC: ["Mechanic workspace", "Notifications"],
  TECHNICIAN: ["Technician workspace", "Notifications"],
  DRIVER: ["Driver portal", "Notifications"],
  ACCOUNTANT: ["Accountant ledger", "Notifications"],
};

export const dedicatedWorkspaceByRole: Record<string, string> = {
  SUPERADMIN: "Command center",
  FLEET_MANAGER: "Fleet manager workspace",
  INVENTORY_MANAGER: "Inventory manager workspace",
  MECHANIC: "Mechanic workspace",
  TECHNICIAN: "Technician workspace",
  DRIVER: "Driver portal",
  ACCOUNTANT: "Accountant ledger",
};

export function getAllowedWorkspace(role: string, requestedSection: string): string {
  const allowed = roleNavAccess[role] ?? roleNavAccess.SUPERADMIN;
  return allowed.includes(requestedSection) ? requestedSection : dedicatedWorkspaceByRole[role] ?? "Command center";
}

export function canAccessWorkspace(role: string, section: string): boolean {
  return (roleNavAccess[role] ?? []).includes(section);
}
