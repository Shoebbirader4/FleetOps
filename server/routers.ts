import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { fleetOpsProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { fleetDb } from "./db";
import { getSupabaseAuthIdentity, provisionFleetOpsUser } from "./supabase";
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
      return { org: ctx.fleetopsUser.org, vehicles, openWorkOrders, inventoryAlerts, unreadNotifications, monthlyExpense: spend._sum.amount ?? 0 };
    }),
  }),
  components: router({
    list: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid().optional() }).optional()).query(({ ctx, input }) => fleetDb.component.findMany({ where: { vehicle: { orgId: ctx.fleetopsUser.orgId }, ...(input?.vehicleId ? { vehicleId: input.vehicleId } : {}) }, orderBy: { name: "asc" } })),
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), name: z.string().min(2), expectedLifeKm: z.number().positive(), lastServicedOdometer: z.number().nonnegative(), alertThresholdKm: z.number().positive() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC"]); assertWritable(ctx.fleetopsUser.org); const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } }); if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." }); return fleetDb.component.create({ data: input }); }),
    update: fleetOpsProcedure.input(z.object({ id: z.string().uuid(), name: z.string().min(2).optional(), expectedLifeKm: z.number().positive().optional(), lastServicedOdometer: z.number().nonnegative().optional(), alertThresholdKm: z.number().positive().optional() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC"]); assertWritable(ctx.fleetopsUser.org); const component = await fleetDb.component.findFirst({ where: { id: input.id, vehicle: { orgId: ctx.fleetopsUser.orgId } } }); if (!component) throw new TRPCError({ code: "NOT_FOUND", message: "Component not found." }); const { id, ...data } = input; return fleetDb.component.update({ where: { id }, data }); }),
    remove: fleetOpsProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const component = await fleetDb.component.findFirst({ where: { id: input.id, vehicle: { orgId: ctx.fleetopsUser.orgId } } }); if (!component) throw new TRPCError({ code: "NOT_FOUND", message: "Component not found." }); return fleetDb.component.delete({ where: { id: input.id } }); }),
  }),
  vehicles: router({
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.vehicle.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { components: true }, orderBy: { updatedAt: "desc" } })),
    create: fleetOpsProcedure.input(z.object({ vin: z.string().min(5), licensePlate: z.string().min(3), make: z.string().min(2), model: z.string().min(2), year: z.number().int().min(1980).max(2100), currentOdometer: z.number().min(0).default(0) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertVehicleCapacity(ctx.fleetopsUser.orgId, ctx.fleetopsUser.org.maxVehicles);
      const count = await fleetDb.vehicle.count({ where: { orgId: ctx.fleetopsUser.orgId } });
      if (ctx.fleetopsUser.org.subscriptionTier === "TRIAL_FREE" && count >= ctx.fleetopsUser.org.maxVehicles) throw new TRPCError({ code: "FORBIDDEN", message: "Trial limit reached: maximum 3 vehicles." });
      return fleetDb.vehicle.create({ data: { ...input, orgId: ctx.fleetopsUser.orgId } });
    }),
    updateOdometer: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), reading: z.number().min(0), source: z.enum(["MANUAL_DRIVER", "GPS_API", "MECHANIC"]) })).mutation(async ({ ctx, input }) => {
      assertWritable(ctx.fleetopsUser.org);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." });
      const current = Number(vehicle.currentOdometer);
      const isFlagged = input.reading < current || input.reading - current > 1000;
      const result = await fleetDb.$transaction([
        fleetDb.vehicle.update({ where: { id: vehicle.id }, data: { currentOdometer: input.reading } }),
        fleetDb.odometerLog.create({ data: { vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, reading: input.reading, source: input.source, isFlagged } }),
      ]);
      await evaluateVehicleMaintenance(vehicle.id, ctx.fleetopsUser.orgId);
      return result;
    }),
  }),
  workOrders: router({
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.workOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true, assignedMechanic: true, partsUsed: { include: { part: true } } }, orderBy: { createdAt: "desc" } })),
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), title: z.string().min(3), description: z.string().optional(), priority: z.nativeEnum(Priority).default(Priority.MEDIUM), assignedMechanicId: z.string().uuid().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found." });
      return fleetDb.workOrder.create({ data: { ...input, orgId: ctx.fleetopsUser.orgId } });
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
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.inventoryPart.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { name: "asc" } })),
    create: fleetOpsProcedure.input(z.object({ sku: z.string().min(1), name: z.string().min(2), binLocation: z.string().optional(), quantityOnHand: z.number().int().nonnegative(), minReorderLevel: z.number().int().nonnegative().default(5), unitCost: z.number().nonnegative() })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); assertWritable(ctx.fleetopsUser.org); const part = await fleetDb.inventoryPart.create({ data: { ...input, orgId: ctx.fleetopsUser.orgId } }); await evaluateLowInventory(ctx.fleetopsUser.orgId); return part; }),
  }),
  automation: router({
    evaluate: fleetOpsProcedure.mutation(({ ctx }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]); return evaluateAllOrganizations(); }),
  }),
  team: router({
    members: fleetOpsProcedure.query(({ ctx }) => fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, select: { id: true, email: true, fullName: true, role: true, createdAt: true }, orderBy: { fullName: "asc" } })),
    invitations: fleetOpsProcedure.query(({ ctx }) => fleetDb.invitation.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { createdAt: "desc" } })),
    invite: fleetOpsProcedure.input(z.object({ email: z.string().email(), role: z.enum(["FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER", "INVENTORY_MANAGER", "ACCOUNTANT"]) })).mutation(async ({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); await assertUserCapacity(ctx.fleetopsUser.orgId, ctx.fleetopsUser.org.maxUsers); return fleetDb.invitation.create({ data: { orgId: ctx.fleetopsUser.orgId, email: input.email, role: input.role, tokenHash: crypto.randomUUID(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }); }),
  }),
  purchaseOrders: router({
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.purchaseOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vendor: true }, orderBy: { createdAt: "desc" } })),
    create: fleetOpsProcedure.input(z.object({ vendorId: z.string().uuid(), totalCost: z.number().nonnegative() })).mutation(({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]); assertWritable(ctx.fleetopsUser.org); return fleetDb.purchaseOrder.create({ data: { ...input, totalCost: input.totalCost, orgId: ctx.fleetopsUser.orgId } }); }),
  }),
  documents: router({
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } })),
    create: fleetOpsProcedure.input(z.object({ title: z.string().min(2), docType: z.string().min(2), fileUrl: z.string().url(), fileKey: z.string().optional(), expiryDate: z.coerce.date(), vehicleId: z.string().uuid().optional() })).mutation(({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]); assertWritable(ctx.fleetopsUser.org); return fleetDb.document.create({ data: { ...input, orgId: ctx.fleetopsUser.orgId } }); }),
  }),
  financials: router({
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { transactionDate: "desc" } })),
    create: fleetOpsProcedure.input(z.object({ vehicleId: z.string().uuid(), type: z.enum(["REVENUE", "EXPENSE"]), category: z.string().min(2), amount: z.number().nonnegative(), transactionDate: z.coerce.date() })).mutation(({ ctx, input }) => { requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]); assertWritable(ctx.fleetopsUser.org); return fleetDb.financialRecord.create({ data: { ...input, amount: input.amount, orgId: ctx.fleetopsUser.orgId } }); }),
  }),
  billing: router({
    status: fleetOpsProcedure.query(({ ctx }) => ({ tier: ctx.fleetopsUser.org.subscriptionTier, trialEndsAt: ctx.fleetopsUser.org.trialEndsAt, daysRemaining: Math.max(0, Math.ceil((ctx.fleetopsUser.org.trialEndsAt.getTime() - Date.now()) / 86_400_000)), maxVehicles: ctx.fleetopsUser.org.maxVehicles, maxUsers: ctx.fleetopsUser.org.maxUsers, writeLocked: ctx.fleetopsUser.org.subscriptionTier === "TRIAL_FREE" && ctx.fleetopsUser.org.trialEndsAt.getTime() < Date.now() })),
  }),
  activity: router({
    recent: fleetOpsProcedure.query(async ({ ctx }) => {
      const [orders, alerts, odometers] = await Promise.all([
        fleetDb.workOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 10 }),
        fleetDb.notification.findMany({ where: { orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 10 }),
        fleetDb.odometerLog.findMany({ where: { vehicle: { orgId: ctx.fleetopsUser.orgId } }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 10 }),
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
