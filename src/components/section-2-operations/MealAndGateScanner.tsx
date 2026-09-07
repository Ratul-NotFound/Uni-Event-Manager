"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import confetti from "canvas-confetti";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import {
  EventDayManager,
  MealClaimResult,
  EVENT_DAY_SESSIONS,
  TokenSessionType,
} from "@/core/domain/event-day";
import { db, StoredAuditLog } from "@/core/storage/db";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Utensils,
  Download,
  Search,
  History,
  Shirt,
  Coffee,
  Sparkles,
  AlertTriangle,
  Clock,
  UserCheck,
  RefreshCw,
} from "lucide-react";

export interface MealAndGateScannerProps {
  students: StudentRecord[];
  onUpdateStudent?: (id: string, updates: Partial<StudentRecord>) => void;
  onRosterSync?: (synced: StudentRecord[]) => void;
}

export const MealAndGateScanner: React.FC<MealAndGateScannerProps> = ({
  students,
  onUpdateStudent,
  onRosterSync,
}) => {
  const [manager] = useState(() => new EventDayManager());
  const [activeSession, setActiveSession] = useState<TokenSessionType>("GATE");
  const [gateName, setGateName] = useState("Main Hall Gate");
  const [manualInputId, setManualInputId] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [activeSubView, setActiveSubView] = useState<"scan" | "search" | "history">("scan");

  const [lastResult, setLastResult] = useState<{
    status: "success" | "duplicate" | "not_found";
    message: string;
    studentName?: string;
    studentId?: string;
    timestamp?: string;
    extraInfo?: string;
  } | null>(null);

  const [claimsList, setClaimsList] = useState<MealClaimResult[]>([]);
  const [checkedInCount, setCheckedInCount] = useState(0);

  // Restore prior check-ins and meal claims from IndexedDB audit logs on load
  useEffect(() => {
    const restoreFromAudit = async () => {
      try {
        const logs = await db.auditLogs
          .where("eventType")
          .anyOf("ATTENDANCE_CHECKIN", "MEAL_CLAIMED")
          .toArray();

        logs.forEach((log) => {
          if (log.status === "SUCCESS") {
            if (log.eventType === "ATTENDANCE_CHECKIN") {
              manager.checkInGate(log.studentId, log.studentName);
            } else if (log.eventType === "MEAL_CLAIMED") {
              const sessionType = log.details.includes("SWAG_KIT")
                ? "SWAG_KIT"
                : log.details.includes("BREAKFAST")
                ? "BREAKFAST"
                : log.details.includes("SNACKS")
                ? "SNACKS"
                : log.details.includes("DINNER")
                ? "DINNER"
                : "LUNCH";
              manager.claimToken(log.studentId, log.studentName, sessionType);
            }
          }
        });

        setCheckedInCount(manager.getTotalCheckedIn());
        setClaimsList(manager.getClaimsList());

        // Sync initial attendance into roster if provided
        if (onRosterSync && students.length > 0) {
          const synced = manager.applyToRoster(students);
          onRosterSync(synced);
        }
      } catch (err) {
        console.warn("Could not load prior audit logs:", err);
      }
    };

    restoreFromAudit();
  }, []);

  // Web Audio chime feedback
  const playSound = (isSuccess: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Warning buzz
        osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      // AudioContext might be blocked until user interacts
    }
  };

  // Main scan processor
  const processScan = async (rawScannedText: string) => {
    const cleanId = rawScannedText.trim();
    if (!cleanId) return;

    // Find student in roster
    const student = students.find(
      (s) =>
        s.id.toLowerCase() === cleanId.toLowerCase() ||
        cleanId.toLowerCase().includes(s.id.toLowerCase())
    );

    const targetName = student ? student.name : "Registered Attendee";
    const studentId = student ? student.id : cleanId;
    const timeStr = new Date().toLocaleTimeString();

    if (activeSession === "GATE") {
      // Gate check-in
      const result = manager.checkInGate(studentId, targetName, gateName);

      if (!result.isDuplicate) {
        playSound(true);
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });

        setLastResult({
          status: "success",
          message: `GATE CHECK-IN VERIFIED: ${targetName} (${studentId})`,
          studentName: targetName,
          studentId: studentId,
          timestamp: timeStr,
          extraInfo: student?.assignedSeat ? `Seat: ${student.assignedSeat} (${student.assignedRoom || "Main Hall"})` : undefined,
        });

        // Sync to parent roster
        if (student && onUpdateStudent) {
          onUpdateStudent(student.id, {
            gateCheckedIn: true,
            attendanceStatus: "CHECKED_IN",
            checkInTime: Date.now(),
          });
        }

        // Persist to IndexedDB
        try {
          await db.auditLogs.add({
            eventType: "ATTENDANCE_CHECKIN",
            studentId,
            studentName: targetName,
            details: `Gate Check-in at ${gateName}`,
            timestamp: Date.now(),
            status: "SUCCESS",
          });
        } catch (dbErr) {
          console.warn("IndexedDB audit write failed:", dbErr);
        }
      } else {
        playSound(false);
        setLastResult({
          status: "duplicate",
          message: `DUPLICATE ENTRY ALERT: ${targetName} was already checked in!`,
          studentName: targetName,
          studentId: studentId,
          timestamp: timeStr,
        });
      }

      setCheckedInCount(manager.getTotalCheckedIn());
    } else {
      // Meal or Kit token claim
      const details =
        activeSession === "SWAG_KIT" && student?.tshirtSize
          ? `T-Shirt Size: ${student.tshirtSize}`
          : student?.foodPreference
          ? `Diet: ${student.foodPreference}`
          : undefined;

      const result = manager.claimToken(studentId, targetName, activeSession, details);

      if (result.success) {
        playSound(true);
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });

        setLastResult({
          status: "success",
          message: `${EVENT_DAY_SESSIONS[activeSession].label} CLAIMED: ${targetName}`,
          studentName: targetName,
          studentId: studentId,
          timestamp: timeStr,
          extraInfo: details,
        });

        // Sync token to roster
        if (student && onUpdateStudent) {
          const currentTokens = student.claimedTokens || [];
          if (!currentTokens.includes(activeSession)) {
            onUpdateStudent(student.id, {
              claimedTokens: [...currentTokens, activeSession],
            });
          }
        }

        // Persist to IndexedDB
        try {
          await db.auditLogs.add({
            eventType: "MEAL_CLAIMED",
            studentId,
            studentName: targetName,
            details: `Session: ${activeSession} | ${details || ""}`,
            timestamp: Date.now(),
            status: "SUCCESS",
          });
        } catch (dbErr) {
          console.warn("IndexedDB audit write failed:", dbErr);
        }
      } else {
        playSound(false);
        setLastResult({
          status: "duplicate",
          message: result.message,
          studentName: targetName,
          studentId: studentId,
          timestamp: timeStr,
          extraInfo: result.details,
        });
      }

      setClaimsList(manager.getClaimsList());
    }

    setManualInputId("");
  };

  // Turnout metrics
  const turnoutStats = useMemo(() => {
    return manager.getTurnoutStats(students);
  }, [students, checkedInCount, claimsList]);

  // Search filtered students for quick manual check-in
  const filteredStudents = useMemo(() => {
    if (!searchFilter.trim()) return students.slice(0, 15);
    const q = searchFilter.toLowerCase().trim();
    return students
      .filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.id || "").toLowerCase().includes(q) ||
          (s.department || "").toLowerCase().includes(q)
      )
      .slice(0, 25);
  }, [students, searchFilter]);

  // Export Claims to Excel
  const handleExportClaims = () => {
    const ws = XLSX.utils.json_to_sheet(claimsList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Event_Claims");
    XLSX.writeFile(wb, `EventDay_Claims_${activeSession}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Multi-Session Anti-Theft QR Scanner & Check-in
                </h2>
                <Badge variant="success">Mission Control Active</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time single-use QR validation, multi-session meal tokens, kit distribution, and IndexedDB audit logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-view switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setActiveSubView("scan")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === "scan"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Live Scanner</span>
            </button>
            <button
              onClick={() => setActiveSubView("search")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === "search"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Manual Check-in</span>
            </button>
            <button
              onClick={() => setActiveSubView("history")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === "history"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Log ({claimsList.length + checkedInCount})</span>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportClaims}
          >
            Export Claims (XLSX)
          </Button>
        </div>
      </div>

      {/* Session Selector Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {(Object.keys(EVENT_DAY_SESSIONS) as TokenSessionType[]).map((sessionKey) => {
          const session = EVENT_DAY_SESSIONS[sessionKey];
          const isActive = activeSession === sessionKey;
          const count =
            sessionKey === "GATE"
              ? checkedInCount
              : turnoutStats.sessionClaimCounts[sessionKey] || 0;

          return (
            <div
              key={sessionKey}
              onClick={() => setActiveSession(sessionKey)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer select-none text-left ${
                isActive
                  ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                  : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Badge variant={session.category === "GATE" ? "primary" : session.category === "MERCH" ? "warning" : "success"}>
                  {session.category}
                </Badge>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {count}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {session.label}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {session.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Real-Time Turnout & KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gate Turnout</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {turnoutStats.checkedInCount} / {turnoutStats.totalRegistered || students.length}{" "}
              <span className="text-xs text-emerald-600 font-bold">({turnoutStats.turnoutPercentage}%)</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lunch Served</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {turnoutStats.sessionClaimCounts["LUNCH"] || 0}{" "}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Meals</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Swag Kits Issued</p>
            <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {turnoutStats.sessionClaimCounts["SWAG_KIT"] || 0}{" "}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Kits</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Session</p>
            <h4 className="text-base font-bold text-purple-600 dark:text-purple-400 tracking-tight truncate">
              {EVENT_DAY_SESSIONS[activeSession].label}
            </h4>
          </div>
        </Card>
      </div>

      {/* Main Workspace Body */}
      {activeSubView === "scan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive Scan / Input Panel */}
          <div className="lg:col-span-7 space-y-4">
            <Card padding="md" className="space-y-4 text-center">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Ready For QR Code / Barcode Scan
                  </h3>
                </div>
                {activeSession === "GATE" && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Gate:</span>
                    <input
                      type="text"
                      value={gateName}
                      onChange={(e) => setGateName(e.target.value)}
                      className="py-0.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-28"
                    />
                  </div>
                )}
              </div>

              {/* Hardware / Webcam Scanner Emulation Zone */}
              <div className="relative py-8 px-4 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <QrCode className="w-12 h-12 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Scanning for {EVENT_DAY_SESSIONS[activeSession].label}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Point 2D barcode scanner or USB gun at attendee lanyard pass, or enter Student ID below.
                  </p>
                </div>

                {/* Direct Scan / Barcode Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    processScan(manualInputId);
                  }}
                  className="w-full max-w-md pt-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Scan or type Student ID (e.g. CSE-1024)..."
                      value={manualInputId}
                      onChange={(e) => setManualInputId(e.target.value)}
                      className={`${THEME.surface.input} text-center font-mono text-sm tracking-wider`}
                    />
                    <Button variant="success" type="submit">
                      Verify
                    </Button>
                  </div>
                </form>
              </div>

              {/* Instant Verification Feedback Display */}
              {lastResult && (
                <div
                  className={`p-4 rounded-2xl border transition-all text-left flex items-start gap-3.5 ${
                    lastResult.status === "success"
                      ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200"
                      : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200 animate-shake"
                  }`}
                >
                  <div className="p-2 rounded-xl shrink-0 mt-0.5">
                    {lastResult.status === "success" ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm tracking-tight">{lastResult.message}</span>
                      <span className="text-[11px] opacity-75 font-mono">{lastResult.timestamp}</span>
                    </div>
                    {lastResult.extraInfo && (
                      <p className="text-xs font-semibold mt-1 opacity-90">{lastResult.extraInfo}</p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right: Real-time Live Log Strip */}
          <div className="lg:col-span-5 space-y-4">
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Live Session Stream
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {claimsList.length} verified claims
                </span>
              </div>

              <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
                {claimsList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No token claims recorded for this session yet.
                  </p>
                ) : (
                  claimsList.slice(0, 30).map((claim, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {claim.studentName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">{claim.studentId}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {claim.details || claim.sessionType}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="success">Verified</Badge>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(claim.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Manual Check-in / Search Table View */}
      {activeSubView === "search" && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Rapid Manual Attendee Check-In
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly find and check in attendees who forgot their ticket or digital QR pass.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, ID, dept..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={`${THEME.surface.input} pl-9 text-xs`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="pb-2.5">Student</th>
                  <th className="pb-2.5">Department</th>
                  <th className="pb-2.5">Assigned Seat</th>
                  <th className="pb-2.5">Gate Status</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredStudents.map((s) => {
                  const isCheckedIn = !!s.gateCheckedIn;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-2.5 pr-2">
                        <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                        <span className="font-mono text-slate-400 ml-2 text-[11px]">{s.id}</span>
                      </td>
                      <td className="py-2.5 pr-2 text-slate-600 dark:text-slate-400">
                        {s.department || "General"}
                      </td>
                      <td className="py-2.5 pr-2 text-slate-600 dark:text-slate-400 font-mono">
                        {s.assignedSeat || "Open"}
                      </td>
                      <td className="py-2.5 pr-2">
                        {isCheckedIn ? (
                          <Badge variant="success">Checked In</Badge>
                        ) : (
                          <Badge variant="neutral">Not Arrived</Badge>
                        )}
                      </td>
                      <td className="py-2.5 text-right space-x-1.5">
                        {!isCheckedIn && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => processScan(s.id)}
                          >
                            Check-in Gate
                          </Button>
                        )}
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => processScan(s.id)}
                        >
                          Claim {EVENT_DAY_SESSIONS[activeSession].label.split(" ")[0]}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Historical Audit Log View */}
      {activeSubView === "history" && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Tamper-Evident Event Day Audit Records
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable records saved locally in IndexedDB for treasurer and dean verification.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportClaims}
            >
              Export Full Sheet (XLSX)
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {claimsList.length === 0 && checkedInCount === 0 ? (
              <p className="text-slate-400 text-center py-8 text-xs">No records logged yet.</p>
            ) : (
              claimsList.map((claim, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{claim.studentName}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{claim.studentId}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Session: <span className="font-semibold">{claim.sessionType || claim.mealType}</span> • {claim.message}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={claim.status === "CLAIMED" ? "success" : "danger"}>
                      {claim.status}
                    </Badge>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(claim.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
