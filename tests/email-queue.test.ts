import { describe, it, expect } from "vitest";
import {
  EmailQueueDispatcher,
  EmailJob,
  EMAIL_SCENARIOS,
  EmailScenarioType,
} from "../src/core/domain/email-queue";
import { StudentRecord } from "../src/core/domain/roster";

describe("EmailQueueDispatcher - Scenario Logic & Lifecycle", () => {
  const sampleStudents: StudentRecord[] = [
    {
      id: "CSE-101",
      name: "Alice Johnson",
      email: "alice@university.edu",
      department: "CSE",
      assignedSeat: "A-12",
      assignedRoom: "Auditorium East",
      foodPreference: "Vegetarian",
    },
    {
      id: "EEE-202",
      name: "Bob Smith",
      email: "bob@university.edu",
      department: "EEE",
      assignedSeat: undefined, // no seat
      assignedRoom: undefined,
      foodPreference: "Non-Veg",
    },
    {
      id: "BBA-303",
      name: "Charlie Brown",
      email: "invalid-email-address", // bad email
      department: "BBA",
      assignedSeat: "C-05",
      assignedRoom: "Hall B",
    },
    {
      id: "CSE-404",
      name: "Dana White",
      email: "", // empty email
      department: "CSE",
      assignedSeat: "A-15",
      assignedRoom: "Auditorium East",
    },
  ];

  it("should provide predefined email scenario presets for event lifecycle", () => {
    expect(EMAIL_SCENARIOS.SEAT_NOTICE).toBeDefined();
    expect(EMAIL_SCENARIOS.CERTIFICATE_DISPATCH).toBeDefined();
    expect(EMAIL_SCENARIOS.GATE_PASS).toBeDefined();
    expect(EMAIL_SCENARIOS.URGENT_ANNOUNCEMENT).toBeDefined();

    expect(EMAIL_SCENARIOS.SEAT_NOTICE.defaultSubject).toContain("{{Seat_Number}}");
    expect(EMAIL_SCENARIOS.CERTIFICATE_DISPATCH.suggestedAttachment).toBe(true);
  });

  it("should create email jobs with enriched event variables and context", () => {
    const jobs = EmailQueueDispatcher.createJobs(
      [sampleStudents[0]],
      "Seat Pass for {{Event_Name}} - {{Seat_Number}}",
      "Hello {{Name}}, your seat in {{Room}} is {{Seat_Number}}. Verification: {{Verification_Url}}",
      {
        eventName: "Annual Hackathon 2026",
        organizerName: "Tech Club Executive",
        reportingTime: "08:30 AM",
        verificationBaseUrl: "https://campus.edu/verify",
      }
    );

    expect(jobs.length).toBe(1);
    expect(jobs[0].recipientEmail).toBe("alice@university.edu");
    expect(jobs[0].subject).toBe("Seat Pass for Annual Hackathon 2026 - A-12");
    expect(jobs[0].body).toContain("Auditorium East");
    expect(jobs[0].body).toContain("A-12");
    expect(jobs[0].body).toContain("https://campus.edu/verify?id=CSE-101");
  });

  it("should filter recipients logically based on scenario requirements", () => {
    // Only students with assigned seats
    const seatedOnly = EmailQueueDispatcher.filterRecipients(sampleStudents, {
      requireAssignedSeat: true,
      validEmailOnly: false,
    });
    expect(seatedOnly.length).toBe(3); // Alice, Charlie, Dana have seats; Bob does not

    // Only students with valid email addresses
    const validEmailsOnly = EmailQueueDispatcher.filterRecipients(sampleStudents, {
      validEmailOnly: true,
    });
    expect(validEmailsOnly.length).toBe(2); // Alice and Bob have valid emails

    // Department filter + valid email + seated
    const cseSeatedValid = EmailQueueDispatcher.filterRecipients(sampleStudents, {
      department: "CSE",
      requireAssignedSeat: true,
      validEmailOnly: true,
    });
    expect(cseSeatedValid.length).toBe(1);
    expect(cseSeatedValid[0].id).toBe("CSE-101");
  });

  it("should run preflight analysis detecting missing tags and invalid emails", () => {
    const diagnostic = EmailQueueDispatcher.analyzePreflight(
      sampleStudents,
      EMAIL_SCENARIOS.SEAT_NOTICE.defaultSubject,
      EMAIL_SCENARIOS.SEAT_NOTICE.defaultBodyText
    );

    expect(diagnostic.totalCount).toBe(4);
    expect(diagnostic.invalidEmailCount).toBe(2); // Charlie (bad syntax) & Dana (empty)
    expect(diagnostic.missingSeatCount).toBe(1); // Bob has no seat
    expect(diagnostic.hasSeatTag).toBe(true);
    expect(diagnostic.warnings.length).toBeGreaterThan(0);
  });

  it("should isolate failed jobs for retry", () => {
    const jobs: EmailJob[] = [
      {
        id: "1",
        studentId: "S1",
        recipientEmail: "s1@test.com",
        subject: "Sub 1",
        body: "Body 1",
        status: "SENT",
      },
      {
        id: "2",
        studentId: "S2",
        recipientEmail: "s2@test.com",
        subject: "Sub 2",
        body: "Body 2",
        status: "FAILED",
        error: "SMTP Rate Limit Exceeded",
      },
    ];

    const failed = EmailQueueDispatcher.getFailedJobs(jobs);
    expect(failed.length).toBe(1);
    expect(failed[0].studentId).toBe("S2");
  });

  it("should generate responsive HTML email layout with header and formatted lists", () => {
    const html = EmailQueueDispatcher.generateHtmlBody(
      "Dear Alice,\n\nHere are details:\n• Seat: A-12\n• Hall: East\n\nSee you there!",
      { eventName: "Annual Gala 2026", organizerName: "Student Council" }
    );

    expect(html).toContain("Annual Gala 2026");
    expect(html).toContain("Student Council");
    expect(html).toContain("<ul");
    expect(html).toContain("Seat: A-12");
  });
});
