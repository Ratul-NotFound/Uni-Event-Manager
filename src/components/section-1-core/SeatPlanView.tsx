"use client";

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import {
  RoomGrid,
  SeatingAllocatorEngine,
} from "@/core/engines/seating-allocator";
import { BulkGeneratorEngine } from "@/core/engines/bulk-generator";
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
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  Settings2,
  FileText,
  Filter,
  Sparkles,
  HelpCircle,
  Maximize2,
  RotateCcw,
  Ban,
  Tag,
  ChevronRight,
} from "lucide-react";

export interface SeatPlanViewProps {
  students: StudentRecord[];
  onRosterUpdate?: (records: StudentRecord[]) => void;
}

export type PhaseTab = "examinees" | "architecture" | "rules" | "dispatch";

export const SeatPlanView: React.FC<SeatPlanViewProps> = ({ students, onRosterUpdate }) => {
  // 4-Phase Sequential Navigation
  const [activePhase, setActivePhase] = useState<PhaseTab>("examinees");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Configured Rooms State
  const [rooms, setRooms] = useState<RoomGrid[]>([
    new RoomGrid({
      id: "room-1",
      name: "Auditorium A",
      rows: 6,
      columns: 6,
      studentsPerDesk: 2,
      aisles: [3],
    }),
    new RoomGrid({
      id: "room-2",
      name: "Hall 201",
      rows: 5,
      columns: 4,
      studentsPerDesk: 1,
      aisles: [2],
    }),
  ]);

  const [activeRoomId, setActiveRoomId] = useState<string>("room-1");

  // Event & Supervisor Metadata
  const [eventName, setEventName] = useState("National Collegiate Tech Competition 2026");
  const [supervisorName, setSupervisorName] = useState("Dr. Alan Turing");

  // Phase 1: Examinees & Scope State
  const [scopeMode, setScopeMode] = useState<"all" | "dept" | "team" | "range">("all");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [customRangeStr, setCustomRangeStr] = useState<string>("1-40");

  // Phase 3: Rules & Strategy State
  const [allocationStrategy, setAllocationStrategy] = useState<
    "interleaved" | "team" | "sequential" | "random"
  >("interleaved");

  // Manual Adjustments: Swapping & Reserved Desks
  const [reservedSeatIds, setReservedSeatIds] = useState<Set<string>>(new Set());
  const [isSwapModeActive, setIsSwapModeActive] = useState<boolean>(false);
  const [swapSourceSeat, setSwapSourceSeat] = useState<AssignedSeat | null>(null);
  const [manualSeatMap, setManualSeatMap] = useState<Record<string, StudentRecord | null>>({});
  const [selectedSeatModal, setSelectedSeatModal] = useState<AssignedSeat | null>(null);
  const [swapToast, setSwapToast] = useState<string | null>(null);

  // New Room Inputs
  const [newRoomName, setNewRoomName] = useState("Exam Hall 305");
  const [newRoomRows, setNewRoomRows] = useState(6);
  const [newRoomCols, setNewRoomCols] = useState(5);
  const [newRoomPerDesk, setNewRoomPerDesk] = useState(2);

  // Available unique departments and teams
  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [students]);

  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const team = s.teamName || (s as any).team;
      if (team) set.add(team.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Scoped Students
  const scopedStudents = useMemo(() => {
    if (students.length === 0) return [];

    if (scopeMode === "dept" && selectedDepts.length > 0) {
      return students.filter(
        (s) => s.department && selectedDepts.includes(s.department.trim().toUpperCase())
      );
    }

    if (scopeMode === "team" && selectedTeam) {
      return students.filter((s) => (s.teamName || (s as any).team) === selectedTeam);
    }

    if (scopeMode === "range" && customRangeStr.trim()) {
      const indices = BulkGeneratorEngine.parseRowRange(customRangeStr, students.length);
      return indices.map((idx) => students[idx]).filter(Boolean);
    }

    return students;
  }, [students, scopeMode, selectedDepts, selectedTeam, customRangeStr]);

  // Compute Base Allocations from Engine
  const baseAllocatedRooms: AllocatedRoom[] = useMemo(() => {
    // Inject current reservedSeatIds into rooms
    const roomsWithReservations = rooms.map((r) => {
      return new RoomGrid({
        id: r.id,
        name: r.name,
        rows: r.rows,
        columns: r.columns,
        studentsPerDesk: r.studentsPerDesk,
        aisles: Array.from(r.aisles),
        reservedSeatIds: Array.from(reservedSeatIds).filter((id) => id.startsWith(r.id)),
      });
    });

    if (scopedStudents.length === 0) {
      return roomsWithReservations.map((r) => ({
        roomId: r.id,
        roomName: r.name,
        seats: r.generateEmptySeats(),
        totalAssigned: 0,
        totalCapacity: r.getTotalCapacity(),
      }));
    }

    if (allocationStrategy === "interleaved") {
      return SeatingAllocatorEngine.allocateInterleaved(scopedStudents, roomsWithReservations);
    } else if (allocationStrategy === "team") {
      return SeatingAllocatorEngine.allocateTeamClustered(scopedStudents, roomsWithReservations);
    } else if (allocationStrategy === "random") {
      return SeatingAllocatorEngine.allocateRandom(scopedStudents, roomsWithReservations);
    } else {
      return SeatingAllocatorEngine.allocateSequential(scopedStudents, roomsWithReservations);
    }
  }, [scopedStudents, rooms, allocationStrategy, reservedSeatIds]);

  // Apply Manual Overrides (Seat Swaps) on top of Base Allocation
  const allocatedRooms: AllocatedRoom[] = useMemo(() => {
    if (Object.keys(manualSeatMap).length === 0) {
      return baseAllocatedRooms;
    }

    return baseAllocatedRooms.map((room) => {
      const updatedSeats = room.seats.map((seat) => {
        if (seat.id in manualSeatMap) {
          const overridden = manualSeatMap[seat.id];
          return {
            ...seat,
            student: overridden
              ? {
                  ...overridden,
                  assignedRoom: room.roomName,
                  assignedRow: String(seat.position.rowIndex + 1),
                  assignedSeat: seat.position.label,
                }
              : undefined,
          };
        }
        return seat;
      });

      const assignedCount = updatedSeats.filter((s) => !s.isAisle && !s.isReserved && s.student).length;

      return {
        ...room,
        seats: updatedSeats,
        totalAssigned: assignedCount,
      };
    });
  }, [baseAllocatedRooms, manualSeatMap]);

  const activeAllocatedRoom =
    allocatedRooms.find((r) => r.roomId === activeRoomId) || allocatedRooms[0];
  const activeRoomConfig =
    rooms.find((r) => r.id === activeRoomId) || rooms[0];

  const totalVenueCapacity = rooms.reduce((acc, r) => acc + r.getTotalCapacity(), 0);

  // Detect Adjacent Department Conflicts (for Interleaved Anti-Cheating Verification)
  const adjacentConflictCount = useMemo(() => {
    if (!activeAllocatedRoom || allocationStrategy !== "interleaved") return 0;
    let conflicts = 0;
    const seats = activeAllocatedRoom.seats;

    for (let r = 0; r < activeRoomConfig.rows; r++) {
      const rowSeats = seats
        .filter((s) => s.position.rowIndex === r && !s.isAisle && !s.isReserved && s.student)
        .sort((a, b) => a.position.colIndex - b.position.colIndex || a.position.seatInDeskIndex - b.position.seatInDeskIndex);

      for (let i = 0; i < rowSeats.length - 1; i++) {
        const curr = rowSeats[i].student?.department;
        const next = rowSeats[i + 1].student?.department;
        if (curr && next && curr.toUpperCase() === next.toUpperCase()) {
          conflicts++;
        }
      }
    }
    return conflicts;
  }, [activeAllocatedRoom, activeRoomConfig, allocationStrategy]);

  // Department Color Mapping
  const getDeptColor = (dept?: string) => {
    if (!dept) return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    const d = dept.toUpperCase();
    if (d.includes("CSE")) return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    if (d.includes("EEE")) return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    if (d.includes("BBA")) return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    if (d.includes("ENG") || d.includes("SWE")) return "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  };

  // Hall Presets
  const applyHallPreset = (preset: "standard" | "auditorium" | "lab" | "hackathon") => {
    let rows = 5, cols = 4, perDesk = 2, aisles: number[] = [2];

    if (preset === "auditorium") {
      rows = 6;
      cols = 6;
      perDesk = 2;
      aisles = [2, 4];
    } else if (preset === "lab") {
      rows = 5;
      cols = 5;
      perDesk = 1;
      aisles = [2];
    } else if (preset === "hackathon") {
      rows = 4;
      cols = 4;
      perDesk = 3;
      aisles = [2];
    }

    const updated = rooms.map((r) => {
      if (r.id === activeRoomId) {
        return new RoomGrid({
          id: r.id,
          name: r.name,
          rows,
          columns: cols,
          studentsPerDesk: perDesk,
          aisles,
        });
      }
      return r;
    });
    setRooms(updated);
  };

  // Toggle Aisle for Active Room
  const toggleColumnAisle = (colIdx: number) => {
    const updated = rooms.map((r) => {
      if (r.id === activeRoomId) {
        const currentAisles = new Set(r.aisles);
        if (currentAisles.has(colIdx)) {
          currentAisles.delete(colIdx);
        } else {
          currentAisles.add(colIdx);
        }
        return new RoomGrid({
          id: r.id,
          name: r.name,
          rows: r.rows,
          columns: r.columns,
          studentsPerDesk: r.studentsPerDesk,
          aisles: Array.from(currentAisles),
        });
      }
      return r;
    });
    setRooms(updated);
  };

  // Toggle Broken/Reserved Desk
  const toggleSeatReserved = (seatId: string) => {
    const next = new Set(reservedSeatIds);
    if (next.has(seatId)) {
      next.delete(seatId);
    } else {
      next.add(seatId);
    }
    setReservedSeatIds(next);
    setSelectedSeatModal(null);
  };

  // Handle Seat Click (Inspection or Swapping)
  const handleSeatClick = (seat: AssignedSeat) => {
    if (seat.isAisle) return;

    if (isSwapModeActive) {
      if (!swapSourceSeat) {
        setSwapSourceSeat(seat);
      } else if (swapSourceSeat.id === seat.id) {
        setSwapSourceSeat(null);
      } else {
        // Execute Swap
        const studentA = swapSourceSeat.student || null;
        const studentB = seat.student || null;

        setManualSeatMap((prev) => ({
          ...prev,
          [swapSourceSeat.id]: studentB,
          [seat.id]: studentA,
        }));

        setSwapToast(
          `Swapped [${studentA ? studentA.name : "Vacant"}] (${swapSourceSeat.position.label}) with [${
            studentB ? studentB.name : "Vacant"
          }] (${seat.position.label})`
        );
        setTimeout(() => setSwapToast(null), 4500);

        setSwapSourceSeat(null);
        setIsSwapModeActive(false);
      }
    } else {
      setSelectedSeatModal(seat);
    }
  };

  // Add Room
  const handleAddRoom = () => {
    const newRoom = new RoomGrid({
      id: `room-${Date.now()}`,
      name: newRoomName || `Hall ${rooms.length + 1}`,
      rows: Number(newRoomRows) || 5,
      columns: Number(newRoomCols) || 4,
      studentsPerDesk: Number(newRoomPerDesk) || 2,
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

  // Reset Overrides
  const handleResetManualSwaps = () => {
    setManualSeatMap({});
    setSwapSourceSeat(null);
    setIsSwapModeActive(false);
    setSwapToast("Manual seat swaps reset to algorithmic allocation.");
    setTimeout(() => setSwapToast(null), 3000);
  };

  // Print Handlers
  const handlePrintDoorNotice = () => {
    if (!activeAllocatedRoom) return;
    const html = SeatingAllocatorEngine.generateDoorNoticeHtml(activeAllocatedRoom, eventName);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  const handlePrintDeskChits = () => {
    if (!activeAllocatedRoom) return;
    const html = SeatingAllocatorEngine.generateDeskChitsHtml(activeAllocatedRoom, eventName);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  const handlePrintAttendanceSheet = () => {
    if (!activeAllocatedRoom) return;
    const html = SeatingAllocatorEngine.generateAttendanceSheetHtml(
      activeAllocatedRoom,
      eventName,
      supervisorName
    );
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

    const handleSyncSeatsToRoster = () => {
    const seatMap = new Map<string, { assignedRoom: string; assignedRow: string; assignedSeat: string }>();
    allocatedRooms.forEach((ar) => {
      ar.seats.forEach((s) => {
        if (!s.isAisle && s.student) {
          seatMap.set(s.student.id, {
            assignedRoom: ar.roomName,
            assignedRow: String(s.position.rowIndex + 1),
            assignedSeat: s.position.label,
          });
        }
      });
    });

    const updatedStudents = students.map((st) => {
      const alloc = seatMap.get(st.id);
      if (alloc) {
        return {
          ...st,
          assignedRoom: alloc.assignedRoom,
          assignedRow: alloc.assignedRow,
          assignedSeat: alloc.assignedSeat,
        };
      }
      return st;
    });

    onRosterUpdate?.(updatedStudents);
    setSyncStatus(`✓ Synced seating allocations for ${seatMap.size} attendees across ID Cards, Badges, and Pipeline!`);
    setTimeout(() => setSyncStatus(null), 5000);
    return updatedStudents;
  };

  const handleExportEnrichedRoster = () => {
    // Auto sync allocations back into the active domain roster
    handleSyncSeatsToRoster();

    const enrichedList: any[] = [];
    allocatedRooms.forEach((ar) => {
      ar.seats.forEach((s) => {
        if (!s.isAisle && s.student) {
          enrichedList.push({
            Assigned_Room: ar.roomName,
            Seat_Label: s.position.label,
            Row_Number: s.position.rowIndex + 1,
            Desk_Col: s.position.colIndex + 1,
            Seat_In_Desk: s.position.seatInDeskIndex + 1,
            Student_ID: s.student.id,
            Student_Name: s.student.name,
            Department: s.student.department || "",
            Team_Name: s.student.teamName || (s.student as any).team || "",
            Advisor: s.student.advisor || (s.student as any).supervisor || "",
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

  const capacityDiff = totalVenueCapacity - scopedStudents.length;

  return (
    <div className="w-full space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Smart Seat Plan & Hall Allocation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deeply logical 4-phase workflow: Scoping → Architecture & Aisles → Anti-Cheating Rules → Print & Dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-4 h-4 text-blue-500" />}
            onClick={handlePrintDoorNotice}
          >
            Door Notice (PDF)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-4 h-4 text-amber-500" />}
            onClick={handlePrintDeskChits}
          >
            Desk Chits (A4)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileText className="w-4 h-4 text-purple-500" />}
            onClick={handlePrintAttendanceSheet}
          >
            Attendance Sheet
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportEnrichedRoster}
          >
            Export Excel
          </Button>
        </div>
      </div>

      {/* Main Split Layout: Left Floor Grid (8 cols) + Right 4-Phase Task Manager (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Permanently Visible Interactive Floor Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card padding="md" className="space-y-4">
            {/* Room Tabs Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {rooms.map((r) => {
                  const isActive = r.id === activeRoomId;
                  const roomAlloc = allocatedRooms.find((ar) => ar.roomId === r.id);
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
                      <Building2 className="w-3.5 h-3.5 opacity-75" />
                      <span>{r.name}</span>
                      <span className="text-[10px] opacity-80">
                        ({roomAlloc?.totalAssigned || 0}/{r.getTotalCapacity()} seats)
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Interactive Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant={isSwapModeActive ? "primary" : "secondary"}
                  size="sm"
                  leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setIsSwapModeActive(!isSwapModeActive);
                    setSwapSourceSeat(null);
                  }}
                >
                  {isSwapModeActive ? "Cancel Swap Mode" : "Swap Seats"}
                </Button>

                {Object.keys(manualSeatMap).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RotateCcw className="w-3 h-3 text-rose-500" />}
                    onClick={handleResetManualSwaps}
                    title="Revert all manual swaps back to pure algorithmic seating"
                  >
                    Reset Swaps
                  </Button>
                )}
              </div>
            </div>

            {/* Notification Toast if Swap performed */}
            {swapToast && (
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{swapToast}</span>
                </div>
                <button
                  onClick={() => setSwapToast(null)}
                  className="text-xs text-blue-500 hover:text-blue-700 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Live Room Status & Conflict Gauge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Room Occupancy
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeAllocatedRoom?.totalAssigned || 0} / {activeRoomConfig.getTotalCapacity()}{" "}
                    <span className="text-slate-400 font-normal">
                      (
                      {Math.round(
                        ((activeAllocatedRoom?.totalAssigned || 0) /
                          Math.max(1, activeRoomConfig.getTotalCapacity())) *
                          100
                      )}
                      %)
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${
                    adjacentConflictCount === 0
                      ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Anti-Cheating Check
                  </span>
                  <span
                    className={`font-bold ${
                      adjacentConflictCount === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {adjacentConflictCount === 0
                      ? "✓ 0 Adjacent Conflicts"
                      : `⚠️ ${adjacentConflictCount} Adjacent Same-Dept`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Layout Configuration
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeRoomConfig.rows} Rows × {activeRoomConfig.columns} Desks (
                    {activeRoomConfig.studentsPerDesk}/bench)
                  </span>
                </div>
              </div>
            </div>

            {/* Swap Mode Guidance Banner */}
            {isSwapModeActive && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3">
                <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">Interactive Seat Swapping Mode Active</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    {swapSourceSeat
                      ? `Selected Seat ${swapSourceSeat.position.label} (${
                          swapSourceSeat.student?.name || "Vacant"
                        }). Now click the target seat to swap!`
                      : "Click on any seat to select the first examinee, then click another seat to swap them."}
                  </p>
                </div>
              </div>
            )}

            {/* Visual Floor Grid Canvas */}
            <div className="w-full overflow-x-auto p-4 bg-slate-100/80 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="min-w-fit mx-auto space-y-3">
                {/* Stage / Blackboard Indicator */}
                <div className="w-full py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-2xs flex items-center justify-center gap-2">
                  <span>[ STAGE / PODIUM / BLACKBOARD ]</span>
                </div>

                {/* Grid Rows & Desks */}
                {Array.from({ length: activeRoomConfig.rows }).map((_, rIdx) => {
                  const rowSeats = (activeAllocatedRoom?.seats || []).filter(
                    (s) => s.position.rowIndex === rIdx
                  );

                  return (
                    <div key={rIdx} className="flex items-center gap-2 justify-center">
                      {/* Row Letter Badge */}
                      <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-mono text-xs text-slate-500 dark:text-slate-400 font-bold shadow-2xs">
                        {String.fromCharCode(65 + rIdx)}
                      </span>

                      {/* Columns */}
                      <div className="flex items-center gap-3">
                        {Array.from({ length: activeRoomConfig.columns }).map((_, cIdx) => {
                          const deskSeats = rowSeats.filter((s) => s.position.colIndex === cIdx);
                          const isAisle = deskSeats.some((s) => s.isAisle);

                          if (isAisle) {
                            return (
                              <div
                                key={cIdx}
                                onClick={() => toggleColumnAisle(cIdx)}
                                className="w-10 h-16 border-r-2 border-dashed border-slate-300 dark:border-slate-800/80 flex flex-col items-center justify-center text-[10px] text-slate-400 dark:text-slate-600 uppercase cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-all select-none"
                                title="Click to toggle aisle on/off"
                              >
                                <span>Aisle</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={cIdx}
                              className="p-1.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex gap-1.5 shadow-xs"
                            >
                              {deskSeats.map((seat) => {
                                const isSelectedForSwap = swapSourceSeat?.id === seat.id;
                                const isReserved = seat.isReserved;

                                if (isReserved) {
                                  return (
                                    <div
                                      key={seat.id}
                                      onClick={() => handleSeatClick(seat)}
                                      className="w-24 h-16 rounded-lg p-1.5 flex flex-col justify-between border border-rose-300 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer hover:shadow-xs transition-all"
                                      title="Reserved / Broken Desk. Click to unblock."
                                    >
                                      <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                                        <span>{seat.position.label}</span>
                                        <Ban className="w-3 h-3" />
                                      </div>
                                      <div className="text-[10px] font-semibold text-center uppercase tracking-wide">
                                        Reserved
                                      </div>
                                      <div className="text-[8px] text-center opacity-75">
                                        Click to restore
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={seat.id}
                                    onClick={() => handleSeatClick(seat)}
                                    className={`w-24 h-16 rounded-lg p-1.5 flex flex-col justify-between border transition-all cursor-pointer select-none ${
                                      isSelectedForSwap
                                        ? "ring-2 ring-blue-500 ring-offset-2 scale-105 shadow-md bg-blue-50 dark:bg-blue-950"
                                        : seat.student
                                        ? getDeptColor(seat.student.department)
                                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-600 hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                                  >
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                      <span className="font-bold">{seat.position.label}</span>
                                      {seat.student && (
                                        <span className="text-[9px] uppercase font-bold tracking-tight">
                                          {seat.student.department?.slice(0, 4)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-semibold truncate leading-tight">
                                      {seat.student ? seat.student.name : "Vacant"}
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 dark:text-slate-400">
                                      <span className="truncate">{seat.student ? seat.student.id : "-"}</span>
                                      {seat.student?.teamName && (
                                        <span className="text-[8px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[40px]">
                                          {seat.student.teamName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Sequential 4-Phase Task Manager (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card padding="md" className="space-y-4">
            {/* 4-Phase Workflow Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActivePhase("examinees")}
                className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activePhase === "examinees"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="text-[10px]">1. Examinees</span>
              </button>

              <button
                onClick={() => setActivePhase("architecture")}
                className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activePhase === "architecture"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">2. Hall Setup</span>
              </button>

              <button
                onClick={() => setActivePhase("rules")}
                className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activePhase === "rules"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px]">3. Rules</span>
              </button>

              <button
                onClick={() => setActivePhase("dispatch")}
                className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  activePhase === "dispatch"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="text-[10px]">4. Dispatch</span>
              </button>
            </div>

            {/* TAB 1: EXAMINEES & SCOPE */}
            {activePhase === "examinees" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    Phase 1: Examinees & Scoping
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Define who is being seated across your halls for this event.
                  </p>
                </div>

                {/* Scope Mode Selector */}
                <div className="space-y-2">
                  <label className={THEME.typography.label}>Target Examinee Scope:</label>

                  <div className="space-y-1.5">
                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        scopeMode === "all"
                          ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeMode === "all"}
                        onChange={() => setScopeMode("all")}
                        className="text-blue-600"
                      />
                      <div>
                        <p className="font-semibold text-xs">All Students ({students.length} loaded)</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Allocate every student record loaded from Data Refinery.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        scopeMode === "dept"
                          ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeMode === "dept"}
                        onChange={() => setScopeMode("dept")}
                        className="text-blue-600"
                      />
                      <div>
                        <p className="font-semibold text-xs">Filter by Department</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Seat specific academic faculties (e.g. CSE, EEE).
                        </p>
                      </div>
                    </label>

                    {scopeMode === "dept" && (
                      <div className="pl-6 pt-1 space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {availableDepts.map((d) => {
                            const isSelected = selectedDepts.includes(d);
                            return (
                              <button
                                key={d}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedDepts(selectedDepts.filter((x) => x !== d));
                                  } else {
                                    setSelectedDepts([...selectedDepts, d]);
                                  }
                                }}
                                className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                                  isSelected
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        scopeMode === "team"
                          ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeMode === "team"}
                        onChange={() => setScopeMode("team")}
                        className="text-blue-600"
                      />
                      <div>
                        <p className="font-semibold text-xs">Filter by Contest Team</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Seat a single hackathon/contest team for testing.
                        </p>
                      </div>
                    </label>

                    {scopeMode === "team" && (
                      <div className="pl-6 pt-1">
                        <select
                          value={selectedTeam}
                          onChange={(e) => setSelectedTeam(e.target.value)}
                          className={THEME.surface.select}
                        >
                          <option value="">-- Choose Contest Team --</option>
                          {availableTeams.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        scopeMode === "range"
                          ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeMode === "range"}
                        onChange={() => setScopeMode("range")}
                        className="text-blue-600"
                      />
                      <div>
                        <p className="font-semibold text-xs">Custom Row Range</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          e.g. 1-30 for Hall A, 31-60 for Hall B.
                        </p>
                      </div>
                    </label>

                    {scopeMode === "range" && (
                      <div className="pl-6 pt-1">
                        <input
                          type="text"
                          value={customRangeStr}
                          onChange={(e) => setCustomRangeStr(e.target.value)}
                          placeholder="e.g. 1-30, 45-60"
                          className={THEME.surface.input}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Capacity Balance Check Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Total Venue Desks:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {totalVenueCapacity} seats
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Selected Examinees:
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {scopedStudents.length} students
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">Balance:</span>
                    <span
                      className={`font-bold text-xs ${
                        capacityDiff >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {capacityDiff >= 0
                        ? `✓ ${capacityDiff} Spare Seats`
                        : `⚠️ Need ${Math.abs(capacityDiff)} More Seats!`}
                    </span>
                  </div>
                </div>

                {/* Event Name & Supervisor */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className={THEME.typography.label}>Event Title:</label>
                    <input
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className={THEME.surface.input}
                    />
                  </div>
                  <div>
                    <label className={THEME.typography.label}>Invigilator / Supervisor Name:</label>
                    <input
                      type="text"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      className={THEME.surface.input}
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-2"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setActivePhase("architecture")}
                >
                  Proceed to Hall Setup
                </Button>
              </div>
            )}

            {/* TAB 2: HALL ARCHITECTURE & AISLES */}
            {activePhase === "architecture" && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                      Phase 2: Hall Architecture
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Configure rows, columns, desk capacities, and walking aisles.
                    </p>
                  </div>
                  {rooms.length > 1 && (
                    <button
                      onClick={() => handleRemoveRoom(activeRoomId)}
                      className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Hall</span>
                    </button>
                  )}
                </div>

                {/* Quick Hall Presets */}
                <div>
                  <label className={THEME.typography.label}>Layout Architecture Presets:</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => applyHallPreset("standard")}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-left hover:border-blue-500 transition-all cursor-pointer"
                    >
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                        🏛️ Standard Class
                      </p>
                      <p className="text-[9px] text-slate-500">5×4, 2/desk, Center Aisle</p>
                    </button>

                    <button
                      onClick={() => applyHallPreset("auditorium")}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-left hover:border-blue-500 transition-all cursor-pointer"
                    >
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                        🎓 Auditorium
                      </p>
                      <p className="text-[9px] text-slate-500">6×6, 2/desk, Dual Aisles</p>
                    </button>

                    <button
                      onClick={() => applyHallPreset("lab")}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-left hover:border-blue-500 transition-all cursor-pointer"
                    >
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                        💻 Computer Lab
                      </p>
                      <p className="text-[9px] text-slate-500">5×5, 1/desk, 1 Aisle</p>
                    </button>

                    <button
                      onClick={() => applyHallPreset("hackathon")}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-left hover:border-blue-500 transition-all cursor-pointer"
                    >
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                        🏆 Hack Arena
                      </p>
                      <p className="text-[9px] text-slate-500">4×4, 3/desk, Team Desks</p>
                    </button>
                  </div>
                </div>

                {/* Hall Name & Dimensions */}
                <div className="space-y-3">
                  <div>
                    <label className={THEME.typography.label}>Hall / Room Name:</label>
                    <input
                      type="text"
                      value={activeRoomConfig.name}
                      onChange={(e) => {
                        const updated = rooms.map((r) =>
                          r.id === activeRoomId ? new RoomGrid({ ...r, name: e.target.value }) : r
                        );
                        setRooms(updated);
                      }}
                      className={THEME.surface.input}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={THEME.typography.label}>Rows Count:</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={activeRoomConfig.rows}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = rooms.map((r) =>
                            r.id === activeRoomId ? new RoomGrid({ ...r, rows: val }) : r
                          );
                          setRooms(updated);
                        }}
                        className={THEME.surface.input}
                      />
                    </div>

                    <div>
                      <label className={THEME.typography.label}>Columns (Desks):</label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={activeRoomConfig.columns}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = rooms.map((r) =>
                            r.id === activeRoomId ? new RoomGrid({ ...r, columns: val }) : r
                          );
                          setRooms(updated);
                        }}
                        className={THEME.surface.input}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Students Per Bench/Desk:</label>
                    <select
                      value={activeRoomConfig.studentsPerDesk}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const updated = rooms.map((r) =>
                          r.id === activeRoomId
                            ? new RoomGrid({ ...r, studentsPerDesk: val })
                            : r
                        );
                        setRooms(updated);
                      }}
                      className={THEME.surface.select}
                    >
                      <option value={1}>1 Student per Bench (Solo Exam)</option>
                      <option value={2}>2 Students per Bench (Dual)</option>
                      <option value={3}>3 Students per Bench (Team Bench)</option>
                    </select>
                  </div>
                </div>

                {/* Interactive Aisle Column Picker */}
                <div>
                  <label className={THEME.typography.label}>
                    Click Column to Toggle Walking Aisle:
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Array.from({ length: activeRoomConfig.columns }).map((_, cIdx) => {
                      const isAisle = activeRoomConfig.aisles.has(cIdx);
                      return (
                        <button
                          key={cIdx}
                          onClick={() => toggleColumnAisle(cIdx)}
                          className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold border transition-all cursor-pointer ${
                            isAisle
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                          }`}
                        >
                          Col {cIdx + 1} {isAisle && "(Aisle)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add Another Room */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] block">
                    Add Another Examination Hall:
                  </span>
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

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-2"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setActivePhase("rules")}
                >
                  Proceed to Rules & Anti-Cheating
                </Button>
              </div>
            )}

            {/* TAB 3: RULES & ANTI-CHEATING */}
            {activePhase === "rules" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    Phase 3: Allocation Rules
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select the seating strategy and apply human overrides.
                  </p>
                </div>

                {/* Strategy Cards */}
                <div className="space-y-2">
                  <label
                    onClick={() => setAllocationStrategy("interleaved")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      allocationStrategy === "interleaved"
                        ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Anti-Cheating Department Interleaving</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Alternates departments round-robin so examinees from the same department
                        never sit at adjacent desks.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setAllocationStrategy("team")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      allocationStrategy === "team"
                        ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Team-Clustered (Hackathons & Contests)</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Groups teammates together at the same bench / adjacent workstations for
                        collaborative team contests.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setAllocationStrategy("sequential")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      allocationStrategy === "sequential"
                        ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <ListOrdered className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Sequential Roll-Wise</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Seats examinees strictly in ascending Student ID / Roll order.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setAllocationStrategy("random")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      allocationStrategy === "random"
                        ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    <Shuffle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Randomized Shuffle</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Shuffles examinees randomly for club elections or auditions.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Human Override Controls */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                      Manual Overrides & Swaps:
                    </span>
                    <Badge variant={Object.keys(manualSeatMap).length > 0 ? "warning" : "neutral"}>
                      {Object.keys(manualSeatMap).length / 2} Swaps Active
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Need to relocate a student? Click "Swap Seats" on the floor plan or click any
                    seat to inspect and mark broken/reserved.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                    onClick={() => setIsSwapModeActive(true)}
                  >
                    Enter Seat Swap Mode
                  </Button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-2"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setActivePhase("dispatch")}
                >
                  Proceed to Print & Dispatch
                </Button>
              </div>
            )}

            {/* TAB 4: PRINT & DISPATCH */}
            {activePhase === "dispatch" && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    Phase 4: Print & Dispatch
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Generate official printables and export enriched rosters.
                  </p>
                </div>

                {/* Print Master Cards */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          Door Notice Poster
                        </span>
                      </div>
                      <Badge variant="primary">Room Door</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Master alphabetical/seat-wise entrance poster to tape on the hall entrance door.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={handlePrintDoorNotice}
                    >
                      Print Door Notice (PDF)
                    </Button>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          Desk Chits / Seat Slips
                        </span>
                      </div>
                      <Badge variant="warning">8 Per A4</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Printable cut-out seat slips with dashed borders to tape onto desks before the exam.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={handlePrintDeskChits}
                    >
                      Print Desk Chits (A4)
                    </Button>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          Invigilator Attendance Roster
                        </span>
                      </div>
                      <Badge variant="success">Official</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Official room roster with candidate signature column, present/absent boxes, and supervisor tally.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={handlePrintAttendanceSheet}
                    >
                      Print Attendance Sheet (PDF)
                    </Button>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          Enriched Excel Roster
                        </span>
                      </div>
                      <Badge variant="success">.xlsx</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Exports full spreadsheet with Assigned_Room, Seat_Label, Row_Number, and Desk_Col.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      leftIcon={<Download className="w-4 h-4" />}
                      onClick={handleExportEnrichedRoster}
                    >
                      Export Seated Excel
                    </Button>
                  </div>

                  <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          Sync to Global Pipeline
                        </span>
                      </div>
                      <Badge variant="primary">ID & Certs</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pushes room & seat assignments to ID Cards, Certificates, Badges, and Local Storage.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      leftIcon={<ArrowLeftRight className="w-4 h-4" />}
                      onClick={handleSyncSeatsToRoster}
                    >
                      Sync Seating to Roster
                    </Button>
                  </div>

                  {syncStatus && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{syncStatus}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Seat Inspector Modal (when clicking on a seat in non-swap mode) */}
      {selectedSeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <Card padding="md" className="w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {selectedSeatModal.position.label}
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Seat Details
                </span>
              </div>
              <button
                onClick={() => setSelectedSeatModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedSeatModal.student ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Examinee Name:</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedSeatModal.student.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Student ID:</span>
                    <p className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {selectedSeatModal.student.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Department:</span>
                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                      {selectedSeatModal.student.department || "General"}
                    </p>
                  </div>
                </div>

                {selectedSeatModal.student.teamName && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Contest Team:</span>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedSeatModal.student.teamName}
                    </p>
                  </div>
                )}

                {selectedSeatModal.student.advisor && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Course Teacher / Advisor:</span>
                    <p className="font-medium text-slate-600 dark:text-slate-400">
                      {selectedSeatModal.student.advisor}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-500">
                <p className="font-semibold">This seat is currently vacant.</p>
                <p className="text-[11px] text-slate-400">No examinee assigned to this desk.</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />}
                onClick={() => {
                  setSwapSourceSeat(selectedSeatModal);
                  setIsSwapModeActive(true);
                  setSelectedSeatModal(null);
                }}
              >
                Swap this Examinee with Another
              </Button>

              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Ban className="w-3.5 h-3.5 text-rose-500" />}
                onClick={() => toggleSeatReserved(selectedSeatModal.id)}
              >
                {selectedSeatModal.isReserved ? "Unblock Desk" : "Mark as Broken / Reserved"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
