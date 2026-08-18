import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Pool } = pg;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const baseUrl = process.env.FLEETOPS_BASE_URL ?? "https://fleetops-elktaacw.manus.space";
if (!supabaseUrl || !serviceKey || !anonKey) throw new Error("Supabase server and browser keys are required");

const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const pool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL, ssl: { rejectUnauthorized: false } });
const runId = Date.now().toString(36);
const ownerEmail = `fleetops.e2e.owner.${runId}@example.com`;
const invitedEmail = `fleetops.e2e.driver.${runId}@example.com`;
const password = `FleetOpsE2E!${runId}A`;
const results = [];
let ownerId;
let invitedId;
let orgId;
let invitationId;

async function tRPC(path, token, input, method = "POST") {
  const query = encodeURIComponent(JSON.stringify({ 0: { json: input } }));
  const url = `${baseUrl}/api/trpc/${path}?batch=1${method === "GET" ? `&input=${query}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === "GET" ? undefined : JSON.stringify({ 0: { json: input } }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 600)}`);
  const value = payload?.[0]?.result?.data?.json ?? payload?.[0]?.result?.data;
  if (payload?.[0]?.error) throw new Error(`${path} tRPC error: ${JSON.stringify(payload[0].error).slice(0, 600)}`);
  return value;
}

async function signIn(email) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  return data.session.access_token;
}

async function check(name, fn) {
  try {
    const value = await fn();
    results.push({ name, status: "PASS", detail: typeof value === "string" ? value : "completed" });
    return value;
  } catch (error) {
    results.push({ name, status: "FAIL", detail: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

try {
  const owner = await check("Create temporary Superadmin Auth user", async () => {
    const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true, user_metadata: { fullName: "FleetOps E2E Owner", needsOnboarding: true } });
    if (error || !data.user) throw error ?? new Error("No owner user returned");
    ownerId = data.user.id;
    return data.user.id;
  });
  const ownerToken = await check("Sign in temporary Superadmin", () => signIn(ownerEmail));
  const ownerContext = await check("Bootstrap or load organization", () => tRPC("onboarding.bootstrap", ownerToken, { orgName: `FleetOps E2E ${runId}`, fullName: "FleetOps E2E Owner" }));
  orgId = ownerContext.id ? ownerContext.orgId : undefined;
  const summary = await check("Load protected dashboard summary", () => tRPC("dashboard.summary", ownerToken, null, "GET"));
  if (!summary?.org?.id) throw new Error("Dashboard summary did not return an organization");
  orgId = summary.org.id;
  await check("Complete organization onboarding", () => tRPC("onboarding.complete", ownerToken, { orgName: `FleetOps E2E ${runId}`, fullName: "FleetOps E2E Owner" }));

  const invited = await check("Create temporary invited Auth user", async () => {
    const { data, error } = await admin.auth.admin.createUser({ email: invitedEmail, password, email_confirm: true, user_metadata: { fullName: "FleetOps E2E Driver" } });
    if (error || !data.user) throw error ?? new Error("No invited user returned");
    invitedId = data.user.id;
    return data.user.id;
  });
  const invitation = await check("Create published Team invitation", () => tRPC("team.invite", ownerToken, { email: invitedEmail, role: "DRIVER" }));
  invitationId = invitation.id;
  if (!invitation?.joinUrl || !invitation?.tokenHash) throw new Error("Invitation did not return join URL and token");
  const details = await check("Resolve organization-bound invitation details", () => tRPC("onboarding.inviteDetails", undefined, { token: invitation.tokenHash }, "GET"));
  if (details.email !== invitedEmail || details.role !== "DRIVER" || details.organization.id !== orgId) throw new Error("Invitation details were not organization-bound");
  const invitedToken = await check("Sign in temporary invited user", () => signIn(invitedEmail));
  const joined = await check("Redeem invitation as invited user", () => tRPC("onboarding.acceptInvite", invitedToken, { token: invitation.tokenHash, fullName: "FleetOps E2E Driver" }));
  if (joined.role !== "DRIVER" || joined.orgId !== orgId) throw new Error("Redeemed user role or organization mismatch");
  await check("Confirm invited user cannot access Superadmin billing", async () => {
    try { await tRPC("billing.status", invitedToken, null); } catch (error) { if (String(error).includes("FORBIDDEN") || String(error).includes("FORBIDDEN")) return "denied as expected"; throw error; }
    throw new Error("Driver was allowed to access billing");
  });
  await check("Confirm invitation is no longer reusable", async () => {
    try { await tRPC("onboarding.inviteDetails", undefined, { token: invitation.tokenHash }, "GET"); } catch (error) { if (String(error).includes("NOT_FOUND") || String(error).includes("invalid")) return "rejected as expected"; throw error; }
    throw new Error("Redeemed invitation remained reusable");
  });
} finally {
  await pool.query(`DELETE FROM invitations WHERE id = $1 OR email IN ($2, $3)`, [invitationId ?? "00000000-0000-0000-0000-000000000000", ownerEmail, invitedEmail]).catch(() => {});
  if (orgId) {
    await pool.query(`DELETE FROM users WHERE org_id = $1`, [orgId]).catch(() => {});
    await pool.query(`DELETE FROM organizations WHERE id = $1`, [orgId]).catch(() => {});
  }
  if (ownerId) await admin.auth.admin.deleteUser(ownerId).catch(() => {});
  if (invitedId) await admin.auth.admin.deleteUser(invitedId).catch(() => {});
  await pool.end().catch(() => {});
}

console.log(JSON.stringify({ runId, ownerEmail, invitedEmail, results }, null, 2));
if (results.some((item) => item.status === "FAIL")) process.exitCode = 1;
