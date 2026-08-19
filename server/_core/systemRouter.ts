import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { sql } from "drizzle-orm";
import { db } from "../db";

const RELEASE = "fleetops-observability-20260820";

export const systemRouter = router({
  health: publicProcedure
    .input(z.object({ timestamp: z.number().min(0, "timestamp cannot be negative") }))
    .query(async ({ input }) => {
      const startedAt = Date.now();
      try {
        await db.execute(sql`select 1`);
        return { ok: true, release: RELEASE, database: "ok" as const, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, clientTimestamp: input.timestamp };
      } catch {
        return { ok: false, release: RELEASE, database: "degraded" as const, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt, clientTimestamp: input.timestamp };
      }
    }),
  release: publicProcedure.query(() => ({ release: RELEASE, service: "FleetOps API", environment: process.env.NODE_ENV === "production" ? "production" : "development" })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
