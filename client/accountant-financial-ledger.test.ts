import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const ui = fs.readFileSync(path.join(root, "client/src/components/FunctionalWorkspace.tsx"), "utf8");
const router = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");

describe("Accountant financial ledger", () => {
  it("renders a complete INR financial-entry form and transaction ledger", () => {
    expect(ui).toContain("Add financial record");
    expect(ui).toContain("Record type");
    expect(ui).toContain("Category");
    expect(ui).toContain("Amount (₹)");
    expect(ui).toContain("Transaction date");
    expect(ui).toContain("Financial ledger");
    expect(ui).toContain("trpc.financials.create");
    expect(ui).toContain("trpc.financials.list");
    expect(ui).toContain("Tenant-scoped records");
    expect(ui).toContain("trpc.financials.exportCsv");
    expect(ui).toContain("Export CSV");
    expect(ui).toContain("trpc.financials.exportPdf");
    expect(ui).toContain("Export PDF");
  });

  it("keeps financial procedures restricted to Accountant and Superadmin", () => {
    expect(router).toContain("financials: router({");
    expect(router).toContain('requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "ACCOUNTANT"])');
    expect(router).toContain('type: z.enum(["REVENUE", "EXPENSE"])');
    expect(router).toContain("transactionDate: z.coerce.date()");
    expect(router).toContain("orgId: ctx.fleetopsUser.orgId");
    expect(router).toContain("FINANCIAL_EXPORT_CSV");
    expect(router).toContain("amountInr");
    expect(router).toContain("FINANCIAL_EXPORT_PDF");
    expect(router).toContain("simplePdf");
  });
});
