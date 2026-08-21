import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./src/components/RoleWorkspaces.tsx", import.meta.url), "utf8");

describe("Inventory Manager part detail UI", () => {
  it("loads detail only after a part is selected", () => {
    expect(source).toContain("const [selectedPartId, setSelectedPartId] = useState(\"\")");
    expect(source).toContain("trpc.inventory.get.useQuery({ partId: selectedPartId }");
    expect(source).toContain("enabled: Boolean(selectedPartId)");
  });

  it("lets operators select a stock row and see movement-backed availability", () => {
    expect(source).toContain("onClick={() => setSelectedPartId(item.id)}");
    expect(source).toContain("reserved} reserved · {partDetail.data.available} available");
    expect(source).toContain("persisted reservation, release, and issue movements");
  });
});
