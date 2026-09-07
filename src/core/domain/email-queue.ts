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

export type EmailScenarioType =
  | "SEAT_NOTICE"
  | "CERTIFICATE_DISPATCH"
  | "GATE_PASS"
  | "URGENT_ANNOUNCEMENT";

export interface EmailScenarioPreset {
  id: EmailScenarioType;
  title: string;
  subtitle: string;
  badge: string;
  defaultSubject: string;
  defaultBodyText: string;
  suggestedAttachment: boolean;
  defaultAttachmentName?: string;
  recommendedFilters: {
    requiresAssignedSeat?: boolean;
    validEmailOnly?: boolean;
    requireAttended?: boolean;
  };
  supportedTags: { tag: string; description: string; sampleValue: string }[];
}

export interface TemplateContext {
  eventName?: string;
  organizerName?: string;
  reportingTime?: string;
  verificationBaseUrl?: string;
  customFields?: Record<string, string>;
}

export interface RecipientFilterOptions {
  department?: string; // "ALL" or specific dept
  requireAssignedSeat?: boolean;
  requireAttended?: boolean;
  validEmailOnly?: boolean;
  searchQuery?: string;
}

export interface PreflightDiagnostic {
  totalCount: number;
  eligibleCount: number;
  invalidEmailCount: number;
  missingSeatCount: number;
  warnings: string[];
  unresolvedTags: string[];
  hasSeatTag: boolean;
  canSafelyDispatch: boolean;
}

export const EMAIL_SCENARIOS: Record<EmailScenarioType, EmailScenarioPreset> = {
  SEAT_NOTICE: {
    id: "SEAT_NOTICE",
    title: "Seat & Venue Allocation Pass",
    subtitle: "Pre-Event: Dispatch assigned Seat Number, Hall/Room, reporting time, and venue guidelines",
    badge: "Pre-Event Logistics",
    defaultSubject: "Official Seat & Venue Pass: {{Event_Name}} - {{Name}} [Seat: {{Seat_Number}}]",
    defaultBodyText: `Dear {{Name}},

We are pleased to share your confirmed seat and hall allocation for {{Event_Name}}!

Your Allocation Details:
• Student ID: {{Student_ID}}
• Department: {{Department}}
• Assigned Hall / Room: {{Room}}
• Allocated Seat: {{Seat_Number}}
• Gate Reporting Time: {{Reporting_Time}}

Important Guidelines:
1. Please arrive at {{Room}} at least 20 minutes prior to {{Reporting_Time}}.
2. Have your physical Student ID or this email pass ready for entrance verification.
3. If you require accessibility assistance, approach our Helpdesk at the main lobby.

We look forward to an inspiring event!

Warm regards,
{{Organizer_Name}}
Campus Club Executive Committee`,
    suggestedAttachment: false,
    recommendedFilters: {
      requiresAssignedSeat: true,
      validEmailOnly: true,
    },
    supportedTags: [
      { tag: "{{Name}}", description: "Student's Full Name", sampleValue: "Alice Johnson" },
      { tag: "{{Student_ID}}", description: "University ID / Roll", sampleValue: "CSE-2023-014" },
      { tag: "{{Department}}", description: "Academic Department", sampleValue: "CSE" },
      { tag: "{{Seat_Number}}", description: "Assigned Desk/Seat", sampleValue: "A-12" },
      { tag: "{{Room}}", description: "Assigned Hall/Room", sampleValue: "Main Auditorium" },
      { tag: "{{Reporting_Time}}", description: "Reporting Schedule", sampleValue: "08:30 AM" },
      { tag: "{{Event_Name}}", description: "Event Title", sampleValue: "TechFest 2026" },
      { tag: "{{Organizer_Name}}", description: "Host Organization", sampleValue: "University Computer Club" },
    ],
  },

  CERTIFICATE_DISPATCH: {
    id: "CERTIFICATE_DISPATCH",
    title: "Tamper-Proof Certificate Dispatch",
    subtitle: "Post-Event: Distribute verified certificates with tamper-proof IDs and attachments",
    badge: "Post-Event Credentials",
    defaultSubject: "Your Official Certificate of Participation - {{Name}} [{{Certificate_ID}}]",
    defaultBodyText: `Dear {{Name}},

Congratulations on your active participation in {{Event_Name}}!

On behalf of the organizing committee, we are delighted to present your official Certificate of Completion.

Credential Verification:
• Recipient: {{Name}}
• Student ID: {{Student_ID}}
• Academic Dept: {{Department}}
• Unique Credential ID: {{Certificate_ID}}
• Online Verification Portal: {{Verification_Url}}

Please find your official high-resolution certificate attached to this email. You can also view, verify, and reprint your certificate at any time using our Public Self-Service Kiosk at {{Verification_Url}}.

Thank you for being part of our university community!

Warmest regards,
{{Organizer_Name}}
Executive Board & Advisory Committee`,
    suggestedAttachment: true,
    defaultAttachmentName: "Certificate_{{Student_ID}}.pdf",
    recommendedFilters: {
      validEmailOnly: true,
      requireAttended: false,
    },
    supportedTags: [
      { tag: "{{Name}}", description: "Student's Full Name", sampleValue: "Alice Johnson" },
      { tag: "{{Student_ID}}", description: "University ID / Roll", sampleValue: "CSE-2023-014" },
      { tag: "{{Department}}", description: "Academic Department", sampleValue: "CSE" },
      { tag: "{{Certificate_ID}}", description: "Tamper-Proof ID", sampleValue: "CERT-CSE101-8921" },
      { tag: "{{Verification_Url}}", description: "Online Verification Link", sampleValue: "https://club.edu/verify?id=CSE-101" },
      { tag: "{{Event_Name}}", description: "Event Title", sampleValue: "TechFest 2026" },
    ],
  },

  GATE_PASS: {
    id: "GATE_PASS",
    title: "Registration Confirmation & Gate Pass",
    subtitle: "Check-in: Provide registration confirmation, gate instructions, and meal token info",
    badge: "Check-in Pass",
    defaultSubject: "Gate Admission Pass: {{Event_Name}} - {{Name}}",
    defaultBodyText: `Dear {{Name}},

Your registration for {{Event_Name}} has been successfully approved!

Your Check-in Information:
• Registered Attendee: {{Name}}
• Student ID: {{Student_ID}}
• Department: {{Department}}
• Meal Preference: {{Meal_Preference}}
• Gate Opening: {{Reporting_Time}}

Check-in Instructions:
1. Show this email on your phone or bring your Student ID card to the fast-track gate.
2. Upon scanning, collect your lanyard badge and meal coupon at Desk #1.
3. Event access will close promptly 15 minutes prior to keynote commencement.

Best regards,
{{Organizer_Name}}
Registration & Operations Desk`,
    suggestedAttachment: false,
    recommendedFilters: {
      validEmailOnly: true,
    },
    supportedTags: [
      { tag: "{{Name}}", description: "Student's Full Name", sampleValue: "Alice Johnson" },
      { tag: "{{Student_ID}}", description: "University ID / Roll", sampleValue: "CSE-2023-014" },
      { tag: "{{Department}}", description: "Academic Department", sampleValue: "CSE" },
      { tag: "{{Meal_Preference}}", description: "Dietary Choice", sampleValue: "Vegetarian" },
      { tag: "{{Reporting_Time}}", description: "Gate Opening Time", sampleValue: "08:00 AM" },
      { tag: "{{Event_Name}}", description: "Event Title", sampleValue: "TechFest 2026" },
    ],
  },

  URGENT_ANNOUNCEMENT: {
    id: "URGENT_ANNOUNCEMENT",
    title: "Urgent Announcement & Venue Alert",
    subtitle: "Live Update: Broadcast urgent schedule shifts, venue reallocations, or emergency notices",
    badge: "Immediate Alert",
    defaultSubject: "[IMPORTANT UPDATE] {{Event_Name}} Schedule & Venue Notice",
    defaultBodyText: `Dear {{Name}},

Please take note of an important update regarding {{Event_Name}}:

We have updated the event schedule and venue arrangements. Please review your updated reporting details:
• Updated Room / Hall: {{Room}}
• Allocated Seat: {{Seat_Number}}
• New Reporting Time: {{Reporting_Time}}

If you have questions or need assistance navigating to the new hall, our volunteer stewards are stationed across the campus corridors.

Thank you for your understanding and prompt cooperation.

Sincerely,
{{Organizer_Name}}
Emergency Response & Club Executive`,
    suggestedAttachment: false,
    recommendedFilters: {
      validEmailOnly: true,
    },
    supportedTags: [
      { tag: "{{Name}}", description: "Student's Full Name", sampleValue: "Alice Johnson" },
      { tag: "{{Student_ID}}", description: "University ID", sampleValue: "CSE-2023-014" },
      { tag: "{{Room}}", description: "Hall / Room", sampleValue: "Main Auditorium" },
      { tag: "{{Seat_Number}}", description: "Assigned Seat", sampleValue: "A-12" },
      { tag: "{{Reporting_Time}}", description: "Updated Time", sampleValue: "09:30 AM" },
      { tag: "{{Event_Name}}", description: "Event Title", sampleValue: "TechFest 2026" },
    ],
  },
};

export class EmailQueueDispatcher {
  /**
   * Validate email address format strictly.
   */
  public static isValidEmail(email?: string): boolean {
    if (!email) return false;
    const trimmed = email.trim();
    // Standard RFC5322 compliant regex check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmed);
  }

  /**
   * Interpolate student and event variables into a template string.
   */
  public static interpolate(
    tpl: string,
    student: StudentRecord,
    context?: TemplateContext
  ): string {
    const eventName = context?.eventName || "University Event";
    const organizerName = context?.organizerName || "Executive Committee";
    const reportingTime = context?.reportingTime || "09:00 AM";
    const cleanId = (student.id || "000").replace(/[^a-zA-Z0-9]/g, "");
    const certId = `CERT-${cleanId}-${Math.abs(
      (student.id || "0").split("").reduce((acc, char) => acc + char.charCodeAt(0), 1000)
    )}`;
    const baseUrl = context?.verificationBaseUrl || "https://club.university.edu/my-certificate";
    const verificationUrl = `${baseUrl}?id=${encodeURIComponent(student.id || "")}`;

    let result = tpl
      .replace(/\{\{\s*(Name|FullName|Student_Name)\s*\}\}/gi, student.name || "Student")
      .replace(/\{\{\s*(Student_ID|ID|Roll)\s*\}\}/gi, student.id || "")
      .replace(/\{\{\s*(Department|Dept)\s*\}\}/gi, student.department || "General")
      .replace(/\{\{\s*(Batch)\s*\}\}/gi, student.batch || "N/A")
      .replace(/\{\{\s*(Seat_Number|Seat|Assigned_Seat)\s*\}\}/gi, student.assignedSeat || "Open Seating")
      .replace(/\{\{\s*(Room|Assigned_Room|Hall)\s*\}\}/gi, student.assignedRoom || "Main Hall")
      .replace(/\{\{\s*(Email|Recipient_Email)\s*\}\}/gi, student.email || "")
      .replace(/\{\{\s*(Meal_Preference|Food_Preference|Meal)\s*\}\}/gi, student.foodPreference || "Standard")
      .replace(/\{\{\s*(Event_Name|Event)\s*\}\}/gi, eventName)
      .replace(/\{\{\s*(Organizer_Name|Organizer|Club_Name)\s*\}\}/gi, organizerName)
      .replace(/\{\{\s*(Reporting_Time|Time)\s*\}\}/gi, reportingTime)
      .replace(/\{\{\s*(Certificate_ID|Cert_ID|Credential_ID)\s*\}\}/gi, certId)
      .replace(/\{\{\s*(Verification_Url|Verify_Url|Portal_Url)\s*\}\}/gi, verificationUrl);

    if (context?.customFields) {
      for (const [key, val] of Object.entries(context.customFields)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
        result = result.replace(regex, val);
      }
    }

    return result;
  }

  /**
   * Filter students according to scenario eligibility requirements.
   */
  public static filterRecipients(
    students: StudentRecord[],
    options: RecipientFilterOptions
  ): StudentRecord[] {
    return students.filter((s) => {
      // 1. Department filter
      if (options.department && options.department !== "ALL" && options.department !== "") {
        if ((s.department || "").toUpperCase() !== options.department.toUpperCase()) {
          return false;
        }
      }

      // 2. Assigned Seat filter
      if (options.requireAssignedSeat) {
        if (!s.assignedSeat || s.assignedSeat.trim() === "" || s.assignedSeat.toLowerCase() === "open") {
          return false;
        }
      }

      // 3. Attended / Check-in filter
      if (options.requireAttended) {
        const isAttended =
          s.attendanceStatus === "CHECKED_IN" ||
          s.attended === true ||
          s.gateCheckedIn === true ||
          s.extra?.attended === "true";
        if (!isAttended) return false;
      }

      // 4. Valid Email Filter
      if (options.validEmailOnly) {
        if (!this.isValidEmail(s.email)) return false;
      }

      // 5. Search Query
      if (options.searchQuery && options.searchQuery.trim() !== "") {
        const query = options.searchQuery.toLowerCase().trim();
        const matchesName = (s.name || "").toLowerCase().includes(query);
        const matchesId = (s.id || "").toLowerCase().includes(query);
        const matchesEmail = (s.email || "").toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesEmail) return false;
      }

      return true;
    });
  }

  /**
   * Pre-flight Diagnostic: Analyze email readiness before triggering batch send.
   */
  public static analyzePreflight(
    students: StudentRecord[],
    subjectTemplate: string,
    bodyTemplate: string,
    options?: RecipientFilterOptions
  ): PreflightDiagnostic {
    const totalCount = students.length;
    const combinedTemplate = `${subjectTemplate} ${bodyTemplate}`;

    let invalidEmailCount = 0;
    let missingSeatCount = 0;
    const warnings: string[] = [];

    const hasSeatTag = /\{\{\s*(Seat_Number|Seat|Assigned_Seat)\s*\}\}/i.test(combinedTemplate);
    const hasRoomTag = /\{\{\s*(Room|Assigned_Room|Hall)\s*\}\}/i.test(combinedTemplate);

    for (const student of students) {
      if (!this.isValidEmail(student.email)) {
        invalidEmailCount++;
      }
      if (!student.assignedSeat || student.assignedSeat.trim() === "" || student.assignedSeat.toLowerCase() === "open") {
        missingSeatCount++;
      }
    }

    if (invalidEmailCount > 0) {
      warnings.push(`${invalidEmailCount} student(s) have missing or invalid email addresses.`);
    }

    if (hasSeatTag && missingSeatCount > 0) {
      warnings.push(
        `Template uses {{Seat_Number}}, but ${missingSeatCount} recipient(s) do not have an assigned seat.`
      );
    }

    // Identify any unresolved placeholders that might look like {{something}}
    const detectedPlaceholders = Array.from(combinedTemplate.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g)).map(
      (m) => m[0]
    );

    const knownTagRegexes = [
      /\{\{\s*(Name|FullName|Student_Name)\s*\}\}/i,
      /\{\{\s*(Student_ID|ID|Roll)\s*\}\}/i,
      /\{\{\s*(Department|Dept)\s*\}\}/i,
      /\{\{\s*(Batch)\s*\}\}/i,
      /\{\{\s*(Seat_Number|Seat|Assigned_Seat)\s*\}\}/i,
      /\{\{\s*(Room|Assigned_Room|Hall)\s*\}\}/i,
      /\{\{\s*(Email|Recipient_Email)\s*\}\}/i,
      /\{\{\s*(Meal_Preference|Food_Preference|Meal)\s*\}\}/i,
      /\{\{\s*(Event_Name|Event)\s*\}\}/i,
      /\{\{\s*(Organizer_Name|Organizer|Club_Name)\s*\}\}/i,
      /\{\{\s*(Reporting_Time|Time)\s*\}\}/i,
      /\{\{\s*(Certificate_ID|Cert_ID|Credential_ID)\s*\}\}/i,
      /\{\{\s*(Verification_Url|Verify_Url|Portal_Url)\s*\}\}/i,
    ];

    const unresolvedTags = detectedPlaceholders.filter((ph) => {
      return !knownTagRegexes.some((regex) => regex.test(ph));
    });

    if (unresolvedTags.length > 0) {
      warnings.push(`Unrecognized tags detected: ${unresolvedTags.join(", ")}`);
    }

    const filtered = options ? this.filterRecipients(students, options) : students;

    return {
      totalCount,
      eligibleCount: filtered.length,
      invalidEmailCount,
      missingSeatCount,
      warnings,
      unresolvedTags,
      hasSeatTag,
      canSafelyDispatch: totalCount > 0 && invalidEmailCount < totalCount,
    };
  }

  /**
   * Generates personalized EmailJobs for each student in the list.
   */
  public static createJobs(
    students: StudentRecord[],
    subjectTemplate: string,
    bodyTemplate: string,
    context?: TemplateContext
  ): EmailJob[] {
    return students.map((s, idx) => {
      const subject = this.interpolate(subjectTemplate, s, context);
      const body = this.interpolate(bodyTemplate, s, context);

      return {
        id: `job-${idx + 1}-${Date.now()}`,
        studentId: s.id,
        studentName: s.name,
        recipientEmail: s.email || "",
        subject,
        body,
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
    const headers = [
      "Student_ID",
      "Student_Name",
      "Email",
      "Subject",
      "Body",
      "Attachment_Filename",
    ];
    const rows = jobs.map((j) => [
      `"${j.studentId}"`,
      `"${(j.studentName || "").replace(/"/g, '""')}"`,
      `"${j.recipientEmail}"`,
      `"${j.subject.replace(/"/g, '""')}"`,
      `"${j.body.replace(/"/g, '""')}"`,
      `"${j.attachmentFilename || `Pass_${j.studentId}.pdf`}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  /**
   * Generates a clean, mobile-responsive HTML email template with header and footer.
   */
  public static generateHtmlBody(
    bodyText: string,
    context?: TemplateContext
  ): string {
    const eventName = context?.eventName || "Campus Club Event";
    const organizer = context?.organizerName || "Executive Committee";
    const formattedText = bodyText
      .split("\n\n")
      .map((paragraph) => {
        const lines = paragraph.split("\n");
        let resultHtml = "";
        let inList = false;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
            if (!inList) {
              resultHtml += '<ul style="margin: 8px 0 12px 0; padding-left: 20px; color: #334155;">';
              inList = true;
            }
            resultHtml += `<li style="margin-bottom: 4px;">${trimmed.replace(/^[•-]\s*/, "")}</li>`;
          } else {
            if (inList) {
              resultHtml += "</ul>";
              inList = false;
            }
            if (trimmed.length > 0) {
              resultHtml += `<p style="margin: 0 0 10px 0; color: #334155; line-height: 1.65;">${line}</p>`;
            }
          }
        }
        if (inList) {
          resultHtml += "</ul>";
        }
        return resultHtml;
      })
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventName}</title>
</head>
<body style="margin:0; padding:24px 12px; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 32px; color: #ffffff;">
              <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #93c5fd;">
                Official University Club Dispatch
              </p>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3;">
                ${eventName}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px; font-size: 14px;">
              ${formattedText}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">${organizer}</p>
              <p style="margin: 0;">Automated message dispatched via CampusClub Event Operations Suite. Please contact your event organizer for inquiries.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
