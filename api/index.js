// serverless-entry.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { createHash } from "node:crypto";
import { z as z2 } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var requireFleetOpsUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.fleetopsUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Supabase authentication required" });
  }
  return next({ ctx: { ...ctx, fleetopsUser: ctx.fleetopsUser } });
});
var fleetOpsProcedure = t.procedure.use(requireFleetOpsUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
import { randomUUID } from "node:crypto";
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError as TRPCError2 } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
import { sql as sql2 } from "drizzle-orm";

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// drizzle/fleetops-schema.ts
import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
var audit = { createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull() };
var organizations = pgTable("organizations", { id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), subscriptionTier: text("subscriptionTier").notNull(), trialEndsAt: timestamp("trialEndsAt", { withTimezone: true }).notNull(), maxVehicles: integer("maxVehicles").notNull(), maxUsers: integer("maxUsers").notNull(), currency: text("currency").notNull(), ...audit });
var organizationSettings = pgTable("organization_settings", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), timezone: text("timezone").notNull().default("Asia/Kolkata"), odometerMaxDailyKm: integer("odometerMaxDailyKm").notNull().default(1e3), safetyContactName: text("safetyContactName"), safetyContactPhone: text("safetyContactPhone"), ...audit });
var users = pgTable("users", { id: uuid("id").defaultRandom().primaryKey(), authUserId: uuid("authUserId").notNull(), orgId: uuid("orgId").notNull(), email: text("email").notNull(), fullName: text("fullName").notNull(), role: text("role").notNull(), ...audit });
var invitations = pgTable("invitations", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), email: text("email").notNull(), role: text("role").notNull(), tokenHash: text("tokenHash").notNull(), expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(), acceptedAt: timestamp("acceptedAt", { withTimezone: true }), createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull() });
var vehicles = pgTable("vehicles", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vin: text("vin").notNull(), licensePlate: text("licensePlate").notNull(), make: text("make").notNull(), model: text("model").notNull(), year: integer("year").notNull(), currentOdometer: numeric("currentOdometer").notNull(), status: text("status").notNull(), ...audit });
var vehicleAssignments = pgTable("vehicle_assignments", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vehicleId: uuid("vehicleId").notNull(), driverId: uuid("driverId").notNull(), active: boolean("active").notNull().default(true), ...audit });
var components = pgTable("components", { id: uuid("id").defaultRandom().primaryKey(), vehicleId: uuid("vehicleId").notNull(), name: text("name").notNull(), expectedLifeKm: numeric("expectedLifeKm").notNull(), lastServicedOdometer: numeric("lastServicedOdometer").notNull(), alertThresholdKm: numeric("alertThresholdKm").notNull() });
var odometerLogs = pgTable("odometer_logs", { id: uuid("id").defaultRandom().primaryKey(), vehicleId: uuid("vehicleId").notNull(), driverId: uuid("driverId"), reading: numeric("reading").notNull(), source: text("source").notNull(), isFlagged: boolean("isFlagged").notNull(), ...audit });
var workOrders = pgTable("work_orders", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vehicleId: uuid("vehicleId").notNull(), assignedMechanicId: uuid("assignedMechanicId"), title: text("title").notNull(), description: text("description"), priority: text("priority").notNull(), status: text("status").notNull(), scheduledFor: timestamp("scheduledFor", { withTimezone: true }), archivedAt: timestamp("archivedAt", { withTimezone: true }), startedAt: timestamp("startedAt", { withTimezone: true }), completedAt: timestamp("completedAt", { withTimezone: true }), laborHours: numeric("laborHours"), repairNotes: text("repairNotes"), ...audit });
var workOrderEvidence = pgTable("work_order_evidence", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), workOrderId: uuid("workOrderId").notNull(), uploadedById: uuid("uploadedById").notNull(), fileUrl: text("fileUrl").notNull(), fileKey: text("fileKey"), caption: text("caption"), createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull() });
var inventoryParts = pgTable("inventory_parts", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), sku: text("sku").notNull(), name: text("name").notNull(), binLocation: text("binLocation"), quantityOnHand: integer("quantityOnHand").notNull(), minReorderLevel: integer("minReorderLevel").notNull(), unitCost: numeric("unitCost").notNull() });
var workOrderParts = pgTable("work_order_parts", { id: uuid("id").defaultRandom().primaryKey(), workOrderId: uuid("workOrderId").notNull(), partId: uuid("partId").notNull(), qtyUsed: integer("qtyUsed").notNull(), unitPrice: numeric("unitPrice").notNull() });
var vendors = pgTable("vendors", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), name: text("name").notNull(), contactPerson: text("contactPerson"), phone: text("phone").notNull(), email: text("email"), ...audit });
var purchaseOrders = pgTable("purchase_orders", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vendorId: uuid("vendorId").notNull(), status: text("status").notNull(), totalCost: numeric("totalCost").notNull(), supplierInvoiceNumber: text("supplierInvoiceNumber"), receivedAt: timestamp("receivedAt", { withTimezone: true }), closedAt: timestamp("closedAt", { withTimezone: true }), ...audit });
var purchaseOrderReceipts = pgTable("purchase_order_receipts", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), purchaseOrderId: uuid("purchaseOrderId").notNull(), partId: uuid("partId").notNull(), quantity: integer("quantity").notNull(), unitCost: numeric("unitCost").notNull(), invoiceNumber: text("invoiceNumber"), location: text("location"), receivedById: uuid("receivedById").notNull(), receivedAt: timestamp("receivedAt", { withTimezone: true }).defaultNow().notNull() });
var financialRecords = pgTable("financial_records", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vehicleId: uuid("vehicleId").notNull(), type: text("type").notNull(), category: text("category").notNull(), amount: numeric("amount").notNull(), transactionDate: timestamp("transactionDate", { withTimezone: true }).notNull(), taxAmount: numeric("taxAmount").notNull().default("0"), gstin: text("gstin"), taxCategory: text("taxCategory"), invoiceNumber: text("invoiceNumber"), vendor: text("vendor"), paymentMethod: text("paymentMethod"), costCenterType: text("costCenterType"), costCenterId: uuid("costCenterId"), tdsAmount: numeric("tdsAmount").notNull().default("0"), reconciledAt: timestamp("reconciledAt", { withTimezone: true }), reconciliationRef: text("reconciliationRef"), approvalStatus: text("approvalStatus").notNull().default("APPROVED"), approvedById: uuid("approvedById"), approvalReason: text("approvalReason"), reversalOfId: uuid("reversalOfId"), createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull() });
var documents = pgTable("documents", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vehicleId: uuid("vehicleId"), title: text("title").notNull(), docType: text("docType").notNull(), fileUrl: text("fileUrl").notNull(), fileKey: text("fileKey"), fileChecksum: text("fileChecksum"), fileSizeBytes: integer("fileSizeBytes"), retentionUntil: timestamp("retentionUntil", { withTimezone: true }), expiryDate: timestamp("expiryDate", { withTimezone: true }).notNull(), ...audit });
var notifications = pgTable("notifications", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), recipientId: uuid("recipientId").notNull(), title: text("title").notNull(), message: text("message").notNull(), type: text("type").notNull(), severity: text("severity").notNull().default("INFO"), sourceType: text("sourceType").notNull().default("SYSTEM"), dedupeKey: text("dedupeKey"), referenceId: uuid("referenceId"), isRead: boolean("isRead").notNull(), acknowledgedAt: timestamp("acknowledgedAt", { withTimezone: true }), escalationLevel: integer("escalationLevel").notNull().default(0), resolvedAt: timestamp("resolvedAt", { withTimezone: true }), ...audit });
var vehicleIssues = pgTable("vehicle_issues", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vehicleId: uuid("vehicleId").notNull(), driverId: uuid("driverId").notNull(), title: text("title").notNull(), description: text("description").notNull(), priority: text("priority").notNull(), status: text("status").notNull(), photoUrl: text("photoUrl"), photoKey: text("photoKey"), ...audit });
var auditEvents = pgTable("audit_events", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), actorId: uuid("actorId"), actorRole: text("actorRole"), action: text("action").notNull(), entityType: text("entityType").notNull(), entityId: uuid("entityId"), summary: text("summary").notNull(), metadata: text("metadata"), createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull() });
var inventoryMovements = pgTable("inventory_movements", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), partId: uuid("partId").notNull(), workOrderId: uuid("workOrderId"), actorId: uuid("actorId"), movementType: text("movementType").notNull(), quantity: integer("quantity").notNull(), unitCost: numeric("unitCost").notNull(), reason: text("reason").notNull(), createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull() });
var dvirInspections = pgTable("dvir_inspections", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vehicleId: uuid("vehicleId").notNull(), driverId: uuid("driverId").notNull(), inspectionType: text("inspectionType").notNull(), status: text("status").notNull(), notes: text("notes"), photoUrl: text("photoUrl"), photoKey: text("photoKey"), ...audit });
var fuelLogs = pgTable("fuel_logs", { id: uuid("id").defaultRandom().primaryKey(), orgId: uuid("orgId").notNull(), vehicleId: uuid("vehicleId").notNull(), driverId: uuid("driverId").notNull(), liters: numeric("liters").notNull(), amount: numeric("amount").notNull(), odometer: numeric("odometer").notNull(), station: text("station"), receiptUrl: text("receiptUrl"), ...audit });

// server/db.ts
var globalForDb = globalThis;
var pool = globalForDb.fleetopsPool ?? new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL, max: 5, ssl: { rejectUnauthorized: false } });
if (process.env.NODE_ENV !== "production") globalForDb.fleetopsPool = pool;
var db = globalForDb.fleetopsDb ?? drizzle(pool);
if (process.env.NODE_ENV !== "production") globalForDb.fleetopsDb = db;
var tables = {
  organization: "organizations",
  organizationSetting: "organization_settings",
  user: "users",
  invitation: "invitations",
  vehicle: "vehicles",
  vehicleAssignment: "vehicle_assignments",
  component: "components",
  odometerLog: "odometer_logs",
  workOrder: "work_orders",
  inventoryPart: "inventory_parts",
  workOrderPart: "work_order_parts",
  vendor: "vendors",
  purchaseOrder: "purchase_orders",
  purchaseOrderReceipt: "purchase_order_receipts",
  financialRecord: "financial_records",
  document: "documents",
  notification: "notifications",
  workOrderEvidence: "work_order_evidence",
  vehicleIssue: "vehicle_issues",
  dvirInspection: "dvir_inspections",
  fuelLog: "fuel_logs",
  auditEvent: "audit_events",
  inventoryMovement: "inventory_movements"
};
function quote(name) {
  return `"${name.replace(/[^a-zA-Z0-9_]/g, "")}"`;
}
function normalize(value) {
  return value instanceof Date ? value.toISOString() : value;
}
function condition(field, value) {
  const c = quote(field);
  if (value === null) return `${c} IS NULL`;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value;
    if (o.in) return `${c} IN (${o.in.map((v) => `'${String(v).replaceAll("'", "''")}'`).join(",")})`;
    if (o.gt !== void 0) return `${c} > '${String(normalize(o.gt)).replaceAll("'", "''")}'`;
    if (o.gte !== void 0) return `${c} >= '${String(normalize(o.gte)).replaceAll("'", "''")}'`;
    if (o.lt !== void 0) return `${c} < '${String(normalize(o.lt)).replaceAll("'", "''")}'`;
    if (o.lte !== void 0) return `${c} <= '${String(normalize(o.lte)).replaceAll("'", "''")}'`;
  }
  if (typeof value === "boolean") return `${c} = ${value}`;
  if (typeof value === "number") return `${c} = ${value}`;
  return `${c} = '${String(normalize(value)).replaceAll("'", "''")}'`;
}
function whereClause(where = {}) {
  const parts = [];
  for (const [field, value] of Object.entries(where)) {
    if (field === "vehicle" && value?.orgId) parts.push(`"vehicleId" IN (SELECT "id" FROM "vehicles" WHERE "orgId" = '${String(value.orgId).replaceAll("'", "''")}')`);
    else if (field === "org" && value?.id) parts.push(`"orgId" = '${String(value.id).replaceAll("'", "''")}'`);
    else if (field !== "vehicle" && field !== "org") parts.push(condition(field, value));
  }
  return parts.length ? ` WHERE ${parts.join(" AND ")}` : "";
}
function dataColumns(data) {
  return Object.keys(data).filter((key) => !["vehicle", "org", "components", "workOrders", "assignedMechanic", "partsUsed"].includes(key));
}
var auditedTables = /* @__PURE__ */ new Set(["organizations", "users", "vehicles", "vehicle_assignments", "odometer_logs", "vendors", "purchase_orders", "notifications", "dvir_inspections", "fuel_logs"]);
function valueSql(value) {
  if (value === null || value === void 0) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  return `'${String(normalize(value)).replaceAll("'", "''")}'`;
}
function model(modelName) {
  const table = tables[modelName];
  return {
    async findMany(options = {}) {
      const select = options.select ? Object.keys(options.select).map(quote).join(", ") : "*";
      const order = options.orderBy ? Object.entries(options.orderBy).map(([k, v]) => `${quote(k)} ${String(v).toUpperCase()}`).join(", ") : void 0;
      const limit = options.take ? ` LIMIT ${Number(options.take)}` : "";
      const result = await db.execute(sql.raw(`SELECT ${select} FROM ${quote(table)}${whereClause(options.where)}${order ? ` ORDER BY ${order}` : ""}${limit}`));
      return result.rows;
    },
    async findFirst(options = {}) {
      const rows = await this.findMany({ ...options, take: 1 });
      return rows[0];
    },
    async findUnique(options = {}) {
      return this.findFirst(options);
    },
    async count(options = {}) {
      const result = await db.execute(sql.raw(`SELECT COUNT(*)::int AS count FROM ${quote(table)}${whereClause(options.where)}`));
      return Number(result.rows[0]?.count ?? 0);
    },
    async create(options) {
      const data = { ...options.data ?? {} };
      const keys = dataColumns(data);
      const result = await db.execute(sql.raw(`INSERT INTO ${quote(table)} (${keys.map(quote).join(", ")}) VALUES (${keys.map((k) => valueSql(data[k])).join(", ")}) RETURNING *`));
      return result.rows[0];
    },
    async createMany(options) {
      const rows = options.data ?? [];
      for (const row of rows) await this.create({ data: row });
      return { count: rows.length };
    },
    async update(options) {
      const data = options.data ?? {};
      const set = dataColumns(data).map((k) => {
        const v = data[k];
        return v && typeof v === "object" && v.decrement !== void 0 ? `${quote(k)} = ${quote(k)} - ${Number(v.decrement)}` : `${quote(k)} = ${valueSql(v)}`;
      }).join(", ");
      const auditSuffix = auditedTables.has(table) ? ', "updatedAt" = NOW()' : "";
      const result = await db.execute(sql.raw(`UPDATE ${quote(table)} SET ${set}${auditSuffix} WHERE "id" = '${String(options.where.id).replaceAll("'", "''")}' RETURNING *`));
      return result.rows[0];
    },
    async updateMany(options) {
      const data = options.data ?? {};
      const set = dataColumns(data).map((k) => `${quote(k)} = ${valueSql(data[k])}`).join(", ");
      const result = await db.execute(sql.raw(`UPDATE ${quote(table)} SET ${set}${whereClause(options.where)}`));
      return { count: result.rowCount ?? 0 };
    },
    async delete(options) {
      const result = await db.execute(sql.raw(`DELETE FROM ${quote(table)} WHERE "id" = '${String(options.where.id).replaceAll("'", "''")}' RETURNING *`));
      return result.rows[0];
    },
    async aggregate(options = {}) {
      const sumField = options._sum ? Object.keys(options._sum)[0] : "amount";
      const result = await db.execute(sql.raw(`SELECT COALESCE(SUM(${quote(sumField)}), 0) AS sum FROM ${quote(table)}${whereClause(options.where)}`));
      return { _sum: { [sumField]: result.rows[0]?.sum ?? 0 } };
    },
    async upsert(options) {
      const existing = await this.findFirst({ where: options.where });
      if (existing) return this.update({ where: { id: existing.id }, data: options.update });
      return this.create({ data: options.create });
    }
  };
}
var fleetDb = new Proxy({}, { get: (_target, property) => property === "$transaction" ? transaction : model(String(property)) });
async function transaction(fn) {
  if (Array.isArray(fn)) return Promise.all(fn);
  return fn(fleetDb);
}
async function getUserByOpenId(openId) {
  return fleetDb.user.findFirst({ where: { authUserId: openId } });
}
async function upsertUser(user) {
  const existing = await getUserByOpenId(user.openId);
  if (existing) return fleetDb.user.update({ where: { id: existing.id }, data: { email: user.email ?? existing.email, fullName: user.name ?? existing.fullName, role: user.role ?? existing.role } });
  return void 0;
}

// server/_core/systemRouter.ts
var RELEASE = "fleetops-observability-20260820";
var systemRouter = router({
  health: publicProcedure.input(z.object({ timestamp: z.number().min(0, "timestamp cannot be negative"), correlationId: z.string().trim().min(8).max(128).optional() })).query(async ({ input }) => {
    const startedAt = Date.now();
    const correlationId = input.correlationId ?? randomUUID();
    try {
      await db.execute(sql2`select 1`);
      return { ok: true, release: RELEASE, database: "ok", checkedAt: (/* @__PURE__ */ new Date()).toISOString(), latencyMs: Date.now() - startedAt, clientTimestamp: input.timestamp, correlationId };
    } catch {
      return { ok: false, release: RELEASE, database: "degraded", checkedAt: (/* @__PURE__ */ new Date()).toISOString(), latencyMs: Date.now() - startedAt, clientTimestamp: input.timestamp, correlationId };
    }
  }),
  release: publicProcedure.query(() => ({ release: RELEASE, service: "FleetOps API", environment: process.env.NODE_ENV === "production" ? "production" : "development" })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL;
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.warn("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
}
var supabaseAdmin = createClient(
  supabaseUrl ?? "http://localhost:54321",
  serviceRoleKey ?? "development-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);
function getBearerToken(req) {
  const header = req?.headers?.authorization ?? (typeof req?.get === "function" ? req.get("authorization") : void 0);
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) return header.slice("bearer ".length).trim();
  const cookieToken = req?.cookies?.["sb-access-token"] ?? req?.cookies?.["supabase-auth-token"];
  return typeof cookieToken === "string" ? cookieToken : null;
}
async function getSupabaseAuthIdentity(req) {
  const token = getBearerToken(req);
  if (!token) {
    console.warn("[Supabase] No bearer token on protected request", { path: req?.path ?? req?.url ?? "unknown" });
    return null;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    console.warn("[Supabase] Bearer token rejected", { path: req?.path ?? req?.url ?? "unknown", reason: error?.message ?? "user_not_found" });
    return null;
  }
  return data.user;
}
async function getFleetOpsUserFromRequest(req) {
  const authUser = await getSupabaseAuthIdentity(req);
  if (!authUser) return null;
  const user = await fleetDb.user.findUnique({ where: { authUserId: authUser.id } });
  if (!user) return null;
  const org = await fleetDb.organization.findFirst({ where: { id: user.orgId } });
  if (!org) return null;
  const normalizedOrg = {
    ...org,
    trialEndsAt: org.trialEndsAt instanceof Date ? org.trialEndsAt : new Date(String(org.trialEndsAt)),
    updatedAt: org.updatedAt instanceof Date ? org.updatedAt : new Date(String(org.updatedAt))
  };
  return { ...user, org: normalizedOrg, name: user.fullName };
}
async function provisionFleetOpsUser(input) {
  const existing = await fleetDb.user.findUnique({ where: { authUserId: input.authUserId }, include: { org: true } });
  if (existing) return existing;
  const role = input.role ?? "SUPERADMIN";
  return fleetDb.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: input.orgName ?? `${input.fullName}'s Fleet`,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3),
        maxVehicles: 3,
        maxUsers: 5
      }
    });
    return tx.user.create({
      data: {
        authUserId: input.authUserId,
        orgId: org.id,
        email: input.email,
        fullName: input.fullName,
        role
      },
      include: { org: true }
    });
  });
}

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}
async function storageGetSignedUrl(relKey) {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = await resp.json();
  return url;
}

// server/role-policy.ts
function roleCanAct(role, allowed) {
  return allowed.includes(role);
}

// server/automation.ts
async function notifyRoles(orgId, roles, title, message, type, referenceId) {
  const recipients = await fleetDb.user.findMany({ where: { orgId, role: { in: roles } } });
  if (recipients.length) await fleetDb.notification.createMany({ data: recipients.map((recipient) => ({ id: crypto.randomUUID(), orgId, recipientId: recipient.id, title, message, type, referenceId, isRead: false, createdAt: /* @__PURE__ */ new Date() })) });
  return recipients.length;
}
async function evaluateVehicleMaintenance(vehicleId, orgId) {
  const vehicle = await fleetDb.vehicle.findFirst({ where: { id: vehicleId, orgId }, include: { components: true } });
  if (!vehicle) return { createdWorkOrders: 0 };
  let createdWorkOrders = 0;
  const components2 = Array.isArray(vehicle.components) ? vehicle.components : [];
  for (const component of components2) {
    const consumed = Number(vehicle.currentOdometer) - Number(component.lastServicedOdometer);
    if (consumed < Number(component.alertThresholdKm)) continue;
    const existing = await fleetDb.workOrder.findFirst({ where: { orgId, vehicleId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK"] }, title: { contains: component.name } } });
    if (existing) continue;
    const workOrder = await fleetDb.workOrder.create({ data: { orgId, vehicleId, title: `${component.name} service threshold reached`, description: `${component.name} has consumed ${Math.round(consumed / Number(component.expectedLifeKm) * 100)}% of expected life.`, priority: consumed >= Number(component.expectedLifeKm) ? "CRITICAL" : "HIGH" } });
    await notifyRoles(orgId, ["SUPERADMIN", "FLEET_MANAGER"], "Predictive maintenance alert", `${vehicle.licensePlate}: ${component.name} crossed its service threshold.`, "MAINTENANCE_THRESHOLD", workOrder.id);
    createdWorkOrders += 1;
  }
  return { createdWorkOrders };
}
async function evaluateLowInventory(orgId) {
  const allParts = await fleetDb.inventoryPart.findMany({ where: { orgId } });
  const lowStock = allParts.filter((part) => Number(part.quantityOnHand) <= Number(part.minReorderLevel));
  if (!lowStock.length) return { lowStock: 0, draftPurchaseOrders: 0 };
  let draftPurchaseOrders = 0;
  let vendor = await fleetDb.vendor.findFirst({ where: { orgId, name: "FleetOps auto-reorder queue" } });
  if (!vendor) vendor = await fleetDb.vendor.create({ data: { id: crypto.randomUUID(), orgId, name: "FleetOps auto-reorder queue", phone: "SYSTEM", createdAt: /* @__PURE__ */ new Date() } });
  for (const part of lowStock) {
    const alreadyNotified = await fleetDb.notification.findFirst({ where: { orgId, referenceId: part.id, type: "INVENTORY_LOW", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1e3) } } });
    if (alreadyNotified) continue;
    const suggestedQty = Math.max(Number(part.minReorderLevel) * 2 - Number(part.quantityOnHand), 1);
    const purchaseOrder = await fleetDb.purchaseOrder.create({ data: { id: crypto.randomUUID(), orgId, vendorId: vendor.id, status: "DRAFT", totalCost: suggestedQty * Number(part.unitCost), createdAt: /* @__PURE__ */ new Date() } });
    await notifyRoles(orgId, ["SUPERADMIN", "INVENTORY_MANAGER"], "Inventory below reorder level", `${part.name} (${part.sku}) has ${part.quantityOnHand} units remaining. Draft PO created for ${suggestedQty} units.`, "INVENTORY_LOW", part.id);
    await notifyRoles(orgId, ["SUPERADMIN", "INVENTORY_MANAGER"], "Draft purchase order created", `Draft PO ${purchaseOrder.id.slice(0, 8).toUpperCase()} was created for ${part.name}.`, "PURCHASE_ORDER_DRAFT", purchaseOrder.id);
    draftPurchaseOrders += 1;
  }
  return { lowStock: lowStock.length, draftPurchaseOrders };
}
async function evaluateDocumentExpiry(orgId) {
  const documents2 = await fleetDb.document.findMany({ where: { orgId } });
  const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
  const expiring = documents2.filter((document) => new Date(document.expiryDate).getTime() <= horizon.getTime());
  for (const document of expiring) {
    const alreadyNotified = await fleetDb.notification.findFirst({ where: { orgId, referenceId: document.id, type: "DOCUMENT_EXPIRY", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1e3) } } });
    if (alreadyNotified) continue;
    await notifyRoles(orgId, ["SUPERADMIN", "FLEET_MANAGER"], "Compliance document expiring", `${document.title} expires on ${new Date(document.expiryDate).toLocaleDateString("en-IN")}.`, "DOCUMENT_EXPIRY", document.id);
  }
  return { expiring: expiring.length };
}
async function evaluateAllOrganizations() {
  const organizations2 = await fleetDb.organization.findMany({ select: { id: true } });
  let maintenanceOrders = 0;
  let lowStockParts = 0;
  let draftPurchaseOrders = 0;
  let expiringDocuments = 0;
  for (const org of organizations2) {
    const vehicles2 = await fleetDb.vehicle.findMany({ where: { orgId: org.id }, select: { id: true } });
    for (const vehicle of vehicles2) maintenanceOrders += (await evaluateVehicleMaintenance(vehicle.id, org.id)).createdWorkOrders;
    const inventory = await evaluateLowInventory(org.id);
    lowStockParts += inventory.lowStock;
    draftPurchaseOrders += inventory.draftPurchaseOrders;
    expiringDocuments += (await evaluateDocumentExpiry(org.id)).expiring;
  }
  return { organizations: organizations2.length, maintenanceOrders, lowStockParts, draftPurchaseOrders, expiringDocuments };
}

// server/routers.ts
var Priority = { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", CRITICAL: "CRITICAL" };
var WorkOrderStatus = { OPEN: "OPEN", IN_PROGRESS: "IN_PROGRESS", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED" };
var CITY_BUS_MAINTENANCE_TEMPLATE = [
  { name: "Engine Oil", expectedLifeKm: 1e4, alertThresholdKm: 8e3 },
  { name: "Brakes", expectedLifeKm: 5e4, alertThresholdKm: 4e4 },
  { name: "Tires", expectedLifeKm: 6e4, alertThresholdKm: 5e4 }
];
function assertWritable(org) {
  if (org.subscriptionTier === "TRIAL_FREE" && org.trialEndsAt.getTime() < Date.now()) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Your trial has expired. Upgrade your FleetOps plan to continue writing data." });
  }
}
async function assertVehicleCapacity(orgId, maxVehicles) {
  const count = await fleetDb.vehicle.count({ where: { orgId } });
  if (count >= maxVehicles) throw new TRPCError3({ code: "FORBIDDEN", message: `Vehicle limit reached (${maxVehicles}). Upgrade your FleetOps plan to add more vehicles.` });
}
async function assertUserCapacity(orgId, maxUsers) {
  const count = await fleetDb.user.count({ where: { orgId } });
  if (count >= maxUsers) throw new TRPCError3({ code: "FORBIDDEN", message: `User limit reached (${maxUsers}). Upgrade your FleetOps plan to invite more team members.` });
}
var ALLOWED_DOCUMENT_TYPES = /* @__PURE__ */ new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
var MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;
function decodeDocumentUpload(fileData, contentType = "application/octet-stream") {
  if (!ALLOWED_DOCUMENT_TYPES.has(contentType)) throw new TRPCError3({ code: "BAD_REQUEST", message: "Only PDF, JPEG, PNG, and WebP documents are allowed." });
  const raw = fileData.replace(/^data:[^;]+;base64,/, "");
  let bytes;
  try {
    bytes = Buffer.from(raw, "base64");
  } catch {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "The uploaded document is not valid base64 data." });
  }
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new TRPCError3({ code: "BAD_REQUEST", message: "Document files must be between 1 byte and 3 MB." });
  const checksum = createHash("sha256").update(bytes).digest("hex");
  return { bytes, checksum, sizeBytes: bytes.length };
}
function retentionAfterExpiry(expiryDate) {
  return new Date(Math.max(expiryDate.getTime(), Date.now()) + 7 * 365 * 24 * 60 * 60 * 1e3);
}
function requireRole(role, allowed) {
  if (!roleCanAct(role, allowed)) throw new TRPCError3({ code: "FORBIDDEN", message: "Your role cannot perform this action." });
}
function csvCell(value) {
  const text2 = value === null || value === void 0 ? "" : String(value);
  return /[",\n]/.test(text2) ? `"${text2.replaceAll('"', '""')}"` : text2;
}
function csvDocument(rows, headers) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}
function parseComplianceCsv(csv) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["CSV is empty."] };
  const headers = lines[0].split(",").map((header) => header.trim());
  const required = ["title", "docType", "expiryDate", "vehicleId"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) return { rows: [], errors: [`Missing required columns: ${missing.join(", ")}`] };
  const rows = lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    const errors = [];
    if (!row.title || row.title.length < 2) errors.push("title is required");
    if (!["INSURANCE", "RC", "FITNESS", "PERMIT", "DRIVER_LICENSE"].includes(row.docType)) errors.push("docType is invalid");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.expiryDate) || Number.isNaN(new Date(row.expiryDate).getTime())) errors.push("expiryDate must be YYYY-MM-DD");
    if (!/^[0-9a-f-]{36}$/i.test(row.vehicleId)) errors.push("vehicleId must be a UUID");
    return { rowNumber: index + 2, row, errors };
  });
  return { rows, errors: rows.flatMap((item) => item.errors.map((error) => `Row ${item.rowNumber}: ${error}`)) };
}
function pdfText(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll("\n", " ");
}
function simplePdf(title, lines) {
  const content = [`BT`, `/F1 16 Tf`, `50 760 Td`, `(${pdfText(title)}) Tj`, `/F1 10 Tf`, ...lines.flatMap((line) => [`0 -18 Td`, `(${pdfText(line)}) Tj`]), `ET`].join("\n");
  const objects = [`<< /Type /Catalog /Pages 2 0 R >>`, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`, `<< /Length ${content.length} >>
stream
${content}
endstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj
${objects[index]}
endobj
`;
  }
  const xref = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}
trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xref}
%%EOF`;
  return Buffer.from(pdf, "utf8").toString("base64");
}
async function recordAudit(ctx, event) {
  if (!fleetDb.auditEvent?.create) return void 0;
  return fleetDb.auditEvent.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, actorId: ctx.fleetopsUser.id, actorRole: ctx.fleetopsUser.role, action: event.action, entityType: event.entityType, entityId: event.entityId, summary: event.summary, metadata: event.metadata ? JSON.stringify(event.metadata) : void 0, createdAt: /* @__PURE__ */ new Date() } });
}
var FLEETOPS_SERVER_RELEASE = "invite-schema-91663e37";
var INVITATION_TIMEOUT_MS = 12e3;
async function withServerTimeout(promise, message, timeoutMs = INVITATION_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new TRPCError3({ code: "TIMEOUT", message })), timeoutMs);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function assignedVehicleIds(ctx) {
  const rows = await fleetDb.vehicleAssignment.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id, active: true } });
  return rows.map((row) => row.vehicleId).filter(Boolean);
}
async function assertDriverVehicle(ctx, vehicleId) {
  if (ctx.fleetopsUser.role !== "DRIVER") return;
  const assigned = await fleetDb.vehicleAssignment.findFirst({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id, vehicleId, active: true } });
  if (!assigned) throw new TRPCError3({ code: "FORBIDDEN", message: "Drivers may only access their currently assigned vehicle." });
}
function validateOdometerReading(current, reading, elapsedDays = 1) {
  if (reading < current) throw new TRPCError3({ code: "BAD_REQUEST", message: "Odometer readings cannot move backwards." });
  if (reading - current > Math.max(1, elapsedDays) * 1e3) throw new TRPCError3({ code: "BAD_REQUEST", message: `Odometer increase exceeds the ${Math.max(1, elapsedDays) * 1e3} km limit for the elapsed period.` });
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.fleetopsUser ?? ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true }))
  }),
  organizationSettings: router({
    get: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      const existing = await fleetDb.organizationSetting.findFirst({ where: { orgId: ctx.fleetopsUser.orgId } });
      return existing ?? { orgId: ctx.fleetopsUser.orgId, timezone: "Asia/Kolkata", odometerMaxDailyKm: 1e3, safetyContactName: null, safetyContactPhone: null };
    }),
    update: fleetOpsProcedure.input(z2.object({ timezone: z2.string().trim().min(3).max(80), odometerMaxDailyKm: z2.number().int().min(100).max(5e3), safetyContactName: z2.string().trim().max(160).optional(), safetyContactPhone: z2.string().trim().max(40).optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      assertWritable(ctx.fleetopsUser.org);
      const existing = await fleetDb.organizationSetting.findFirst({ where: { orgId: ctx.fleetopsUser.orgId } });
      const settings = existing ? await fleetDb.organizationSetting.update({ where: { id: existing.id }, data: input }) : await fleetDb.organizationSetting.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, ...input, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "ORGANIZATION_SETTINGS_UPDATED", entityType: "ORGANIZATION", entityId: ctx.fleetopsUser.orgId, summary: "Organization operating settings updated", metadata: input });
      return settings;
    })
  }),
  maintenanceTemplates: router({
    list: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      return [{ id: "CITY_BUS", name: "City bus preventive maintenance", components: CITY_BUS_MAINTENANCE_TEMPLATE }];
    }),
    applyTemplate: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), templateId: z2.enum(["CITY_BUS"]) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Vehicle not found in this organization." });
      const existing = await fleetDb.component.findMany({ where: { vehicleId: vehicle.id } });
      const names = new Set(existing.map((item) => item.name));
      const added = CITY_BUS_MAINTENANCE_TEMPLATE.filter((template) => !names.has(template.name));
      await Promise.all(added.map((template) => fleetDb.component.create({ data: { id: crypto.randomUUID(), vehicleId: vehicle.id, name: template.name, expectedLifeKm: template.expectedLifeKm, lastServicedOdometer: Number(vehicle.currentOdometer), alertThresholdKm: template.alertThresholdKm } })));
      await recordAudit(ctx, { action: "MAINTENANCE_TEMPLATE_APPLIED", entityType: "VEHICLE", entityId: vehicle.id, summary: `Applied CITY_BUS maintenance template to ${vehicle.licensePlate}`, metadata: { templateId: input.templateId, added: added.map((item) => item.name), skippedExisting: CITY_BUS_MAINTENANCE_TEMPLATE.length - added.length } });
      return { vehicleId: vehicle.id, templateId: input.templateId, added: added.length, skippedExisting: CITY_BUS_MAINTENANCE_TEMPLATE.length - added.length };
    })
  }),
  onboarding: router({
    bootstrap: publicProcedure.input(z2.object({ orgName: z2.string().min(2).optional(), fullName: z2.string().min(2).optional() })).mutation(async ({ ctx, input }) => {
      const authUser = await getSupabaseAuthIdentity(ctx.req);
      if (!authUser?.email) throw new TRPCError3({ code: "UNAUTHORIZED", message: "A valid Supabase access token is required." });
      return provisionFleetOpsUser({ authUserId: authUser.id, email: authUser.email, fullName: input.fullName ?? String(authUser.user_metadata?.fullName ?? authUser.email.split("@")[0]), orgName: input.orgName ?? String(authUser.user_metadata?.orgName ?? "Avani Transit") });
    }),
    complete: fleetOpsProcedure.input(z2.object({ orgName: z2.string().min(2), fullName: z2.string().min(2) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      const updated = await fleetDb.$transaction(async (tx) => {
        const user = await tx.user.update({ where: { id: ctx.fleetopsUser.id }, data: { fullName: input.fullName } });
        const org = await tx.organization.update({ where: { id: ctx.fleetopsUser.orgId }, data: { name: input.orgName } });
        return { user, org };
      });
      const authUser = await getSupabaseAuthIdentity(ctx.req);
      if (!authUser) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Your Supabase session expired. Sign in again to finish onboarding." });
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { user_metadata: { ...authUser.user_metadata, fullName: input.fullName, orgName: input.orgName, needsOnboarding: false } });
      if (metadataError) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: `Organization was saved, but onboarding state could not be finalized: ${metadataError.message}` });
      return updated;
    }),
    inviteDetails: publicProcedure.input(z2.object({ token: z2.string().uuid() })).query(async ({ input }) => {
      const invite = await fleetDb.invitation.findFirst({ where: { tokenHash: input.token, acceptedAt: null, expiresAt: { gt: /* @__PURE__ */ new Date() } } });
      if (!invite) throw new TRPCError3({ code: "NOT_FOUND", message: "This invitation is invalid, expired, or already redeemed." });
      const org = await fleetDb.organization.findFirst({ where: { id: invite.orgId } });
      if (!org) throw new TRPCError3({ code: "NOT_FOUND", message: "The invitation organization no longer exists." });
      return { email: invite.email, role: invite.role, organization: { id: org.id, name: org.name }, expiresAt: invite.expiresAt };
    }),
    acceptInvite: publicProcedure.input(z2.object({ token: z2.string().uuid(), fullName: z2.string().min(2).optional() })).mutation(async ({ ctx, input }) => {
      const authUser = await getSupabaseAuthIdentity(ctx.req);
      if (!authUser?.email) throw new TRPCError3({ code: "UNAUTHORIZED", message: "A valid Supabase access token is required." });
      const invite = await fleetDb.invitation.findFirst({ where: { tokenHash: input.token, email: authUser.email, acceptedAt: null, expiresAt: { gt: /* @__PURE__ */ new Date() } } });
      if (!invite) throw new TRPCError3({ code: "NOT_FOUND", message: "Invitation is invalid, expired, or already redeemed." });
      const user = await fleetDb.$transaction(async (tx) => {
        const joined = await tx.user.upsert({ where: { authUserId: authUser.id }, update: { orgId: invite.orgId, role: invite.role, email: authUser.email, fullName: input.fullName ?? String(authUser.user_metadata?.fullName ?? authUser.email.split("@")[0]) }, create: { authUserId: authUser.id, orgId: invite.orgId, role: invite.role, email: authUser.email, fullName: input.fullName ?? String(authUser.user_metadata?.fullName ?? authUser.email.split("@")[0]) } });
        await tx.invitation.update({ where: { id: invite.id }, data: { acceptedAt: /* @__PURE__ */ new Date() } });
        return joined;
      });
      const inviteOrg = await fleetDb.organization.findFirst({ where: { id: invite.orgId } });
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { user_metadata: { ...authUser.user_metadata, fullName: user.fullName, orgId: user.orgId, orgName: inviteOrg?.name, role: user.role, needsOnboarding: false, invitationToken: void 0 } });
      if (metadataError) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: `Organization membership was created, but the session metadata could not be finalized: ${metadataError.message}` });
      return user;
    })
  }),
  dashboard: router({
    summary: fleetOpsProcedure.query(async ({ ctx }) => {
      const orgId = ctx.fleetopsUser.orgId;
      const [vehicles2, openWorkOrders, inventoryAlerts, unreadNotifications, spend] = await Promise.all([
        fleetDb.vehicle.findMany({ where: { orgId }, orderBy: { updatedAt: "desc" }, take: 10 }),
        fleetDb.workOrder.count({ where: { orgId, status: { in: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS] } } }),
        fleetDb.inventoryPart.count({ where: { orgId, quantityOnHand: { lte: 5 } } }),
        fleetDb.notification.count({ where: { orgId, recipientId: ctx.fleetopsUser.id, isRead: false } }),
        fleetDb.financialRecord.aggregate({ where: { orgId, type: "EXPENSE" }, _sum: { amount: true } })
      ]);
      const authUser = await getSupabaseAuthIdentity(ctx.req);
      const defaultOrgName = `${ctx.fleetopsUser.fullName}'s Fleet`;
      const needsOnboarding = authUser?.user_metadata?.needsOnboarding === true || authUser?.user_metadata?.needsOnboarding === "true" || ctx.fleetopsUser.org.name === defaultOrgName;
      return { org: ctx.fleetopsUser.org, role: ctx.fleetopsUser.role, needsOnboarding, vehicles: vehicles2, openWorkOrders, inventoryAlerts, unreadNotifications, monthlyExpense: spend._sum.amount ?? 0 };
    })
  }),
  components: router({
    list: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid().optional() }).optional()).query(({ ctx, input }) => fleetDb.component.findMany({ where: { vehicle: { orgId: ctx.fleetopsUser.orgId }, ...input?.vehicleId ? { vehicleId: input.vehicleId } : {} }, orderBy: { name: "asc" } })),
    create: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), name: z2.string().min(2), expectedLifeKm: z2.number().positive(), lastServicedOdometer: z2.number().nonnegative(), alertThresholdKm: z2.number().positive() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC"]);
      assertWritable(ctx.fleetopsUser.org);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Vehicle not found." });
      return fleetDb.component.create({ data: { id: crypto.randomUUID(), ...input } });
    }),
    update: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid(), name: z2.string().min(2).optional(), expectedLifeKm: z2.number().positive().optional(), lastServicedOdometer: z2.number().nonnegative().optional(), alertThresholdKm: z2.number().positive().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC"]);
      assertWritable(ctx.fleetopsUser.org);
      const component = await fleetDb.component.findFirst({ where: { id: input.id, vehicle: { orgId: ctx.fleetopsUser.orgId } } });
      if (!component) throw new TRPCError3({ code: "NOT_FOUND", message: "Component not found." });
      const { id, ...data } = input;
      return fleetDb.component.update({ where: { id }, data });
    }),
    remove: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const component = await fleetDb.component.findFirst({ where: { id: input.id, vehicle: { orgId: ctx.fleetopsUser.orgId } } });
      if (!component) throw new TRPCError3({ code: "NOT_FOUND", message: "Component not found." });
      return fleetDb.component.delete({ where: { id: input.id } });
    })
  }),
  vehicles: router({
    list: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER"]);
      const where = ctx.fleetopsUser.role === "DRIVER" ? { orgId: ctx.fleetopsUser.orgId, id: { in: await assignedVehicleIds(ctx) } } : { orgId: ctx.fleetopsUser.orgId };
      return fleetDb.vehicle.findMany({ where, include: { components: true }, orderBy: { updatedAt: "desc" } });
    }),
    create: fleetOpsProcedure.input(z2.object({ vin: z2.string().min(5), licensePlate: z2.string().min(3), make: z2.string().min(2), model: z2.string().min(2), year: z2.number().int().min(1980).max(2100), currentOdometer: z2.number().min(0).default(0), maintenanceTemplate: z2.enum(["NONE", "CITY_BUS"]).default("NONE") })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertVehicleCapacity(ctx.fleetopsUser.orgId, ctx.fleetopsUser.org.maxVehicles);
      const count = await fleetDb.vehicle.count({ where: { orgId: ctx.fleetopsUser.orgId } });
      if (ctx.fleetopsUser.org.subscriptionTier === "TRIAL_FREE" && count >= ctx.fleetopsUser.org.maxVehicles) throw new TRPCError3({ code: "FORBIDDEN", message: "Trial limit reached: maximum 3 vehicles." });
      const { maintenanceTemplate, ...vehicleInput } = input;
      const vehicle = await fleetDb.vehicle.create({ data: { id: crypto.randomUUID(), ...vehicleInput, status: "ACTIVE", orgId: ctx.fleetopsUser.orgId, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() } });
      if (maintenanceTemplate === "CITY_BUS") {
        const odometer = Number(input.currentOdometer ?? 0);
        await Promise.all(CITY_BUS_MAINTENANCE_TEMPLATE.map((template) => fleetDb.component.create({ data: { id: crypto.randomUUID(), vehicleId: vehicle.id, name: template.name, expectedLifeKm: template.expectedLifeKm, lastServicedOdometer: odometer, alertThresholdKm: template.alertThresholdKm } })));
      }
      await recordAudit(ctx, { action: "VEHICLE_CREATED", entityType: "VEHICLE", entityId: vehicle.id, summary: `Vehicle ${vehicle.licensePlate} added to the fleet`, metadata: { maintenanceTemplate } });
      return { ...vehicle, maintenanceTemplate };
    }),
    odometerHistory: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["FLEET_MANAGER"]);
      return fleetDb.odometerLog.findMany({ where: { vehicle: { orgId: ctx.fleetopsUser.orgId } }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 100 });
    }),
    health: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid() })).query(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER"]);
      await assertDriverVehicle(ctx, input.vehicleId);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId }, include: { components: true } });
      if (!vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Vehicle not found in your organization scope." });
      const [odometers, workOrders2, documents2] = await Promise.all([fleetDb.odometerLog.findMany({ where: { vehicleId: vehicle.id, vehicle: { orgId: ctx.fleetopsUser.orgId } }, orderBy: { createdAt: "desc" }, take: 12 }), fleetDb.workOrder.findMany({ where: { vehicleId: vehicle.id, orgId: ctx.fleetopsUser.orgId, ...["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { assignedMechanicId: ctx.fleetopsUser.id } : {} }, orderBy: { updatedAt: "desc" }, take: 12 }), fleetDb.document.findMany({ where: { vehicleId: vehicle.id, orgId: ctx.fleetopsUser.orgId }, orderBy: { expiryDate: "asc" }, take: 12 })]);
      const dueComponents = vehicle.components.filter((item) => Number(vehicle.currentOdometer) - Number(item.lastServicedOdometer) >= Number(item.alertThresholdKm));
      const dueDocuments = documents2.filter((item) => new Date(item.expiryDate).getTime() < Date.now() + 30 * 864e5);
      return { vehicle, odometers, workOrders: workOrders2, documents: documents2, health: { componentCount: vehicle.components.length, dueComponents: dueComponents.length, openWorkOrders: workOrders2.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status)).length, dueDocuments: dueDocuments.length, readiness: vehicle.status === "ACTIVE" && dueComponents.length === 0 && dueDocuments.length === 0 ? "READY" : "REVIEW" } };
    }),
    updateOdometer: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), reading: z2.number().min(0), source: z2.enum(["MANUAL_DRIVER", "GPS_API", "MECHANIC"]) })).mutation(async ({ ctx, input }) => {
      assertWritable(ctx.fleetopsUser.org);
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER"]);
      await assertDriverVehicle(ctx, input.vehicleId);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Vehicle not found." });
      const current = Number(vehicle.currentOdometer);
      const previousLog = await fleetDb.odometerLog.findFirst({ where: { vehicleId: vehicle.id }, orderBy: { createdAt: "desc" } });
      const elapsedDays = previousLog?.createdAt ? Math.max(1, Math.ceil((Date.now() - new Date(previousLog.createdAt).getTime()) / 864e5)) : 1;
      validateOdometerReading(previousLog ? Number(previousLog.reading) : current, input.reading, elapsedDays);
      const isFlagged = false;
      const result = await fleetDb.$transaction([
        fleetDb.vehicle.update({ where: { id: vehicle.id }, data: { currentOdometer: input.reading } }),
        fleetDb.odometerLog.create({ data: { id: crypto.randomUUID(), vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, reading: input.reading, source: input.source, isFlagged, createdAt: /* @__PURE__ */ new Date() } })
      ]);
      await evaluateVehicleMaintenance(vehicle.id, ctx.fleetopsUser.orgId);
      return result;
    })
  }),
  planning: router({
    maintenance: fleetOpsProcedure.input(z2.object({ from: z2.coerce.date().optional(), to: z2.coerce.date().optional() }).optional()).query(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      const from = input?.from ?? /* @__PURE__ */ new Date();
      const to = input?.to ?? new Date(from.getTime() + 90 * 864e5);
      if (to < from) throw new TRPCError3({ code: "BAD_REQUEST", message: "The planning end date must be on or after the start date." });
      const [vehicles2, documents2, workOrders2] = await Promise.all([
        fleetDb.vehicle.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { components: true }, orderBy: { licensePlate: "asc" } }),
        fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } }),
        fleetDb.workOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK"] } }, include: { vehicle: true, assignedMechanic: true }, orderBy: { updatedAt: "desc" } })
      ]);
      const items = [
        ...vehicles2.flatMap((vehicle) => (vehicle.components ?? []).filter((component) => Number(vehicle.currentOdometer) - Number(component.lastServicedOdometer) >= Number(component.alertThresholdKm)).map((component) => ({ id: component.id, kind: "COMPONENT_DUE", title: `${component.name} service due`, vehicleId: vehicle.id, vehicleLabel: vehicle.licensePlate, dueDate: /* @__PURE__ */ new Date(), priority: "HIGH", detail: `${Math.max(0, Number(vehicle.currentOdometer) - Number(component.lastServicedOdometer)).toLocaleString("en-IN")} km since last service`, sourceId: component.id }))),
        ...documents2.filter((document) => {
          const due = new Date(document.expiryDate);
          return due >= from && due <= to;
        }).map((document) => ({ id: document.id, kind: "DOCUMENT_EXPIRY", title: `${document.title} expires`, vehicleId: document.vehicleId ?? null, vehicleLabel: document.vehicle?.licensePlate ?? "Organization document", dueDate: new Date(document.expiryDate), priority: new Date(document.expiryDate).getTime() < Date.now() + 30 * 864e5 ? "CRITICAL" : "MEDIUM", detail: `${document.docType ?? "Document"} renewal required`, sourceId: document.id })),
        ...workOrders2.filter((order) => {
          const due = new Date(order.updatedAt ?? order.createdAt);
          return due >= from && due <= to;
        }).map((order) => ({ id: order.id, kind: "WORK_ORDER", title: order.title, vehicleId: order.vehicleId, vehicleLabel: order.vehicle?.licensePlate ?? order.vehicleId, dueDate: new Date(order.updatedAt ?? order.createdAt), priority: order.priority, detail: `${order.status} \xB7 ${order.assignedMechanic?.fullName ?? "Unassigned"}`, sourceId: order.id }))
      ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      return { from, to, items, counts: { total: items.length, components: items.filter((item) => item.kind === "COMPONENT_DUE").length, documents: items.filter((item) => item.kind === "DOCUMENT_EXPIRY").length, workOrders: items.filter((item) => item.kind === "WORK_ORDER").length } };
    })
  }),
  workOrders: router({
    list: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]);
      const where = ["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId };
      return fleetDb.workOrder.findMany({ where, include: { vehicle: true, assignedMechanic: true, partsUsed: { include: { part: true } } }, orderBy: { createdAt: "desc" } });
    }),
    board: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]);
      const where = ["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId };
      const orders = await fleetDb.workOrder.findMany({ where, include: { vehicle: true, assignedMechanic: true }, orderBy: { updatedAt: "desc" } });
      return { columns: ["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK", "COMPLETED", "CANCELLED"].map((status) => ({ status, items: orders.filter((order) => order.status === status) })), totals: { all: orders.length, open: orders.filter((order) => order.status === "OPEN").length, inProgress: orders.filter((order) => order.status === "IN_PROGRESS").length, completed: orders.filter((order) => order.status === "COMPLETED").length } };
    }),
    updateStatus: fleetOpsProcedure.input(z2.object({ workOrderId: z2.string().uuid(), status: z2.enum(["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK", "CANCELLED"]), expectedUpdatedAt: z2.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, ...["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { assignedMechanicId: ctx.fleetopsUser.id } : {} } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Work order not found in your organization scope." });
      if (input.expectedUpdatedAt && new Date(order.updatedAt).getTime() !== input.expectedUpdatedAt.getTime()) throw new TRPCError3({ code: "CONFLICT", message: "This work order changed elsewhere. Refresh the queue before updating its status." });
      const allowed = { OPEN: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK", "CANCELLED"], WAITING_FOR_PARTS: ["IN_PROGRESS", "CANCELLED"], READY_FOR_REVIEW: ["COMPLETED", "REWORK"], REWORK: ["IN_PROGRESS", "READY_FOR_REVIEW", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
      if (!allowed[order.status]?.includes(input.status)) throw new TRPCError3({ code: "BAD_REQUEST", message: `Cannot move work order from ${order.status} to ${input.status}.` });
      const updated = await fleetDb.workOrder.update({ where: { id: order.id }, data: { status: input.status, ...input.status === "IN_PROGRESS" && !order.startedAt ? { startedAt: /* @__PURE__ */ new Date() } : {} } });
      await recordAudit(ctx, { action: "WORK_ORDER_STATUS_CHANGED", entityType: "WORK_ORDER", entityId: order.id, summary: `Work order moved from ${order.status} to ${input.status}`, metadata: { previousStatus: order.status, nextStatus: input.status } });
      return updated;
    }),
    bulkUpdate: fleetOpsProcedure.input(z2.object({ workOrderIds: z2.array(z2.string().uuid()).min(1).max(100), priority: z2.nativeEnum(Priority).optional(), assignedMechanicId: z2.string().uuid().nullable().optional(), scheduledFor: z2.coerce.date().nullable().optional(), archive: z2.boolean().optional(), cancel: z2.boolean().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      if (!input.priority && input.assignedMechanicId === void 0 && input.scheduledFor === void 0 && input.archive === void 0 && !input.cancel) throw new TRPCError3({ code: "BAD_REQUEST", message: "Choose a priority, assignee, schedule, archive, or cancellation action." });
      if (input.assignedMechanicId) {
        const assignee = await fleetDb.user.findFirst({ where: { id: input.assignedMechanicId, orgId: ctx.fleetopsUser.orgId, role: { in: ["MECHANIC", "TECHNICIAN"] } } });
        if (!assignee) throw new TRPCError3({ code: "BAD_REQUEST", message: "Assignee must belong to this organization." });
      }
      const orders = await fleetDb.workOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId, id: { in: input.workOrderIds } } });
      if (orders.length !== input.workOrderIds.length) throw new TRPCError3({ code: "NOT_FOUND", message: "One or more work orders are outside this organization." });
      const results = [];
      for (const order of orders) {
        if (input.cancel && ["COMPLETED", "CANCELLED"].includes(order.status)) continue;
        const updated = await fleetDb.workOrder.update({ where: { id: order.id }, data: { ...input.priority ? { priority: input.priority } : {}, ...input.assignedMechanicId !== void 0 ? { assignedMechanicId: input.assignedMechanicId } : {}, ...input.scheduledFor !== void 0 ? { scheduledFor: input.scheduledFor } : {}, ...input.archive !== void 0 ? { archivedAt: input.archive ? /* @__PURE__ */ new Date() : null } : {}, ...input.cancel ? { status: "CANCELLED" } : {} } });
        results.push(updated);
        await recordAudit(ctx, { action: "WORK_ORDER_BULK_UPDATED", entityType: "WORK_ORDER", entityId: order.id, summary: `Bulk work-order update applied to ${order.title}`, metadata: { priority: input.priority, assignedMechanicId: input.assignedMechanicId, cancelled: Boolean(input.cancel), scheduledFor: input.scheduledFor, archived: input.archive } });
      }
      return { updated: results.length, skipped: orders.length - results.length, workOrders: results };
    }),
    startWork: fleetOpsProcedure.input(z2.object({ workOrderId: z2.string().uuid() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Work order is not assigned to you." });
      return fleetDb.workOrder.update({ where: { id: order.id }, data: { status: "IN_PROGRESS", startedAt: order.startedAt ?? /* @__PURE__ */ new Date() } });
    }),
    reservePart: fleetOpsProcedure.input(z2.object({ workOrderId: z2.string().uuid(), partId: z2.string().uuid(), quantity: z2.number().int().positive(), reason: z2.string().trim().min(3).max(300).default("Reserved for work order") })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["FLEET_MANAGER", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, ...["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { assignedMechanicId: ctx.fleetopsUser.id } : {} } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Work order not found in your organization scope." });
      const part = await fleetDb.inventoryPart.findFirst({ where: { id: input.partId, orgId: ctx.fleetopsUser.orgId } });
      if (!part) throw new TRPCError3({ code: "NOT_FOUND", message: "Inventory part not found." });
      const [reservations, releases] = await Promise.all([fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, action: "INVENTORY_PART_RESERVED" } }), fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, action: "INVENTORY_PART_RETURNED" } })]);
      const activeReserved = reservations.filter((event) => {
        try {
          const metadata = JSON.parse(event.metadata ?? "{}");
          return metadata.workOrderId === order.id && metadata.partId === part.id && !releases.some((release) => {
            try {
              const released = JSON.parse(release.metadata ?? "{}");
              return released.reservationId === metadata.reservationId;
            } catch {
              return false;
            }
          });
        } catch {
          return false;
        }
      }).reduce((sum, event) => {
        try {
          return sum + Number(JSON.parse(event.metadata ?? "{}").quantity ?? 0);
        } catch {
          return sum;
        }
      }, 0);
      if (Number(part.quantityOnHand) - activeReserved < input.quantity) throw new TRPCError3({ code: "BAD_REQUEST", message: "Insufficient available stock after existing reservations." });
      const reservationId = crypto.randomUUID();
      if (fleetDb.inventoryMovement?.create) await fleetDb.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, workOrderId: order.id, actorId: ctx.fleetopsUser.id, movementType: "RESERVATION", quantity: input.quantity, unitCost: part.unitCost, reason: input.reason, createdAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "INVENTORY_PART_RESERVED", entityType: "WORK_ORDER_PART", entityId: order.id, summary: `Reserved ${input.quantity} ${part.name} for work order`, metadata: { reservationId, workOrderId: order.id, partId: part.id, quantity: input.quantity, reason: input.reason } });
      return { reservationId, workOrderId: order.id, partId: part.id, quantity: input.quantity };
    }),
    returnReservedPart: fleetOpsProcedure.input(z2.object({ reservationId: z2.string().uuid(), quantity: z2.number().int().positive(), reason: z2.string().trim().min(3).max(300).default("Returned unused reserved stock") })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["FLEET_MANAGER", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const reservations = await fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, action: "INVENTORY_PART_RESERVED" } });
      const releases = await fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, action: "INVENTORY_PART_RETURNED" } });
      const reservation = reservations.find((event) => {
        try {
          return JSON.parse(event.metadata ?? "{}").reservationId === input.reservationId;
        } catch {
          return false;
        }
      });
      if (!reservation) throw new TRPCError3({ code: "NOT_FOUND", message: "Active part reservation not found." });
      const metadata = JSON.parse(reservation.metadata ?? "{}");
      const returnedQuantity = releases.filter((event) => {
        try {
          return JSON.parse(event.metadata ?? "{}").reservationId === input.reservationId;
        } catch {
          return false;
        }
      }).reduce((sum, event) => {
        try {
          return sum + Number(JSON.parse(event.metadata ?? "{}").quantity ?? 0);
        } catch {
          return sum;
        }
      }, 0);
      if (returnedQuantity >= Number(metadata.quantity)) throw new TRPCError3({ code: "BAD_REQUEST", message: "This part reservation has already been returned." });
      if (input.quantity > Number(metadata.quantity) - returnedQuantity) throw new TRPCError3({ code: "BAD_REQUEST", message: "Return quantity cannot exceed the remaining reserved quantity." });
      const part = await fleetDb.inventoryPart.findFirst({ where: { id: metadata.partId, orgId: ctx.fleetopsUser.orgId } });
      if (!part) throw new TRPCError3({ code: "NOT_FOUND", message: "Reserved part is no longer in this organization." });
      const order = await fleetDb.workOrder.findFirst({ where: { id: metadata.workOrderId, orgId: ctx.fleetopsUser.orgId, ...["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { assignedMechanicId: ctx.fleetopsUser.id } : {} } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Work order is outside your role scope." });
      if (fleetDb.inventoryMovement?.create) await fleetDb.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, workOrderId: order.id, actorId: ctx.fleetopsUser.id, movementType: "RETURN", quantity: input.quantity, unitCost: part.unitCost, reason: input.reason, createdAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "INVENTORY_PART_RETURNED", entityType: "WORK_ORDER_PART", entityId: order.id, summary: `Returned ${input.quantity} ${part.name} from work order reservation`, metadata: { reservationId: input.reservationId, workOrderId: order.id, partId: part.id, quantity: input.quantity, reason: input.reason } });
      return { reservationId: input.reservationId, workOrderId: order.id, partId: part.id, quantity: input.quantity };
    }),
    create: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), title: z2.string().min(3), description: z2.string().optional(), priority: z2.nativeEnum(Priority).default(Priority.MEDIUM), assignedMechanicId: z2.string().uuid().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Vehicle not found." });
      if (input.assignedMechanicId) {
        const assignee = await fleetDb.user.findFirst({ where: { id: input.assignedMechanicId, orgId: ctx.fleetopsUser.orgId, role: { in: ["MECHANIC", "TECHNICIAN"] } } });
        if (!assignee) throw new TRPCError3({ code: "BAD_REQUEST", message: "Mechanic or Technician must belong to this organization." });
      }
      const created = await fleetDb.workOrder.create({ data: { id: crypto.randomUUID(), ...input, status: "OPEN", orgId: ctx.fleetopsUser.orgId, createdAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "WORK_ORDER_CREATED", entityType: "WORK_ORDER", entityId: created.id, summary: `Work order created: ${created.title}`, metadata: { priority: created.priority, assignedMechanicId: created.assignedMechanicId } });
      return created;
    }),
    complete: fleetOpsProcedure.input(z2.object({ workOrderId: z2.string().uuid(), parts: z2.array(z2.object({ partId: z2.string().uuid(), qtyUsed: z2.number().int().positive() })).default([]), laborHours: z2.number().nonnegative().max(1e3).default(0), repairNotes: z2.string().trim().min(3).max(5e3).default("Completed from organization oversight."), evidence: z2.array(z2.object({ fileData: z2.string().max(6e6), contentType: z2.string().startsWith("image/"), fileName: z2.string().min(1).max(200), caption: z2.string().max(500).optional() })).max(8).default([]) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, ...["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { assignedMechanicId: ctx.fleetopsUser.id } : {} }, include: { vehicle: true } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Work order not found." });
      const uploadedEvidence = await Promise.all(input.evidence.map(async (item, index) => {
        const raw = item.fileData.replace(/^data:[^;]+;base64,/, "");
        return { ...item, uploaded: await storagePut(`fleetops/work-orders/${ctx.fleetopsUser.orgId}/${order.id}/${Date.now()}-${index}-${item.fileName}`, Buffer.from(raw, "base64"), item.contentType) };
      }));
      const result = await fleetDb.$transaction(async (tx) => {
        let partsCost = 0;
        for (const requested of input.parts) {
          const part = await tx.inventoryPart.findFirst({ where: { id: requested.partId, orgId: ctx.fleetopsUser.orgId } });
          if (!part || part.quantityOnHand < requested.qtyUsed) throw new TRPCError3({ code: "BAD_REQUEST", message: "Insufficient inventory for one or more parts." });
          partsCost += Number(part.unitCost) * requested.qtyUsed;
          await tx.inventoryPart.update({ where: { id: part.id }, data: { quantityOnHand: { decrement: requested.qtyUsed } } });
          await tx.workOrderPart.create({ data: { id: crypto.randomUUID(), workOrderId: order.id, partId: part.id, qtyUsed: requested.qtyUsed, unitPrice: part.unitCost } });
          if (tx.inventoryMovement?.create) await tx.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, workOrderId: order.id, actorId: ctx.fleetopsUser.id, movementType: "ISSUE", quantity: -requested.qtyUsed, unitCost: part.unitCost, reason: `Consumed for work order ${order.id}`, createdAt: /* @__PURE__ */ new Date() } });
        }
        const completed = await tx.workOrder.update({ where: { id: order.id }, data: { status: "READY_FOR_REVIEW", startedAt: order.startedAt ?? /* @__PURE__ */ new Date(), completedAt: order.completedAt ?? /* @__PURE__ */ new Date(), laborHours: input.laborHours, repairNotes: input.repairNotes } });
        for (const item of uploadedEvidence) await tx.workOrderEvidence.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, workOrderId: order.id, uploadedById: ctx.fleetopsUser.id, fileUrl: item.uploaded.url, ...item.uploaded.key ? { fileKey: item.uploaded.key } : {}, ...item.caption ? { caption: item.caption } : {}, createdAt: /* @__PURE__ */ new Date() } });
        const admins = await tx.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: "SUPERADMIN" } });
        if (admins.length) await tx.notification.createMany({ data: admins.map((admin) => ({ id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, recipientId: admin.id, title: "Work order ready for review", message: `${order.vehicle?.licensePlate ?? order.vehicleId} repair is ready for approval. Parts cost: \u20B9${partsCost.toLocaleString("en-IN")}.`, type: "WORK_ORDER_REVIEW", severity: "HIGH", sourceType: "WORK_ORDER", dedupeKey: `WORK_ORDER_REVIEW:${order.id}`, referenceId: order.id, isRead: false, createdAt: /* @__PURE__ */ new Date() })) });
        return { completed, partsCost };
      });
      await recordAudit(ctx, { action: "WORK_ORDER_READY_FOR_REVIEW", entityType: "WORK_ORDER", entityId: order.id, summary: `Work order ready for review for ${order.vehicle?.licensePlate ?? order.vehicleId}`, metadata: { partsCost: result.partsCost, laborHours: input.laborHours, evidenceCount: input.evidence.length } });
      await evaluateLowInventory(ctx.fleetopsUser.orgId);
      return result;
    }),
    updateChecklist: fleetOpsProcedure.input(z2.object({ workOrderId: z2.string().uuid(), items: z2.array(z2.object({ id: z2.string().min(1).max(80), title: z2.string().trim().min(2).max(160), completed: z2.boolean() })).min(1).max(30) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Work order is not assigned to you." });
      await recordAudit(ctx, { action: "WORK_ORDER_CHECKLIST_UPDATED", entityType: "WORK_ORDER", entityId: order.id, summary: `Checklist updated for ${order.title}`, metadata: { items: input.items } });
      return { workOrderId: order.id, items: input.items };
    }),
    approve: fleetOpsProcedure.input(z2.object({ workOrderId: z2.string().uuid() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.workOrder.findFirst({ where: { id: input.workOrderId, orgId: ctx.fleetopsUser.orgId, status: "READY_FOR_REVIEW" } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Only work orders ready for review can be approved." });
      const checklistEvents = await fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, entityType: "WORK_ORDER", entityId: order.id, action: "WORK_ORDER_CHECKLIST_UPDATED" }, orderBy: { createdAt: "desc" }, take: 1 });
      let items = [];
      try {
        items = JSON.parse(checklistEvents[0]?.metadata ?? "{}").items ?? [];
      } catch {
        items = [];
      }
      if (!items.length || items.some((item) => !item.completed)) throw new TRPCError3({ code: "BAD_REQUEST", message: "Complete every execution checklist item before approval." });
      const approved = await fleetDb.workOrder.update({ where: { id: order.id }, data: { status: "COMPLETED", completedAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "WORK_ORDER_APPROVED", entityType: "WORK_ORDER", entityId: order.id, summary: `Work order approved and completed: ${order.title}`, metadata: { checklistItems: items.length } });
      return approved;
    })
  }),
  inventory: router({
    list: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      return fleetDb.inventoryPart.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { name: "asc" } });
    }),
    movements: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"]);
      return fleetDb.inventoryMovement.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { createdAt: "desc" }, take: 100 });
    }),
    create: fleetOpsProcedure.input(z2.object({ sku: z2.string().min(1), name: z2.string().min(2), binLocation: z2.string().optional(), quantityOnHand: z2.number().int().nonnegative(), minReorderLevel: z2.number().int().nonnegative().default(5), unitCost: z2.number().nonnegative() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const part = await fleetDb.inventoryPart.create({ data: { id: crypto.randomUUID(), ...input, orgId: ctx.fleetopsUser.orgId } });
      if (input.quantityOnHand > 0 && fleetDb.inventoryMovement?.create) await fleetDb.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, actorId: ctx.fleetopsUser.id, movementType: "RECEIPT", quantity: input.quantityOnHand, unitCost: input.unitCost, reason: "Opening inventory balance", createdAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "INVENTORY_PART_CREATED", entityType: "INVENTORY_PART", entityId: part.id, summary: `Inventory part created: ${part.name}`, metadata: { openingQuantity: input.quantityOnHand } });
      await evaluateLowInventory(ctx.fleetopsUser.orgId);
      return part;
    }),
    receive: fleetOpsProcedure.input(z2.object({ partId: z2.string().uuid(), quantity: z2.number().int().positive(), unitCost: z2.number().nonnegative().optional(), reason: z2.string().min(3).max(300) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const part = await fleetDb.inventoryPart.findFirst({ where: { id: input.partId, orgId: ctx.fleetopsUser.orgId } });
      if (!part) throw new TRPCError3({ code: "NOT_FOUND", message: "Inventory part not found." });
      const updated = await fleetDb.$transaction(async (tx) => {
        const next = await tx.inventoryPart.update({ where: { id: part.id }, data: { quantityOnHand: { increment: input.quantity }, ...input.unitCost !== void 0 ? { unitCost: input.unitCost } : {} } });
        if (tx.inventoryMovement?.create) await tx.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, actorId: ctx.fleetopsUser.id, movementType: "RECEIPT", quantity: input.quantity, unitCost: input.unitCost ?? part.unitCost, reason: input.reason, createdAt: /* @__PURE__ */ new Date() } });
        return next;
      });
      await recordAudit(ctx, { action: "INVENTORY_RECEIVED", entityType: "INVENTORY_PART", entityId: part.id, summary: `Received ${input.quantity} units of ${part.name}`, metadata: { quantity: input.quantity, reason: input.reason } });
      return updated;
    }),
    issue: fleetOpsProcedure.input(z2.object({ partId: z2.string().uuid(), quantity: z2.number().int().positive(), reason: z2.string().min(3).max(300) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"]);
      assertWritable(ctx.fleetopsUser.org);
      const part = await fleetDb.inventoryPart.findFirst({ where: { id: input.partId, orgId: ctx.fleetopsUser.orgId } });
      if (!part) throw new TRPCError3({ code: "NOT_FOUND", message: "Inventory part not found." });
      if (part.quantityOnHand < input.quantity) throw new TRPCError3({ code: "BAD_REQUEST", message: "Insufficient inventory for this issue." });
      const updated = await fleetDb.$transaction(async (tx) => {
        const next = await tx.inventoryPart.update({ where: { id: part.id }, data: { quantityOnHand: { decrement: input.quantity } } });
        if (tx.inventoryMovement?.create) await tx.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, actorId: ctx.fleetopsUser.id, movementType: "ISSUE", quantity: -input.quantity, unitCost: part.unitCost, reason: input.reason, createdAt: /* @__PURE__ */ new Date() } });
        return next;
      });
      await recordAudit(ctx, { action: "INVENTORY_ISSUED", entityType: "INVENTORY_PART", entityId: part.id, summary: `Issued ${input.quantity} units of ${part.name}`, metadata: { quantity: input.quantity, reason: input.reason } });
      await evaluateLowInventory(ctx.fleetopsUser.orgId);
      return updated;
    }),
    adjust: fleetOpsProcedure.input(z2.object({ partId: z2.string().uuid(), expectedQuantityOnHand: z2.number().int().nonnegative(), delta: z2.number().int(), reason: z2.string().trim().min(3).max(300) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const part = await fleetDb.inventoryPart.findFirst({ where: { id: input.partId, orgId: ctx.fleetopsUser.orgId } });
      if (!part) throw new TRPCError3({ code: "NOT_FOUND", message: "Inventory part not found." });
      const nextQuantity = input.expectedQuantityOnHand + input.delta;
      if (nextQuantity < 0) throw new TRPCError3({ code: "BAD_REQUEST", message: "Inventory adjustments cannot produce a negative balance." });
      const updated = await fleetDb.$transaction(async (tx) => {
        const changed = await tx.inventoryPart.updateMany({ where: { id: part.id, orgId: ctx.fleetopsUser.orgId, quantityOnHand: input.expectedQuantityOnHand }, data: { quantityOnHand: nextQuantity } });
        if (!changed.count) throw new TRPCError3({ code: "CONFLICT", message: "Inventory changed since it was loaded. Refresh the balance and retry." });
        if (tx.inventoryMovement?.create) await tx.inventoryMovement.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, partId: part.id, actorId: ctx.fleetopsUser.id, movementType: "ADJUSTMENT", quantity: input.delta, unitCost: part.unitCost, reason: input.reason, createdAt: /* @__PURE__ */ new Date() } });
        return tx.inventoryPart.findFirst({ where: { id: part.id, orgId: ctx.fleetopsUser.orgId } });
      });
      await recordAudit(ctx, { action: "INVENTORY_ADJUSTED", entityType: "INVENTORY_PART", entityId: part.id, summary: `Adjusted ${part.name} by ${input.delta}`, metadata: { expectedQuantityOnHand: input.expectedQuantityOnHand, nextQuantity, reason: input.reason } });
      await evaluateLowInventory(ctx.fleetopsUser.orgId);
      return updated;
    })
  }),
  driver: router({
    inspections: fleetOpsProcedure.query(async ({ ctx }) => fleetDb.dvirInspection.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 50 })),
    createInspection: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), inspectionType: z2.enum(["PRE_TRIP", "POST_TRIP"]), status: z2.enum(["PASS", "FAIL"]), notes: z2.string().max(2e3).optional(), photoData: z2.string().max(2e6).optional(), photoContentType: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["DRIVER", "SUPERADMIN"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertDriverVehicle(ctx, input.vehicleId);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Vehicle not found." });
      let photoUrl;
      let photoKey;
      if (input.photoData) {
        const raw = input.photoData.replace(/^data:[^;]+;base64,/, "");
        const uploaded = await storagePut(`fleetops/dvir/${ctx.fleetopsUser.orgId}/${vehicle.id}.jpg`, Buffer.from(raw, "base64"), input.photoContentType ?? "image/jpeg");
        photoUrl = uploaded.url;
        photoKey = uploaded.key;
      }
      return fleetDb.dvirInspection.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, inspectionType: input.inspectionType, status: input.status, notes: input.notes, photoUrl, photoKey, createdAt: /* @__PURE__ */ new Date() } });
    }),
    fuelLogs: fleetOpsProcedure.query(({ ctx }) => fleetDb.fuelLog.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 50 })),
    createFuelLog: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), liters: z2.number().positive(), amount: z2.number().nonnegative(), odometer: z2.number().nonnegative(), station: z2.string().max(200).optional(), receiptData: z2.string().max(2e6).optional(), receiptContentType: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["DRIVER", "SUPERADMIN"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertDriverVehicle(ctx, input.vehicleId);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Vehicle not found." });
      const previousLog = await fleetDb.odometerLog.findFirst({ where: { vehicleId: vehicle.id }, orderBy: { createdAt: "desc" } });
      const elapsedDays = previousLog?.createdAt ? Math.max(1, Math.ceil((Date.now() - new Date(previousLog.createdAt).getTime()) / 864e5)) : 1;
      validateOdometerReading(previousLog ? Number(previousLog.reading) : Number(vehicle.currentOdometer), input.odometer, elapsedDays);
      let receiptUrl;
      if (input.receiptData) receiptUrl = (await storagePut(`fleetops/fuel/${ctx.fleetopsUser.orgId}/${vehicle.id}.jpg`, Buffer.from(input.receiptData.replace(/^data:[^;]+;base64,/, ""), "base64"), input.receiptContentType ?? "image/jpeg")).url;
      const [log] = await fleetDb.$transaction([fleetDb.fuelLog.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, liters: input.liters, amount: input.amount, odometer: input.odometer, station: input.station, receiptUrl, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() } }), fleetDb.financialRecord.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: vehicle.id, type: "EXPENSE", category: "FUEL", amount: input.amount, transactionDate: /* @__PURE__ */ new Date() } }), fleetDb.odometerLog.create({ data: { id: crypto.randomUUID(), vehicleId: vehicle.id, driverId: ctx.fleetopsUser.id, reading: input.odometer, source: "MANUAL_DRIVER", isFlagged: false, createdAt: /* @__PURE__ */ new Date() } }), fleetDb.vehicle.update({ where: { id: vehicle.id }, data: { currentOdometer: input.odometer } })]);
      return log;
    }),
    dailyHome: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["DRIVER"]);
      const assignments = await fleetDb.vehicleAssignment.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id, active: true } });
      const assigned = assignments[0];
      if (!assigned) return { vehicle: null, readiness: "UNASSIGNED", latestInspection: null, openIssues: [], nextAction: "Contact Fleet Manager for an active vehicle assignment." };
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: assigned.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      const inspections = await fleetDb.dvirInspection.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id, vehicleId: assigned.vehicleId }, orderBy: { createdAt: "desc" }, take: 10 });
      const openIssues = await fleetDb.vehicleIssue.findMany({ where: { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id, vehicleId: assigned.vehicleId, status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } }, orderBy: { createdAt: "desc" }, take: 20 });
      const latestInspection = inspections[0] ?? null;
      const readiness = vehicle?.status === "OUT_OF_SERVICE" ? "UNSAFE" : latestInspection?.inspectionType === "PRE_TRIP" && latestInspection.status === "PASS" && !openIssues.some((issue) => ["HIGH", "CRITICAL"].includes(issue.priority)) ? "READY" : "ACTION_REQUIRED";
      return { vehicle, readiness, latestInspection, openIssues, nextAction: readiness === "READY" ? "Vehicle cleared for shift." : readiness === "UNSAFE" ? "Do not drive. Fleet Manager disposition required." : "Complete a passing pre-trip inspection and resolve high-priority issues." };
    }),
    unsafeDisposition: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), disposition: z2.enum(["UNSAFE_TO_DRIVE", "CLEARED_TO_DRIVE"]), notes: z2.string().trim().min(3).max(1e3) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["DRIVER"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertDriverVehicle(ctx, input.vehicleId);
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Assigned vehicle not found." });
      const nextStatus = input.disposition === "UNSAFE_TO_DRIVE" ? "OUT_OF_SERVICE" : "ACTIVE";
      const updated = await fleetDb.vehicle.update({ where: { id: vehicle.id }, data: { status: nextStatus } });
      const managers = await fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: "FLEET_MANAGER" } });
      if (managers.length) await fleetDb.notification.createMany({ data: managers.map((manager) => ({ id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, recipientId: manager.id, title: input.disposition === "UNSAFE_TO_DRIVE" ? "Driver marked vehicle unsafe" : "Driver cleared vehicle", message: `${vehicle.licensePlate}: ${input.notes}`, type: "DRIVER_SAFETY_DISPOSITION", severity: input.disposition === "UNSAFE_TO_DRIVE" ? "CRITICAL" : "INFO", sourceType: "VEHICLE", dedupeKey: `DRIVER_SAFETY:${vehicle.id}:${input.disposition}`, referenceId: vehicle.id, isRead: false, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() })) });
      await recordAudit(ctx, { action: "DRIVER_SAFETY_DISPOSITION", entityType: "VEHICLE", entityId: vehicle.id, summary: `${vehicle.licensePlate} marked ${input.disposition}`, metadata: { disposition: input.disposition, notes: input.notes } });
      return updated;
    })
  }),
  vehicleIssues: router({
    list: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "DRIVER"]);
      const where = ctx.fleetopsUser.role === "DRIVER" ? { orgId: ctx.fleetopsUser.orgId, driverId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId };
      return fleetDb.vehicleIssue.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 });
    }),
    create: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), title: z2.string().trim().min(3).max(160), description: z2.string().trim().min(5).max(4e3), priority: z2.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"), photoData: z2.string().max(4e6).optional(), photoContentType: z2.string().startsWith("image/").optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["DRIVER"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertDriverVehicle(ctx, input.vehicleId);
      let photoUrl;
      let photoKey;
      if (input.photoData) {
        const uploaded = await storagePut(`fleetops/vehicle-issues/${ctx.fleetopsUser.orgId}/${input.vehicleId}/${Date.now()}.jpg`, Buffer.from(input.photoData.replace(/^data:[^;]+;base64,/, ""), "base64"), input.photoContentType ?? "image/jpeg");
        photoUrl = uploaded.url;
        photoKey = uploaded.key;
      }
      const issue = await fleetDb.vehicleIssue.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: input.vehicleId, driverId: ctx.fleetopsUser.id, title: input.title, description: input.description, priority: input.priority, status: "OPEN", photoUrl, photoKey, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() } });
      const managers = await fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: "FLEET_MANAGER" } });
      if (managers.length) await fleetDb.notification.createMany({ data: managers.map((manager) => ({ id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, recipientId: manager.id, title: "Driver vehicle issue reported", message: `${input.title} \xB7 ${input.priority} priority`, type: "VEHICLE_ISSUE", severity: input.priority === "CRITICAL" ? "CRITICAL" : input.priority === "HIGH" ? "HIGH" : "INFO", sourceType: "VEHICLE_ISSUE", dedupeKey: `VEHICLE_ISSUE:${issue.id}`, referenceId: issue.id, isRead: false, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() })) });
      await recordAudit(ctx, { action: "VEHICLE_ISSUE_REPORTED", entityType: "VEHICLE_ISSUE", entityId: issue.id, summary: `Driver reported vehicle issue: ${issue.title}`, metadata: { priority: issue.priority } });
      return issue;
    }),
    updateStatus: fleetOpsProcedure.input(z2.object({ issueId: z2.string().uuid(), status: z2.enum(["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const issue = await fleetDb.vehicleIssue.findFirst({ where: { id: input.issueId, orgId: ctx.fleetopsUser.orgId } });
      if (!issue) throw new TRPCError3({ code: "NOT_FOUND", message: "Vehicle issue not found in this organization." });
      const updated = await fleetDb.vehicleIssue.update({ where: { id: issue.id }, data: { status: input.status } });
      await recordAudit(ctx, { action: "VEHICLE_ISSUE_STATUS_CHANGED", entityType: "VEHICLE_ISSUE", entityId: issue.id, summary: `Vehicle issue moved from ${issue.status} to ${input.status}`, metadata: { previousStatus: issue.status, nextStatus: input.status } });
      return updated;
    })
  }),
  triage: router({
    update: fleetOpsProcedure.input(z2.object({ kind: z2.enum(["VEHICLE_ISSUE", "WORK_ORDER", "DOCUMENT", "LOW_STOCK"]), referenceId: z2.string().uuid(), state: z2.enum(["ACKNOWLEDGED", "ASSIGNED", "DEFERRED", "RESOLVED"]), note: z2.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      await recordAudit(ctx, { action: "TRIAGE_STATE_CHANGED", entityType: input.kind, entityId: input.referenceId, summary: `${input.kind} triage marked ${input.state.toLowerCase()}`, metadata: { state: input.state, assigneeId: input.state === "ASSIGNED" ? ctx.fleetopsUser.id : null, note: input.note ?? null } });
      return { kind: input.kind, referenceId: input.referenceId, state: input.state, assigneeId: input.state === "ASSIGNED" ? ctx.fleetopsUser.id : null };
    }),
    queue: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      const cutoff = new Date(Date.now() + 30 * 864e5);
      const [issues, orders, documents2, parts, triageAudits] = await Promise.all([fleetDb.vehicleIssue.findMany({ where: { orgId: ctx.fleetopsUser.orgId, status: { notIn: ["RESOLVED", "CLOSED"] } }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 50 }), fleetDb.workOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } }, include: { vehicle: true, assignedMechanic: true }, orderBy: { createdAt: "desc" }, take: 50 }), fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId, expiryDate: { lte: cutoff } }, include: { vehicle: true }, orderBy: { expiryDate: "asc" }, take: 50 }), fleetDb.inventoryPart.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { name: "asc" }, take: 200 }), fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, action: "TRIAGE_STATE_CHANGED" }, orderBy: { createdAt: "desc" }, take: 500 })]);
      const triageState = /* @__PURE__ */ new Map();
      for (const event of triageAudits) {
        const key = `${event.entityType}:${event.entityId}`;
        if (!triageState.has(key)) {
          try {
            const metadata = JSON.parse(event.metadata ?? "{}");
            triageState.set(key, metadata.state ? `${metadata.state}${metadata.assigneeId ? `:${metadata.assigneeId}` : ""}` : "");
          } catch {
            triageState.set(key, "");
          }
        }
      }
      const withState = (item, kind) => ({ ...item, triageState: triageState.get(`${kind}:${item.referenceId}`) ?? null });
      const issueItems = issues.map((item) => withState({ id: item.id, kind: "VEHICLE_ISSUE", title: item.title, subtitle: `${item.vehicle?.licensePlate ?? item.vehicleId} \xB7 Driver issue`, priority: item.priority, status: item.status, createdAt: item.createdAt, referenceId: item.id, actionable: true }, "VEHICLE_ISSUE"));
      const orderItems = orders.map((item) => withState({ id: item.id, kind: "WORK_ORDER", title: item.title, subtitle: `${item.vehicle?.licensePlate ?? item.vehicleId} \xB7 ${item.assignedMechanic?.fullName ?? "Unassigned"}`, priority: item.priority, status: item.status, createdAt: item.createdAt, referenceId: item.id, actionable: true }, "WORK_ORDER"));
      const documentItems = documents2.map((item) => withState({ id: item.id, kind: "DOCUMENT", title: item.title, subtitle: `${item.vehicle?.licensePlate ?? "Organization document"} \xB7 expires ${new Date(item.expiryDate).toLocaleDateString("en-IN")}`, priority: new Date(item.expiryDate) < /* @__PURE__ */ new Date() ? "CRITICAL" : "HIGH", status: "REVIEW", createdAt: item.createdAt, referenceId: item.id, actionable: true }, "DOCUMENT"));
      const lowStockItems = parts.filter((item) => Number(item.quantityOnHand) <= Number(item.minReorderLevel)).map((item) => withState({ id: item.id, kind: "LOW_STOCK", title: `${item.sku} \xB7 ${item.name}`, subtitle: `${item.quantityOnHand} on hand \xB7 reorder at ${item.minReorderLevel}`, priority: "HIGH", status: "REORDER", createdAt: item.updatedAt ?? item.createdAt, referenceId: item.id, actionable: true }, "LOW_STOCK"));
      return [...issueItems, ...orderItems, ...documentItems, ...lowStockItems].filter((item) => !["DEFERRED", "RESOLVED"].includes(String(item.triageState).split(":")[0])).sort((a, b) => {
        const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }).slice(0, 100);
    })
  }),
  audit: router({
    list: fleetOpsProcedure.input(z2.object({ actorId: z2.string().uuid().optional(), actorRole: z2.string().optional(), entityType: z2.string().optional(), action: z2.string().optional(), outcome: z2.enum(["SUCCESS", "ERROR"]).optional(), dateFrom: z2.string().datetime().optional(), dateTo: z2.string().datetime().optional(), limit: z2.number().int().min(1).max(200).default(100) }).optional()).query(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      const rows = await fleetDb.auditEvent.findMany({ where: { orgId: ctx.fleetopsUser.orgId, ...input?.actorId ? { actorId: input.actorId } : {}, ...input?.actorRole ? { actorRole: input.actorRole } : {}, ...input?.entityType ? { entityType: input.entityType } : {}, ...input?.action ? { action: input.action } : {}, ...input?.dateFrom || input?.dateTo ? { createdAt: { ...input?.dateFrom ? { gte: new Date(input.dateFrom) } : {}, ...input?.dateTo ? { lte: new Date(input.dateTo) } : {} } } : {} }, orderBy: { createdAt: "desc" }, take: input?.limit ?? 100 });
      if (!input?.outcome) return rows;
      return rows.filter((row) => {
        let metadata = {};
        try {
          metadata = row.metadata ? JSON.parse(row.metadata) : {};
        } catch {
          metadata = {};
        }
        const outcome = String(metadata.outcome ?? "SUCCESS").toUpperCase();
        return outcome === input.outcome;
      });
    })
  }),
  automation: router({
    evaluate: fleetOpsProcedure.mutation(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      return evaluateAllOrganizations();
    })
  }),
  team: router({
    members: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      return fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, select: { id: true, email: true, fullName: true, role: true, createdAt: true }, orderBy: { fullName: "asc" } });
    }),
    invitations: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      return fleetDb.invitation.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { createdAt: "desc" } });
    }),
    invite: fleetOpsProcedure.input(z2.object({ email: z2.string().email(), role: z2.enum(["FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER", "INVENTORY_MANAGER", "ACCOUNTANT"]) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      assertWritable(ctx.fleetopsUser.org);
      await assertUserCapacity(ctx.fleetopsUser.orgId, ctx.fleetopsUser.org.maxUsers);
      const invitation = await withServerTimeout(fleetDb.invitation.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, email: input.email.toLowerCase(), role: input.role, tokenHash: crypto.randomUUID(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3), createdAt: /* @__PURE__ */ new Date() } }), "Invitation storage did not respond within 12 seconds. No invitation was confirmed.");
      await recordAudit(ctx, { action: "INVITATION_CREATED", entityType: "INVITATION", entityId: invitation.id, summary: `Invitation created for ${input.email.toLowerCase()}`, metadata: { role: input.role } });
      const origin = String(ctx.req?.headers?.origin ?? "https://fleetops-elktaacw.manus.space");
      const joinUrl = new URL(`/join/${invitation.tokenHash}`, origin).toString();
      const emailResult = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email.toLowerCase(), { redirectTo: joinUrl });
      return { ...invitation, joinUrl, delivery: emailResult.error ? "MANUAL_TOKEN" : "EMAIL", deliveryError: emailResult.error?.message, serverRelease: FLEETOPS_SERVER_RELEASE };
    }),
    updateRole: fleetOpsProcedure.input(z2.object({ userId: z2.string().uuid(), role: z2.enum(["FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER", "INVENTORY_MANAGER", "ACCOUNTANT"]) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      assertWritable(ctx.fleetopsUser.org);
      const member = await fleetDb.user.findFirst({ where: { id: input.userId, orgId: ctx.fleetopsUser.orgId } });
      if (!member) throw new TRPCError3({ code: "NOT_FOUND", message: "Team member not found." });
      const updated = await fleetDb.user.update({ where: { id: input.userId }, data: { role: input.role } });
      await recordAudit(ctx, { action: "ROLE_CHANGED", entityType: "USER", entityId: member.id, summary: `Role changed for ${member.fullName}`, metadata: { previousRole: member.role, nextRole: input.role } });
      return updated;
    }),
    operationalRoster: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["FLEET_MANAGER"]);
      const [members, assignments, vehicles2] = await Promise.all([fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: { in: ["DRIVER", "MECHANIC", "TECHNICIAN"] } }, select: { id: true, fullName: true, email: true, role: true }, orderBy: { fullName: "asc" } }), fleetDb.vehicleAssignment.findMany({ where: { orgId: ctx.fleetopsUser.orgId, active: true }, orderBy: { updatedAt: "desc" } }), fleetDb.vehicle.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, select: { id: true, licensePlate: true, make: true, model: true } })]);
      const memberById = new Map(members.map((member) => [member.id, member]));
      const vehicleById = new Map(vehicles2.map((vehicle) => [vehicle.id, vehicle]));
      const enrichedAssignments = assignments.map((assignment) => ({ ...assignment, driver: memberById.get(assignment.driverId), vehicle: vehicleById.get(assignment.vehicleId) }));
      return { members, assignments: enrichedAssignments, activeAssignmentCount: enrichedAssignments.length, unassignedDrivers: members.filter((member) => member.role === "DRIVER" && !enrichedAssignments.some((assignment) => assignment.driverId === member.id)).length, unassignedVehicles: vehicles2.filter((vehicle) => !enrichedAssignments.some((assignment) => assignment.vehicleId === vehicle.id)).length };
    }),
    driverHandoffs: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      const [assignments, drivers, vehicles2, issues, safetyNotifications] = await Promise.all([fleetDb.vehicleAssignment.findMany({ where: { orgId: ctx.fleetopsUser.orgId, active: true }, orderBy: { updatedAt: "desc" } }), fleetDb.user.findMany({ where: { orgId: ctx.fleetopsUser.orgId, role: "DRIVER" }, select: { id: true, fullName: true, email: true } }), fleetDb.vehicle.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, select: { id: true, licensePlate: true, make: true, model: true, status: true } }), fleetDb.vehicleIssue.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { createdAt: "desc" }, take: 500 }), fleetDb.notification.findMany({ where: { orgId: ctx.fleetopsUser.orgId, type: "DRIVER_SAFETY_DISPOSITION" }, orderBy: { createdAt: "desc" }, take: 500 })]);
      const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
      const vehicleById = new Map(vehicles2.map((vehicle) => [vehicle.id, vehicle]));
      const latestIssueByVehicle = /* @__PURE__ */ new Map();
      for (const issue of issues) if (!latestIssueByVehicle.has(issue.vehicleId)) latestIssueByVehicle.set(issue.vehicleId, issue);
      const latestDispositionByVehicle = /* @__PURE__ */ new Map();
      for (const notification of safetyNotifications) if (!latestDispositionByVehicle.has(notification.referenceId)) latestDispositionByVehicle.set(notification.referenceId, notification);
      return assignments.map((assignment) => {
        const vehicle = vehicleById.get(assignment.vehicleId);
        const driver = driverById.get(assignment.driverId);
        const issue = latestIssueByVehicle.get(assignment.vehicleId);
        const disposition = latestDispositionByVehicle.get(assignment.vehicleId);
        const safety = vehicle?.status === "OUT_OF_SERVICE" ? "UNSAFE" : vehicle?.status === "ACTIVE" ? "ACTIVE" : "REVIEW";
        return { assignmentId: assignment.id, driverId: assignment.driverId, driverName: driver?.fullName ?? "Unknown driver", driverEmail: driver?.email ?? "", vehicleId: assignment.vehicleId, vehicleLabel: vehicle?.licensePlate ?? assignment.vehicleId, vehicleStatus: vehicle?.status ?? "UNKNOWN", safety, latestIssue: issue ? { id: issue.id, title: issue.title, priority: issue.priority, status: issue.status, createdAt: issue.createdAt } : null, latestDisposition: disposition ? { severity: disposition.severity, message: disposition.message, createdAt: disposition.createdAt } : null, acknowledgedAt: issue?.status === "ACKNOWLEDGED" ? issue.updatedAt : null };
      });
    }),
    assignVehicle: fleetOpsProcedure.input(z2.object({ driverId: z2.string().uuid(), vehicleId: z2.string().uuid(), active: z2.boolean().default(true) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const driver = await fleetDb.user.findFirst({ where: { id: input.driverId, orgId: ctx.fleetopsUser.orgId, role: "DRIVER" } });
      const vehicle = await fleetDb.vehicle.findFirst({ where: { id: input.vehicleId, orgId: ctx.fleetopsUser.orgId } });
      if (!driver || !vehicle) throw new TRPCError3({ code: "NOT_FOUND", message: "Driver or vehicle not found in this organization." });
      const conflicting = await fleetDb.vehicleAssignment.findMany({ where: { orgId: ctx.fleetopsUser.orgId, active: true } });
      const closed = conflicting.filter((item) => item.driverId === input.driverId || item.vehicleId === input.vehicleId);
      await Promise.all(closed.map((item) => fleetDb.vehicleAssignment.update({ where: { id: item.id }, data: { active: false } })));
      const assignment = await fleetDb.vehicleAssignment.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: input.vehicleId, driverId: input.driverId, active: input.active, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: closed.length ? "VEHICLE_REASSIGNED" : "VEHICLE_ASSIGNED", entityType: "VEHICLE_ASSIGNMENT", entityId: assignment.id, summary: `${closed.length ? "Reassigned" : "Assigned"} ${vehicle.licensePlate} to ${driver.fullName}`, metadata: { vehicleId: input.vehicleId, driverId: input.driverId, active: input.active, closedAssignmentIds: closed.map((item) => item.id) } });
      return { ...assignment, closedAssignments: closed.length };
    })
  }),
  vendors: router({
    list: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      return fleetDb.vendor.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { name: "asc" } });
    }),
    create: fleetOpsProcedure.input(z2.object({ name: z2.string().trim().min(2).max(160), contactPerson: z2.string().trim().max(120).optional(), phone: z2.string().trim().min(5).max(40), email: z2.string().trim().email().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const created = await fleetDb.vendor.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, name: input.name, contactPerson: input.contactPerson || void 0, phone: input.phone, email: input.email || void 0, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "VENDOR_CREATED", entityType: "VENDOR", entityId: created.id, summary: `Vendor created: ${created.name}`, metadata: { phone: created.phone } });
      return created;
    })
  }),
  purchaseOrders: router({
    list: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      return fleetDb.purchaseOrder.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vendor: true }, orderBy: { createdAt: "desc" } });
    }),
    create: fleetOpsProcedure.input(z2.object({ vendorId: z2.string().uuid(), totalCost: z2.number().nonnegative() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const created = await fleetDb.purchaseOrder.create({ data: { id: crypto.randomUUID(), ...input, status: "DRAFT", totalCost: input.totalCost, orgId: ctx.fleetopsUser.orgId, createdAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "PURCHASE_ORDER_CREATED", entityType: "PURCHASE_ORDER", entityId: created.id, summary: `Purchase order created: \u20B9${Number(created.totalCost).toLocaleString("en-IN")}`, metadata: { vendorId: created.vendorId } });
      return created;
    }),
    updateStatus: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid(), status: z2.enum(["DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED", "CLOSED"]), expectedUpdatedAt: z2.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.purchaseOrder.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Purchase order not found in your organization." });
      if (input.expectedUpdatedAt && new Date(order.updatedAt).getTime() !== input.expectedUpdatedAt.getTime()) throw new TRPCError3({ code: "CONFLICT", message: "This purchase order changed elsewhere. Refresh before updating its status." });
      const allowed = { DRAFT: ["SENT", "CANCELLED"], SENT: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"], PARTIALLY_RECEIVED: ["RECEIVED", "CANCELLED"], RECEIVED: ["CLOSED"], CLOSED: [], CANCELLED: [] };
      if (!allowed[order.status]?.includes(input.status)) throw new TRPCError3({ code: "BAD_REQUEST", message: `Cannot move purchase order from ${order.status} to ${input.status}.` });
      const updated = await fleetDb.purchaseOrder.update({ where: { id: order.id }, data: { status: input.status, ...input.status === "RECEIVED" ? { receivedAt: /* @__PURE__ */ new Date() } : {}, ...input.status === "CLOSED" ? { closedAt: /* @__PURE__ */ new Date() } : {} } });
      await recordAudit(ctx, { action: "PURCHASE_ORDER_STATUS_CHANGED", entityType: "PURCHASE_ORDER", entityId: order.id, summary: `Purchase order moved from ${order.status} to ${input.status}`, metadata: { previousStatus: order.status, nextStatus: input.status } });
      return updated;
    }),
    receivePartial: fleetOpsProcedure.input(z2.object({ purchaseOrderId: z2.string().uuid(), partId: z2.string().uuid(), quantity: z2.number().int().positive(), expectedQuantityOnHand: z2.number().int().nonnegative(), unitCost: z2.number().nonnegative(), invoiceNumber: z2.string().trim().max(120).optional(), location: z2.string().trim().max(120).optional(), complete: z2.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const order = await fleetDb.purchaseOrder.findFirst({ where: { id: input.purchaseOrderId, orgId: ctx.fleetopsUser.orgId } });
      if (!order || ["CANCELLED", "CLOSED"].includes(order.status)) throw new TRPCError3({ code: "NOT_FOUND", message: "Purchase order is not receivable in this organization." });
      const part = await fleetDb.inventoryPart.findFirst({ where: { id: input.partId, orgId: ctx.fleetopsUser.orgId } });
      if (!part) throw new TRPCError3({ code: "NOT_FOUND", message: "Inventory part not found in this organization." });
      const received = await fleetDb.$transaction(async (tx) => {
        const changed = await tx.inventoryPart.updateMany({ where: { id: part.id, orgId: ctx.fleetopsUser.orgId, quantityOnHand: input.expectedQuantityOnHand }, data: { quantityOnHand: input.expectedQuantityOnHand + input.quantity, unitCost: input.unitCost, ...input.location ? { binLocation: input.location } : {} } });
        if (!changed.count) throw new TRPCError3({ code: "CONFLICT", message: "Inventory changed since it was loaded. Refresh the balance and retry." });
        const receipt = await tx.purchaseOrderReceipt.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, purchaseOrderId: order.id, partId: part.id, quantity: input.quantity, unitCost: input.unitCost, invoiceNumber: input.invoiceNumber, location: input.location, receivedById: ctx.fleetopsUser.id, receivedAt: /* @__PURE__ */ new Date() } });
        const updatedOrder = await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: input.complete ? "RECEIVED" : "PARTIALLY_RECEIVED", ...input.invoiceNumber ? { supplierInvoiceNumber: input.invoiceNumber } : {}, ...input.complete ? { receivedAt: /* @__PURE__ */ new Date() } : {} } });
        return { receipt, order: updatedOrder };
      });
      await recordAudit(ctx, { action: "PURCHASE_ORDER_PARTIALLY_RECEIVED", entityType: "PURCHASE_ORDER", entityId: order.id, summary: `Received ${input.quantity} units into ${part.name}`, metadata: { partId: part.id, quantity: input.quantity, unitCost: input.unitCost, invoiceNumber: input.invoiceNumber, location: input.location, complete: input.complete } });
      return received;
    }),
    receipts: fleetOpsProcedure.input(z2.object({ purchaseOrderId: z2.string().uuid() })).query(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "INVENTORY_MANAGER"]);
      const order = await fleetDb.purchaseOrder.findFirst({ where: { id: input.purchaseOrderId, orgId: ctx.fleetopsUser.orgId } });
      if (!order) throw new TRPCError3({ code: "NOT_FOUND", message: "Purchase order not found in your organization." });
      return fleetDb.purchaseOrderReceipt.findMany({ where: { purchaseOrderId: order.id, orgId: ctx.fleetopsUser.orgId }, orderBy: { receivedAt: "desc" } });
    })
  }),
  documents: router({
    exportPdf: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      const rows = await fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } });
      const content = simplePdf("FleetOps Compliance Register", [`Organization: ${ctx.fleetopsUser.org.name}`, `Generated: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")}`, `Documents: ${rows.length}`, ...rows.map((row) => `${row.title} | ${row.docType} | ${row.vehicle?.licensePlate ?? "Organization"} | expires ${new Date(row.expiryDate).toLocaleDateString("en-IN")}`)]);
      await recordAudit(ctx, { action: "DOCUMENT_EXPORT_PDF", entityType: "DOCUMENT", summary: `Exported compliance PDF with ${rows.length} documents`, metadata: { count: rows.length } });
      return { filename: `fleetops-compliance-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf`, content, rowCount: rows.length };
    }),
    exportCsv: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      const rows = await fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } });
      const csv = csvDocument(rows.map((row) => ({ title: row.title, docType: row.docType, vehicle: row.vehicle?.licensePlate ?? "Organization", expiryDate: new Date(row.expiryDate).toISOString().slice(0, 10), fileStatus: row.fileKey ? "STORED" : "MISSING" })), ["title", "docType", "vehicle", "expiryDate", "fileStatus"]);
      await recordAudit(ctx, { action: "DOCUMENT_EXPORT_CSV", entityType: "DOCUMENT", summary: `Exported ${rows.length} compliance documents`, metadata: { count: rows.length } });
      return { filename: `fleetops-compliance-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`, content: csv, rowCount: rows.length };
    }),
    previewImport: fleetOpsProcedure.input(z2.object({ csv: z2.string().max(1e6) })).query(({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      const parsed = parseComplianceCsv(input.csv);
      return { rowCount: parsed.rows.length, validCount: parsed.rows.filter((row) => !row.errors.length).length, errors: parsed.errors, rows: parsed.rows.slice(0, 100).map((item) => ({ rowNumber: item.rowNumber, ...item.row, errors: item.errors })) };
    }),
    importCsv: fleetOpsProcedure.input(z2.object({ csv: z2.string().max(1e6) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const parsed = parseComplianceCsv(input.csv);
      if (parsed.errors.length) throw new TRPCError3({ code: "BAD_REQUEST", message: parsed.errors.slice(0, 8).join("; ") });
      const vehicles2 = await fleetDb.vehicle.findMany({ where: { orgId: ctx.fleetopsUser.orgId } });
      const vehicleIds = new Set(vehicles2.map((vehicle) => vehicle.id));
      const existing = await fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId } });
      const seen = new Set(existing.map((document) => `${document.title}|${document.docType}|${document.vehicleId}|${new Date(document.expiryDate).toISOString().slice(0, 10)}`));
      const candidates = parsed.rows.filter((item) => vehicleIds.has(item.row.vehicleId)).filter((item) => {
        const key = `${item.row.title}|${item.row.docType}|${item.row.vehicleId}|${item.row.expiryDate}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (candidates.length !== parsed.rows.length) throw new TRPCError3({ code: "BAD_REQUEST", message: "Every row must reference an organization vehicle and must not duplicate an existing compliance document." });
      const created = await Promise.all(candidates.map((item) => fleetDb.document.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, title: item.row.title, docType: item.row.docType, expiryDate: new Date(item.row.expiryDate), vehicleId: item.row.vehicleId, fileUrl: item.row.fileUrl || void 0, createdAt: /* @__PURE__ */ new Date() } })));
      await recordAudit(ctx, { action: "DOCUMENT_IMPORT_CSV", entityType: "DOCUMENT", summary: `Imported ${created.length} compliance documents`, metadata: { count: created.length } });
      return { importedCount: created.length };
    }),
    list: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      return fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { expiryDate: "asc" } });
    }),
    create: fleetOpsProcedure.input(z2.object({ title: z2.string().min(2), docType: z2.string().min(2), fileUrl: z2.string().url().optional(), fileKey: z2.string().optional(), fileData: z2.string().max(4e6).optional(), fileContentType: z2.string().optional(), expiryDate: z2.coerce.date(), vehicleId: z2.string().uuid().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const { fileData, fileContentType, ...data } = input;
      let fileUrl = data.fileUrl;
      let fileKey = data.fileKey;
      let fileChecksum;
      let fileSizeBytes;
      if (fileData) {
        const decoded = decodeDocumentUpload(fileData, fileContentType);
        const duplicate = await fleetDb.document.findFirst({ where: { orgId: ctx.fleetopsUser.orgId, fileChecksum: decoded.checksum } });
        if (duplicate) throw new TRPCError3({ code: "CONFLICT", message: "This exact document file already exists in the organization." });
        const uploaded = await storagePut(`fleetops/documents/${ctx.fleetopsUser.orgId}/${input.title}`, decoded.bytes, fileContentType);
        fileUrl = uploaded.url;
        fileKey = uploaded.key;
        fileChecksum = decoded.checksum;
        fileSizeBytes = decoded.sizeBytes;
      }
      if (!fileUrl) throw new TRPCError3({ code: "BAD_REQUEST", message: "A document file is required." });
      const created = await fleetDb.document.create({ data: { id: crypto.randomUUID(), ...data, fileUrl, fileKey, fileChecksum, fileSizeBytes, retentionUntil: retentionAfterExpiry(input.expiryDate), orgId: ctx.fleetopsUser.orgId, createdAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "DOCUMENT_CREATED", entityType: "DOCUMENT", entityId: created.id, summary: `Compliance document added: ${created.title}`, metadata: { docType: created.docType, fileChecksum, fileSizeBytes, malwareScan: "NOT_AVAILABLE_POLICY_RECORDED" } });
      return created;
    }),
    update: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid(), title: z2.string().min(2).optional(), expiryDate: z2.coerce.date().optional(), fileData: z2.string().max(4e6).optional(), fileContentType: z2.string().optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      assertWritable(ctx.fleetopsUser.org);
      const existing = await fleetDb.document.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } });
      if (!existing) throw new TRPCError3({ code: "NOT_FOUND", message: "Document not found." });
      const { id, fileData, fileContentType, ...data } = input;
      let updateData = { ...data };
      if (fileData) {
        const decoded = decodeDocumentUpload(fileData, fileContentType);
        const duplicate = await fleetDb.document.findFirst({ where: { orgId: ctx.fleetopsUser.orgId, fileChecksum: decoded.checksum } });
        if (duplicate && duplicate.id !== existing.id) throw new TRPCError3({ code: "CONFLICT", message: "This exact replacement file already exists in the organization." });
        const uploaded = await storagePut(`fleetops/documents/${ctx.fleetopsUser.orgId}/${existing.title}`, decoded.bytes, fileContentType);
        updateData = { ...updateData, fileUrl: uploaded.url, fileKey: uploaded.key, fileChecksum: decoded.checksum, fileSizeBytes: decoded.sizeBytes };
      }
      if (input.expiryDate) updateData.retentionUntil = retentionAfterExpiry(input.expiryDate);
      const updated = await fleetDb.document.update({ where: { id }, data: updateData });
      await recordAudit(ctx, { action: "DOCUMENT_UPDATED", entityType: "DOCUMENT", entityId: existing.id, summary: `Compliance document updated: ${updated.title}`, metadata: { fileChecksum: updateData.fileChecksum, fileSizeBytes: updateData.fileSizeBytes, retentionUntil: updateData.retentionUntil } });
      return updated;
    }),
    lifecycle: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      const rows = await fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { createdAt: "desc" } });
      const now = Date.now();
      const missingMetadata = rows.filter((row) => !row.fileKey || !row.fileChecksum || !row.fileSizeBytes);
      const retentionExpired = rows.filter((row) => row.retentionUntil && new Date(row.retentionUntil).getTime() < now);
      return { total: rows.length, missingMetadata: missingMetadata.map((row) => row.id), retentionExpired: retentionExpired.map((row) => row.id), malwareScanPolicy: "EXTERNAL_SCAN_REQUIRED_BEFORE_PRODUCTION_UPLOAD", accessLogging: "FILE_ACCESSED audit events enabled" };
    }),
    access: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid(), kind: z2.enum(["DOCUMENT", "WORK_ORDER_EVIDENCE"]).default("DOCUMENT") })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, input.kind === "DOCUMENT" ? ["SUPERADMIN", "FLEET_MANAGER"] : ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"]);
      const row = input.kind === "DOCUMENT" ? await fleetDb.document.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } }) : await fleetDb.workOrderEvidence.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } });
      if (!row?.fileKey) throw new TRPCError3({ code: "NOT_FOUND", message: "The requested file is unavailable." });
      await recordAudit(ctx, { action: "FILE_ACCESSED", entityType: input.kind, entityId: input.id, summary: `Authorized file access for ${input.kind.toLowerCase()}` });
      return { url: await storageGetSignedUrl(row.fileKey), expiresInSeconds: 900 };
    })
  }),
  financials: router({
    exportPdf: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid().optional(), type: z2.enum(["REVENUE", "EXPENSE"]).optional(), category: z2.string().optional(), from: z2.coerce.date().optional(), to: z2.coerce.date().optional() }).optional()).query(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      const where = { orgId: ctx.fleetopsUser.orgId, ...input?.vehicleId ? { vehicleId: input.vehicleId } : {}, ...input?.type ? { type: input.type } : {}, ...input?.category ? { category: input.category } : {}, ...input?.from ? { transactionDate: { gte: input.from } } : {}, ...input?.to ? { transactionDate: { lte: input.to } } : {} };
      const rows = await fleetDb.financialRecord.findMany({ where, include: { vehicle: true }, orderBy: { transactionDate: "desc" } });
      const content = simplePdf("FleetOps INR Financial Ledger", [`Organization: ${ctx.fleetopsUser.org.name}`, `Generated: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")}`, `Records: ${rows.length}`, ...rows.map((row) => `${new Date(row.transactionDate).toLocaleDateString("en-IN")} | ${row.vehicle?.licensePlate ?? row.vehicleId} | ${row.type} | ${row.category} | INR ${Number(row.amount).toFixed(2)}`)]);
      await recordAudit(ctx, { action: "FINANCIAL_EXPORT_PDF", entityType: "FINANCIAL_RECORD", summary: `Exported financial PDF with ${rows.length} records`, metadata: { count: rows.length } });
      return { filename: `fleetops-financial-ledger-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf`, content, rowCount: rows.length };
    }),
    exportCsv: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid().optional(), type: z2.enum(["REVENUE", "EXPENSE"]).optional(), category: z2.string().optional(), from: z2.coerce.date().optional(), to: z2.coerce.date().optional() }).optional()).query(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      const where = { orgId: ctx.fleetopsUser.orgId, ...input?.vehicleId ? { vehicleId: input.vehicleId } : {}, ...input?.type ? { type: input.type } : {}, ...input?.category ? { category: input.category } : {}, ...input?.from ? { transactionDate: { gte: input.from } } : {}, ...input?.to ? { transactionDate: { lte: input.to } } : {} };
      const rows = await fleetDb.financialRecord.findMany({ where, include: { vehicle: true }, orderBy: { transactionDate: "desc" } });
      const csv = csvDocument(rows.map((row) => ({ transactionDate: new Date(row.transactionDate).toISOString().slice(0, 10), vehicle: row.vehicle?.licensePlate ?? row.vehicleId, type: row.type, category: row.category, amountInr: Number(row.amount).toFixed(2) })), ["transactionDate", "vehicle", "type", "category", "amountInr"]);
      await recordAudit(ctx, { action: "FINANCIAL_EXPORT_CSV", entityType: "FINANCIAL_RECORD", summary: `Exported ${rows.length} financial records`, metadata: { count: rows.length } });
      return { filename: `fleetops-financial-ledger-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`, content: csv, rowCount: rows.length };
    }),
    list: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      return fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { transactionDate: "desc" } });
    }),
    metrics: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      const [records, odometers, vehicles2] = await Promise.all([
        fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { transactionDate: "desc" } }),
        fleetDb.odometerLog.findMany({ where: { vehicle: { orgId: ctx.fleetopsUser.orgId } }, orderBy: { createdAt: "asc" } }),
        fleetDb.vehicle.findMany({ where: { orgId: ctx.fleetopsUser.orgId } })
      ]);
      const byVehicle = /* @__PURE__ */ new Map();
      for (const vehicle of vehicles2) byVehicle.set(vehicle.id, { vehicleId: vehicle.id, vehicle: vehicle.licensePlate, revenue: 0, expenses: 0, firstOdometer: null, lastOdometer: null });
      for (const record of records) {
        const row = byVehicle.get(record.vehicleId);
        if (!row) continue;
        if (record.type === "REVENUE") row.revenue += Number(record.amount);
        else row.expenses += Number(record.amount);
      }
      for (const log of odometers) {
        const row = byVehicle.get(log.vehicleId);
        if (!row) continue;
        const reading = Number(log.reading);
        if (row.firstOdometer === null) row.firstOdometer = reading;
        row.lastOdometer = reading;
      }
      const rows = Array.from(byVehicle.values()).map((row) => {
        const distanceKm = row.firstOdometer !== null && row.lastOdometer !== null ? Math.max(0, row.lastOdometer - row.firstOdometer) : 0;
        return { ...row, distanceKm, profit: row.revenue - row.expenses, cpk: distanceKm > 0 ? row.expenses / distanceKm : 0 };
      });
      return { rows, totals: { revenue: rows.reduce((s, r) => s + r.revenue, 0), expenses: rows.reduce((s, r) => s + r.expenses, 0), profit: rows.reduce((s, r) => s + r.profit, 0), cpk: rows.reduce((s, r) => s + r.expenses, 0) / Math.max(1, rows.reduce((s, r) => s + r.distanceKm, 0)) } };
    }),
    reconcile: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      const [vehicles2, fuelLogs2, ledger] = await Promise.all([fleetDb.vehicle.findMany({ where: { orgId: ctx.fleetopsUser.orgId }, orderBy: { licensePlate: "asc" } }), fleetDb.fuelLog.findMany({ where: { orgId: ctx.fleetopsUser.orgId } }), fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId, type: "EXPENSE", category: "FUEL" } })]);
      const fuelByVehicle = /* @__PURE__ */ new Map();
      const ledgerByVehicle = /* @__PURE__ */ new Map();
      for (const row of fuelLogs2) fuelByVehicle.set(row.vehicleId, (fuelByVehicle.get(row.vehicleId) ?? 0) + Number(row.amount));
      for (const row of ledger) ledgerByVehicle.set(row.vehicleId, (ledgerByVehicle.get(row.vehicleId) ?? 0) + Number(row.amount));
      const rows = vehicles2.map((vehicle) => {
        const fuelLogged = fuelByVehicle.get(vehicle.id) ?? 0;
        const ledgerFuel = ledgerByVehicle.get(vehicle.id) ?? 0;
        const difference = Math.round((fuelLogged - ledgerFuel) * 100) / 100;
        return { vehicleId: vehicle.id, vehicle: vehicle.licensePlate, fuelLogged, ledgerFuel, difference, status: Math.abs(difference) < 0.01 ? "MATCHED" : "MISMATCH" };
      });
      return { rows, mismatches: rows.filter((row) => row.status === "MISMATCH"), totals: { fuelLogged: rows.reduce((sum, row) => sum + row.fuelLogged, 0), ledgerFuel: rows.reduce((sum, row) => sum + row.ledgerFuel, 0), difference: rows.reduce((sum, row) => sum + row.difference, 0) } };
    }),
    create: fleetOpsProcedure.input(z2.object({ vehicleId: z2.string().uuid(), type: z2.enum(["REVENUE", "EXPENSE"]), category: z2.string().min(2), amount: z2.number().nonnegative(), transactionDate: z2.coerce.date(), taxAmount: z2.number().nonnegative().default(0), gstin: z2.string().trim().max(30).optional(), taxCategory: z2.string().trim().max(80).optional(), invoiceNumber: z2.string().trim().max(120).optional(), vendor: z2.string().trim().max(160).optional(), paymentMethod: z2.string().trim().max(60).optional(), costCenterType: z2.string().trim().max(60).optional(), costCenterId: z2.string().uuid().optional(), tdsAmount: z2.number().nonnegative().default(0) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      assertWritable(ctx.fleetopsUser.org);
      const approvalStatus = input.type === "EXPENSE" && (input.amount >= 1e5 || input.category.toUpperCase().includes("MANUAL")) ? "PENDING_APPROVAL" : "APPROVED";
      const created = await fleetDb.financialRecord.create({ data: { id: crypto.randomUUID(), ...input, amount: input.amount, orgId: ctx.fleetopsUser.orgId, approvalStatus } });
      await recordAudit(ctx, { action: approvalStatus === "PENDING_APPROVAL" ? "FINANCIAL_APPROVAL_REQUIRED" : "FINANCIAL_RECORD_CREATED", entityType: "FINANCIAL_RECORD", entityId: created.id, summary: `${created.type} record added: \u20B9${Number(created.amount).toLocaleString("en-IN")}${approvalStatus === "PENDING_APPROVAL" ? " \xB7 approval required" : ""}`, metadata: { category: created.category, approvalStatus } });
      return created;
    }),
    approvalQueue: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      return fleetDb.financialRecord.findMany({ where: { orgId: ctx.fleetopsUser.orgId, approvalStatus: "PENDING_APPROVAL" }, include: { vehicle: true }, orderBy: { transactionDate: "asc" } });
    }),
    reconcileRecord: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid(), reconciliationRef: z2.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      assertWritable(ctx.fleetopsUser.org);
      const existing = await fleetDb.financialRecord.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } });
      if (!existing) throw new TRPCError3({ code: "NOT_FOUND", message: "Financial record not found." });
      const updated = await fleetDb.financialRecord.update({ where: { id: existing.id }, data: { reconciledAt: /* @__PURE__ */ new Date(), reconciliationRef: input.reconciliationRef } });
      await recordAudit(ctx, { action: "FINANCIAL_RECORD_RECONCILED", entityType: "FINANCIAL_RECORD", entityId: existing.id, summary: `Reconciled financial record \u20B9${Number(existing.amount).toLocaleString("en-IN")}`, metadata: { reconciliationRef: input.reconciliationRef } });
      return updated;
    }),
    approve: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid(), reason: z2.string().min(3) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      assertWritable(ctx.fleetopsUser.org);
      const existing = await fleetDb.financialRecord.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } });
      if (!existing) throw new TRPCError3({ code: "NOT_FOUND", message: "Financial record not found." });
      if (existing.approvalStatus !== "PENDING_APPROVAL") throw new TRPCError3({ code: "BAD_REQUEST", message: "This financial record does not require approval." });
      const approved = await fleetDb.financialRecord.update({ where: { id: existing.id }, data: { approvalStatus: "APPROVED", approvedById: ctx.fleetopsUser.id, approvalReason: input.reason } });
      await recordAudit(ctx, { action: "FINANCIAL_RECORD_APPROVED", entityType: "FINANCIAL_RECORD", entityId: existing.id, summary: `Approved financial record \u20B9${Number(existing.amount).toLocaleString("en-IN")}`, metadata: { reason: input.reason } });
      return approved;
    }),
    reverse: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid(), reason: z2.string().min(3) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"]);
      assertWritable(ctx.fleetopsUser.org);
      const existing = await fleetDb.financialRecord.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } });
      if (!existing) throw new TRPCError3({ code: "NOT_FOUND", message: "Financial record not found." });
      const priorReversal = await fleetDb.financialRecord.findFirst({ where: { orgId: ctx.fleetopsUser.orgId, reversalOfId: existing.id } });
      if (priorReversal) throw new TRPCError3({ code: "CONFLICT", message: "This financial record has already been reversed." });
      const reversal = await fleetDb.financialRecord.create({ data: { id: crypto.randomUUID(), orgId: ctx.fleetopsUser.orgId, vehicleId: existing.vehicleId, type: existing.type === "EXPENSE" ? "REVENUE" : "EXPENSE", category: `REVERSAL:${existing.category}`, amount: Number(existing.amount), transactionDate: /* @__PURE__ */ new Date(), approvalStatus: existing.approvalStatus === "APPROVED" ? "APPROVED" : "PENDING_APPROVAL", reversalOfId: existing.id, approvalReason: input.reason } });
      await recordAudit(ctx, { action: "FINANCIAL_RECORD_REVERSED", entityType: "FINANCIAL_RECORD", entityId: existing.id, summary: `Reversed financial record \u20B9${Number(existing.amount).toLocaleString("en-IN")}`, metadata: { reversalId: reversal.id, reason: input.reason } });
      return reversal;
    })
  }),
  billing: router({
    status: fleetOpsProcedure.query(({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN"]);
      return { tier: ctx.fleetopsUser.org.subscriptionTier, trialEndsAt: ctx.fleetopsUser.org.trialEndsAt, daysRemaining: Math.max(0, Math.ceil((ctx.fleetopsUser.org.trialEndsAt.getTime() - Date.now()) / 864e5)), maxVehicles: ctx.fleetopsUser.org.maxVehicles, maxUsers: ctx.fleetopsUser.org.maxUsers, writeLocked: ctx.fleetopsUser.org.subscriptionTier === "TRIAL_FREE" && ctx.fleetopsUser.org.trialEndsAt.getTime() < Date.now() };
    })
  }),
  activity: router({
    recent: fleetOpsProcedure.query(async ({ ctx }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER"]);
      const [orders, alerts, odometers] = await Promise.all([
        fleetDb.workOrder.findMany({ where: ["MECHANIC", "TECHNICIAN"].includes(ctx.fleetopsUser.role) ? { orgId: ctx.fleetopsUser.orgId, assignedMechanicId: ctx.fleetopsUser.id } : { orgId: ctx.fleetopsUser.orgId }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 10 }),
        fleetDb.notification.findMany({ where: { orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, orderBy: { createdAt: "desc" }, take: 10 }),
        fleetDb.odometerLog.findMany({ where: ctx.fleetopsUser.role === "DRIVER" ? { vehicle: { orgId: ctx.fleetopsUser.orgId }, driverId: ctx.fleetopsUser.id } : { vehicle: { orgId: ctx.fleetopsUser.orgId } }, include: { vehicle: true }, orderBy: { createdAt: "desc" }, take: 10 })
      ]);
      return [
        ...orders.map((order) => ({ id: order.id, kind: "work_order", title: order.title, detail: `${order.vehicle?.licensePlate ?? order.vehicleId} \xB7 ${order.status}`, createdAt: order.createdAt })),
        ...alerts.map((alert) => ({ id: alert.id, kind: "notification", title: alert.title, detail: alert.message, createdAt: alert.createdAt })),
        ...odometers.map((log) => ({ id: log.id, kind: "odometer", title: `Odometer updated \xB7 ${log.vehicle?.licensePlate ?? log.vehicleId}`, detail: `${Number(log.reading).toLocaleString("en-IN")} km${log.isFlagged ? " \xB7 flagged" : ""}`, createdAt: log.createdAt }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
    })
  }),
  notifications: router({
    list: fleetOpsProcedure.query(({ ctx }) => fleetDb.notification.findMany({ where: { orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, orderBy: { resolvedAt: "asc", createdAt: "desc" }, take: 50 })),
    markRead: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid() })).mutation(({ ctx, input }) => fleetDb.notification.updateMany({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId, recipientId: ctx.fleetopsUser.id }, data: { isRead: true, acknowledgedAt: /* @__PURE__ */ new Date() } })),
    escalate: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      const current = await fleetDb.notification.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } });
      if (!current) throw new TRPCError3({ code: "NOT_FOUND", message: "Notification not found." });
      if (current.resolvedAt) throw new TRPCError3({ code: "BAD_REQUEST", message: "Resolved notifications cannot be escalated." });
      const updated = await fleetDb.notification.update({ where: { id: current.id }, data: { escalationLevel: (current.escalationLevel ?? 0) + 1, isRead: false } });
      await recordAudit(ctx, { action: "NOTIFICATION_ESCALATED", entityType: "NOTIFICATION", entityId: current.id, summary: `Escalated ${current.title}`, metadata: { escalationLevel: updated.escalationLevel, sourceType: current.sourceType } });
      return updated;
    }),
    resolve: fleetOpsProcedure.input(z2.object({ id: z2.string().uuid(), note: z2.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"]);
      const current = await fleetDb.notification.findFirst({ where: { id: input.id, orgId: ctx.fleetopsUser.orgId } });
      if (!current) throw new TRPCError3({ code: "NOT_FOUND", message: "Notification not found." });
      if (current.resolvedAt) return current;
      if (current.sourceType === "VEHICLE_ISSUE" && current.referenceId) {
        const issue = await fleetDb.vehicleIssue.findFirst({ where: { id: current.referenceId, orgId: ctx.fleetopsUser.orgId } });
        if (!issue || !["RESOLVED", "CLOSED"].includes(issue.status)) throw new TRPCError3({ code: "BAD_REQUEST", message: "Resolve the source vehicle issue before closing this notification." });
      }
      if (current.sourceType === "WORK_ORDER" && current.referenceId) {
        const order = await fleetDb.workOrder.findFirst({ where: { id: current.referenceId, orgId: ctx.fleetopsUser.orgId } });
        if (!order || order.status !== "COMPLETED") throw new TRPCError3({ code: "BAD_REQUEST", message: "Complete the source work order before closing this notification." });
      }
      if (current.sourceType === "VEHICLE" && current.referenceId) {
        const vehicle = await fleetDb.vehicle.findFirst({ where: { id: current.referenceId, orgId: ctx.fleetopsUser.orgId } });
        if (!vehicle || vehicle.status !== "ACTIVE") throw new TRPCError3({ code: "BAD_REQUEST", message: "Clear the source vehicle before closing this notification." });
      }
      const updated = await fleetDb.notification.update({ where: { id: current.id }, data: { isRead: true, acknowledgedAt: current.acknowledgedAt ?? /* @__PURE__ */ new Date(), resolvedAt: /* @__PURE__ */ new Date() } });
      await recordAudit(ctx, { action: "NOTIFICATION_RESOLVED", entityType: "NOTIFICATION", entityId: current.id, summary: `Resolved ${current.title}`, metadata: { note: input.note, sourceType: current.sourceType, referenceId: current.referenceId } });
      return updated;
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  let fleetopsUser = null;
  try {
    fleetopsUser = await getFleetOpsUserFromRequest(opts.req);
  } catch (error) {
    console.warn("[Supabase] Failed to resolve FleetOps user", error);
  }
  return { req: opts.req, res: opts.res, user, fleetopsUser };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/maintenance.ts
async function maintenanceCallback(req, res) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    const result = await evaluateAllOrganizations();
    return res.status(200).json({ ok: true, taskUid: user.taskUid, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: message,
      context: { path: req.path, taskUid: req.headers["x-manus-task-uid"] ?? null },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}

// serverless-entry.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.post("/api/scheduled/maintenance", maintenanceCallback);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
var serverless_entry_default = app;
export {
  serverless_entry_default as default
};
