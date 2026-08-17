import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { prisma } from "./prisma";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
}

export const supabaseAdmin = createClient(
  supabaseUrl ?? "http://localhost:54321",
  serviceRoleKey ?? "development-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  const cookieToken = req.cookies?.["sb-access-token"] ?? req.cookies?.["supabase-auth-token"];
  return typeof cookieToken === "string" ? cookieToken : null;
}

export async function getSupabaseAuthIdentity(req: Request) {
  const token = getBearerToken(req);
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getFleetOpsUserFromRequest(req: Request) {
  const authUser = await getSupabaseAuthIdentity(req);
  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    include: { org: true },
  });
  return user ? { ...user, name: user.fullName } : null;
}

export async function provisionFleetOpsUser(input: {
  authUserId: string;
  email: string;
  fullName: string;
  orgName?: string;
  role?: "SUPERADMIN" | "FLEET_MANAGER" | "MECHANIC" | "TECHNICIAN" | "DRIVER" | "INVENTORY_MANAGER" | "ACCOUNTANT";
}) {
  const existing = await prisma.user.findUnique({ where: { authUserId: input.authUserId }, include: { org: true } });
  if (existing) return existing;

  const role = input.role ?? "SUPERADMIN";
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: input.orgName ?? `${input.fullName}'s Fleet`,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxVehicles: 3,
        maxUsers: 5,
      },
    });

    return tx.user.create({
      data: {
        authUserId: input.authUserId,
        orgId: org.id,
        email: input.email,
        fullName: input.fullName,
        role,
      },
      include: { org: true },
    });
  });
}
