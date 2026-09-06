import { describe, it, expect } from "vitest";
import { EmailQueueDispatcher, EmailJob } from "../src/core/domain/email-queue";
import { StudentRecord } from "../src/core/domain/roster";

describe("EmailQueueDispatcher", () => {
  const students: StudentRecord[] = [
    { id: "S1", name: "Alice", email: "alice@test.com" },
    { id: "S2", name: "Bob", email: "bob@test.com" },
  ];

  it("should create email jobs with personalized variables", () => {
    const jobs = EmailQueueDispatcher.createJobs(
      students,
      "Your Certificate - {{Name}}",
      "Hello {{Name}}, your student ID is {{Student_ID}}."
    );

    expect(jobs.length).toBe(2);
    expect(jobs[0].recipientEmail).toBe("alice@test.com");
    expect(jobs[0].subject).toBe("Your Certificate - Alice");
    expect(jobs[0].body).toBe("Hello Alice, your student ID is S1.");
    expect(jobs[1].recipientEmail).toBe("bob@test.com");
    expect(jobs[1].subject).toBe("Your Certificate - Bob");
  });

  it("should isolate failed jobs for easy retry", () => {
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
        error: "SMTP Timeout",
      },
    ];

    const failed = EmailQueueDispatcher.getFailedJobs(jobs);
    expect(failed.length).toBe(1);
    expect(failed[0].studentId).toBe("S2");
  });
});
