"use client";

import React, { useState } from "react";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { IdCard, Printer, Sparkles, Download, Check } from "lucide-react";

export interface BadgeGeneratorProps {
  students: StudentRecord[];
}

export const BadgeGenerator: React.FC<BadgeGeneratorProps> = ({ students }) => {
  const [eventName, setEventName] = useState("University Innovation Fest 2026");
  const [role, setRole] = useState<"PARTICIPANT" | "VOLUNTEER" | "SPEAKER" | "VIP" | "JUDGE">("PARTICIPANT");

  const badgeColor =
    role === "VIP"
      ? "#F59E0B"
      : role === "SPEAKER"
      ? "#8B5CF6"
      : role === "VOLUNTEER"
      ? "#10B981"
      : role === "JUDGE"
      ? "#F43F5E"
      : "#6366F1";

  const handlePrintBadges = () => {
    const attendees = students.length > 0 ? students : [
      { id: "CSE-1024", name: "Alexandria Morgan", department: "Computer Science" },
      { id: "BBA-2001", name: "Rahim Ahmed", department: "Business Admin" },
    ];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Event Badges - ${eventName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; }
    .page { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; page-break-after: always; }
    .badge { border: 2px solid ${badgeColor}; border-radius: 12px; padding: 18px; box-sizing: border-box; text-align: center; height: 320px; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; }
    .event { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
    .name { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 10px; }
    .dept { font-size: 13px; color: #475569; font-weight: 500; }
    .id { font-size: 12px; font-family: monospace; color: #64748b; margin-top: 4px; }
    .role-banner { background: ${badgeColor}; color: white; font-weight: 900; font-size: 14px; padding: 6px; border-radius: 6px; text-transform: uppercase; letter-spacing: 2px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="page">
    ${attendees.map(s => `
      <div class="badge">
        <div class="event">${eventName}</div>
        <div>
          <div class="name">${s.name}</div>
          <div class="dept">${s.department || "Attendee"}</div>
          <div class="id">${s.id}</div>
        </div>
        <div class="role-banner">${role}</div>
      </div>
    `).join("")}
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Event Badges & Lanyard ID Pass Generator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-tiled print-ready A4 sheets with crop marks for participants, volunteers, VIPs, and speakers.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={handlePrintBadges}
        >
          Print Printable A4 Badges ({students.length || 2} Passes)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Badge Preview */}
        <div className="lg:col-span-6 flex justify-center">
          <div
            className="w-80 h-[440px] rounded-3xl border-2 p-6 flex flex-col justify-between text-center bg-white dark:bg-slate-900 shadow-xl transition-all"
            style={{ borderColor: badgeColor }}
          >
            {/* Lanyard Hole Clip */}
            <div className="w-16 h-3 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full border border-slate-300 dark:border-slate-700 mb-2" />

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {eventName}
              </p>
              <div className="w-16 h-1 mx-auto rounded-full mt-2" style={{ backgroundColor: badgeColor }} />
            </div>

            <div className="space-y-2 py-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xs">
                QR PASS
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {students[0]?.name || "Alexandria Morgan"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {students[0]?.department || "Computer Science & Engineering"}
              </p>
              <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">
                {students[0]?.id || "CSE-2026-1024"}
              </p>
            </div>

            <div
              className="w-full py-2 rounded-xl text-white font-black text-sm uppercase tracking-widest shadow-md"
              style={{ backgroundColor: badgeColor }}
            >
              {role}
            </div>
          </div>
        </div>

        {/* Right Side: Badge Settings */}
        <div className="lg:col-span-6 space-y-4">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
              Badge Customizer
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={THEME.typography.label}>Event Title:</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>

              <div>
                <label className={THEME.typography.label}>Designated Role Tier:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {(["PARTICIPANT", "VOLUNTEER", "SPEAKER", "VIP", "JUDGE"] as const).map(
                    (r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          role === r
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {r}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Badge Standard Size:</span>
                  <span className="text-slate-900 dark:text-white font-mono">CR80 Lanyard Card</span>
                </div>
                <div className="flex justify-between">
                  <span>Print Layout:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tiled 4 to 6 Badges per A4</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
