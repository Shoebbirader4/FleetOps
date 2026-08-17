import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertWritable, requireRole } from "./routers";

describe("FleetOps rules", () => {
  it("allows writes during an active trial", () => {
    expect(() => assertWritable({ subscriptionTier: "TRIAL_FREE", trialEndsAt: new Date(Date.now() + 60_000) })).not.toThrow();
  });

  it("blocks writes after the trial expires", () => {
    expect(() => assertWritable({ subscriptionTier: "TRIAL_FREE", trialEndsAt: new Date(Date.now() - 60_000) })).toThrowError(TRPCError);
  });

  it("allows only explicitly granted roles", () => {
    expect(() => requireRole("MECHANIC", ["MECHANIC", "TECHNICIAN"])).not.toThrow();
    expect(() => requireRole("DRIVER", ["MECHANIC", "TECHNICIAN"])).toThrowError(TRPCError);
  });
});
