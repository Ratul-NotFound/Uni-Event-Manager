import { StudentRecord } from "./roster";

export type EmailJobStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";

export interface EmailJob {
  id: string;
  studentId: string;
  studentName?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  attachmentFilename?: string;
  attachmentBase64?: string;
  status: EmailJobStatus;
  error?: string;
  sentAt?: number;
}

export interface EmailProviderConfig {
  provider: "smtp" | "resend" | "brevo" | "emailjs" | "simulate";
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  apiKey?: string;
  fromName: string;
  fromEmail: string;
  delayMs: number; // throttling delay between emails (e.g. 1500ms)
}

export class EmailQueueDispatcher {
  /**
   * Generates a personalized EmailJob for each student in the list.
   */
  public static createJobs(
    students: StudentRecord[],
    subjectTemplate: string,
    bodyTemplate: string
  ): EmailJob[] {
    return students.map((s, idx) => {
      const interpolate = (tpl: string) =>
        tpl
          .replace(/\{\{\s*(Name|FullName)\s*\}\}/gi, s.name || "")
          .replace(/\{\{\s*(Student_ID|ID|Roll)\s*\}\}/gi, s.id || "")
          .replace(/\{\{\s*(Department|Dept)\s*\}\}/gi, s.department || "")
          .replace(/\{\{\s*(Seat_Number|Seat|Assigned_Seat)\s*\}\}/gi, s.assignedSeat || "Open")
          .replace(/\{\{\s*(Room|Assigned_Room)\s*\}\}/gi, s.assignedRoom || "Main Hall");

      return {
        id: `job-${idx + 1}-${Date.now()}`,
        studentId: s.id,
        studentName: s.name,
        recipientEmail: s.email || "",
        subject: interpolate(subjectTemplate),
        body: interpolate(bodyTemplate),
        status: "PENDING",
      };
    });
  }

  public static getFailedJobs(jobs: EmailJob[]): EmailJob[] {
    return jobs.filter((j) => j.status === "FAILED");
  }

  public static getPendingJobs(jobs: EmailJob[]): EmailJob[] {
    return jobs.filter((j) => j.status === "PENDING");
  }

  /**
   * Generates a pre-formatted Mail-Merge CSV ready for external tools like Outlook/Thunderbird.
   */
  public static formatMailMergeCsv(jobs: EmailJob[]): string {
    const headers = ["Student_ID", "Student_Name", "Email", "Subject", "Body", "Attachment_Filename"];
    const rows = jobs.map((j) => [
      `"${j.studentId}"`,
      `"${j.studentName || ""}"`,
      `"${j.recipientEmail}"`,
      `"${j.subject.replace(/"/g, '""')}"`,
      `"${j.body.replace(/"/g, '""')}"`,
      `"${j.attachmentFilename || `Cert_${j.studentId}.pdf`}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}
