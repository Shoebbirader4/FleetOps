import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { fleetOpsProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { fleetDb } from "./db";
import { getSupabaseAuthIdentity, provisionFleetOpsUser, supabaseAdmin } from "./supabase";
import { storagePut } from "./storage";
const Priority = { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", CRITICAL: "CRITICAL" } as const;
const WorkOrderStatus = { OPEN: "OPEN", IN_PROGRESS: "IN_PROGRESS", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED" } as const;
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
  if (ctx.fleetopsUser.role === "SUPERADMIN") return;
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
    create: fleetOpsProcedure.input(z.object({ vin: z.string().min(5), licensePlate: z.string().min(3), make: z.string().min(2), model: z.string().min(2), year: z.number().int().min(1980).max(2100), currentOdometer: z.number().min(0).default(0) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertVehicleCapacity(ctx.fleetopsUser.orgId, ctx.fleetopsUser.org.maxVehicles);
      const count = await fleetDb.vehicle.count({ where: { orgId: ctx.fleetopsUser.orgId } });
      if (ctx.fleetopsUser.org.subscriptionTier === "TRIAL_FREE" && count >= ctx.fleetopsUser.org.maxVehicles) throw new TRPCError({ code: "FORBIDDEN", message: "Trial limit reached: maximum 3 vehicles." });
      return fleetDb.vehicle.create({ data: { id: crypto.randomUUID(), ...input, status: "ACTIVE", orgId: ctx.fleetopsUser.orgId, createdAt: new Date(), updatedAt: new Date() } });
    }),
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
        fleetDb.odometerLog.create({ data: { vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, reading: input.reading, source: input.source, isFlagged } }),
      ]);
      await evaluateVehicleMaintenance(vehicle.id, ctx.fleetopsUser.orgId);
      return result;
    }),
  }),
  workOrders: router({
    list: fleetOpsProcedure.query(async ({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]); const where = ["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId }; return fleetDb.workOrder.findMany({ where, include: { vehicle: true, assignedMechanic: true, partsUsed: { include: { part: true } } }, orderBy: { createdAt: "desc" } }); }),
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), title: z.string().min(3), description: z.string().optional(), priority: z.nativeEnum(Priority).default(Priority.MEDIUM), assignedMechanicId: z.string().uuid().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." });
      return fleetDb.workOrder.create({ data: { id: crypto.randomUUID(), ...input, status: "OPEN", orgId: ctx.fleetopsUser.orgId, createdAt: new Date() } });
    }),
    complete: fleetOpsProcedure.input(z.object({ workOrderId: z.string().uuid(), parts: z.array(z.object({ partId: z.string().uuid(), qtyUsed: z.number().int().positive() })).default([]) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true } });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Work order not found." });
      const result = await fleetDb.$transaction(async (tx: any) => {
        let partsCost = 0;
        for (const requested of input.parts) {
          const part = await tx.inventoryPart.findFirst({ where: { id: requested.partId, orgId: ctx.fleetopsUser.orgId } });
          if (!part || part.quantityOnHand < requested.qtyUsed) throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient inventory for one or more parts." });
          partsCost += Number(part.unitCost) * requested.qtyUsed;
          await tx.inventoryPart.update({ where: { id: part.id }, data: { quantityOnHand: { decrement: requested.qtyUsed } } });
          await tx.workOrderPart.create({ data: { workOrderId: order.id, partId: part.id, qtyUsed: requested.qtyUsed, unitPrice: part.unitCost } });
        }
        const completed = await tx.workOrder.update({ where: { id: order.id }, data: { status: WorkOrderStatus.COMPLETED, completedAt: new Date() } });
        const admins = await tx.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: "SUPERADMIN" } });
        if (admins.length) await tx.notification.createMany({ data: admins.map((admin: any) => ({ orgId: ctx.fleetopsUser.orgId, recipientId: admin.id, title: "Work order completed", message: `${order.vehicle.licensePlate} repair completed. Parts cost: ₹${partsCost.toLocaleString("en-IN")}.`, type: "WORK_ORDER_COMPLETE", referenceId: order.id })) });
        return { completed, partsCost };
      });
      await evaluateLowInventory(ctx.fleetopsUser.orgId);
      return result;
    }),
  }),
  inventory: router({
    list: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); return fleetDb.inventoryPart.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { name: "asc" } }); }),
    create: fleetOpsProcedure.input(z.object({ sku: z.string().min(1), name: z.string().min(2), binLocation: z.string().optional(), quantityOnHand: z.number().int().nonnegative(), minReorderLevel: z.number().int().nonnegative().default(5), unitCost: z.number().nonnegative() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const part = await fleetDb.inventoryPart.create({ data: { ...input, orgId: ctx.fleetopsUser.orgId } }); await evaluateLowInventory(ctx.fleetopsUser.orgId); return part; }),
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
      return fleetDb.dvirInspection.create({ data: { orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, inspectionType: input.inspectionType, status: input.status, notes: input.notes, photoUrl, photoKey } });
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
      const [log] = await fleetDb.$transaction([fleetDb.fuelLog.create({ data: { orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, liters: input.liters, amount: input.amount, odometer: input.odometer, station: input.station, receiptUrl } }), fleetDb.financialRecord.create({ data: { orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, type: "EXPENSE", category: "FUEL", amount: input.amount, transactionDate: new Date() } }), fleetDb.odometerLog.create({ data: { vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, reading: input.odometer, source: "MANUAL_DRIVER", isFlagged: false } }), fleetDb.vehicle.update({ where: { id: vehicle.id }, data: { currentOdometer: input.odometer } })]);
      return log;
    }),
  }),
  automation: router({
    evaluate: fleetOpsProcedure.mutation(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); return evaluateAllOrganizations(); }),
  }),
  team: router({
    members: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); return fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, select: { id: true, email: true, fullName: true, role: true, createdAt: true }, orderBy: { fullName: "asc" } }); }),
    invitations: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); return fleetDb.invitation.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { createdAt: "desc" } }); }),
    invite: fleetOpsProcedure.input(z.object({ email: z.string().email(), role: z.enum(["FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER", "INVENTORY_MANAGER", "ACCOUNTANT"]) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); assertWritable(ctx.fleetopsUser.org); await assertUserCapacity(ctx.fleetopsUser.orgId, ctx.fleetopsUser.org.maxUsers); const invitation = await withServerTimeout<any>(fleetDb.invitation.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, email: input.email.toLowerCase(), role: input.role, tokenHash: crypto.randomUUID(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: new Date() } }), "Invitation storage did not respond within 12 seconds. No invitation was confirmed."); const origin = String(ctx.req?.headers?.origin ?? "https://fleetops-elktaacw.manus.space"); const joinUrl = new URL(`/join/${invitation.tokenHash}`, origin).toString(); const emailResult = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email.toLowerCase(), { redirectTo: joinUrl }); return { ...(invitation as Record<string, unknown>), joinUrl, delivery: emailResult.error ? "MANUAL_TOKEN" as const : "EMAIL" as const, deliveryError: emailResult.error?.message, serverRelease: FLEETOPS_SERVER_RELEASE }; }),
    updateRole: fleetOpsProcedure.input(z.object({ userId: z.string().uuid(), role: z.enum(["FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER", "INVENTORY_MANAGER", "ACCOUNTANT"]) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); assertWritable(ctx.fleetopsUser.org); const member = await fleetDb.user.findFirst({ where: { id: input.userId, orgId: ctx.fleetopsUser.orgId } }); if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Team member not found." }); return fleetDb.user.update({ where: { id: input.userId }, data: { role: input.role } }); }),
    assignVehicle: fleetOpsProcedure.input(z.object({ driverId: z.string().uuid(), vehicleId: z.string().uuid(), active: z.boolean().default(true) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const driver = await fleetDb.user.findFirst({ where: { id: input.driverId, orgId: ctx.fleetopsUser.orgId, role: "DRIVER" } }); const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } }); if (!driver || !vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Driver or vehicle not found in this organization." }); return fleetDb.vehicleAssignment.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, driverId: input.driverId, vehicleId: input.vehicleId, active: input.active, createdAt: new Date(), updatedAt: new Date() } }); }),
  }),
  purchaseOrders: router({
    list: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); return fleetDb.purchaseOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vendor: true }, orderBy: { createdAt: "desc" } }); }),
    create: fleetOpsProcedure.input(z.object({ vendorId: z.string().uuid(), totalCost: z.number().nonnegative() })).mutation(({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); assertWritable(ctx.fleetopsUser.org); return fleetDb.purchaseOrder.create({ data: { ...input, totalCost: input.totalCost, orgId: ctx.fleetopsUser.orgId } }); }),
  }),
  documents: router({
    list: fleetOpsProcedure.query(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); return fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } }); }),
    create: fleetOpsProcedure.input(z.object({ title: z.string().min(2), docType: z.string().min(2), fileUrl: z.string().url().optional(), fileKey: z.string().optional(), fileData: z.string().max(4_000_000).optional(), fileContentType: z.string().optional(), expiryDate: z.coerce.date(), vehicleId: z.string().uuid().optional() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const { fileData, fileContentType, ...data } = input; let fileUrl = data.fileUrl; let fileKey = data.fileKey; if (fileData) { const uploaded = await storagePut(`fleetops/documents/${ctx.fleetopsUser.orgId}/${input.title}`, Buffer.from(fileData.replace(/^data:[^;]+;base64,/, "")), fileContentType ?? "application/octet-stream"); fileUrl = uploaded.url; fileKey = uploaded.key; } if (!fileUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "A document file is required." }); return fleetDb.document.create({ data: { id: crypto.randomUUID(), ...data, fileUrl, fileKey, orgId: ctx.fleetopsUser.orgId, createdAt: new Date() } }); }),
    update: fleetOpsProcedure.input(z.object({ id: z.string().uuid(), title: z.string().min(2).optional(), expiryDate: z.coerce.date().optional(), fileData: z.string().max(4_000_000).optional(), fileContentType: z.string().optional() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const existing = await fleetDb.document.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } }); if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." }); const { id, fileData, fileContentType, ...data } = input; let updateData: any = { ...data }; if (fileData) { const uploaded = await storagePut(`fleetops/documents/${ctx.fleetopsUser.orgId}/${existing.title}`, Buffer.from(fileData.replace(/^data:[^;]+;base64,/, "")), fileContentType ?? "application/octet-stream"); updateData = { ...updateData, fileUrl: uploaded.url, fileKey: uploaded.key }; } return fleetDb.document.update({ where: { id }, data: updateData }); }),
  }),
  financials: router({
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
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), type: z.enum(["REVENUE", "EXPENSE"]), category: z.string().min(2), amount: z.number().nonnegative(), transactionDate: z.coerce.date() })).mutation(({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]); assertWritable(ctx.fleetopsUser.org); return fleetDb.financialRecord.create({ data: { ...input, amount: input.amount, orgId: ctx.fleetopsUser.orgId } }); }),
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
        ...orders.map((order: any) => ({ id: order.id, kind: "work_order", title: order.title, detail: `${order.vehicle.licensePlate} · ${order.status}`, createdAt: order.createdAt })),
        ...alerts.map((alert: any) => ({ id: alert.id, kind: "notification", title: alert.title, detail: alert.message, createdAt: alert.createdAt })),
        ...odometers.map((log: any) => ({ id: log.id, kind: "odometer", title: `Odometer updated · ${log.vehicle.licensePlate}`, detail: `${Number(log.reading).toLocaleString("en-IN")} km${log.isFlagged ? " · flagged" : ""}`, createdAt: log.createdAt })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);
    }),
  }),
  notifications: router({
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.notification.findMany({ where: { orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 50 })),
    markRead: fleetOpsProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => fleetDb.notification.updateMany({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, data: { isRead: true } })),
  }),
});

export type AppRouter = typeof appRouter;
