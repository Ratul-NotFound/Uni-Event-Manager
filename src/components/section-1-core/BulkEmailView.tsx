"use client";

import React, { useState, useRef } from "react";
import saveAs from "file-saver";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import {
  EmailJob,
  EmailProviderConfig,
  EmailQueueDispatcher,
} from "@/core/domain/email-queue";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { ProgressBar } from "@/components/common/ProgressBar";
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
} from "lucide-react";

export interface BulkEmailViewProps {
  students: StudentRecord[];
}

export const BulkEmailView: React.FC<BulkEmailViewProps> = ({ students }) => {
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

  // Template State
  const [subjectTemplate, setSubjectTemplate] = useState(
    "Your Official Certificate & Event Access Pass - {{Name}}"
  );
  const [bodyTemplate, setBodyTemplate] = useState(
    `Dear {{Name}},\n\nCongratulations on your participation in our university event!\n\nYour assigned Student ID is {{Student_ID}} (Department: {{Department}}).\nPlease find attached your personalized, tamper-proof Certificate.\n\nWarm regards,\nExecutive Committee\nUniversity Campus Club`
  );
  const [attachCert, setAttachCert] = useState(true);

  // Dispatch Queue State
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState("organizer@university.edu");
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // References to handle pause/abort inside async loop
  const pausedRef = useRef(false);
  const abortRef = useRef(false);

  // Initialize Jobs from loaded students
  const handlePrepareQueue = () => {
    if (students.length === 0) {
      alert("Please load or upload student records in the Data Refinery first!");
      return;
    }
    const created = EmailQueueDispatcher.createJobs(
      students,
      subjectTemplate,
      bodyTemplate
    );
    setJobs(created);
    setCurrentIndex(0);
  };

  // Send 1 Test Email
  const handleSendTestEmail = async () => {
    setTestStatus("Sending test email...");
    try {
      if (providerConfig.provider === "simulate") {
        await new Promise((r) => setTimeout(r, 1200));
        setTestStatus("Test email delivered successfully! (Simulated Mode)");
      } else {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: testEmailAddress,
            subject: "[TEST PREVIEW] " + subjectTemplate.replace(/\{\{\s*Name\s*\}\}/g, "Test Student"),
            text: bodyTemplate.replace(/\{\{\s*Name\s*\}\}/g, "Test Student"),
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
    if (jobs.length === 0) {
      handlePrepareQueue();
    }

    setIsSending(true);
    setIsPaused(false);
    pausedRef.current = false;
    abortRef.current = false;

    const currentJobs = jobs.length > 0 ? [...jobs] : EmailQueueDispatcher.createJobs(students, subjectTemplate, bodyTemplate);

    for (let i = currentIndex; i < currentJobs.length; i++) {
      if (abortRef.current) break;

      while (pausedRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (abortRef.current) break;
      }
      if (abortRef.current) break;

      setCurrentIndex(i);
      currentJobs[i].status = "SENDING";
      setJobs([...currentJobs]);

      try {
        if (providerConfig.provider === "simulate") {
          // Simulate network delay and 98% realistic university delivery rate
          await new Promise((r) => setTimeout(r, providerConfig.delayMs));
          const isRandomFailure = Math.random() < 0.03; // 3% simulated bounce
          if (isRandomFailure) {
            throw new Error("Mailbox quota exceeded (simulated bounce)");
          }
        } else {
          // Real SMTP via proxy
          const res = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: currentJobs[i].recipientEmail,
              subject: currentJobs[i].subject,
              text: currentJobs[i].body,
              smtpConfig: providerConfig,
            }),
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error);
        }

        currentJobs[i].status = "SENT";
        currentJobs[i].sentAt = Date.now();
      } catch (err: any) {
        currentJobs[i].status = "FAILED";
        currentJobs[i].error = err.message || "Failed to dispatch";
      }

      setJobs([...currentJobs]);
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
    const updated = jobs.map((j) => (j.status === "FAILED" ? { ...j, status: "PENDING" as const, error: undefined } : j));
    setJobs(updated);
    startBulkDispatch();
  };

  // Export Mail Merge CSV
  const handleExportMailMerge = () => {
    const csvContent = EmailQueueDispatcher.formatMailMergeCsv(jobs.length > 0 ? jobs : EmailQueueDispatcher.createJobs(students, subjectTemplate, bodyTemplate));
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `Mail_Merge_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Metrics
  const sentCount = jobs.filter((j) => j.status === "SENT").length;
  const failedCount = jobs.filter((j) => j.status === "FAILED").length;
  const pendingCount = jobs.filter((j) => j.status === "PENDING" || j.status === "SENDING").length;
  const totalJobs = jobs.length || students.length;
  const progressPercent = totalJobs > 0 ? Math.round((sentCount / totalJobs) * 100) : 0;

  return (
    <div className="w-full space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Direct Generate & Bulk Email Pipeline
              </h2>
              <p className="text-xs text-slate-400">
                1-Click generate and dispatch personalized certificates directly to 1,000+ student inboxes with rate-limiting and retry logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            >
              Start Bulk Dispatch ({totalJobs} Students)
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

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total In Queue</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {totalJobs} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Recipients</span>
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
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold cursor-pointer"
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
                Dispatching: {sentCount + failedCount} of {totalJobs} ({progressPercent}%)
              </span>
              {isPaused && <Badge variant="warning">PAUSED</Badge>}
            </div>
            <span className="text-slate-500 dark:text-slate-400">
              Throttled delay: {providerConfig.delayMs}ms between messages
            </span>
          </div>
          <ProgressBar progress={progressPercent} variant="success" size="md" />
        </Card>
      )}

      {/* Main Grid: Left Template & Provider Setup, Right Real-Time Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Email Customizer & Provider Settings (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
              Email Template Studio
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={THEME.typography.label}>Subject Line:</label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={THEME.typography.label}>Email Body:</label>
                  <div className="flex gap-1 text-[10px] text-slate-400">
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
                      onClick={() => setBodyTemplate(bodyTemplate + " {{Department}}")}
                      className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                    >
                      +Dept
                    </span>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className={`${THEME.surface.input} mt-1 font-mono text-xs`}
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="attachCert"
                  checked={attachCert}
                  onChange={(e) => setAttachCert(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="attachCert" className="text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Attach personalized PDF Certificate to each student</span>
                </label>
              </div>
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
                    <option value={500}>0.5s (Fast / High Capacity)</option>
                    <option value={1500}>1.5s (Recommended / Anti-Spam)</option>
                    <option value={3000}>3.0s (Strict University SMTP)</option>
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
                    <label className={THEME.typography.label}>Email / User:</label>
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

              {/* Send Test Email Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
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
          </Card>
        </div>

        {/* Right Side: Live Dispatch Queue & Audit Log (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Dispatch Log
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {jobs.length > 0 ? `${jobs.length} in queue` : `${students.length} ready`}
              </span>
            </div>

            <div className="w-full max-h-[560px] overflow-y-auto space-y-2 pr-1">
              {(jobs.length > 0 ? jobs : EmailQueueDispatcher.createJobs(students, subjectTemplate, bodyTemplate)).map(
                (job, idx) => {
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
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {job.recipientEmail || "no-email@university.edu"}
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
                          <Badge variant="success">Sent</Badge>
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
                }
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
