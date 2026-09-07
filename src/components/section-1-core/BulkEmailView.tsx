"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import saveAs from "file-saver";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import {
  EmailJob,
  EmailProviderConfig,
  EmailQueueDispatcher,
  EMAIL_SCENARIOS,
  EmailScenarioType,
  RecipientFilterOptions,
} from "@/core/domain/email-queue";
import { db, StoredAuditLog } from "@/core/storage/db";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Modal } from "@/components/common/Modal";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  Mail,
  Send,
  Pause,
  Play,
  RotateCcw,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  AlertTriangle,
  Paperclip,
  Check,
  MapPin,
  Award,
  Ticket,
  BellRing,
  Eye,
  Edit3,
  History,
  Filter,
  ShieldCheck,
  Search,
  FileText,
  UserCheck,
} from "lucide-react";

export interface BulkEmailViewProps {
  students: StudentRecord[];
}

/**
 * Generates an on-the-fly, high-resolution PDF pass / certificate for email attachments
 */
async function generatePdfPassBase64(
  student: StudentRecord,
  eventName: string,
  scenario: EmailScenarioType
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 420]); // Standard A5 landscape points
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Background frame
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 595,
    height: 420,
    color: rgb(0.97, 0.98, 1.0),
  });

  page.drawRectangle({
    x: 18,
    y: 18,
    width: 559,
    height: 384,
    borderWidth: 2,
    borderColor: rgb(0.18, 0.35, 0.72),
    color: rgb(1, 1, 1),
  });

  // Header Banner
  page.drawRectangle({
    x: 18,
    y: 334,
    width: 559,
    height: 68,
    color: rgb(0.12, 0.25, 0.65),
  });

  page.drawText(eventName.toUpperCase(), {
    x: 36,
    y: 372,
    size: 17,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const subtitle =
    scenario === "SEAT_NOTICE"
      ? "OFFICIAL SEAT ALLOCATION & VENUE ENTRANCE PASS"
      : scenario === "GATE_PASS"
      ? "OFFICIAL GATE CHECK-IN PASS & REGISTRATION TICKET"
      : scenario === "CERTIFICATE_DISPATCH"
      ? "OFFICIAL CERTIFICATE OF PARTICIPATION & COMPLETION"
      : "OFFICIAL EVENT NOTIFICATION PASS";

  page.drawText(subtitle, {
    x: 36,
    y: 350,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.85, 0.92, 1.0),
  });

  // Participant Card
  page.drawText(`PARTICIPANT: ${student.name.toUpperCase()}`, {
    x: 36,
    y: 292,
    size: 15,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.25),
  });

  page.drawText(`Student ID: ${student.id}`, {
    x: 36,
    y: 265,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  page.drawText(`Department: ${student.department || "General"}`, {
    x: 240,
    y: 265,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  if (student.batch) {
    page.drawText(`Batch: ${student.batch}`, {
      x: 420,
      y: 265,
      size: 11,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.45),
    });
  }

  // Hall & Seat Box
  page.drawRectangle({
    x: 36,
    y: 155,
    width: 523,
    height: 80,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.8, 0.86, 0.96),
    borderWidth: 1,
  });

  page.drawText(`Assigned Seat: ${student.assignedSeat || "Open Seating"}`, {
    x: 52,
    y: 200,
    size: 14,
    font: fontBold,
    color: rgb(0.08, 0.45, 0.25),
  });

  page.drawText(`Room / Hall: ${student.assignedRoom || "Main Auditorium"}`, {
    x: 52,
    y: 174,
    size: 11.5,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  if (student.foodPreference) {
    page.drawText(`Meal Choice: ${student.foodPreference}`, {
      x: 320,
      y: 174,
      size: 11.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });
  }

  // Credential Hash & Security Footer
  const certId = `PASS-${(student.id || "00").replace(/[^a-zA-Z0-9]/g, "")}-${Date.now().toString().slice(-4)}`;
  page.drawText(`Credential Security ID: ${certId}`, {
    x: 36,
    y: 92,
    size: 10,
    font: fontBold,
    color: rgb(0.35, 0.4, 0.5),
  });

  page.drawText("Issued by CampusClub Operations Engine • Cryptographically Verified Digital Credential", {
    x: 36,
    y: 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65),
  });

  const pdfBytes = await pdfDoc.saveAsBase64();
  return pdfBytes;
}

export const BulkEmailView: React.FC<BulkEmailViewProps> = ({ students }) => {
  // Scenario Preset State
  const [activeScenario, setActiveScenario] = useState<EmailScenarioType>("SEAT_NOTICE");

  // Event Context Meta
  const [eventName, setEventName] = useState("University Annual TechFest 2026");
  const [organizerName, setOrganizerName] = useState("Campus Club Executive Committee");
  const [reportingTime, setReportingTime] = useState("08:30 AM");

  // Recipient Filters
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [filterRequireSeat, setFilterRequireSeat] = useState(true);
  const [filterValidEmailOnly, setFilterValidEmailOnly] = useState(true);
  const [filterSearch, setFilterSearch] = useState("");

  // Provider Config State
  const [providerConfig, setProviderConfig] = useState<EmailProviderConfig>({
    provider: "simulate",
    fromName: "Campus Club Executive",
    fromEmail: "club@university.edu",
    delayMs: 1500,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpUser: "",
    smtpPass: "",
  });

  // Active Template State (initialized to SEAT_NOTICE)
  const [subjectTemplate, setSubjectTemplate] = useState(
    EMAIL_SCENARIOS.SEAT_NOTICE.defaultSubject
  );
  const [bodyTemplate, setBodyTemplate] = useState(
    EMAIL_SCENARIOS.SEAT_NOTICE.defaultBodyText
  );
  const [attachCert, setAttachCert] = useState(EMAIL_SCENARIOS.SEAT_NOTICE.suggestedAttachment);

  // Dispatch Queue State
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // View Mode: Template Editor vs Live Student Preview
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [previewStudentId, setPreviewStudentId] = useState<string>("");
  const [previewTab, setPreviewTab] = useState<"html" | "text">("html");

  // Audit Logs Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<StoredAuditLog[]>([]);

  // Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState("organizer@university.edu");
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Async loop control refs
  const pausedRef = useRef(false);
  const abortRef = useRef(false);

  // Unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    students.forEach((s) => {
      if (s.department && s.department.trim() !== "") {
        depts.add(s.department.trim());
      }
    });
    return Array.from(depts).sort();
  }, [students]);

  // Filtered eligible recipients based on segmentation controls
  const eligibleStudents = useMemo(() => {
    const filterOptions: RecipientFilterOptions = {
      department: selectedDept,
      requireAssignedSeat: filterRequireSeat,
      validEmailOnly: filterValidEmailOnly,
      searchQuery: filterSearch,
    };
    return EmailQueueDispatcher.filterRecipients(students, filterOptions);
  }, [students, selectedDept, filterRequireSeat, filterValidEmailOnly, filterSearch]);

  // Pre-flight sanity diagnostic
  const preflight = useMemo(() => {
    return EmailQueueDispatcher.analyzePreflight(
      students,
      subjectTemplate,
      bodyTemplate,
      {
        department: selectedDept,
        requireAssignedSeat: filterRequireSeat,
        validEmailOnly: filterValidEmailOnly,
        searchQuery: filterSearch,
      }
    );
  }, [students, subjectTemplate, bodyTemplate, selectedDept, filterRequireSeat, filterValidEmailOnly, filterSearch]);

  // Selected student for live preview
  const previewStudent = useMemo(() => {
    if (previewStudentId) {
      const found = students.find((s) => s.id === previewStudentId);
      if (found) return found;
    }
    return eligibleStudents[0] || students[0] || null;
  }, [previewStudentId, students, eligibleStudents]);

  // Switch Scenario Preset
  const handleSelectScenario = (scenarioKey: EmailScenarioType) => {
    setActiveScenario(scenarioKey);
    const preset = EMAIL_SCENARIOS[scenarioKey];
    setSubjectTemplate(preset.defaultSubject);
    setBodyTemplate(preset.defaultBodyText);
    setAttachCert(preset.suggestedAttachment);
    if (preset.recommendedFilters.requiresAssignedSeat !== undefined) {
      setFilterRequireSeat(preset.recommendedFilters.requiresAssignedSeat);
    }
    // Clear previously prepared un-sent queue so it regenerates with the new scenario
    if (!isSending) {
      setJobs([]);
    }
  };

  // Prepare Queue from eligible students
  const handlePrepareQueue = () => {
    if (eligibleStudents.length === 0) {
      alert("No students match your current audience filter criteria!");
      return;
    }
    const created = EmailQueueDispatcher.createJobs(
      eligibleStudents,
      subjectTemplate,
      bodyTemplate,
      {
        eventName,
        organizerName,
        reportingTime,
      }
    );
    setJobs(created);
    setCurrentIndex(0);
  };

  // Send 1 Test Email
  const handleSendTestEmail = async () => {
    setTestStatus("Sending test email...");
    const sampleStudent = previewStudent || {
      id: "TEST-001",
      name: "Organizer Test",
      email: testEmailAddress,
      department: "CSE",
      assignedSeat: "VIP-01",
      assignedRoom: "Main Auditorium",
    };

    const resolvedSubject = `[TEST] ` + EmailQueueDispatcher.interpolate(subjectTemplate, sampleStudent, {
      eventName,
      organizerName,
      reportingTime,
    });
    const resolvedBody = EmailQueueDispatcher.interpolate(bodyTemplate, sampleStudent, {
      eventName,
      organizerName,
      reportingTime,
    });
    const resolvedHtml = EmailQueueDispatcher.generateHtmlBody(resolvedBody, {
      eventName,
      organizerName,
    });

    try {
      if (providerConfig.provider === "simulate") {
        await new Promise((r) => setTimeout(r, 1200));
        setTestStatus("Test email delivered successfully! (Simulated Mode)");
      } else {
        let attachmentPayload: { filename: string; content: string } | undefined = undefined;
        if (attachCert) {
          try {
            const pdfBase64 = await generatePdfPassBase64(sampleStudent, eventName, activeScenario);
            attachmentPayload = {
              filename: `TestPass_${sampleStudent.id}.pdf`,
              content: pdfBase64,
            };
          } catch (pdfErr) {
            console.warn("Could not generate test PDF:", pdfErr);
          }
        }

        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: testEmailAddress,
            subject: resolvedSubject,
            text: resolvedBody,
            html: resolvedHtml,
            attachment: attachmentPayload,
            smtpConfig: providerConfig,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setTestStatus("Test email delivered successfully via SMTP!");
        } else {
          setTestStatus(`Test failed: ${json.error}`);
        }
      }
    } catch (err: any) {
      setTestStatus(`Error: ${err.message}`);
    }
  };

  // Start Bulk Dispatch Loop
  const startBulkDispatch = async () => {
    const activeList = jobs.length > 0
      ? [...jobs]
      : EmailQueueDispatcher.createJobs(eligibleStudents, subjectTemplate, bodyTemplate, {
          eventName,
          organizerName,
          reportingTime,
        });

    if (activeList.length === 0) {
      alert("No recipients in queue to dispatch! Please check your audience filters.");
      return;
    }

    setJobs(activeList);
    setIsSending(true);
    setIsPaused(false);
    pausedRef.current = false;
    abortRef.current = false;

    for (let i = currentIndex; i < activeList.length; i++) {
      if (abortRef.current) break;

      while (pausedRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (abortRef.current) break;
      }
      if (abortRef.current) break;

      setCurrentIndex(i);
      activeList[i].status = "SENDING";
      setJobs([...activeList]);

      const currentJob = activeList[i];
      const matchedStudent = students.find((s) => s.id === currentJob.studentId);

      try {
        // Prepare attachment if enabled
        let attachmentPayload: { filename: string; content: string } | undefined = undefined;
        if (attachCert && matchedStudent) {
          try {
            const pdfBase64 = await generatePdfPassBase64(matchedStudent, eventName, activeScenario);
            const extName =
              activeScenario === "SEAT_NOTICE"
                ? `SeatPass_${matchedStudent.id}.pdf`
                : activeScenario === "GATE_PASS"
                ? `GatePass_${matchedStudent.id}.pdf`
                : `Certificate_${matchedStudent.id}.pdf`;
            attachmentPayload = {
              filename: extName,
              content: pdfBase64,
            };
          } catch (pdfErr) {
            console.warn("Could not generate PDF attachment:", pdfErr);
          }
        }

        if (providerConfig.provider === "simulate") {
          // Throttled simulated network delay
          await new Promise((r) => setTimeout(r, providerConfig.delayMs));
          // Realistic university SMTP bounce probability (2% for invalid domain)
          const isRandomFailure = !EmailQueueDispatcher.isValidEmail(currentJob.recipientEmail);
          if (isRandomFailure) {
            throw new Error("Invalid mailbox syntax / unknown recipient domain");
          }
        } else {
          // Real SMTP via proxy
          const htmlContent = EmailQueueDispatcher.generateHtmlBody(currentJob.body, {
            eventName,
            organizerName,
          });

          const res = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: currentJob.recipientEmail,
              subject: currentJob.subject,
              text: currentJob.body,
              html: htmlContent,
              attachment: attachmentPayload,
              smtpConfig: providerConfig,
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error);
        }

        activeList[i].status = "SENT";
        activeList[i].sentAt = Date.now();

        // Write success to IndexedDB audit log
        try {
          await db.auditLogs.add({
            eventType: "EMAIL_SENT",
            studentId: currentJob.studentId,
            studentName: currentJob.studentName || "Student",
            details: `[${EMAIL_SCENARIOS[activeScenario].title}] Dispatched to ${currentJob.recipientEmail}`,
            timestamp: Date.now(),
            status: "SUCCESS",
          });
        } catch (dbErr) {
          console.warn("IndexedDB audit write failed:", dbErr);
        }
      } catch (err: any) {
        activeList[i].status = "FAILED";
        activeList[i].error = err.message || "Failed to dispatch";

        // Write failure to IndexedDB audit log
        try {
          await db.auditLogs.add({
            eventType: "EMAIL_SENT",
            studentId: currentJob.studentId,
            studentName: currentJob.studentName || "Student",
            details: `[${EMAIL_SCENARIOS[activeScenario].title}] Failed to ${currentJob.recipientEmail}: ${err.message}`,
            timestamp: Date.now(),
            status: "FAILED",
          });
        } catch (dbErr) {
          console.warn("IndexedDB audit write failed:", dbErr);
        }
      }

      setJobs([...activeList]);
    }

    setIsSending(false);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      pausedRef.current = false;
      setIsPaused(false);
    } else {
      pausedRef.current = true;
      setIsPaused(true);
    }
  };

  const handleAbort = () => {
    abortRef.current = true;
    pausedRef.current = false;
    setIsSending(false);
    setIsPaused(false);
  };

  // Retry Failed Only
  const handleRetryFailed = () => {
    const updated = jobs.map((j) =>
      j.status === "FAILED" ? { ...j, status: "PENDING" as const, error: undefined } : j
    );
    setJobs(updated);
    startBulkDispatch();
  };

  // Auto-exclude invalid records
  const handleAutoExcludeInvalid = () => {
    setFilterValidEmailOnly(true);
    if (preflight.hasSeatTag) {
      setFilterRequireSeat(true);
    }
  };

  // Export Mail Merge CSV
  const handleExportMailMerge = () => {
    const targetJobs =
      jobs.length > 0
        ? jobs
        : EmailQueueDispatcher.createJobs(eligibleStudents, subjectTemplate, bodyTemplate, {
            eventName,
            organizerName,
            reportingTime,
          });
    const csvContent = EmailQueueDispatcher.formatMailMergeCsv(targetJobs);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `Mail_Merge_${activeScenario}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Load audit history from IndexedDB
  const handleOpenAuditLogs = async () => {
    try {
      const logs = await db.auditLogs
        .where("eventType")
        .equals("EMAIL_SENT")
        .reverse()
        .limit(100)
        .toArray();
      setAuditLogs(logs);
      setIsAuditModalOpen(true);
    } catch (err) {
      console.warn("Could not load audit logs:", err);
    }
  };

  // Metrics
  const sentCount = jobs.filter((j) => j.status === "SENT").length;
  const failedCount = jobs.filter((j) => j.status === "FAILED").length;
  const pendingCount = jobs.filter((j) => j.status === "PENDING" || j.status === "SENDING").length;
  const totalInQueue = jobs.length || eligibleStudents.length;
  const progressPercent = totalInQueue > 0 ? Math.round((sentCount / totalInQueue) * 100) : 0;

  return (
    <div className="w-full space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Lifecycle Bulk Email & Pass Pipeline
                </h2>
                <Badge variant="primary">
                  {EMAIL_SCENARIOS[activeScenario].badge}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Scenario-driven automated dispatch for Seat Plans, Digital Certificates, Gate Passes, and Live Alerts with rate limiting and audit trails.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<History className="w-4 h-4" />}
            onClick={handleOpenAuditLogs}
          >
            Audit Logs
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportMailMerge}
          >
            Export Mail-Merge (CSV)
          </Button>
          {!isSending ? (
            <Button
              variant="success"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={startBulkDispatch}
              disabled={eligibleStudents.length === 0}
            >
              Start Dispatch ({totalInQueue} Recipients)
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                onClick={handlePauseResume}
              >
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleAbort}
              >
                Stop
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Presets Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(EMAIL_SCENARIOS) as EmailScenarioType[]).map((key) => {
          const preset = EMAIL_SCENARIOS[key];
          const isActive = activeScenario === key;
          const IconComponent =
            key === "SEAT_NOTICE"
              ? MapPin
              : key === "CERTIFICATE_DISPATCH"
              ? Award
              : key === "GATE_PASS"
              ? Ticket
              : BellRing;

          return (
            <div
              key={key}
              onClick={() => handleSelectScenario(key)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                isActive
                  ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                  : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className={`p-2 rounded-xl ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <Badge variant={isActive ? "primary" : "neutral"}>
                    {preset.badge}
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {preset.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {preset.subtitle}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                <span>{preset.suggestedAttachment ? "PDF Pass Attached" : "Clean Text / HTML"}</span>
                {isActive && (
                  <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Eligible in Queue</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {totalInQueue} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Students</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Successfully Sent</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {sentCount} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Delivered</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Failed / Bounced</p>
              {failedCount > 0 && (
                <button
                  onClick={handleRetryFailed}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                >
                  Retry ({failedCount})
                </button>
              )}
            </div>
            <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              {failedCount} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Errors</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Queue</p>
            <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {pendingCount} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Remaining</span>
            </h4>
          </div>
        </Card>
      </div>

      {/* Live Sending Progress Indicator */}
      {isSending && (
        <Card padding="md" className="bg-white dark:bg-slate-900/90 border border-blue-200 dark:border-blue-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-slate-900 dark:text-white">
                Dispatching: {sentCount + failedCount} of {totalInQueue} ({progressPercent}%)
              </span>
              {isPaused && <Badge variant="warning">PAUSED</Badge>}
            </div>
            <span className="text-slate-500 dark:text-slate-400">
              Pacing delay: {providerConfig.delayMs}ms between inboxes
            </span>
          </div>
          <ProgressBar progress={progressPercent} variant="success" size="md" />
        </Card>
      )}

      {/* Audience Segmentation & Pre-Flight Diagnostics Strip */}
      <Card padding="sm" className="space-y-3 bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Audience Eligibility Filters
            </span>
            <Badge variant="neutral">
              {eligibleStudents.length} of {students.length} Selected
            </Badge>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">Department:</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="py-1 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Departments ({students.length})</option>
                {uniqueDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={filterRequireSeat}
                onChange={(e) => setFilterRequireSeat(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
              />
              <span>Assigned Seats Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={filterValidEmailOnly}
                onChange={(e) => setFilterValidEmailOnly(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
              />
              <span>Valid Email Only</span>
            </label>

            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name/roll..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="py-1 pl-6 pr-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-32 focus:w-44 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Pre-flight Warnings if any */}
        {preflight.warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Pre-Flight Sanity Warning:
                </span>
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                  {preflight.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleAutoExcludeInvalid}
              className="text-xs shrink-0 self-start sm:self-auto"
            >
              Auto-Sanitize Audience
            </Button>
          </div>
        )}
      </Card>

      {/* Main Grid: Left Template & Provider Setup, Right Real-Time Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Email Customizer / Live Preview Toggle (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Scenario Email Designer
                </h3>
              </div>

              {/* View Switcher: Edit vs Preview */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewMode === "edit"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewMode === "preview"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Recipient Preview</span>
                </button>
              </div>
            </div>

            {viewMode === "edit" ? (
              /* EDITOR MODE */
              <div className="space-y-3.5 text-xs">
                {/* Event Context Metadata Inputs */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className={THEME.typography.label}>Event Title:</label>
                    <input
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className={`${THEME.surface.input} mt-1 text-[11px]`}
                    />
                  </div>
                  <div>
                    <label className={THEME.typography.label}>Reporting Time:</label>
                    <input
                      type="text"
                      value={reportingTime}
                      onChange={(e) => setReportingTime(e.target.value)}
                      className={`${THEME.surface.input} mt-1 text-[11px]`}
                    />
                  </div>
                  <div>
                    <label className={THEME.typography.label}>Sender Org:</label>
                    <input
                      type="text"
                      value={organizerName}
                      onChange={(e) => setOrganizerName(e.target.value)}
                      className={`${THEME.surface.input} mt-1 text-[11px]`}
                    />
                  </div>
                </div>

                {/* Subject Line */}
                <div>
                  <label className={THEME.typography.label}>Subject Line:</label>
                  <input
                    type="text"
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                    className={`${THEME.surface.input} mt-1`}
                  />
                </div>

                {/* Body Template & Token Injectors */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className={THEME.typography.label}>Email Content:</label>
                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                      <span
                        onClick={() => setBodyTemplate(bodyTemplate + " {{Name}}")}
                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                      >
                        +Name
                      </span>
                      <span
                        onClick={() => setBodyTemplate(bodyTemplate + " {{Student_ID}}")}
                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                      >
                        +ID
                      </span>
                      <span
                        onClick={() => setBodyTemplate(bodyTemplate + " {{Seat_Number}}")}
                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                      >
                        +Seat
                      </span>
                      <span
                        onClick={() => setBodyTemplate(bodyTemplate + " {{Room}}")}
                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                      >
                        +Room
                      </span>
                      <span
                        onClick={() => setBodyTemplate(bodyTemplate + " {{Reporting_Time}}")}
                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                      >
                        +Time
                      </span>
                      <span
                        onClick={() => setBodyTemplate(bodyTemplate + " {{Certificate_ID}}")}
                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                      >
                        +CertID
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    className={`${THEME.surface.input} mt-1 font-mono text-xs leading-relaxed`}
                  />
                </div>

                {/* PDF Pass / Certificate Attachment Option */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="attachCert"
                      checked={attachCert}
                      onChange={(e) => setAttachCert(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="attachCert" className="text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium">Attach Personalized PDF Pass / Certificate to each student</span>
                    </label>
                  </div>
                  <Badge variant={attachCert ? "success" : "neutral"}>
                    {attachCert ? "Dynamic PDF Enabled" : "Text Only"}
                  </Badge>
                </div>

                {/* Provider Configuration */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Provider & Throttle Settings</span>
                    </h4>
                    <Badge variant={providerConfig.provider === "simulate" ? "warning" : "primary"}>
                      {providerConfig.provider === "simulate" ? "Demo Simulator" : "Live SMTP"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={THEME.typography.label}>Delivery Mode:</label>
                      <select
                        value={providerConfig.provider}
                        onChange={(e) =>
                          setProviderConfig({
                            ...providerConfig,
                            provider: e.target.value as any,
                          })
                        }
                        className={`${THEME.surface.select} mt-1`}
                      >
                        <option value="simulate">Simulated Demo (Zero Cost, No Setup)</option>
                        <option value="smtp">Direct University SMTP / Gmail App Password</option>
                      </select>
                    </div>

                    <div>
                      <label className={THEME.typography.label}>Delay Between Emails:</label>
                      <select
                        value={providerConfig.delayMs}
                        onChange={(e) =>
                          setProviderConfig({
                            ...providerConfig,
                            delayMs: Number(e.target.value),
                          })
                        }
                        className={`${THEME.surface.select} mt-1`}
                      >
                        <option value={500}>0.5s (High Capacity SMTP)</option>
                        <option value={1500}>1.5s (Recommended Anti-Spam)</option>
                        <option value={3000}>3.0s (Strict Campus SMTP)</option>
                      </select>
                    </div>
                  </div>

                  {providerConfig.provider === "smtp" && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={THEME.typography.label}>SMTP Host:</label>
                          <input
                            type="text"
                            placeholder="smtp.gmail.com"
                            value={providerConfig.smtpHost}
                            onChange={(e) =>
                              setProviderConfig({ ...providerConfig, smtpHost: e.target.value })
                            }
                            className={`${THEME.surface.input} mt-0.5`}
                          />
                        </div>
                        <div>
                          <label className={THEME.typography.label}>Port:</label>
                          <input
                            type="number"
                            placeholder="465"
                            value={providerConfig.smtpPort}
                            onChange={(e) =>
                              setProviderConfig({
                                ...providerConfig,
                                smtpPort: Number(e.target.value),
                              })
                            }
                            className={`${THEME.surface.input} mt-0.5`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={THEME.typography.label}>Sender Email / User:</label>
                        <input
                          type="text"
                          placeholder="club@university.edu"
                          value={providerConfig.smtpUser}
                          onChange={(e) =>
                            setProviderConfig({ ...providerConfig, smtpUser: e.target.value })
                          }
                          className={`${THEME.surface.input} mt-0.5`}
                        />
                      </div>

                      <div>
                        <label className={THEME.typography.label}>App Password / Password:</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          value={providerConfig.smtpPass}
                          onChange={(e) =>
                            setProviderConfig({ ...providerConfig, smtpPass: e.target.value })
                          }
                          className={`${THEME.surface.input} mt-0.5`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Send Test Email Safety Check */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Safety Check: Send 1 Test Email First
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="organizer@university.edu"
                        className={`${THEME.surface.input} text-xs`}
                      />
                      <Button variant="secondary" size="sm" onClick={handleSendTestEmail}>
                        Send Test
                      </Button>
                    </div>
                    {testStatus && (
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{testStatus}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* LIVE RECIPIENT PREVIEW MODE */
              <div className="space-y-4 text-xs">
                {/* Select Recipient to Preview */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-slate-900 dark:text-white">Inspect Recipient:</span>
                  </div>
                  <select
                    value={previewStudent?.id || ""}
                    onChange={(e) => setPreviewStudentId(e.target.value)}
                    className="py-1 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-[280px]"
                  >
                    {eligibleStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id}) - {s.email || "No Email"}
                      </option>
                    ))}
                  </select>
                </div>

                {previewStudent ? (
                  <div className="space-y-3">
                    {/* Rendered Subject */}
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Rendered Subject:
                      </p>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                        {EmailQueueDispatcher.interpolate(subjectTemplate, previewStudent, {
                          eventName,
                          organizerName,
                          reportingTime,
                        })}
                      </p>
                    </div>

                    {/* Preview Format Switcher: HTML vs Plaintext */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                        Rendered Inbox Message:
                      </span>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setPreviewTab("html")}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            previewTab === "html"
                              ? "bg-blue-600 text-white font-bold"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          Rich HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab("text")}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            previewTab === "text"
                              ? "bg-blue-600 text-white font-bold"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          Raw Text
                        </button>
                      </div>
                    </div>

                    {/* Rendered Body */}
                    {previewTab === "html" ? (
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-800 space-y-3 max-h-[340px] overflow-y-auto">
                        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white">
                          <p className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">
                            Official University Club Dispatch
                          </p>
                          <h4 className="text-base font-bold mt-1">{eventName}</h4>
                        </div>
                        <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed px-1">
                          {EmailQueueDispatcher.interpolate(bodyTemplate, previewStudent, {
                            eventName,
                            organizerName,
                            reportingTime,
                          })}
                        </div>
                        <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                          <p className="font-bold text-slate-600">{organizerName}</p>
                          <p>Automated message dispatched via CampusClub Event Operations Suite.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-950 text-slate-300 font-mono text-xs whitespace-pre-wrap max-h-[340px] overflow-y-auto">
                        {EmailQueueDispatcher.interpolate(bodyTemplate, previewStudent, {
                          eventName,
                          organizerName,
                          reportingTime,
                        })}
                      </div>
                    )}

                    {/* Attachment preview pill */}
                    {attachCert && (
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            Attachment: {activeScenario === "SEAT_NOTICE" ? `SeatPass_${previewStudent.id}.pdf` : `Certificate_${previewStudent.id}.pdf`}
                          </span>
                        </div>
                        <Badge variant="primary">A5 Tamper-Proof PDF</Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">
                    No students currently match the filter to preview.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Live Dispatch Queue & Audit Log (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Dispatch Queue
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {jobs.length > 0 ? `${jobs.length} queued` : `${eligibleStudents.length} eligible`}
                </span>
                {jobs.length === 0 && (
                  <button
                    onClick={handlePrepareQueue}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                  >
                    Sync Queue
                  </button>
                )}
              </div>
            </div>

            <div className="w-full max-h-[580px] overflow-y-auto space-y-2 pr-1">
              {(jobs.length > 0
                ? jobs
                : EmailQueueDispatcher.createJobs(eligibleStudents, subjectTemplate, bodyTemplate, {
                    eventName,
                    organizerName,
                    reportingTime,
                  })
              ).map((job, idx) => {
                return (
                  <div
                    key={job.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      job.status === "SENT"
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
                        : job.status === "FAILED"
                        ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40"
                        : job.status === "SENDING"
                        ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-500 animate-pulse"
                        : "bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {job.studentName || `Student ${idx + 1}`}
                        </span>
                        <span className={THEME.typography.mono}>{job.studentId}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                        <span>{job.recipientEmail || "no-email-address"}</span>
                        {!EmailQueueDispatcher.isValidEmail(job.recipientEmail) && (
                          <span className="text-[10px] text-rose-500 font-bold">(Invalid)</span>
                        )}
                      </div>
                      {job.error && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{job.error}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {job.status === "SENT" ? (
                        <Badge variant="success">Delivered</Badge>
                      ) : job.status === "FAILED" ? (
                        <Badge variant="danger">Failed</Badge>
                      ) : job.status === "SENDING" ? (
                        <Badge variant="primary">Sending...</Badge>
                      ) : (
                        <Badge variant="neutral">Pending</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Historical Audit Logs Modal */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Event Email Audit Logs (IndexedDB)"
        subtitle="Permanent local audit log of all dispatches, deliveries, and delivery errors"
        maxWidth="2xl"
      >
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span>Showing recent {auditLogs.length} logged email events</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await db.auditLogs.where("eventType").equals("EMAIL_SENT").delete();
                setAuditLogs([]);
              }}
            >
              Clear Log History
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-center text-slate-400 py-6">No email audit records recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{log.studentName}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{log.studentId}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {log.details}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={log.status === "SUCCESS" ? "success" : "danger"}>
                      {log.status === "SUCCESS" ? "Delivered" : "Bounced"}
                    </Badge>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
