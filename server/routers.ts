import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { fleetOpsProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { fleetDb } from "./db";
import { getSupabaseAuthIdentity, provisionFleetOpsUser, supabaseAdmin } from "./supabase";
import { storageGetSignedUrl, storagePut } from "./storage";
const Priority = { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", CRITICAL: "CRITICAL" } as const;
const WorkOrderStatus = { OPEN: "OPEN", IN_PROGRESS: "IN_PROGRESS", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED" } as const;
export const CITY_BUS_MAINTENANCE_TEMPLATE = [
  { name: "Engine Oil", expectedLifeKm: 10000, alertThresholdKm: 8000 },
  { name: "Brakes", expectedLifeKm: 50000, alertThresholdKm: 40000 },
  { name: "Tires", expectedLifeKm: 60000, alertThresholdKm: 50000 },
] as const;
import { evaluateAllOrganizations, evaluateLowInventory, evaluateVehicleMaintenance } from "./automation";

export function assertWritable(org: { subscriptionTier: string; trialEndsAt: Date }) {
  if (org.subscriptionTier === "TRIAL_FREE" && org.trialEndsAt.getTime() < Date.now()) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your trial has expired. Upgrade your FleetOps plan to continue writing data." });
  }
}

async function assertVehicleCapacity(orgId: string, maxVehicles: number) {
  const count = await fleetDb.vehicle.count({ where: { orgId } });
  if (count >= maxVehicles) throw new TRPCError({ code: "FORBIDDEN", message: `Vehicle limit reached (${maxVehicles}). Upgrade your FleetOps plan to add more vehicles.` });
}

async function assertUserCapacity(orgId: string, maxUsers: number) {
  const count = await fleetDb.user.count({ where: { orgId } });
  if (count >= maxUsers) throw new TRPCError({ code: "FORBIDDEN", message: `User limit reached (${maxUsers}). Upgrade your FleetOps plan to invite more team members.` });
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot perform this action." });
}

function csvCell(value: unknown) { const text = value === null || value === undefined ? "" : String(value); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function csvDocument(rows: Array<Record<string, unknown>>, headers: string[]) { return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n"); }
function pdfText(value: unknown) { return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll("\n", " "); }
function simplePdf(title: string, lines: string[]) { const content = [`BT`, `/F1 16 Tf`, `50 760 Td`, `(${pdfText(title)}) Tj`, `/F1 10 Tf`, ...lines.flatMap((line) => [`0 -18 Td`, `(${pdfText(line)}) Tj`]), `ET`].join("\n"); const objects = [`<< /Type /Catalog /Pages 2 0 R >>`, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`]; let pdf = "%PDF-1.4\n"; const offsets = [0]; for (let index = 0; index < objects.length; index += 1) { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`; } const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; return Buffer.from(pdf, "utf8").toString("base64"); }

async function recordAudit(ctx: any, event: { action: string; entityType: string; entityId?: string; summary: string; metadata?: Record<string, unknown> }) {
  if (!fleetDb.auditEvent?.create) return undefined;
  return fleetDb.auditEvent.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, actorId: ctx.fleetopsUser.id, actorRole: ctx.fleetopsUser.role, action: event.action, entityType: event.entityType, entityId: event.entityId, summary: event.summary, metadata: event.metadata ? JSON.stringify(event.metadata) : undefined, createdAt: new Date() } });
}

const FLEETOPS_SERVER_RELEASE = "invite-schema-91663e37";
const INVITATION_TIMEOUT_MS = 12_000;
async function withServerTimeout<T>(promise: Promise<T>, message: string, timeoutMs = INVITATION_TIMEOUT_MS): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new TRPCError({ code: "TIMEOUT", message })), timeoutMs); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function assignedVehicleIds(ctx: any): Promise<string[]> {
  const rows = await fleetDb.vehicleAssignment.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id, active: true } });
  return rows.map((row: any) => row.vehicleId).filter(Boolean);
}

async function assertDriverVehicle(ctx: any, vehicleId: string) {
  if (ctx.fleetopsUser.role !== "DRIVER") return;
  const assigned = await fleetDb.vehicleAssignment.findFirst({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id, vehicleId, active: true } });
  if (!assigned) throw new TRPCError({ code: "FORBIDDEN", message: "Drivers may only access their currently assigned vehicle." });
}

export function validateOdometerReading(current: number, reading: number, elapsedDays = 1) {
  if (reading < current) throw new TRPCError({ code: "BAD_REQUEST", message: "Odometer readings cannot move backwards." });
  if (reading - current > Math.max(1, elapsedDays) * 1000) throw new TRPCError({ code: "BAD_REQUEST", message: `Odometer increase exceeds the ${Math.max(1, elapsedDays) * 1000} km limit for the elapsed period.` });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.fleetopsUser ?? ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  onboarding: router({
    bootstrap: publicProcedure.input(z.object({ orgName: z.string().min(2).optional(), fullName: z.string().min(2).optional() })).mutation(async ({ ctx, input }) => {
      const authUser = await getSupabaseAuthIdentity(ctx.req);
      if (!authUser?.email) throw new TRPCError({ code: "UNAUTHORIZED", message: "A valid Supabase access token is required." });
      return provisionFleetOpsUser({ authUserId: authUser.id, email: authUser.email, fullName: input.fullName ?? String(authUser.user_metadata?.fullName ?? authUser.email.split("@")[0]), orgName: input.orgName ?? String(authUser.user_metadata?.orgName ?? "Avani Transit") });
    }),
    complete: fleetOpsProcedure.input(z.object({ orgName: z.string().min(2), fullName: z.string().min(2) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      const updated = await fleetDb.$transaction(async (tx: any) => {
        const user = await tx.user.update({ where: { id: ctx.fleetopsUser.id }, data: { fullName: input.fullName } });
        const org = await tx.organization.update({ where: { id: ctx.fleetopsUser.orgId }, data: { name: input.orgName } });
        return { user, org };
      });
      const authUser = await getSupabaseAuthIdentity(ctx.req);
      if (!authUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your Supabase session expired. Sign in again to finish onboarding." });
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { user_metadata: { ...authUser.user_metadata, fullName: input.fullName, orgName: input.orgName, needsOnboarding: false } });
      if (metadataError) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Organization was saved, but onboarding state could not be finalized: ${metadataError.message}` });
      return updated;
    }),
    inviteDetails: publicProcedure.input(z.object({ token: z.string().uuid() })).query(async ({ input }) => {
      const invite = await fleetDb.invitation.findFirst({ where: { tokenHash: input.token, acceptedAt: null, expiresAt: { gt: new Date() } } });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "This invitation is invalid, expired, or already redeemed." });
      const org = await fleetDb.organization.findFirst({ where: { id: invite.orgId } });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "The invitation organization no longer exists." });
      return { email: invite.email, role: invite.role, organization: { id: org.id, name: org.name }, expiresAt: invite.expiresAt };
    }),
    acceptInvite: publicProcedure.input(z.object({ token: z.string().uuid(), fullName: z.string().min(2).optional() })).mutation(async ({ ctx, input }) => {
      const authUser = await getSupabaseAuthIdentity(ctx.req);
      if (!authUser?.email) throw new TRPCError({ code: "UNAUTHORIZED", message: "A valid Supabase access token is required." });
      const invite = await fleetDb.invitation.findFirst({ where: { tokenHash: input.token, email: authUser.email, acceptedAt: null, expiresAt: { gt: new Date() } } });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation is invalid, expired, or already redeemed." });
      const user = await fleetDb.$transaction(async (tx: any) => {
        const joined = await tx.user.upsert({ where: { authUserId: authUser.id }, update: { orgId: invite.orgId, role: invite.role, email: authUser.email!, fullName: input.fullName ?? String(authUser.user_metadata?.fullName ?? authUser.email!.split("@")[0]) }, create: { authUserId: authUser.id, orgId: invite.orgId, role: invite.role, email: authUser.email!, fullName: input.fullName ?? String(authUser.user_metadata?.fullName ?? authUser.email!.split("@")[0]) } });
        await tx.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
        return joined;
      });
      const inviteOrg = await fleetDb.organization.findFirst({ where: { id: invite.orgId } });
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { user_metadata: { ...authUser.user_metadata, fullName: user.fullName, orgId: user.orgId, orgName: inviteOrg?.name, role: user.role, needsOnboarding: false, invitationToken: undefined } });
      if (metadataError) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Organization membership was created, but the session metadata could not be finalized: ${metadataError.message}` });
      return user;
    }),
  }),
  dashboard: router({
    summary: fleetOpsProcedure.query(async ({ ctx }) => {
      const orgId = ctx.fleetopsUser.orgId;
      const [vehicles, openWorkOrders, inventoryAlerts, unreadNotifications, spend] = await Promise.all([
        fleetDb.vehicle.findMany({ where: { orgId }, orderBy: { updatedAt: "desc" }, take: 10 }),
        fleetDb.workOrder.count({ where: { orgId, status: { in: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS] } } }),
        fleetDb.inventoryPart.count({ where: { orgId, quantityOnHand: { lte: 5 } } }),
        fleetDb.notification.count({ where: { orgId, recipientId: ctx.fleetopsUser.id, isRead: false } }),
        fleetDb.financialRecord.aggregate({ where: { orgId, type: "EXPENSE" }, _sum: { amount: true } }),
      ]);
      const authUser = await getSupabaseAuthIdentity(ctx.req);
      const defaultOrgName = `${ctx.fleetopsUser.fullName}'s Fleet`;
      const needsOnboarding = authUser?.user_metadata?.needsOnboarding === true || authUser?.user_metadata?.needsOnboarding === "true" || ctx.fleetopsUser.org.name === defaultOrgName;
      return { org: ctx.fleetopsUser.org, role: ctx.fleetopsUser.role, needsOnboarding, vehicles, openWorkOrders, inventoryAlerts, unreadNotifications, monthlyExpense: spend._sum.amount ?? 0 };
    }),
  }),
  components: router({
    list: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid().optional() }).optional()).query(({ ctx, input }) => fleetDb.component.findMany({ where: { vehicle: { orgId: ctx.fleetopsUser.orgId }, ...(input?.vehicleId ? { vehicleId: input.vehicleId } : {}) }, orderBy: { name: "asc" } })),
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), name: z.string().min(2), expectedLifeKm: z.number().positive(), lastServicedOdometer: z.number().nonnegative(), alertThresholdKm: z.number().positive() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC"]); assertWritable(ctx.fleetopsUser.org); const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } }); if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." }); return fleetDb.component.create({ data: { id: crypto.randomUUID(), ...input } }); }),
    update: fleetOpsProcedure.input(z.object({ id: z.string().uuid(), name: z.string().min(2).optional(), expectedLifeKm: z.number().positive().optional(), lastServicedOdometer: z.number().nonnegative().optional(), alertThresholdKm: z.number().positive().optional() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC"]); assertWritable(ctx.fleetopsUser.org); const component = await fleetDb.component.findFirst({ where: { id: input.id, vehicle: { orgId: ctx.fleetopsUser.orgId } } }); if (!component) throw new TRPCError({ code: "NOT_FOUND", message: "Component not found." }); const { id, ...data } = input; return fleetDb.component.update({ where: { id }, data }); }),
    remove: fleetOpsProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const component = await fleetDb.component.findFirst({ where: { id: input.id, vehicle: { orgId: ctx.fleetopsUser.orgId } } }); if (!component) throw new TRPCError({ code: "NOT_FOUND", message: "Component not found." }); return fleetDb.component.delete({ where: { id: input.id } }); }),
  }),
  vehicles: router({
    list: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER"]);
      const where = ctx.fleetopsUser.role === "DRIVER" ? { orgId: ctx.fleetopsUser.orgId, id: { in: await assignedVehicleIds(ctx) } } : { orgId: ctx.fleetopsUser.orgId };
      return fleetDb.vehicle.findMany({ where, include: { components: true }, orderBy: { updatedAt: "desc" } });
    }),
    create: fleetOpsProcedure.input(z.object({ vin: z.string().min(5), licensePlate: z.string().min(3), make: z.string().min(2), model: z.string().min(2), year: z.number().int().min(1980).max(2100), currentOdometer: z.number().min(0).default(0), maintenanceTemplate: z.enum(["NONE", "CITY_BUS"]).default("NONE") })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertVehicleCapacity(ctx.fleetopsUser.orgId, ctx.fleetopsUser.org.maxVehicles);
      const count = await fleetDb.vehicle.count({ where: { orgId: ctx.fleetopsUser.orgId } });
      if (ctx.fleetopsUser.org.subscriptionTier === "TRIAL_FREE" && count >= ctx.fleetopsUser.org.maxVehicles) throw new TRPCError({ code: "FORBIDDEN", message: "Trial limit reached: maximum 3 vehicles." });
      const { maintenanceTemplate, ...vehicleInput } = input;
      const vehicle = await fleetDb.vehicle.create({ data: { id: crypto.randomUUID(), ...vehicleInput, status: "ACTIVE", orgId: ctx.fleetopsUser.orgId, createdAt: new Date(), updatedAt: new Date() } });
      if (maintenanceTemplate === "CITY_BUS") {
        const odometer = Number(input.currentOdometer ?? 0);
        await Promise.all(CITY_BUS_MAINTENANCE_TEMPLATE.map((template) => fleetDb.component.create({ data: { id: crypto.randomUUID(), vehicleId: vehicle.id, name: template.name, expectedLifeKm: template.expectedLifeKm, lastServicedOdometer: odometer, alertThresholdKm: template.alertThresholdKm } })));
      }
      await recordAudit(ctx, { action: "VEHICLE_CREATED", entityType: "VEHICLE", entityId: vehicle.id, summary: `Vehicle ${vehicle.licensePlate} added to the fleet`, metadata: { maintenanceTemplate } });
      return { ...vehicle, maintenanceTemplate };
    }),
    odometerHistory: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["FLEET_MANAGER"]); return fleetDb.odometerLog.findMany({ where: { vehicle: { orgId: ctx.fleetopsUser.orgId } }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 100 }); }),
    health: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid() })).query(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER"]); await assertDriverVehicle(ctx, input.vehicleId); const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId }, include: { components: true } }); if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found in your organization scope." }); const [odometers, workOrders, documents] = await Promise.all([fleetDb.odometerLog.findMany({ where: { vehicleId: vehicle.id, vehicle: { orgId: ctx.fleetopsUser.orgId } }, orderBy: { createdAt: "desc" }, take: 12 }), fleetDb.workOrder.findMany({ where: { vehicleId: vehicle.id, orgId: ctx.fleetopsUser.orgId, ...(["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { assignedMechanicId: ctx.fleetopsUser.id } : {}) }, orderBy: { updatedAt: "desc" }, take: 12 }), fleetDb.document.findMany({ where: { vehicleId: vehicle.id, orgId: ctx.fleetopsUser.orgId }, orderBy: { expiryDate: "asc" }, take: 12 })]); const dueComponents = vehicle.components.filter((item: any) => Number(vehicle.currentOdometer) - Number(item.lastServicedOdometer) >= Number(item.alertThresholdKm)); const dueDocuments = documents.filter((item: any) => new Date(item.expiryDate).getTime() < Date.now() + 30 * 86_400_000); return { vehicle, odometers, workOrders, documents, health: { componentCount: vehicle.components.length, dueComponents: dueComponents.length, openWorkOrders: workOrders.filter((item: any) => !["COMPLETED", "CANCELLED"].includes(item.status)).length, dueDocuments: dueDocuments.length, readiness: vehicle.status === "ACTIVE" && dueComponents.length === 0 && dueDocuments.length === 0 ? "READY" : "REVIEW" } }; }),
    updateOdometer: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), reading: z.number().min(0), source: z.enum(["MANUAL_DRIVER", "GPS_API", "MECHANIC"]) })).mutation(async ({ ctx, input }) => {
      assertWritable(ctx.fleetopsUser.org);
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER"]);
      await assertDriverVehicle(ctx, input.vehicleId);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." });
      const current = Number(vehicle.currentOdometer);
      const previousLog = await fleetDb.odometerLog.findFirst({ where: { vehicleId: vehicle.id }, orderBy: { createdAt: "desc" } });
      const elapsedDays = previousLog?.createdAt ? Math.max(1, Math.ceil((Date.now() - new Date(previousLog.createdAt).getTime()) / 86_400_000)) : 1;
      validateOdometerReading(previousLog ? Number(previousLog.reading) : current, input.reading, elapsedDays);
      const isFlagged = false;
      const result = await fleetDb.$transaction([
        fleetDb.vehicle.update({ where: { id: vehicle.id }, data: { currentOdometer: input.reading } }),
        fleetDb.odometerLog.create({ data: { id: crypto.randomUUID(), vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, reading: input.reading, source: input.source, isFlagged, createdAt: new Date() } }),
      ]);
      await evaluateVehicleMaintenance(vehicle.id, ctx.fleetopsUser.orgId);
      return result;
    }),
  }),
  workOrders: router({
    list: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]); const where = ["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId }; return fleetDb.workOrder.findMany({ where, include: { vehicle: true, assignedMechanic: true, partsUsed: { include: { part: true } } }, orderBy: { createdAt: "desc" } }); }),
    board: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]); const where = ["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId }; const orders = await fleetDb.workOrder.findMany({ where, include: { vehicle: true, assignedMechanic: true }, orderBy: { updatedAt: "desc" } }); return { columns: ["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK", "COMPLETED", "CANCELLED"].map((status) => ({ status, items: orders.filter((order: any) => order.status === status) })), totals: { all: orders.length, open: orders.filter((order: any) => order.status === "OPEN").length, inProgress: orders.filter((order: any) => order.status === "IN_PROGRESS").length, completed: orders.filter((order: any) => order.status === "COMPLETED").length } }; }),
    updateStatus: fleetOpsProcedure.input(z.object({ workOrderId: z.string().uuid(), status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK", "CANCELLED"]) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]); assertWritable(ctx.fleetopsUser.org); const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, ...(["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { assignedMechanicId: ctx.fleetopsUser.id } : {}) } }); if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Work order not found in your organization scope." }); const allowed: Record<string, string[]> = { OPEN: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK", "CANCELLED"], WAITING_FOR_PARTS: ["IN_PROGRESS", "CANCELLED"], READY_FOR_REVIEW: ["COMPLETED", "REWORK"], REWORK: ["IN_PROGRESS", "READY_FOR_REVIEW", "CANCELLED"], COMPLETED: [], CANCELLED: [] }; if (!allowed[order.status]?.includes(input.status)) throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot move work order from ${order.status} to ${input.status}.` }); const updated = await fleetDb.workOrder.update({ where: { id: order.id }, data: { status: input.status, ...(input.status === "IN_PROGRESS" && !order.startedAt ? { startedAt: new Date() } : {}) } }); await recordAudit(ctx, { action: "WORK_ORDER_STATUS_CHANGED", entityType: "WORK_ORDER", entityId: order.id, summary: `Work order moved from ${order.status} to ${input.status}`, metadata: { previousStatus: order.status, nextStatus: input.status } }); return updated; }),
    startWork: fleetOpsProcedure.input(z.object({ workOrderId: z.string().uuid() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["MECHANIC", "TECHNICIAN"]); assertWritable(ctx.fleetopsUser.org); const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } }); if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Work order is not assigned to you." }); return fleetDb.workOrder.update({ where: { id: order.id }, data: { status: "IN_PROGRESS", startedAt: order.startedAt ?? new Date() } }); }),
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), title: z.string().min(3), description: z.string().optional(), priority: z.nativeEnum(Priority).default(Priority.MEDIUM), assignedMechanicId: z.string().uuid().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." });
      if (input.assignedMechanicId) {
        const assignee = await fleetDb.user.findFirst({ where: { id: input.assignedMechanicId, orgId: ctx.fleetopsUser.orgId, role: { in: ["MECHANIC", "TECHNICIAN"] } } });
        if (!assignee) throw new TRPCError({ code: "BAD_REQUEST", message: "Mechanic or Technician must belong to this organization." });
      }
      const created = await fleetDb.workOrder.create({ data: { id: crypto.randomUUID(), ...input, status: "OPEN", orgId: ctx.fleetopsUser.orgId, createdAt: new Date() } });
      await recordAudit(ctx, { action: "WORK_ORDER_CREATED", entityType: "WORK_ORDER", entityId: created.id, summary: `Work order created: ${created.title}`, metadata: { priority: created.priority, assignedMechanicId: created.assignedMechanicId } });
      return created;
    }),
    complete: fleetOpsProcedure.input(z.object({ workOrderId: z.string().uuid(), parts: z.array(z.object({ partId: z.string().uuid(), qtyUsed: z.number().int().positive() })).default([]), laborHours: z.number().nonnegative().max(1000).default(0), repairNotes: z.string().trim().min(3).max(5000).default("Completed from organization oversight."), evidence: z.array(z.object({ fileData: z.string().max(6_000_000), contentType: z.string().startsWith("image/"), fileName: z.string().min(1).max(200), caption: z.string().max(500).optional() })).max(8).default([]) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, ...(["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { assignedMechanicId: ctx.fleetopsUser.id } : {}) }, include: { vehicle: true } });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Work order not found." });
      const uploadedEvidence = await Promise.all(input.evidence.map(async (item, index) => { const raw = item.fileData.replace(/^data:[^;]+;base64,/, ""); return { ...item, uploaded: await storagePut(`fleetops/work-orders/${ctx.fleetopsUser.orgId}/${order.id}/${Date.now()}-${index}-${item.fileName}`, Buffer.from(raw, "base64"), item.contentType) }; }));
      const result = await fleetDb.$transaction(async (tx: any) => {
        let partsCost = 0;
        for (const requested of input.parts) {
          const part = await tx.inventoryPart.findFirst({ where: { id: requested.partId, orgId: ctx.fleetopsUser.orgId } });
          if (!part || part.quantityOnHand < requested.qtyUsed) throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient inventory for one or more parts." });
          partsCost += Number(part.unitCost) * requested.qtyUsed;
          await tx.inventoryPart.update({ where: { id: part.id }, data: { quantityOnHand: { decrement: requested.qtyUsed } } });
          await tx.workOrderPart.create({ data: { id: crypto.randomUUID(), workOrderId: order.id, partId: part.id, qtyUsed: requested.qtyUsed, unitPrice: part.unitCost } });
          if (tx.inventoryMovement?.create) await tx.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, workOrderId: order.id, actorId: ctx.fleetopsUser.id, movementType: "ISSUE", quantity: -requested.qtyUsed, unitCost: part.unitCost, reason: `Consumed for work order ${order.id}`, createdAt: new Date() } });
        }
        const completed = await tx.workOrder.update({ where: { id: order.id }, data: { status: WorkOrderStatus.COMPLETED, startedAt: order.startedAt ?? new Date(), completedAt: new Date(), laborHours: input.laborHours, repairNotes: input.repairNotes } });
        for (const item of uploadedEvidence) await tx.workOrderEvidence.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, workOrderId: order.id, uploadedById: ctx.fleetopsUser.id, fileUrl: item.uploaded.url, ...(item.uploaded.key ? { fileKey: item.uploaded.key } : {}), ...(item.caption ? { caption: item.caption } : {}), createdAt: new Date() } });
        const admins = await tx.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: "SUPERADMIN" } });
        if (admins.length) await tx.notification.createMany({ data: admins.map((admin: any) => ({ id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, recipientId: admin.id, title: "Work order completed", message: `${order.vehicle?.licensePlate ?? order.vehicleId} repair completed. Parts cost: ₹${partsCost.toLocaleString("en-IN")}.`, type: "WORK_ORDER_COMPLETE", referenceId: order.id, isRead: false, createdAt: new Date() })) });
        return { completed, partsCost };
      });
      await recordAudit(ctx, { action: "WORK_ORDER_COMPLETED", entityType: "WORK_ORDER", entityId: order.id, summary: `Work order completed for ${order.vehicle?.licensePlate ?? order.vehicleId}`, metadata: { partsCost: result.partsCost, laborHours: input.laborHours, evidenceCount: input.evidence.length } });
      await evaluateLowInventory(ctx.fleetopsUser.orgId);
      return result;
    }),
  }),
  inventory: router({
    list: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); return fleetDb.inventoryPart.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { name: "asc" } }); }),
    movements: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"]); return fleetDb.inventoryMovement.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { createdAt: "desc" }, take: 100 }); }),
    create: fleetOpsProcedure.input(z.object({ sku: z.string().min(1), name: z.string().min(2), binLocation: z.string().optional(), quantityOnHand: z.number().int().nonnegative(), minReorderLevel: z.number().int().nonnegative().default(5), unitCost: z.number().nonnegative() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const part = await fleetDb.inventoryPart.create({ data: { id: crypto.randomUUID(), ...input, orgId: ctx.fleetopsUser.orgId } }); if (input.quantityOnHand > 0 && fleetDb.inventoryMovement?.create) await fleetDb.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, actorId: ctx.fleetopsUser.id, movementType: "RECEIPT", quantity: input.quantityOnHand, unitCost: input.unitCost, reason: "Opening inventory balance", createdAt: new Date() } }); await recordAudit(ctx, { action: "INVENTORY_PART_CREATED", entityType: "INVENTORY_PART", entityId: part.id, summary: `Inventory part created: ${part.name}`, metadata: { openingQuantity: input.quantityOnHand } }); await evaluateLowInventory(ctx.fleetopsUser.orgId); return part; }),
    receive: fleetOpsProcedure.input(z.object({ partId: z.string().uuid(), quantity: z.number().int().positive(), unitCost: z.number().nonnegative().optional(), reason: z.string().min(3).max(300) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const part = await fleetDb.inventoryPart.findFirst({ where: { id: input.partId, orgId: ctx.fleetopsUser.orgId } }); if (!part) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory part not found." }); const updated = await fleetDb.$transaction(async (tx: any) => { const next = await tx.inventoryPart.update({ where: { id: part.id }, data: { quantityOnHand: { increment: input.quantity }, ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}) } }); if (tx.inventoryMovement?.create) await tx.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, actorId: ctx.fleetopsUser.id, movementType: "RECEIPT", quantity: input.quantity, unitCost: input.unitCost ?? part.unitCost, reason: input.reason, createdAt: new Date() } }); return next; }); await recordAudit(ctx, { action: "INVENTORY_RECEIVED", entityType: "INVENTORY_PART", entityId: part.id, summary: `Received ${input.quantity} units of ${part.name}`, metadata: { quantity: input.quantity, reason: input.reason } }); return updated; }),
    issue: fleetOpsProcedure.input(z.object({ partId: z.string().uuid(), quantity: z.number().int().positive(), reason: z.string().min(3).max(300) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"]); assertWritable(ctx.fleetopsUser.org); const part = await fleetDb.inventoryPart.findFirst({ where: { id: input.partId, orgId: ctx.fleetopsUser.orgId } }); if (!part) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory part not found." }); if (part.quantityOnHand < input.quantity) throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient inventory for this issue." }); const updated = await fleetDb.$transaction(async (tx: any) => { const next = await tx.inventoryPart.update({ where: { id: part.id }, data: { quantityOnHand: { decrement: input.quantity } } }); if (tx.inventoryMovement?.create) await tx.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, actorId: ctx.fleetopsUser.id, movementType: "ISSUE", quantity: -input.quantity, unitCost: part.unitCost, reason: input.reason, createdAt: new Date() } }); return next; }); await recordAudit(ctx, { action: "INVENTORY_ISSUED", entityType: "INVENTORY_PART", entityId: part.id, summary: `Issued ${input.quantity} units of ${part.name}`, metadata: { quantity: input.quantity, reason: input.reason } }); await evaluateLowInventory(ctx.fleetopsUser.orgId); return updated; }),
  }),
  driver: router({
    inspections: fleetOpsProcedure.query(async ({ ctx }) => fleetDb.dvirInspection.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 50 })),
    createInspection: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), inspectionType: z.enum(["PRE_TRIP", "POST_TRIP"]), status: z.enum(["PASS", "FAIL"]), notes: z.string().max(2000).optional(), photoData: z.string().max(2_000_000).optional(), photoContentType: z.string().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["DRIVER", "SUPERADMIN"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertDriverVehicle(ctx, input.vehicleId);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." });
      let photoUrl: string | undefined;
      let photoKey: string | undefined;
      if (input.photoData) {
        const raw = input.photoData.replace(/^data:[^;]+;base64,/, "");
        const uploaded = await storagePut(`fleetops/dvir/${ctx.fleetopsUser.orgId}/${vehicle.id}.jpg`, Buffer.from(raw, "base64"), input.photoContentType ?? "image/jpeg");
        photoUrl = uploaded.url; photoKey = uploaded.key;
      }
      return fleetDb.dvirInspection.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, inspectionType: input.inspectionType, status: input.status, notes: input.notes, photoUrl, photoKey, createdAt: new Date() } });
    }),
    fuelLogs: fleetOpsProcedure.query(({ ctx }) => fleetDb.fuelLog.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 50 })),
    createFuelLog: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), liters: z.number().positive(), amount: z.number().nonnegative(), odometer: z.number().nonnegative(), station: z.string().max(200).optional(), receiptData: z.string().max(2_000_000).optional(), receiptContentType: z.string().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["DRIVER", "SUPERADMIN"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertDriverVehicle(ctx, input.vehicleId);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." });
      const previousLog = await fleetDb.odometerLog.findFirst({ where: { vehicleId: vehicle.id }, orderBy: { createdAt: "desc" } });
      const elapsedDays = previousLog?.createdAt ? Math.max(1, Math.ceil((Date.now() - new Date(previousLog.createdAt).getTime()) / 86_400_000)) : 1;
      validateOdometerReading(previousLog ? Number(previousLog.reading) : Number(vehicle.currentOdometer), input.odometer, elapsedDays);
      let receiptUrl: string | undefined;
      if (input.receiptData) receiptUrl = (await storagePut(`fleetops/fuel/${ctx.fleetopsUser.orgId}/${vehicle.id}.jpg`, Buffer.from(input.receiptData.replace(/^data:[^;]+;base64,/, ""), "base64"), input.receiptContentType ?? "image/jpeg")).url;
      const [log] = await fleetDb.$transaction([fleetDb.fuelLog.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, liters: input.liters, amount: input.amount, odometer: input.odometer, station: input.station, receiptUrl, createdAt: new Date(), updatedAt: new Date() } }), fleetDb.financialRecord.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, type: "EXPENSE", category: "FUEL", amount: input.amount, transactionDate: new Date() } }), fleetDb.odometerLog.create({ data: { id: crypto.randomUUID(), vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, reading: input.odometer, source: "MANUAL_DRIVER", isFlagged: false, createdAt: new Date() } }), fleetDb.vehicle.update({ where: { id: vehicle.id }, data: { currentOdometer: input.odometer } })]);
      return log;
    }),
  }),
  vehicleIssues: router({
    list: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "DRIVER"]); const where = ctx.fleetopsUser.role === "DRIVER" ? { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId }; return fleetDb.vehicleIssue.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }); }),
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), title: z.string().trim().min(3).max(160), description: z.string().trim().min(5).max(4000), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"), photoData: z.string().max(4_000_000).optional(), photoContentType: z.string().startsWith("image/").optional() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["DRIVER"]); assertWritable(ctx.fleetopsUser.org); await assertDriverVehicle(ctx, input.vehicleId); let photoUrl: string | undefined; let photoKey: string | undefined; if (input.photoData) { const uploaded = await storagePut(`fleetops/vehicle-issues/${ctx.fleetopsUser.orgId}/${input.vehicleId}/${Date.now()}.jpg`, Buffer.from(input.photoData.replace(/^data:[^;]+;base64,/, ""), "base64"), input.photoContentType ?? "image/jpeg"); photoUrl = uploaded.url; photoKey = uploaded.key; } const issue = await fleetDb.vehicleIssue.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: input.vehicleId, driverId: ctx.fleetopsUser.id, title: input.title, description: input.description, priority: input.priority, status: "OPEN", photoUrl, photoKey, createdAt: new Date(), updatedAt: new Date() } }); const managers = await fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: "FLEET_MANAGER" } }); if (managers.length) await fleetDb.notification.createMany({ data: managers.map((manager: any) => ({ id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, recipientId: manager.id, title: "Driver vehicle issue reported", message: `${input.title} · ${input.priority} priority`, type: "VEHICLE_ISSUE", referenceId: issue.id, isRead: false, createdAt: new Date(), updatedAt: new Date() })) }); await recordAudit(ctx, { action: "VEHICLE_ISSUE_REPORTED", entityType: "VEHICLE_ISSUE", entityId: issue.id, summary: `Driver reported vehicle issue: ${issue.title}`, metadata: { priority: issue.priority } }); return issue; }),
    updateStatus: fleetOpsProcedure.input(z.object({ issueId: z.string().uuid(), status: z.enum(["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const issue = await fleetDb.vehicleIssue.findFirst({ where: { id: input.issueId, orgId: ctx.fleetopsUser.orgId } }); if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle issue not found in this organization." }); const updated = await fleetDb.vehicleIssue.update({ where: { id: issue.id }, data: { status: input.status } }); await recordAudit(ctx, { action: "VEHICLE_ISSUE_STATUS_CHANGED", entityType: "VEHICLE_ISSUE", entityId: issue.id, summary: `Vehicle issue moved from ${issue.status} to ${input.status}`, metadata: { previousStatus: issue.status, nextStatus: input.status } }); return updated; }),
  }),
  triage: router({
    update: fleetOpsProcedure.input(z.object({ kind: z.enum(["VEHICLE_ISSUE", "WORK_ORDER", "DOCUMENT", "LOW_STOCK"]), referenceId: z.string().uuid(), state: z.enum(["ACKNOWLEDGED", "ASSIGNED", "DEFERRED", "RESOLVED"]), note: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); await recordAudit(ctx, { action: "TRIAGE_STATE_CHANGED", entityType: input.kind, entityId: input.referenceId, summary: `${input.kind} triage marked ${input.state.toLowerCase()}`, metadata: { state: input.state, assigneeId: input.state === "ASSIGNED" ? ctx.fleetopsUser.id : null, note: input.note ?? null } }); return { kind: input.kind, referenceId: input.referenceId, state: input.state, assigneeId: input.state === "ASSIGNED" ? ctx.fleetopsUser.id : null }; }),
    queue: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); const cutoff = new Date(Date.now() + 30 * 86_400_000); const [issues, orders, documents, parts, triageAudits] = await Promise.all([fleetDb.vehicleIssue.findMany({ where: { orgId: ctx.fleetopsUser.orgId, status: { notIn: ["RESOLVED", "CLOSED"] } }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 50 }), fleetDb.workOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } }, include: { vehicle: true, assignedMechanic: true }, orderBy: { createdAt: "desc" }, take: 50 }), fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId, expiryDate: { lte: cutoff } }, include: { vehicle: true }, orderBy: { expiryDate: "asc" }, take: 50 }), fleetDb.inventoryPart.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { name: "asc" }, take: 200 }), fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, action: "TRIAGE_STATE_CHANGED" }, orderBy: { createdAt: "desc" }, take: 500 })]); const triageState = new Map<string, string>(); for (const event of triageAudits as any[]) { const key = `${event.entityType}:${event.entityId}`; if (!triageState.has(key)) { try { const metadata = JSON.parse(event.metadata ?? "{}"); triageState.set(key, metadata.state ? `${metadata.state}${metadata.assigneeId ? `:${metadata.assigneeId}` : ""}` : ""); } catch { triageState.set(key, ""); } } } const withState = (item: any, kind: string) => ({ ...item, triageState: triageState.get(`${kind}:${item.referenceId}`) ?? null }); const issueItems = issues.map((item: any) => withState({ id: item.id, kind: "VEHICLE_ISSUE", title: item.title, subtitle: `${item.vehicle?.licensePlate ?? item.vehicleId} · Driver issue`, priority: item.priority, status: item.status, createdAt: item.createdAt, referenceId: item.id, actionable: true }, "VEHICLE_ISSUE")); const orderItems = orders.map((item: any) => withState({ id: item.id, kind: "WORK_ORDER", title: item.title, subtitle: `${item.vehicle?.licensePlate ?? item.vehicleId} · ${item.assignedMechanic?.fullName ?? "Unassigned"}`, priority: item.priority, status: item.status, createdAt: item.createdAt, referenceId: item.id, actionable: true }, "WORK_ORDER")); const documentItems = documents.map((item: any) => withState({ id: item.id, kind: "DOCUMENT", title: item.title, subtitle: `${item.vehicle?.licensePlate ?? "Organization document"} · expires ${new Date(item.expiryDate).toLocaleDateString("en-IN")}`, priority: new Date(item.expiryDate) < new Date() ? "CRITICAL" : "HIGH", status: "REVIEW", createdAt: item.createdAt, referenceId: item.id, actionable: true }, "DOCUMENT")); const lowStockItems = parts.filter((item: any) => Number(item.quantityOnHand) <= Number(item.minReorderLevel)).map((item: any) => withState({ id: item.id, kind: "LOW_STOCK", title: `${item.sku} · ${item.name}`, subtitle: `${item.quantityOnHand} on hand · reorder at ${item.minReorderLevel}`, priority: "HIGH", status: "REORDER", createdAt: item.updatedAt ?? item.createdAt, referenceId: item.id, actionable: true }, "LOW_STOCK")); return [...issueItems, ...orderItems, ...documentItems, ...lowStockItems].filter((item: any) => !["DEFERRED", "RESOLVED"].includes(String(item.triageState).split(":")[0])).sort((a: any, b: any) => { const rank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }; return (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); }).slice(0, 100); }),
  }),
  audit: router({
    list: fleetOpsProcedure.input(z.object({ actorId: z.string().uuid().optional(), actorRole: z.string().optional(), entityType: z.string().optional(), action: z.string().optional(), outcome: z.enum(["SUCCESS", "ERROR"]).optional(), dateFrom: z.string().datetime().optional(), dateTo: z.string().datetime().optional(), limit: z.number().int().min(1).max(200).default(100) }).optional()).query(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); const rows = await fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, ...(input?.actorId ? { actorId: input.actorId } : {}), ...(input?.actorRole ? { actorRole: input.actorRole } : {}), ...(input?.entityType ? { entityType: input.entityType } : {}), ...(input?.action ? { action: input.action } : {}), ...(input?.dateFrom || input?.dateTo ? { createdAt: { ...(input?.dateFrom ? { gte: new Date(input.dateFrom) } : {}), ...(input?.dateTo ? { lte: new Date(input.dateTo) } : {}) } } : {}) }, orderBy: { createdAt: "desc" }, take: input?.limit ?? 100 }); if (!input?.outcome) return rows; return rows.filter((row: any) => { let metadata: any = {}; try { metadata = row.metadata ? JSON.parse(row.metadata) : {}; } catch { metadata = {}; } const outcome = String(metadata.outcome ?? "SUCCESS").toUpperCase(); return outcome === input.outcome; }); }),
  }),
  automation: router({
    evaluate: fleetOpsProcedure.mutation(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); return evaluateAllOrganizations(); }),
  }),
  team: router({
    members: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); return fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, select: { id: true, email: true, fullName: true, role: true, createdAt: true }, orderBy: { fullName: "asc" } }); }),
    invitations: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); return fleetDb.invitation.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { createdAt: "desc" } }); }),
    invite: fleetOpsProcedure.input(z.object({ email: z.string().email(), role: z.enum(["FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER", "INVENTORY_MANAGER", "ACCOUNTANT"]) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); assertWritable(ctx.fleetopsUser.org); await assertUserCapacity(ctx.fleetopsUser.orgId, ctx.fleetopsUser.org.maxUsers); const invitation = await withServerTimeout<any>(fleetDb.invitation.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, email: input.email.toLowerCase(), role: input.role, tokenHash: crypto.randomUUID(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: new Date() } }), "Invitation storage did not respond within 12 seconds. No invitation was confirmed."); await recordAudit(ctx, { action: "INVITATION_CREATED", entityType: "INVITATION", entityId: invitation.id, summary: `Invitation created for ${input.email.toLowerCase()}`, metadata: { role: input.role } }); const origin = String(ctx.req?.headers?.origin ?? "https://fleetops-elktaacw.manus.space"); const joinUrl = new URL(`/join/${invitation.tokenHash}`, origin).toString(); const emailResult = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email.toLowerCase(), { redirectTo: joinUrl }); return { ...(invitation as Record<string, unknown>), joinUrl, delivery: emailResult.error ? "MANUAL_TOKEN" as const : "EMAIL" as const, deliveryError: emailResult.error?.message, serverRelease: FLEETOPS_SERVER_RELEASE }; }),
    updateRole: fleetOpsProcedure.input(z.object({ userId: z.string().uuid(), role: z.enum(["FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER", "INVENTORY_MANAGER", "ACCOUNTANT"]) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); assertWritable(ctx.fleetopsUser.org); const member = await fleetDb.user.findFirst({ where: { id: input.userId, orgId: ctx.fleetopsUser.orgId } }); if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Team member not found." }); const updated = await fleetDb.user.update({ where: { id: input.userId }, data: { role: input.role } }); await recordAudit(ctx, { action: "ROLE_CHANGED", entityType: "USER", entityId: member.id, summary: `Role changed for ${member.fullName}`, metadata: { previousRole: member.role, nextRole: input.role } }); return updated; }),
    operationalRoster: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["FLEET_MANAGER"]); const [members, assignments] = await Promise.all([fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: { in: ["DRIVER", "MECHANIC", "TECHNICIAN"] } }, select: { id: true, fullName: true, email: true, role: true }, orderBy: { fullName: "asc" } }), fleetDb.vehicleAssignment.findMany({ where: { orgId: ctx.fleetopsUser.orgId, active: true }, orderBy: { updatedAt: "desc" } })]); return { members, assignments }; }),
    assignVehicle: fleetOpsProcedure.input(z.object({ driverId: z.string().uuid(), vehicleId: z.string().uuid(), active: z.boolean().default(true) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const driver = await fleetDb.user.findFirst({ where: { id: input.driverId, orgId: ctx.fleetopsUser.orgId, role: "DRIVER" } }); const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } }); if (!driver || !vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Driver or vehicle not found in this organization." }); const assignment = await fleetDb.vehicleAssignment.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: input.vehicleId, driverId: input.driverId, active: input.active, createdAt: new Date(), updatedAt: new Date() } }); await recordAudit(ctx, { action: "VEHICLE_ASSIGNED", entityType: "VEHICLE_ASSIGNMENT", entityId: assignment.id, summary: `Vehicle ${input.vehicleId} assigned to driver ${input.driverId}`, metadata: { vehicleId: input.vehicleId, driverId: input.driverId, active: input.active } }); return assignment; }),
  }),
  purchaseOrders: router({
    list: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); return fleetDb.purchaseOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vendor: true }, orderBy: { createdAt: "desc" } }); }),
    create: fleetOpsProcedure.input(z.object({ vendorId: z.string().uuid(), totalCost: z.number().nonnegative() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const created = await fleetDb.purchaseOrder.create({ data: { id: crypto.randomUUID(), ...input, status: "DRAFT", totalCost: input.totalCost, orgId: ctx.fleetopsUser.orgId, createdAt: new Date() } }); await recordAudit(ctx, { action: "PURCHASE_ORDER_CREATED", entityType: "PURCHASE_ORDER", entityId: created.id, summary: `Purchase order created: ₹${Number(created.totalCost).toLocaleString("en-IN")}`, metadata: { vendorId: created.vendorId } }); return created; }),
  }),
  documents: router({
    exportPdf: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); const rows = await fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } }); const content = simplePdf("FleetOps Compliance Register", [`Organization: ${ctx.fleetopsUser.org.name}`, `Generated: ${new Date().toLocaleDateString("en-IN")}`, `Documents: ${rows.length}`, ...rows.map((row: any) => `${row.title} | ${row.docType} | ${row.vehicle?.licensePlate ?? "Organization"} | expires ${new Date(row.expiryDate).toLocaleDateString("en-IN")}`)]); await recordAudit(ctx, { action: "DOCUMENT_EXPORT_PDF", entityType: "DOCUMENT", summary: `Exported compliance PDF with ${rows.length} documents`, metadata: { count: rows.length } }); return { filename: `fleetops-compliance-${new Date().toISOString().slice(0, 10)}.pdf`, content, rowCount: rows.length }; }),
    exportCsv: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); const rows = await fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } }); const csv = csvDocument(rows.map((row: any) => ({ title: row.title, docType: row.docType, vehicle: row.vehicle?.licensePlate ?? "Organization", expiryDate: new Date(row.expiryDate).toISOString().slice(0, 10), fileStatus: row.fileKey ? "STORED" : "MISSING" })), ["title", "docType", "vehicle", "expiryDate", "fileStatus"]); await recordAudit(ctx, { action: "DOCUMENT_EXPORT_CSV", entityType: "DOCUMENT", summary: `Exported ${rows.length} compliance documents`, metadata: { count: rows.length } }); return { filename: `fleetops-compliance-${new Date().toISOString().slice(0, 10)}.csv`, content: csv, rowCount: rows.length }; }),
    list: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); return fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } }); }),
    create: fleetOpsProcedure.input(z.object({ title: z.string().min(2), docType: z.string().min(2), fileUrl: z.string().url().optional(), fileKey: z.string().optional(), fileData: z.string().max(4_000_000).optional(), fileContentType: z.string().optional(), expiryDate: z.coerce.date(), vehicleId: z.string().uuid().optional() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const { fileData, fileContentType, ...data } = input; let fileUrl = data.fileUrl; let fileKey = data.fileKey; if (fileData) { const uploaded = await storagePut(`fleetops/documents/${ctx.fleetopsUser.orgId}/${input.title}`, Buffer.from(fileData.replace(/^data:[^;]+;base64,/, "")), fileContentType ?? "application/octet-stream"); fileUrl = uploaded.url; fileKey = uploaded.key; } if (!fileUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "A document file is required." }); const created = await fleetDb.document.create({ data: { id: crypto.randomUUID(), ...data, fileUrl, fileKey, orgId: ctx.fleetopsUser.orgId, createdAt: new Date() } }); await recordAudit(ctx, { action: "DOCUMENT_CREATED", entityType: "DOCUMENT", entityId: created.id, summary: `Compliance document added: ${created.title}`, metadata: { docType: created.docType } }); return created; }),
    update: fleetOpsProcedure.input(z.object({ id: z.string().uuid(), title: z.string().min(2).optional(), expiryDate: z.coerce.date().optional(), fileData: z.string().max(4_000_000).optional(), fileContentType: z.string().optional() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const existing = await fleetDb.document.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } }); if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." }); const { id, fileData, fileContentType, ...data } = input; let updateData: any = { ...data }; if (fileData) { const uploaded = await storagePut(`fleetops/documents/${ctx.fleetopsUser.orgId}/${existing.title}`, Buffer.from(fileData.replace(/^data:[^;]+;base64,/, "")), fileContentType ?? "application/octet-stream"); updateData = { ...updateData, fileUrl: uploaded.url, fileKey: uploaded.key }; } const updated = await fleetDb.document.update({ where: { id }, data: updateData }); await recordAudit(ctx, { action: "DOCUMENT_UPDATED", entityType: "DOCUMENT", entityId: existing.id, summary: `Compliance document updated: ${updated.title}` }); return updated; }),
    access: fleetOpsProcedure.input(z.object({ id: z.string().uuid(), kind: z.enum(["DOCUMENT", "WORK_ORDER_EVIDENCE"]).default("DOCUMENT") })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, input.kind === "DOCUMENT" ? ["SUPERADMIN", "FLEET_MANAGER"] : ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]); const row = input.kind === "DOCUMENT" ? await fleetDb.document.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } }) : await fleetDb.workOrderEvidence.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } }); if (!row?.fileKey) throw new TRPCError({ code: "NOT_FOUND", message: "The requested file is unavailable." }); await recordAudit(ctx, { action: "FILE_ACCESSED", entityType: input.kind, entityId: input.id, summary: `Authorized file access for ${input.kind.toLowerCase()}` }); return { url: await storageGetSignedUrl(row.fileKey), expiresInSeconds: 900 }; }),
  }),
  financials: router({
    exportPdf: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]); const rows = await fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { transactionDate: "desc" } }); const content = simplePdf("FleetOps INR Financial Ledger", [`Organization: ${ctx.fleetopsUser.org.name}`, `Generated: ${new Date().toLocaleDateString("en-IN")}`, `Records: ${rows.length}`, ...rows.map((row: any) => `${new Date(row.transactionDate).toLocaleDateString("en-IN")} | ${row.vehicle?.licensePlate ?? row.vehicleId} | ${row.type} | ${row.category} | INR ${Number(row.amount).toFixed(2)}`)]); await recordAudit(ctx, { action: "FINANCIAL_EXPORT_PDF", entityType: "FINANCIAL_RECORD", summary: `Exported financial PDF with ${rows.length} records`, metadata: { count: rows.length } }); return { filename: `fleetops-financial-ledger-${new Date().toISOString().slice(0, 10)}.pdf`, content, rowCount: rows.length }; }),
    exportCsv: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]); const rows = await fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { transactionDate: "desc" } }); const csv = csvDocument(rows.map((row: any) => ({ transactionDate: new Date(row.transactionDate).toISOString().slice(0, 10), vehicle: row.vehicle?.licensePlate ?? row.vehicleId, type: row.type, category: row.category, amountInr: Number(row.amount).toFixed(2) })), ["transactionDate", "vehicle", "type", "category", "amountInr"]); await recordAudit(ctx, { action: "FINANCIAL_EXPORT_CSV", entityType: "FINANCIAL_RECORD", summary: `Exported ${rows.length} financial records`, metadata: { count: rows.length } }); return { filename: `fleetops-financial-ledger-${new Date().toISOString().slice(0, 10)}.csv`, content: csv, rowCount: rows.length }; }),
    list: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]); return fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { transactionDate: "desc" } }); }),
    metrics: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      const [records, odometers, vehicles] = await Promise.all([
        fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { transactionDate: "desc" } }),
        fleetDb.odometerLog.findMany({ where: { vehicle: { orgId: ctx.fleetopsUser.orgId } }, orderBy: { createdAt: "asc" } }),
        fleetDb.vehicle.findMany({ where: { orgId: ctx.fleetopsUser.orgId } }),
      ]);
      const byVehicle = new Map<string, { vehicleId: string; vehicle: string; revenue: number; expenses: number; firstOdometer: number | null; lastOdometer: number | null }>();
      for (const vehicle of vehicles as any[]) byVehicle.set(vehicle.id, { vehicleId: vehicle.id, vehicle: vehicle.licensePlate, revenue: 0, expenses: 0, firstOdometer: null, lastOdometer: null });
      for (const record of records as any[]) { const row = byVehicle.get(record.vehicleId); if (!row) continue; if (record.type === "REVENUE") row.revenue += Number(record.amount); else row.expenses += Number(record.amount); }
      for (const log of odometers as any[]) { const row = byVehicle.get(log.vehicleId); if (!row) continue; const reading = Number(log.reading); if (row.firstOdometer === null) row.firstOdometer = reading; row.lastOdometer = reading; }
      const rows = Array.from(byVehicle.values()).map((row) => { const distanceKm = row.firstOdometer !== null && row.lastOdometer !== null ? Math.max(0, row.lastOdometer - row.firstOdometer) : 0; return { ...row, distanceKm, profit: row.revenue - row.expenses, cpk: distanceKm > 0 ? row.expenses / distanceKm : 0 }; });
      return { rows, totals: { revenue: rows.reduce((s, r) => s + r.revenue, 0), expenses: rows.reduce((s, r) => s + r.expenses, 0), profit: rows.reduce((s, r) => s + r.profit, 0), cpk: rows.reduce((s, r) => s + r.expenses, 0) / Math.max(1, rows.reduce((s, r) => s + r.distanceKm, 0)) } };
    }),
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), type: z.enum(["REVENUE", "EXPENSE"]), category: z.string().min(2), amount: z.number().nonnegative(), transactionDate: z.coerce.date() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]); assertWritable(ctx.fleetopsUser.org); const created = await fleetDb.financialRecord.create({ data: { id: crypto.randomUUID(), ...input, amount: input.amount, orgId: ctx.fleetopsUser.orgId } }); await recordAudit(ctx, { action: "FINANCIAL_RECORD_CREATED", entityType: "FINANCIAL_RECORD", entityId: created.id, summary: `${created.type} record added: ₹${Number(created.amount).toLocaleString("en-IN")}`, metadata: { category: created.category } }); return created; }),
  }),
  billing: router({
    status: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); return ({ tier: ctx.fleetopsUser.org.subscriptionTier, trialEndsAt: ctx.fleetopsUser.org.trialEndsAt, daysRemaining: Math.max(0, Math.ceil((ctx.fleetopsUser.org.trialEndsAt.getTime() - Date.now()) / 86_400_000)), maxVehicles: ctx.fleetopsUser.org.maxVehicles, maxUsers: ctx.fleetopsUser.org.maxUsers, writeLocked: ctx.fleetopsUser.org.subscriptionTier === "TRIAL_FREE" && ctx.fleetopsUser.org.trialEndsAt.getTime() < Date.now() }); }),
  }),
  activity: router({
    recent: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER"]);
      const [orders, alerts, odometers] = await Promise.all([
        fleetDb.workOrder.findMany({ where: ["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 10 }),
        fleetDb.notification.findMany({ where: { orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 10 }),
        fleetDb.odometerLog.findMany({ where: ctx.fleetopsUser.role === "DRIVER" ? { vehicle: { orgId: ctx.fleetopsUser.orgId }, driverId: ctx.fleetopsUser.id } : { vehicle: { orgId: ctx.fleetopsUser.orgId } }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 10 }),
      ]);
      return [
        ...orders.map((order: any) => ({ id: order.id, kind: "work_order", title: order.title, detail: `${order.vehicle?.licensePlate ?? order.vehicleId} · ${order.status}`, createdAt: order.createdAt })),
        ...alerts.map((alert: any) => ({ id: alert.id, kind: "notification", title: alert.title, detail: alert.message, createdAt: alert.createdAt })),
        ...odometers.map((log: any) => ({ id: log.id, kind: "odometer", title: `Odometer updated · ${log.vehicle?.licensePlate ?? log.vehicleId}`, detail: `${Number(log.reading).toLocaleString("en-IN")} km${log.isFlagged ? " · flagged" : ""}`, createdAt: log.createdAt })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
    }),
  }),
  notifications: router({
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.notification.findMany({ where: { orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 50 })),
    markRead: fleetOpsProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => fleetDb.notification.updateMany({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, data: { isRead: true } })),
  }),
});

export type AppRouter = typeof appRouter;
