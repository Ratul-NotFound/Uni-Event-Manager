"use client";

import React, { useState, useMemo } from "react";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  ExternalLink,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Clock,
  MapPin,
  Utensils,
  Trophy,
} from "lucide-react";

export interface WhatsAppBroadcasterProps {
  students: StudentRecord[];
}

export const WhatsAppBroadcaster: React.FC<WhatsAppBroadcasterProps> = ({
  students,
}) => {
  const [targetAudience, setTargetAudience] = useState<"ALL" | "CHECKED_IN" | "ABSENT">("CHECKED_IN");
  const [broadcastMessage, setBroadcastMessage] = useState(
    "📢 Food Alert: Lunch buffet has officially started in Cafeteria 2! Please present your badge QR code at Counter #1."
  );
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Filter students based on audience selection
  const targetedStudents = useMemo(() => {
    if (targetAudience === "CHECKED_IN") {
      return students.filter((s) => s.gateCheckedIn === true);
    }
    if (targetAudience === "ABSENT") {
      return students.filter((s) => !s.gateCheckedIn);
    }
    return students;
  }, [students, targetAudience]);

  // Clean valid phone numbers
  const phoneNumbers = useMemo(() => {
    return targetedStudents
      .map((s) => (s.phone || "").replace(/[^0-9+]/g, ""))
      .filter((p) => p.length >= 8);
  }, [targetedStudents]);

  const handleCopyNumbers = () => {
    navigator.clipboard.writeText(phoneNumbers.join(", "));
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  const sampleDirectLink =
    phoneNumbers.length > 0
      ? `https://wa.me/${phoneNumbers[0].replace(/\+/g, "")}?text=${encodeURIComponent(
          broadcastMessage
        )}`
      : "#";

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Targeted Event-Day WhatsApp & SMS Broadcaster
                </h2>
                <Badge variant="success">Zero Server Cost</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Segmented broadcasts for checked-in attendees, late arrivals, and emergency room updates with 1-click WhatsApp links.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={copiedBatch ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          onClick={handleCopyNumbers}
          disabled={phoneNumbers.length === 0}
        >
          {copiedBatch ? "Copied Phone Numbers!" : `Copy Phone List (${phoneNumbers.length})`}
        </Button>
      </div>

      {/* Target Audience Segmenter Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setTargetAudience("CHECKED_IN")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
            targetAudience === "CHECKED_IN"
              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Checked-In Attendees Only
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Inside the venue / Present
              </p>
            </div>
          </div>
          <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
            {students.filter((s) => s.gateCheckedIn).length}
          </span>
        </div>

        <div
          onClick={() => setTargetAudience("ABSENT")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
            targetAudience === "ABSENT"
              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Absent / Not Checked-In
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Late arrivals / Reminders
              </p>
            </div>
          </div>
          <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
            {students.filter((s) => !s.gateCheckedIn).length}
          </span>
        </div>

        <div
          onClick={() => setTargetAudience("ALL")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
            targetAudience === "ALL"
              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                All Registered Students
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Full roster broadcast
              </p>
            </div>
          </div>
          <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
            {students.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Message Composer */}
        <div className="lg:col-span-7 space-y-4">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
              Broadcast Message Composer
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={THEME.typography.label}>Announcement Text:</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className={`${THEME.surface.input} mt-1 text-xs font-sans leading-relaxed`}
                />
              </div>

              {/* Event-Day Scenario Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Event-Day Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setBroadcastMessage(
                        "📢 Food Alert: Lunch buffet is now serving in Cafeteria 2! Please present your badge QR pass at Counter #1."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-750"
                  >
                    <Utensils className="w-3 h-3 text-emerald-500" />
                    <span>Lunch Started</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setBroadcastMessage(
                        "⚡ Venue Notice: The Keynote Session has shifted to Auditorium Hall A. Please assemble and take your seats now."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-750"
                  >
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>Hall Change</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setBroadcastMessage(
                        "⏳ Final Call: Admission gates are closing in 15 minutes! Please report to Gate #1 with your Student ID."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-750"
                  >
                    <Clock className="w-3 h-3 text-rose-500" />
                    <span>Gate Closing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setBroadcastMessage(
                        "🏆 Ceremony Alert: The Awards & Prize Distribution Gala is commencing in 10 minutes in the Main Auditorium."
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-750"
                  >
                    <Trophy className="w-3 h-3 text-purple-500" />
                    <span>Awards Gala</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Target Segment Summary */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="md" className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
              Dispatch Audience Metrics
            </h3>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Selected Segment:</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {targetAudience === "CHECKED_IN"
                    ? "Checked-in Attendees"
                    : targetAudience === "ABSENT"
                    ? "Absent Students"
                    : "All Attendees"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Recipients with Phone:</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold">
                  {phoneNumbers.length} Students
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">SMS / WhatsApp Cost:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">$0.00 (Native Link)</span>
              </div>

              {phoneNumbers.length > 0 && (
                <a
                  href={sampleDirectLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Send on WhatsApp Web</span>
                </a>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
