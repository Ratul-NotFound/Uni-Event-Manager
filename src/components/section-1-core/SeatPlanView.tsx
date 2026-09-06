"use client";

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import {
  RoomGrid,
  SeatingAllocatorEngine,
} from "@/core/engines/seating-allocator";
import { AllocatedRoom, AssignedSeat } from "@/core/domain/seating-matrix";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import {
  LayoutGrid,
  Printer,
  ShieldCheck,
  ListOrdered,
  Shuffle,
  Plus,
  Trash2,
  Download,
  Users,
  Building2,
  FileSpreadsheet,
} from "lucide-react";

export interface SeatPlanViewProps {
  students: StudentRecord[];
}

export const SeatPlanView: React.FC<SeatPlanViewProps> = ({ students }) => {
  // Configured Rooms State
  const [rooms, setRooms] = useState<RoomGrid[]>([
    new RoomGrid({
      id: "room-1",
      name: "Auditorium A",
      rows: 6,
      columns: 6,
      studentsPerDesk: 2,
      aisles: [3], // aisle at column 3
    }),
    new RoomGrid({
      id: "room-2",
      name: "Hall 201",
      rows: 5,
      columns: 4,
      studentsPerDesk: 1,
    }),
  ]);

  const [activeRoomId, setActiveRoomId] = useState<string>("room-1");
  const [allocationStrategy, setAllocationStrategy] = useState<
    "interleaved" | "sequential" | "random"
  >("interleaved");
  const [eventName, setEventName] = useState(
    "National Collegiate Tech Competition 2026"
  );

  // New Room Inputs
  const [newRoomName, setNewRoomName] = useState("Exam Hall 305");
  const [newRoomRows, setNewRoomRows] = useState(6);
  const [newRoomCols, setNewRoomCols] = useState(5);
  const [newRoomPerDesk, setNewRoomPerDesk] = useState(2);

  // Run Allocation
  const allocatedRooms: AllocatedRoom[] = useMemo(() => {
    if (students.length === 0) {
      // Return empty templates if no students loaded
      return rooms.map((r) => ({
        roomId: r.id,
        roomName: r.name,
        seats: r.generateEmptySeats(),
        totalAssigned: 0,
        totalCapacity: r.getTotalCapacity(),
      }));
    }

    if (allocationStrategy === "interleaved") {
      return SeatingAllocatorEngine.allocateInterleaved(students, rooms);
    } else if (allocationStrategy === "random") {
      return SeatingAllocatorEngine.allocateRandom(students, rooms);
    } else {
      return SeatingAllocatorEngine.allocateSequential(students, rooms);
    }
  }, [students, rooms, allocationStrategy]);

  const activeAllocatedRoom =
    allocatedRooms.find((r) => r.roomId === activeRoomId) || allocatedRooms[0];
  const activeRoomConfig =
    rooms.find((r) => r.id === activeRoomId) || rooms[0];

  const totalCapacity = rooms.reduce((acc, r) => acc + r.getTotalCapacity(), 0);

  // Department Color Mapping for visual distinction
  const getDeptColor = (dept?: string) => {
    if (!dept) return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    const d = dept.toUpperCase();
    if (d.includes("CSE")) return "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    if (d.includes("EEE")) return "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    if (d.includes("BBA")) return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    if (d.includes("ENG")) return "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    return "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  };

  // Add Room
  const handleAddRoom = () => {
    const newRoom = new RoomGrid({
      id: `room-${Date.now()}`,
      name: newRoomName || `Hall ${rooms.length + 1}`,
      rows: Number(newRoomRows) || 5,
      columns: Number(newRoomCols) || 4,
      studentsPerDesk: Number(newRoomPerDesk) || 1,
    });
    setRooms([...rooms, newRoom]);
    setActiveRoomId(newRoom.id);
  };

  // Remove Room
  const handleRemoveRoom = (id: string) => {
    if (rooms.length <= 1) return;
    const filtered = rooms.filter((r) => r.id !== id);
    setRooms(filtered);
    if (activeRoomId === id) setActiveRoomId(filtered[0].id);
  };

  // Print Door Notices
  const handlePrintDoorNotice = () => {
    if (!activeAllocatedRoom) return;
    const html = SeatingAllocatorEngine.generateDoorNoticeHtml(
      activeAllocatedRoom,
      eventName
    );
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  // Print Desk Chits
  const handlePrintDeskChits = () => {
    if (!activeAllocatedRoom) return;
    const html = SeatingAllocatorEngine.generateDeskChitsHtml(
      activeAllocatedRoom,
      eventName
    );
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  // Export Enriched Excel
  const handleExportEnrichedRoster = () => {
    const enrichedList: any[] = [];
    allocatedRooms.forEach((ar) => {
      ar.seats.forEach((s) => {
        if (!s.isAisle && s.student) {
          enrichedList.push({
            Assigned_Room: ar.roomName,
            Seat_Label: s.position.label,
            Row_Number: s.position.rowIndex + 1,
            Desk_Col: s.position.colIndex + 1,
            Student_ID: s.student.id,
            Student_Name: s.student.name,
            Department: s.student.department || "",
            Email: s.student.email || "",
            Phone: s.student.phone || "",
          });
        }
      });
    });

    const ws = XLSX.utils.json_to_sheet(enrichedList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Allocated_Seat_Plan");
    XLSX.writeFile(wb, `Seating_Plan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Smart Seat Plan & Hall Allocation Module
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-room layout matrix with anti-cheating interleaved algorithms, printable door sheets, and desk chits.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrintDoorNotice}
          >
            Print Door Notice (PDF)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-4 h-4 text-amber-500" />}
            onClick={handlePrintDeskChits}
          >
            Print Desk Chits (A4)
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportEnrichedRoster}
          >
            Export Seated Excel
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Halls / Rooms</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {rooms.length} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Active</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Venue Capacity</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {totalCapacity} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Desks/Seats</span>
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Allocated Examinees</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {students.length} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Assigned</span>
            </h4>
          </div>
        </Card>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Room Tabs & Floor Matrix (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card padding="md" className="space-y-4">
            {/* Room Tabs & Strategy Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {rooms.map((r) => {
                  const isActive = r.id === activeRoomId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveRoomId(r.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>{r.name}</span>
                      <span className="text-[10px] opacity-80">
                        ({r.getTotalCapacity()} seats)
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Strategy Selector */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setAllocationStrategy("interleaved")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-medium ${
                    allocationStrategy === "interleaved"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="Alternates departments so neighbors never share the same department"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Anti-Cheating</span>
                </button>
                <button
                  onClick={() => setAllocationStrategy("sequential")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-medium ${
                    allocationStrategy === "sequential"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="Sequential by roll / ID"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Sequential</span>
                </button>
                <button
                  onClick={() => setAllocationStrategy("random")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-medium ${
                    allocationStrategy === "random"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="Random shuffle for competitions"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Random</span>
                </button>
              </div>
            </div>

            {/* Visual Floor Grid */}
            <div className="w-full overflow-x-auto p-4 bg-slate-100/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="min-w-fit mx-auto space-y-3">
                {/* Stage / Blackboard Indicator */}
                <div className="w-full py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-2xs">
                  [ STAGE / PODIUM / BLACKBOARD ]
                </div>

                {/* Rows & Desks */}
                {Array.from({ length: activeRoomConfig.rows }).map((_, rIdx) => {
                  const rowSeats = (activeAllocatedRoom?.seats || []).filter(
                    (s) => s.position.rowIndex === rIdx
                  );

                  return (
                    <div key={rIdx} className="flex items-center gap-2 justify-center">
                      <span className="w-6 text-center font-mono text-xs text-slate-400 dark:text-slate-500 font-bold">
                        {String.fromCharCode(65 + rIdx)}
                      </span>

                      {/* Columns */}
                      <div className="flex items-center gap-3">
                        {Array.from({ length: activeRoomConfig.columns }).map(
                          (_, cIdx) => {
                            const deskSeats = rowSeats.filter(
                              (s) => s.position.colIndex === cIdx
                            );
                            const isAisle = deskSeats.some((s) => s.isAisle);

                            if (isAisle) {
                              return (
                                <div
                                  key={cIdx}
                                  className="w-10 h-16 border-r-2 border-dashed border-slate-300 dark:border-slate-800/80 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-600 uppercase"
                                >
                                  Aisle
                                </div>
                              );
                            }

                            return (
                              <div
                                key={cIdx}
                                className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex gap-2 shadow-xs"
                              >
                                {deskSeats.map((seat) => (
                                  <div
                                    key={seat.id}
                                    className={`w-24 h-16 rounded-lg p-1.5 flex flex-col justify-between border transition-all ${
                                      seat.student
                                        ? getDeptColor(seat.student.department)
                                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-600"
                                    }`}
                                  >
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                      <span className="font-bold">{seat.position.label}</span>
                                      {seat.student && (
                                        <span className="text-[9px] uppercase font-semibold">
                                          {seat.student.department?.slice(0, 4)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-semibold truncate">
                                      {seat.student ? seat.student.name : "Vacant"}
                                    </div>
                                    <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                      {seat.student ? seat.student.id : "-"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Room Management & Hall Configuration (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Hall Grid Setup
              </h3>
              {rooms.length > 1 && (
                <button
                  onClick={() => handleRemoveRoom(activeRoomId)}
                  className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Hall</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={THEME.typography.label}>Room / Hall Name:</label>
                <input
                  type="text"
                  value={activeRoomConfig.name}
                  onChange={(e) => {
                    const updated = [...rooms];
                    const idx = updated.findIndex((r) => r.id === activeRoomId);
                    if (idx !== -1) {
                      updated[idx].name = e.target.value;
                      setRooms(updated);
                    }
                  }}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={THEME.typography.label}>Rows Count:</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={activeRoomConfig.rows}
                    onChange={(e) => {
                      const updated = [...rooms];
                      const idx = updated.findIndex((r) => r.id === activeRoomId);
                      if (idx !== -1) {
                        updated[idx].rows = Number(e.target.value);
                        setRooms(updated);
                      }
                    }}
                    className={`${THEME.surface.input} mt-1`}
                  />
                </div>

                <div>
                  <label className={THEME.typography.label}>Columns (Desks):</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={activeRoomConfig.columns}
                    onChange={(e) => {
                      const updated = [...rooms];
                      const idx = updated.findIndex((r) => r.id === activeRoomId);
                      if (idx !== -1) {
                        updated[idx].columns = Number(e.target.value);
                        setRooms(updated);
                      }
                    }}
                    className={`${THEME.surface.input} mt-1`}
                  />
                </div>
              </div>

              <div>
                <label className={THEME.typography.label}>Students Per Desk:</label>
                <select
                  value={activeRoomConfig.studentsPerDesk}
                  onChange={(e) => {
                    const updated = [...rooms];
                    const idx = updated.findIndex((r) => r.id === activeRoomId);
                    if (idx !== -1) {
                      updated[idx].studentsPerDesk = Number(e.target.value);
                      setRooms(updated);
                    }
                  }}
                  className={`${THEME.surface.select} mt-1`}
                >
                  <option value={1}>1 Student per Bench (Solo Exam)</option>
                  <option value={2}>2 Students per Bench (Dual)</option>
                  <option value={3}>3 Students per Bench (Team Bench)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Room Capacity:</span>
                  <span className="text-white font-bold">{activeRoomConfig.getTotalCapacity()} seats</span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned In This Room:</span>
                  <span className="text-emerald-400 font-bold">
                    {activeAllocatedRoom?.totalAssigned || 0} students
                  </span>
                </div>
              </div>
            </div>

            {/* Add Another Room Section */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Add Another Hall:
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Science Lab 4"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className={`${THEME.surface.input} text-xs`}
                />
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleAddRoom}
                >
                  Add
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
