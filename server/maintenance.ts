import type { Request, Response } from "express";
import { evaluateAllOrganizations } from "./automation";
import { sdk } from "./_core/sdk";

export async function maintenanceCallback(req: Request, res: Response) {
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
      timestamp: new Date().toISOString(),
    });
  }
}
