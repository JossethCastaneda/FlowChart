import { describe, it, expect } from "vitest";
import {
  getInviteEmailHtml,
  getPasswordResetEmailHtml,
  getWelcomeEmailHtml,
  getTaskAssignedEmailHtml,
  getSLAWarningEmailHtml
} from "@/lib/email-templates";

describe("Email Templates", () => {
  it("should generate invite email html", () => {
    const html = getInviteEmailHtml({
      inviterName: "Alice",
      workspaceName: "My Agency",
      role: "ADMIN",
      inviteUrl: "invite-url"
    });
    expect(html).toContain("My Agency");
    expect(html).toContain("invite-url");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("should generate password reset email html", () => {
    const html = getPasswordResetEmailHtml({
      userName: "Bob",
      resetUrl: "reset-url"
    });
    expect(html).toContain("reset-url");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("should generate welcome email html", () => {
    const html = getWelcomeEmailHtml({
      userName: "John Doe",
      dashboardUrl: "https://app.example.com"
    });
    expect(html).toContain("John Doe");
    expect(html).toContain("https://app.example.com");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("should generate task assigned email html", () => {
    const html = getTaskAssignedEmailHtml({
      taskTitle: "Fix bug",
      assigneeName: "Bob",
      assignerName: "Alice",
      priority: "High",
      dueDate: "2026-08-10",
      taskUrl: "task-url",
    });
    expect(html).toContain("Fix bug");
    expect(html).toContain("Alice");
    expect(html).toContain("task-url");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("should generate SLA warning email html", () => {
    const html = getSLAWarningEmailHtml({
      taskTitle: "Critical bug",
      userName: "Bob",
      dueDate: "2026-08-04",
      hoursLeft: 2,
      taskUrl: "sla-url",
    });
    expect(html).toContain("Critical bug");
    expect(html).toContain("2");
    expect(html).toContain("sla-url");
    expect(html).toContain("<!DOCTYPE html>");
  });
});
