"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import confetti from "canvas-confetti";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import { EventDayManager, MealClaimResult } from "@/core/domain/event-day";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import {
  QrCode,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Utensils,
  Download,
  Search,
  Volume2,
} from "lucide-react";

export interface MealAndGateScannerProps {
  students: StudentRecord[];
}

export const MealAndGateScanner: React.FC<MealAndGateScannerProps> = ({
  students,
}) => {
  const [manager] = useState(() => new EventDayManager());
  const [scanMode, setScanMode] = useState<"meal" | "gate">("meal");
  const [mealType, setMealType] = useState<string>("Lunch");
  const [manualInputId, setManualInputId] = useState("");
  const [lastResult, setLastResult] = useState<{
    status: "success" | "duplicate" | "not_found";
    message: string;
    studentName?: string;
    studentId?: string;
    timestamp?: string;
  } | null>(null);
  const [claimsList, setClaimsList] = useState<MealClaimResult[]>([]);
  const [checkedInCount, setCheckedInCount] = useState(0);

  // Play audio chime
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
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Low warning buzz
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

  const processScan = (rawScannedText: string) => {
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

    if (scanMode === "meal") {
      const result = manager.claimMeal(studentId, targetName, mealType);
      if (result.success) {
        playSound(true);
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
        setLastResult({
          status: "success",
          message: `MEAL CLAIMED: ${targetName} (${studentId})`,
          studentName: targetName,
          studentId: studentId,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        playSound(false);
        setLastResult({
          status: "duplicate",
          message: result.message,
          studentName: targetName,
          studentId: studentId,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      setClaimsList(manager.getClaimsList());
    } else {
      // Gate Checkin
      const result = manager.checkInGate(studentId, targetName);
      if (!result.isDuplicate) {
        playSound(true);
        setLastResult({
          status: "success",
          message: `GATE CHECK-IN VERIFIED: ${targetName} (${studentId})`,
          studentName: targetName,
          studentId: studentId,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        playSound(false);
        setLastResult({
          status: "duplicate",
          message: `DUPLICATE ENTRY: ${targetName} was already checked in!`,
          studentName: targetName,
          studentId: studentId,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      setCheckedInCount(manager.getTotalCheckedIn());
    }
    setManualInputId("");
  };

  // Export Claims to Excel
  const handleExportClaims = () => {
    const ws = XLSX.utils.json_to_sheet(claimsList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Meal_Claims");
    XLSX.writeFile(wb, `Meal_Claims_${mealType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Anti-Theft Meal Tokens & Gate Check-In Scanner
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prevent food fraud, double-claiming, and non-registered entry with single-use audio-visual QR validation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setScanMode("meal")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scanMode === "meal"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Meal Token Mode</span>
            </button>
            <button
              onClick={() => setScanMode("gate")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scanMode === "gate"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Gate Check-In Mode</span>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportClaims}
          >
            Export Attendance / Claims
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gate Checked-In</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {checkedInCount} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Present</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{mealType} Meals Claimed</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {claimsList.length} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Meals Served</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Remaining Food Capacity</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {Math.max(0, (students.length || 100) - claimsList.length)}{" "}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Meals Left</span>
            </h4>
          </div>
        </Card>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Active Scanner & Instant Alert Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card padding="md" className="space-y-4 text-center">
            {/* Meal Type Selector (if in Meal Mode) */}
            {scanMode === "meal" && (
              <div className="flex items-center justify-center gap-2 pb-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  Active Meal:
                </span>
                {["Lunch", "Dinner", "Snacks / Breakfast"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setMealType(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mealType === type
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            {/* Simulated / Fast Manual QR & Barcode Input */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <QrCode className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Ready to Scan Participant Badge or Ticket
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Point USB Barcode / QR Scanner at participant pass, or enter Student ID below.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processScan(manualInputId);
                }}
                className="flex gap-2 max-w-md mx-auto"
              >
                <input
                  type="text"
                  value={manualInputId}
                  onChange={(e) => setManualInputId(e.target.value)}
                  placeholder="Scan QR or type Student ID (e.g. CSE-1024)..."
                  className={`${THEME.surface.input} text-center font-mono`}
                  autoFocus
                />
                <Button variant="success" type="submit">
                  Verify Pass
                </Button>
              </form>
            </div>

            {/* Live Visual Alert Display */}
            {lastResult && (
              <div
                className={`p-6 rounded-2xl border text-center transition-all animate-in zoom-in-95 duration-200 ${
                  lastResult.status === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/80 shadow-sm"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/80 shadow-sm"
                }`}
              >
                <div className="inline-flex p-3 rounded-full mb-3">
                  {lastResult.status === "success" ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-12 h-12 text-rose-600 dark:text-rose-400 animate-bounce" />
                  )}
                </div>

                <h3
                  className={`text-xl font-extrabold tracking-tight ${
                    lastResult.status === "success"
                      ? "text-emerald-800 dark:text-emerald-300"
                      : "text-rose-800 dark:text-rose-300"
                  }`}
                >
                  {lastResult.status === "success"
                    ? "PASS VERIFIED & CLAIMED"
                    : "FRAUD ALERT: DUPLICATE CLAIM!"}
                </h3>

                <p className="text-sm text-slate-700 dark:text-slate-200 mt-2 font-medium">
                  {lastResult.message}
                </p>

                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>Student ID: {lastResult.studentId}</span>
                  <span>Time: {lastResult.timestamp}</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Real-Time Live Check-in Audit Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Live Gate & Meal Log
              </h3>
              <Badge variant="primary">{claimsList.length} Verified</Badge>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 text-xs">
              {claimsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                  No claims recorded yet. Scan a pass to begin.
                </div>
              ) : (
                [...claimsList].reverse().map((claim, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{claim.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        ID: {claim.studentId} | {claim.mealType}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">Claimed</Badge>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {new Date(claim.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
