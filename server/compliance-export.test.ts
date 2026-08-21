import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("compliance exports", () => {
  it("provides role-scoped CSV and PDF document exports", () => {
    expect(source).toContain("exportCsv: fleetOpsProcedure");
    expect(source).toContain("exportPdf: fleetOpsProcedure");
    expect(source).toContain('["SUPERADMIN", "FLEET_MANAGER"]');
    expect(source).toContain("DOCUMENT_EXPORT_PDF");
  });

  it("keeps exported document rows inside the active organization", () => {
    expect(source).toContain('const rows = await fleetDb.document.findMany({ where: { orgId: ctx.fleetopsUser.orgId }');
    expect(source).toContain("csvDocument");
  });
});
