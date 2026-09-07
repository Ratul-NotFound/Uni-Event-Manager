"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import {
  IdCard,
  Printer,
  Sparkles,
  Download,
  Check,
  Filter,
  UserCheck,
  QrCode,
  MapPin,
  Utensils,
} from "lucide-react";

export interface BadgeGeneratorProps {
  students: StudentRecord[];
}

export const BadgeGenerator: React.FC<BadgeGeneratorProps> = ({ students }) => {
  const [eventName, setEventName] = useState("University Innovation Fest 2026");
  const [role, setRole] = useState<"PARTICIPANT" | "VOLUNTEER" | "SPEAKER" | "VIP" | "JUDGE">("PARTICIPANT");
  const [audienceFilter, setAudienceFilter] = useState<"all" | "checked_in" | "not_checked_in">("all");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>("");

  const badgeColor =
    role === "VIP"
      ? "#F59E0B"
      : role === "SPEAKER"
      ? "#8B5CF6"
      : role === "VOLUNTEER"
      ? "#10B981"
      : role === "JUDGE"
      ? "#F43F5E"
      : "#2563EB";

  // Unique departments for filter
  const uniqueDepts = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered attendees for badges
  const filteredAttendees = useMemo(() => {
    let list: StudentRecord[] = students.length > 0 ? [...students] : [
      { id: "CSE-1024", name: "Alexandria Morgan", email: "alex@university.edu", department: "Computer Science", assignedSeat: "A-12", assignedRoom: "Main Auditorium", foodPreference: "Vegetarian", gateCheckedIn: true },
      { id: "BBA-2001", name: "Rahim Ahmed", email: "rahim@university.edu", department: "Business Admin", assignedSeat: "B-05", assignedRoom: "Main Auditorium", foodPreference: "Standard", gateCheckedIn: false },
    ];

    if (audienceFilter === "checked_in") {
      list = list.filter((s) => s.gateCheckedIn === true);
    } else if (audienceFilter === "not_checked_in") {
      list = list.filter((s) => !s.gateCheckedIn);
    }

    if (deptFilter !== "ALL") {
      list = list.filter((s) => s.department === deptFilter);
    }

    return list;
  }, [students, audienceFilter, deptFilter]);

  const activeStudent: StudentRecord = filteredAttendees[previewStudentIndex] || filteredAttendees[0] || {
    id: "CSE-1024",
    name: "Alexandria Morgan",
    email: "alex@university.edu",
    department: "Computer Science",
    assignedSeat: "A-12",
    assignedRoom: "Main Hall",
  };

  // Generate QR Code data URL for the preview badge
  useEffect(() => {
    const generateQr = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(activeStudent.id, {
          width: 140,
          margin: 1,
          color: {
            dark: "#0F172A",
            light: "#FFFFFF",
          },
        });
        setPreviewQrDataUrl(dataUrl);
      } catch (err) {
        console.warn("Could not generate QR code:", err);
      }
    };
    generateQr();
  }, [activeStudent.id]);

  // Print Badges with scannable QR codes
  const handlePrintBadges = async () => {
    const qrMap = new Map<string, string>();
    for (const s of filteredAttendees) {
      try {
        const qr = await QRCode.toDataURL(s.id, {
          width: 120,
          margin: 1,
        });
        qrMap.set(s.id, qr);
      } catch (e) {
        // fallback
      }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Event Badges - ${eventName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; background: #fff; }
    .page { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; page-break-after: always; }
    .badge { border: 2.5px solid ${badgeColor}; border-radius: 16px; padding: 20px; box-sizing: border-box; text-align: center; height: 380px; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; background: #fff; position: relative; }
    .clip-hole { width: 48px; height: 8px; background: #cbd5e1; border-radius: 4px; margin: 0 auto 10px auto; }
    .event { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 1.5px; }
    .qr-box { margin: 10px auto; width: 110px; height: 110px; }
    .qr-box img { width: 110px; height: 110px; display: block; }
    .name { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px; line-height: 1.2; }
    .dept { font-size: 12.5px; color: #475569; font-weight: 600; margin-top: 2px; }
    .meta { font-size: 11px; font-family: monospace; color: #64748b; margin-top: 4px; display: flex; justify-content: center; gap: 8px; }
    .seat-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 4px; }
    .role-banner { background: ${badgeColor}; color: white; font-weight: 900; font-size: 13px; padding: 8px; border-radius: 8px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="page">
    ${filteredAttendees
      .map(
        (s) => `
      <div class="badge">
        <div class="clip-hole"></div>
        <div class="event">${eventName}</div>
        <div class="qr-box">
          <img src="${qrMap.get(s.id) || ""}" alt="${s.id}" />
        </div>
        <div>
          <div class="name">${s.name}</div>
          <div class="dept">${s.department || "Attendee"}</div>
          <div class="meta">
            <span>ID: ${s.id}</span>
            ${s.foodPreference ? `<span>• ${s.foodPreference}</span>` : ""}
          </div>
          ${s.assignedSeat ? `<div class="seat-box">Seat: ${s.assignedSeat} | ${s.assignedRoom || "Main Hall"}</div>` : ""}
        </div>
        <div class="role-banner">${role}</div>
      </div>
    `
      )
      .join("")}
  </div>
</body>
</html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Scannable QR Event Badges & Lanyard Passes
                </h2>
                <Badge variant="primary">Print-Ready A4</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Auto-tiled print sheets with real scannable QR codes for participants, VIPs, and volunteers with gate integration.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={handlePrintBadges}
          disabled={filteredAttendees.length === 0}
        >
          Print Badges ({filteredAttendees.length} Passes)
        </Button>
      </div>

      {/* Filter & Customization Toolbar */}
      <Card padding="sm" className="space-y-3 bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Badge Audience & Role Filters
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500">Status:</label>
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value as any)}
                className="py-1 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="all">All Attendees ({students.length})</option>
                <option value="checked_in">Checked-In Only (Gate Present)</option>
                <option value="not_checked_in">Not Yet Arrived</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500">Dept:</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="py-1 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Departments</option>
                {uniqueDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Color Picker */}
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500">Badge Role:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="py-1 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              >
                <option value="PARTICIPANT">Participant (Blue)</option>
                <option value="VOLUNTEER">Volunteer (Green)</option>
                <option value="SPEAKER">Keynote Speaker (Purple)</option>
                <option value="VIP">VIP & Dignitary (Gold)</option>
                <option value="JUDGE">Competition Judge (Rose)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Badge Interactive Preview */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div
            className="w-80 h-[470px] rounded-3xl border-2 p-6 flex flex-col justify-between text-center bg-white dark:bg-slate-900 shadow-xl transition-all relative"
            style={{ borderColor: badgeColor }}
          >
            {/* Lanyard Hole Clip */}
            <div className="w-16 h-3 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full border border-slate-300 dark:border-slate-700 mb-1" />

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {eventName}
              </p>
              <div className="w-16 h-1 mx-auto rounded-full mt-1.5" style={{ backgroundColor: badgeColor }} />
            </div>

            {/* Real QR Code Pass */}
            <div className="space-y-2 py-2">
              <div className="w-28 h-28 mx-auto p-1.5 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center">
                {previewQrDataUrl ? (
                  <img src={previewQrDataUrl} alt="Pass QR" className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-16 h-16 text-slate-400 animate-pulse" />
                )}
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeStudent.name}
              </h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {activeStudent.department || "Attendee"}
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
                <span>{activeStudent.id}</span>
                {activeStudent.foodPreference && (
                  <span className="text-emerald-600">• {activeStudent.foodPreference}</span>
                )}
              </div>

              {activeStudent.assignedSeat && (
                <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Seat: {activeStudent.assignedSeat} | {activeStudent.assignedRoom || "Main Hall"}
                </div>
              )}
            </div>

            <div
              className="py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-xs"
              style={{ backgroundColor: badgeColor }}
            >
              {role}
            </div>
          </div>

          {/* Student preview switcher */}
          {filteredAttendees.length > 1 && (
            <div className="flex items-center gap-3 mt-4 text-xs">
              <button
                type="button"
                onClick={() => setPreviewStudentIndex((i) => Math.max(0, i - 1))}
                disabled={previewStudentIndex === 0}
                className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 disabled:opacity-40 cursor-pointer font-bold"
              >
                Previous
              </button>
              <span className="text-slate-500">
                Attendee {previewStudentIndex + 1} of {filteredAttendees.length}
              </span>
              <button
                type="button"
                onClick={() => setPreviewStudentIndex((i) => Math.min(filteredAttendees.length - 1, i + 1))}
                disabled={previewStudentIndex >= filteredAttendees.length - 1}
                className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 disabled:opacity-40 cursor-pointer font-bold"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Configuration & Live Sheet Summary */}
        <div className="lg:col-span-6 space-y-4">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
              Badge Printing Specifications
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={THEME.typography.label}>Event Title on Badge:</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Badges to Print:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {filteredAttendees.length} Attendees
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Sheet Layout:</span>
                  <span className="font-bold text-slate-900 dark:text-white">A4 2-Column Tiled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">QR Code Type:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    High-Contrast Single-Use Pass
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={handlePrintBadges}
              >
                Generate Print Sheet ({filteredAttendees.length} Badges)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
