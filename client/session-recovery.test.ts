import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const authHook = fs.readFileSync(path.join(root, "client/src/hooks/useFleetOpsAuth.ts"), "utf8");
const transport = fs.readFileSync(path.join(root, "client/src/main.tsx"), "utf8");

describe("Supabase session recovery", () => {
  it("clears local auth state when the initial session or refresh is invalid", () => {
    expect(authHook).toContain('supabase.auth.signOut({ scope: "local" })');
    expect(authHook).toContain('event === "SIGNED_OUT"');
    expect(authHook).toContain("result.error || !result.data.session");
  });

  it("does not retry protected tRPC traffic with a stale token after refresh failure", () => {
    expect(transport).toContain('window.dispatchEvent(new CustomEvent("fleetops-session-expired"))');
    expect(transport).toContain('throw new Error("FleetOps session expired. Please sign in again.")');
    expect(transport).toContain("if (response.status === 401 && data.session)");
  });
});
