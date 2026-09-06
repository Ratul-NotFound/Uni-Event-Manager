"use client";

import React, { useState } from "react";
import { THEME } from "@/styles/theme";
import { VolunteerShift } from "@/core/domain/event-day";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Users2, Plus, Printer, Trash2, Clock, Phone, MapPin } from "lucide-react";

export const VolunteerRoster: React.FC = () => {
  const [shifts, setShifts] = useState<VolunteerShift[]>([
    {
      id: "v1",
      name: "Tanzim Shakib",
      station: "Registration & Badge Desk",
      timeSlot: "08:00 AM - 12:00 PM",
      supervisorPhone: "+8801711223344",
      notes: "Verify student ID and hand out welcome packs",
    },
    {
      id: "v2",
      name: "Nusrat Fariha",
      station: "Lunch & Food Token Counter",
      timeSlot: "12:00 PM - 03:00 PM",
      supervisorPhone: "+8801711223355",
      notes: "Scan meal QR codes using web scanner",
    },
    {
      id: "v3",
      name: "Kazi Arfin",
      station: "Auditorium & Stage AV",
      timeSlot: "09:00 AM - 05:00 PM",
      supervisorPhone: "+8801711223366",
      notes: "Manage stage wireless microphones & projector",
    },
  ]);

  const [newVolunteerName, setNewVolunteerName] = useState("");
  const [newStation, setNewStation] = useState("Stage & AV Support");
  const [newTimeSlot, setNewTimeSlot] = useState("09:00 AM - 01:00 PM");
  const [newSupervisorPhone, setNewSupervisorPhone] = useState("+8801700000000");

  const handleAddShift = () => {
    if (!newVolunteerName.trim()) return;
    setShifts([
      ...shifts,
      {
        id: `v-${Date.now()}`,
        name: newVolunteerName,
        station: newStation,
        timeSlot: newTimeSlot,
        supervisorPhone: newSupervisorPhone,
      },
    ]);
    setNewVolunteerName("");
  };

  const handleRemoveShift = (id: string) => {
    setShifts(shifts.filter((s) => s.id !== id));
  };

  const handlePrintPocketPasses = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Volunteer Duty Passes</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .pass { border: 2px dashed #0284c7; border-radius: 10px; padding: 16px; page-break-inside: avoid; background: #f8fafc; }
    .tag { font-size: 11px; font-weight: 900; color: #0284c7; text-transform: uppercase; }
    .name { font-size: 18px; font-weight: bold; color: #0f172a; margin: 4px 0; }
    .station { font-size: 14px; font-weight: 600; color: #334155; }
    .time { font-size: 13px; color: #0284c7; font-weight: bold; margin: 6px 0; }
    .contact { font-size: 12px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="grid">
    ${shifts
      .map(
        (s) => `
      <div class="pass">
        <div class="tag">Official Duty Roster Pass</div>
        <div class="name">${s.name}</div>
        <div class="station">📍 Station: ${s.station}</div>
        <div class="time">⏰ Shift: ${s.timeSlot}</div>
        <div class="contact">📞 Lead Contact: ${s.supervisorPhone}</div>
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Volunteer & Executive Duty Shift Roster
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coordinate event staff across stations (Registration, Food, Stage, Security) with printable pocket duty cards.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={handlePrintPocketPasses}
        >
          Print Pocket Duty Passes ({shifts.length} Passes)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Shift Roster Stream (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {shifts.map((shift) => (
            <Card key={shift.id} padding="sm" className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{shift.name}</h4>
                  <Badge variant="primary">{shift.station}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{shift.timeSlot}</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>{shift.supervisorPhone}</span>
                  </span>
                </div>
                {shift.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">{shift.notes}</p>
                )}
              </div>

              <button
                onClick={() => handleRemoveShift(shift.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>

        {/* Right Side: Add Volunteer Shift Form (4 cols) */}
        <div className="lg:col-span-4">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
              Assign New Shift
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className={THEME.typography.label}>Volunteer Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Tanzim Shakib"
                  value={newVolunteerName}
                  onChange={(e) => setNewVolunteerName(e.target.value)}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>

              <div>
                <label className={THEME.typography.label}>Assigned Station:</label>
                <select
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value)}
                  className={`${THEME.surface.select} mt-1`}
                >
                  <option value="Registration & Badge Desk">Registration & Badge Desk</option>
                  <option value="Lunch & Food Token Counter">Lunch & Food Token Counter</option>
                  <option value="Auditorium & Stage AV">Auditorium & Stage AV</option>
                  <option value="VIP & Guest Ushering">VIP & Guest Ushering</option>
                  <option value="Floor Security & Crowd Control">Floor Security & Crowd Control</option>
                </select>
              </div>

              <div>
                <label className={THEME.typography.label}>Shift Timings:</label>
                <input
                  type="text"
                  placeholder="08:00 AM - 12:00 PM"
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>

              <div>
                <label className={THEME.typography.label}>Supervisor Phone:</label>
                <input
                  type="text"
                  placeholder="+8801700000000"
                  value={newSupervisorPhone}
                  onChange={(e) => setNewSupervisorPhone(e.target.value)}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>

              <Button
                variant="primary"
                className="w-full mt-2"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleAddShift}
              >
                Assign Volunteer
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
