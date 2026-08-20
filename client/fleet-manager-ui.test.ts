import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
const wrapper = readFileSync(resolve(process.cwd(), "client/src/components/FunctionalWorkspace.tsx"), "utf8");
const resourceWorkspace = readFileSync(resolve(process.cwd(), "client/src/components/workspaces/ResourceWorkspace.tsx"), "utf8");

describe("Fleet Manager workspace UI refinement", () => {
  it("provides contextual page headers for every Fleet Manager operational page", () => {
    expect(wrapper).toContain("workspace-page-header");
    expect(wrapper).toContain("Vehicles");
    expect(wrapper).toContain("Components");
    expect(wrapper).toContain("Work orders");
    expect(wrapper).toContain("Compliance vault");
    expect(wrapper).toContain("workspace-chain");
  });

  it("keeps dedicated resource pages on shared responsive form and table primitives", () => {
    expect(resourceWorkspace).toContain("workspace-form");
    expect(resourceWorkspace).toContain("invite-form");
    expect(resourceWorkspace).toContain("workspace-table");
    expect(resourceWorkspace).toContain("resource-list");
  });

  it("includes the refined operational hierarchy and responsive states", () => {
    expect(css).toContain(".fleet-manager-surface");
    expect(css).toContain(".workspace-page-header");
    expect(css).toContain(".workspace-chain");
    expect(css).toContain("@media (max-width: 620px)");
    expect(css).toContain(".workspace-state");
  });
});
