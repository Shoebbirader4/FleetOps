import { describe, expect, it } from "vitest";
import { renderInvitationEmail } from "./invitation-email";

describe("invitation email template", () => {
  it("renders branded secure join content without operational data", () => {
    const result = renderInvitationEmail({ organizationName: "Transit <Ops>", inviteeEmail: "driver@example.com", role: "FLEET_MANAGER", joinUrl: "https://fleetops.example/join/token", expiresAt: new Date("2026-09-01T00:00:00Z") });
    expect(result.subject).toContain("Transit <Ops>");
    expect(result.text).toContain("https://fleetops.example/join/token");
    expect(result.html).toContain("Transit &lt;Ops&gt;");
    expect(result.html).toContain("Join organization");
    expect(result.html).not.toContain("vehicle");
    expect(result.html).not.toContain("work order");
  });
});
