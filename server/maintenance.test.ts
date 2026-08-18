import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateRequest = vi.fn();
const evaluateAllOrganizations = vi.fn();

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));
vi.mock("./automation", () => ({ evaluateAllOrganizations }));

const { maintenanceCallback } = await import("./maintenance");

function responseMock() {
  const res: any = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("maintenance callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-cron callers", async () => {
    authenticateRequest.mockResolvedValue({ isCron: false });
    const res = responseMock();

    await maintenanceCallback({ path: "/api/scheduled/maintenance", headers: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(evaluateAllOrganizations).not.toHaveBeenCalled();
  });

  it("evaluates all organizations for an authenticated cron task", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task_123" });
    evaluateAllOrganizations.mockResolvedValue({ organizations: 2, maintenanceOrders: 1, lowStockParts: 3, draftPurchaseOrders: 1, expiringDocuments: 0 });
    const res = responseMock();

    await maintenanceCallback({ path: "/api/scheduled/maintenance", headers: {} } as any, res);

    expect(evaluateAllOrganizations).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, taskUid: "task_123", organizations: 2, maintenanceOrders: 1, lowStockParts: 3, draftPurchaseOrders: 1, expiringDocuments: 0 });
  });

  it("returns a diagnostic 500 when evaluation fails", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task_123" });
    evaluateAllOrganizations.mockRejectedValue(new Error("database unavailable"));
    const res = responseMock();

    await maintenanceCallback({ path: "/api/scheduled/maintenance", headers: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: "database unavailable", context: { path: "/api/scheduled/maintenance" } });
  });
});
