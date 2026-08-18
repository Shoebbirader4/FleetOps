import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const landing = fs.readFileSync(path.join(root, "client/src/pages/LandingPage.tsx"), "utf8");
const app = fs.readFileSync(path.join(root, "client/src/App.tsx"), "utf8");
const home = fs.readFileSync(path.join(root, "client/src/pages/Home.tsx"), "utf8");

describe("public FleetOps landing page", () => {
  it("exposes distinct public calls to action", () => {
    expect(landing).toContain("Sign In");
    expect(landing).toContain("/login");
    expect(landing).toContain("Create Organization");
    expect(landing).toContain("/create-organization");
    expect(landing).toContain("Fleet readiness");
    expect(landing).toContain("Role-safe by design");
  });

  it("routes public auth paths without replacing invitation or workspace routes", () => {
    expect(app).toContain('path="/login"');
    expect(app).toContain('path="/create-organization"');
    expect(app).toContain('path="/join/:token"');
    expect(app).toContain('path="/workspace/:section"');
    expect(home).toContain('publicMode === "landing"');
    expect(home).toContain('publicMode === "signup"');
  });
});
