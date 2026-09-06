"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { THEME } from "@/styles/theme";
import { StudentRecord, StudentRoster } from "@/core/domain/roster";
import { DataRefineryEngine } from "@/core/engines/data-refinery";
import { DataTable, Column } from "@/components/common/DataTable";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import {
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  Shuffle,
  Layers,
  Users,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
  Shirt,
  Utensils,
  BookOpen,
  Plus,
  Type,
  Search,
  Replace,
  ArrowUpDown,
  SlidersHorizontal,
  Edit2,
  FileText,
} from "lucide-react";

export interface DataRefineryViewProps {
  roster: StudentRoster;
  onRosterUpdate: (records: StudentRecord[]) => void;
}

export const DataRefineryView: React.FC<DataRefineryViewProps> = ({
  roster,
  onRosterUpdate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedMatrix, setCopiedMatrix] = useState(false);

  // Dynamic Column List State (Extracted dynamically from uploaded sheet)
  const defaultInitialColumns = [
    "id",
    "name",
    "email",
    "department",
    "batch",
    "section",
    "tshirtSize",
    "foodPreference",
    "paymentStatus",
  ];
  const [dynamicColumns, setDynamicColumns] = useState<string[]>(() => {
    const existing = roster.getColumnHeaders();
    return existing && existing.length > 0 ? existing : defaultInitialColumns;
  });

  // Selected Target Column for Row-Wise Transformations
  const [targetTransformCol, setTargetTransformCol] = useState<string>("all");

  // Row-Wise Find & Replace Modal State
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [findReplaceCol, setFindReplaceCol] = useState<string>("all");
  const [matchCase, setMatchCase] = useState(false);

  // Add Dynamic Column Modal State
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnDefault, setNewColumnDefault] = useState("");

  // Edit Single Row Modal State
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null);

  // Mentor Allocation Modal State
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);
  const [mentorInput, setMentorInput] = useState(
    "Prof. Alan Turing\nDr. Ada Lovelace\nProf. Grace Hopper\nDr. Andrew Ng"
  );
  const [mentorAllocations, setMentorAllocations] = useState<any[]>([]);

  const records = roster.getRecords();
  const tShirtMatrix = DataRefineryEngine.getTShirtMatrix(records);
  const mealMatrix = DataRefineryEngine.getMealMatrix(records);

  // =========================================================================
  // DYNAMIC SPREADSHEET UPLOAD WITH COLUMN DETECTION
  // =========================================================================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawRows = results.data as Record<string, any>[];
          if (rawRows.length > 0) {
            const detectedHeaders = DataRefineryEngine.extractHeaders(rawRows);
            const headers = detectedHeaders.length > 0 ? detectedHeaders : Object.keys(rawRows[0]);
            setDynamicColumns(headers);
            roster.setColumnHeaders(headers);

            const mapped = rawRows.map((row: any, i: number) =>
              DataRefineryEngine.mapRawRowToStudent(row, i)
            );
            onRosterUpdate(mapped);
          }
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (rawRows.length > 0) {
          const detectedHeaders = DataRefineryEngine.extractHeaders(rawRows);
          const headers = detectedHeaders.length > 0 ? detectedHeaders : Object.keys(rawRows[0]);
          setDynamicColumns(headers);
          roster.setColumnHeaders(headers);

          const mapped = rawRows.map((row: any, i: number) =>
            DataRefineryEngine.mapRawRowToStudent(row, i)
          );
          onRosterUpdate(mapped);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  // Load Demonstration Sample Data with Dynamic Columns
  const loadSampleData = () => {
    const departments = ["CSE", "EEE", "BBA", "ENG", "MATH"];
    const sizes = ["S", "M", "L", "XL", "XXL"];
    const colleges = [
      "School of Engineering",
      "Faculty of Science",
      "Business Academy",
      "Arts & Humanities",
      "Applied Mathematics",
    ];
    const teams = ["Team CyberNova", "Team Quantum", "Team DataVortex", "Team NeuralNet", "Team Apex"];
    const projects = [
      "Autonomous Rover Navigation",
      "Smart Campus Energy Grid",
      "Financial Ledger Automation",
      "AI Speech Recognition",
      "Predictive Student Retention",
    ];
    const names = [
      "RAHIM ahmed",
      "sara SMITH",
      "johnathan DOE",
      "fatima AL-ZAHRA",
      "mohammad ALI",
      "tasmia HOSSAIN",
      "alexander WANG",
      "maria GARCIA",
      "tanvir ISLAM",
      "nusrat JAHAN",
    ];

    const samples: StudentRecord[] = [];
    for (let i = 1; i <= 60; i++) {
      const dept = departments[i % departments.length];
      const size = sizes[i % sizes.length];
      const college = colleges[i % colleges.length];
      const team = teams[i % teams.length];
      const project = projects[i % projects.length];
      const rawName = names[i % names.length] + ` ${i}`;

      const rec: StudentRecord = {
        id: `${dept}-2026-${1000 + i}`,
        name: rawName,
        email: `student${i}@university.edu`,
        phone: `+8801700${String(10000 + i).slice(-5)}`,
        department: dept,
        batch: `Batch ${50 + (i % 4)}`,
        section: i % 2 === 0 ? "Section A" : "Section B",
        tshirtSize: size,
        foodPreference: i % 3 === 0 ? "Veg" : "Non-Veg",
        paymentStatus: "Paid",
        paymentTxId: `TXN-902${i}`,
        // Dynamic custom columns:
        "College / School": college,
        "Team Name": team,
        "Project Title": project,
        "Registration Timestamp": new Date(Date.now() - i * 3600000).toLocaleString(),
      };
      samples.push(rec);
    }

    const sampleHeaders = [
      "id",
      "name",
      "email",
      "department",
      "batch",
      "section",
      "tshirtSize",
      "foodPreference",
      "paymentStatus",
      "College / School",
      "Team Name",
      "Project Title",
    ];
    setDynamicColumns(sampleHeaders);
    roster.setColumnHeaders(sampleHeaders);
    onRosterUpdate(samples);
  };

  // =========================================================================
  // ROW-WISE TRANSFORMATION ACTIONS
  // =========================================================================
  const handleApplyTransformRowWise = (
    type: "titleCase" | "uppercase" | "lowercase" | "trim"
  ) => {
    const updated = DataRefineryEngine.applyColumnTransformRowWise(
      records,
      targetTransformCol,
      type
    );
    onRosterUpdate(updated);
  };

  const handleRunFindReplace = () => {
    if (!findText) return;
    const updated = DataRefineryEngine.findAndReplaceRowWise(
      records,
      findReplaceCol,
      findText,
      replaceText,
      matchCase
    );
    onRosterUpdate(updated);
    setIsFindReplaceOpen(false);
    setFindText("");
    setReplaceText("");
  };

  const handleDeduplicateRowWise = () => {
    const key = targetTransformCol === "all" ? "id" : targetTransformCol;
    const updated = DataRefineryEngine.deduplicateByColumn(records, key);
    onRosterUpdate(updated);
  };

  const handleSortRowWise = (direction: "asc" | "desc") => {
    const key = targetTransformCol === "all" ? "department" : targetTransformCol;
    const updated = DataRefineryEngine.multiSort(records, [{ key, direction }]);
    onRosterUpdate(updated);
  };

  const handleShuffle = () => {
    const updated = DataRefineryEngine.shuffle(records);
    onRosterUpdate(updated);
  };

  const handleClear = () => {
    onRosterUpdate([]);
  };

  // =========================================================================
  // DYNAMIC COLUMN MANAGEMENT (ADD / REMOVE / RENAME)
  // =========================================================================
  const handleAddDynamicColumn = () => {
    const col = newColumnName.trim();
    if (!col || dynamicColumns.includes(col)) return;

    const nextCols = [...dynamicColumns, col];
    setDynamicColumns(nextCols);
    roster.setColumnHeaders(nextCols);

    // Apply default value row-wise to all existing records
    const updated = records.map((r) => ({
      ...r,
      [col]: newColumnDefault || "",
    }));
    onRosterUpdate(updated);

    setNewColumnName("");
    setNewColumnDefault("");
    setIsAddColumnOpen(false);
  };

  const handleRemoveDynamicColumn = (colToRemove: string) => {
    const nextCols = dynamicColumns.filter((c) => c !== colToRemove);
    setDynamicColumns(nextCols);
    roster.setColumnHeaders(nextCols);

    const updated = records.map((r) => {
      const copy = { ...r };
      delete copy[colToRemove];
      return copy;
    });
    onRosterUpdate(updated);
  };

  // =========================================================================
  // ROW ACTIONS (ADD ROW / EDIT ROW / DELETE ROW)
  // =========================================================================
  const handleAddNewRow = () => {
    const newId = `STU-${records.length + 1}`;
    const newRecord: StudentRecord = {
      id: newId,
      name: "New Attendee",
      email: "",
      department: "GENERAL",
      batch: "",
      section: "",
      tshirtSize: "M",
      foodPreference: "Non-Veg",
      paymentStatus: "Paid",
    };

    // Populate dynamic columns with empty string
    dynamicColumns.forEach((col) => {
      if ((newRecord as any)[col] === undefined) {
        (newRecord as any)[col] = "";
      }
    });

    onRosterUpdate([newRecord, ...records]);
    setEditingRecord(newRecord);
  };

  const handleSaveEditedRow = () => {
    if (!editingRecord) return;
    const updated = records.map((r) =>
      r.id === editingRecord.id ? { ...editingRecord } : r
    );
    onRosterUpdate(updated);
    setEditingRecord(null);
  };

  const handleDeleteRow = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    onRosterUpdate(updated);
  };

  // =========================================================================
  // EXPORT DYNAMIC EXCEL & CSV (FULL ROW-WISE PRESERVING ALL COLUMNS)
  // =========================================================================
  const handleExportDynamicExcel = () => {
    const dynamicRows = DataRefineryEngine.exportDynamicSheet(records, dynamicColumns);
    const ws = XLSX.utils.json_to_sheet(dynamicRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cleaned_Roster");
    XLSX.writeFile(wb, `Cleaned_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportDynamicCSV = () => {
    const dynamicRows = DataRefineryEngine.exportDynamicSheet(records, dynamicColumns);
    const csv = Papa.unparse(dynamicRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Cleaned_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const copyTShirtMatrixToClipboard = () => {
    const text = `T-Shirt Order Matrix (Total: ${tShirtMatrix.Total}):
XS: ${tShirtMatrix.XS}
S: ${tShirtMatrix.S}
M: ${tShirtMatrix.M}
L: ${tShirtMatrix.L}
XL: ${tShirtMatrix.XL}
XXL: ${tShirtMatrix.XXL}
3XL: ${tShirtMatrix["3XL"]}
Other: ${tShirtMatrix.Other}`;
    navigator.clipboard.writeText(text);
    setCopiedMatrix(true);
    setTimeout(() => setCopiedMatrix(false), 2000);
  };

  const runMentorAllocation = () => {
    const list = mentorInput
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const result = DataRefineryEngine.allocateToMentors(records, list);
    setMentorAllocations(result);
  };

  // =========================================================================
  // DYNAMIC TABLE COLUMNS GENERATION
  // =========================================================================
  const tableColumns: Column<StudentRecord>[] = [
    // Dynamic columns generated from active spreadsheet headers
    ...dynamicColumns.map((colKey) => ({
      key: colKey,
      header:
        colKey === "id"
          ? "Student ID"
          : colKey === "name"
          ? "Full Name"
          : colKey === "department"
          ? "Dept"
          : colKey === "tshirtSize"
          ? "T-Shirt"
          : colKey === "foodPreference"
          ? "Meal"
          : colKey === "paymentStatus"
          ? "Status"
          : colKey,
      render: (r: StudentRecord) => {
        const val = r[colKey] ?? "";

        if (colKey === "id") {
          return <span className={THEME.typography.mono}>{val || r.id}</span>;
        }
        if (colKey === "name") {
          return <span className="font-semibold text-slate-900 dark:text-white">{val || r.name}</span>;
        }
        if (colKey === "tshirtSize") {
          return (
            <Badge variant="primary">
              <Shirt className="w-3 h-3" />
              <span>{val || r.tshirtSize || "M"}</span>
            </Badge>
          );
        }
        if (colKey === "foodPreference") {
          const pref = val || r.foodPreference;
          return (
            <Badge variant={pref === "Veg" ? "success" : "neutral"}>
              <Utensils className="w-3 h-3" />
              <span>{pref || "Non-Veg"}</span>
            </Badge>
          );
        }
        if (colKey === "paymentStatus") {
          const status = val || r.paymentStatus || "Paid";
          return (
            <Badge variant={status === "Paid" ? "success" : "warning"}>
              {status}
            </Badge>
          );
        }

        return <span className="text-slate-700 dark:text-slate-300">{String(val)}</span>;
      },
    })),
    // Row Action column for fast editing and row deletion
    {
      key: "__actions",
      header: "Actions",
      sortable: false,
      render: (r: StudentRecord) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setEditingRecord({ ...r })}
            className="p-1 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Edit Row"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteRow(r.id)}
            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Delete Row"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Google Form Data Refinery & Dynamic Row Engine
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Dynamic Columns
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-detects any spreadsheet column, cleans data row-wise, and exports fully customized tables.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="primary"
            leftIcon={<UploadCloud className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Sheet (Excel / CSV)
          </Button>

          {records.length === 0 ? (
            <Button
              variant="secondary"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={loadSampleData}
            >
              Load Demo Dataset (with Custom Columns)
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleAddNewRow}
              >
                Add Row
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleExportDynamicExcel}
              >
                Export Excel (.xlsx)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FileText className="w-4 h-4" />}
                onClick={handleExportDynamicCSV}
              >
                Export CSV (.csv)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
                onClick={handleClear}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary KPI Counters */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="sm" className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Records</p>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {records.length} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Rows</span>
              </h4>
            </div>
          </Card>

          <Card padding="sm" className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Columns</p>
              <h4 className="text-xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">
                {dynamicColumns.length} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Headers</span>
              </h4>
            </div>
          </Card>

          <Card padding="sm" className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Shirt className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">T-Shirt Summary</p>
                <button
                  onClick={copyTShirtMatrixToClipboard}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-medium"
                >
                  {copiedMatrix ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedMatrix ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-1 overflow-x-auto text-[11px] text-slate-700 dark:text-slate-300">
                <span>M:{tShirtMatrix.M}</span>
                <span>L:{tShirtMatrix.L}</span>
                <span>XL:{tShirtMatrix.XL}</span>
                <span>XXL:{tShirtMatrix.XXL}</span>
              </div>
            </div>
          </Card>

          <Card padding="sm" className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Catering Count</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                Non-Veg: <span className="text-slate-900 dark:text-white font-bold">{mealMatrix["Non-Veg"]}</span> | Veg:{" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{mealMatrix["Veg"]}</span>
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Main Workspace Table Area */}
      {records.length === 0 ? (
        <Card padding="lg" className="text-center py-16 space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Spreadsheet Loaded</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload any Google Form or Excel/CSV export. All columns and headers will be detected dynamically and displayed row-wise.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              leftIcon={<UploadCloud className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Spreadsheet File
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={loadSampleData}
            >
              Load Demo Dataset
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="md" className="space-y-4">
          {/* ========================================================================= */}
          {/* FULL ROW-WISE TRANSFORMATION TOOLBAR                                     */}
          {/* ========================================================================= */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Target Column Selection for Row-Wise Actions */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                  Apply Row-Wise To:
                </span>
                <select
                  value={targetTransformCol}
                  onChange={(e) => setTargetTransformCol(e.target.value)}
                  className={`${THEME.surface.select} py-1 text-xs font-semibold`}
                >
                  <option value="all">⚡ All Columns (Full Row-Wise)</option>
                  {dynamicColumns.map((col) => (
                    <option key={col} value={col}>
                      Column: {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Column Management Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsAddColumnOpen(true)}
                >
                  Add Custom Column
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Replace className="w-3.5 h-3.5 text-blue-500" />}
                  onClick={() => {
                    setFindReplaceCol(targetTransformCol);
                    setIsFindReplaceOpen(true);
                  }}
                >
                  Find & Replace
                </Button>
              </div>
            </div>

            {/* Row-Wise Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800/80 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                Row Operations:
              </span>
              <button
                onClick={() => handleApplyTransformRowWise("titleCase")}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs flex items-center gap-1"
                title="Capitalize words row-wise"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Title Case (Aa Bb)</span>
              </button>

              <button
                onClick={() => handleApplyTransformRowWise("uppercase")}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs flex items-center gap-1"
                title="Convert to UPPERCASE row-wise"
              >
                <Type className="w-3.5 h-3.5 text-indigo-500" />
                <span>UPPERCASE</span>
              </button>

              <button
                onClick={() => handleApplyTransformRowWise("lowercase")}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs flex items-center gap-1"
                title="Convert to lowercase row-wise"
              >
                <Type className="w-3.5 h-3.5 text-purple-500" />
                <span>lowercase</span>
              </button>

              <button
                onClick={() => handleApplyTransformRowWise("trim")}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs flex items-center gap-1"
                title="Remove excess whitespace row-wise"
              >
                <span>Trim Spaces</span>
              </button>

              <button
                onClick={handleDeduplicateRowWise}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs flex items-center gap-1"
                title="Deduplicate rows by chosen column"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>Deduplicate</span>
              </button>

              <button
                onClick={() => handleSortRowWise("asc")}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs flex items-center gap-1"
                title="Sort ascending"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-sky-500" />
                <span>Sort A-Z</span>
              </button>

              <button
                onClick={handleShuffle}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs flex items-center gap-1"
                title="Randomize rows"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={() => {
                  runMentorAllocation();
                  setIsMentorModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer shadow-2xs flex items-center gap-1 ml-auto"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Allocate Mentors</span>
              </button>
            </div>
          </div>

          {/* Active Dynamic Columns Pill Bar */}
          <div className="flex items-center gap-2 text-xs overflow-x-auto py-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Active Columns ({dynamicColumns.length}):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {dynamicColumns.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                >
                  <span>{col}</span>
                  {dynamicColumns.length > 2 && (
                    <button
                      onClick={() => handleRemoveDynamicColumn(col)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer ml-0.5"
                      title={`Remove column ${col}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Dynamic DataTable with Full Row Editing */}
          <DataTable
            data={records}
            columns={tableColumns}
            searchPlaceholder="Search across any column or field..."
            pageSize={25}
          />
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ROW-WISE FIND & REPLACE MODAL                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        title="Row-Wise Find & Replace"
        subtitle="Search for any text and batch-replace it across records"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsFindReplaceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRunFindReplace}>
              Replace All Row-Wise
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className={THEME.typography.label}>Target Column:</label>
            <select
              value={findReplaceCol}
              onChange={(e) => setFindReplaceCol(e.target.value)}
              className={`${THEME.surface.select} mt-1`}
            >
              <option value="all">⚡ All Columns (Full Row-Wise)</option>
              {dynamicColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={THEME.typography.label}>Find Text:</label>
            <input
              type="text"
              placeholder="e.g. BBA or 2025"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className={`${THEME.surface.input} mt-1`}
              autoFocus
            />
          </div>

          <div>
            <label className={THEME.typography.label}>Replace With:</label>
            <input
              type="text"
              placeholder="e.g. CSE or 2026"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className={`${THEME.surface.input} mt-1`}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="matchCaseCheck"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="matchCaseCheck" className="text-slate-700 dark:text-slate-300">
              Match Exact Case
            </label>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* ADD CUSTOM DYNAMIC COLUMN MODAL                                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        title="Add Dynamic Column"
        subtitle="Appends a new column to all rows in the dataset"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsAddColumnOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddDynamicColumn}>
              Add Column
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className={THEME.typography.label}>Column Header Name:</label>
            <input
              type="text"
              placeholder="e.g. College Name, Seat No, Mentor, Notes..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className={`${THEME.surface.input} mt-1`}
              autoFocus
            />
          </div>

          <div>
            <label className={THEME.typography.label}>Default Value for Existing Rows (Optional):</label>
            <input
              type="text"
              placeholder="e.g. General or Pending"
              value={newColumnDefault}
              onChange={(e) => setNewColumnDefault(e.target.value)}
              className={`${THEME.surface.input} mt-1`}
            />
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* EDIT SINGLE ROW MODAL (FULL ROW-WISE EDITING)                            */}
      {/* ========================================================================= */}
      {editingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRecord(null)}
          title="Edit Row Details"
          subtitle={`Modifying record ID: ${editingRecord.id}`}
          maxWidth="lg"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEditedRow}>
                Save Row
              </Button>
            </div>
          }
        >
          <div className="max-h-[60vh] overflow-y-auto space-y-3 text-xs pr-1">
            {dynamicColumns.map((col) => (
              <div key={col}>
                <label className={THEME.typography.label}>{col}:</label>
                <input
                  type="text"
                  value={editingRecord[col] ?? ""}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      [col]: e.target.value,
                      ...(col === "name" ? { name: e.target.value } : {}),
                      ...(col === "id" ? { id: e.target.value } : {}),
                      ...(col === "email" ? { email: e.target.value } : {}),
                      ...(col === "department" ? { department: e.target.value } : {}),
                    })
                  }
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MENTOR ALLOCATION MODAL                                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isMentorModalOpen}
        onClose={() => setIsMentorModalOpen(false)}
        title="Student-to-Teacher / Mentor Allocator"
        subtitle="Evenly distributes examinees or participants across faculty advisors"
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">
              {records.length} students split across {mentorAllocations.length} mentors
            </span>
            <Button variant="primary" onClick={() => setIsMentorModalOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
              Enter Mentors / Faculty Advisors (one per line):
            </label>
            <textarea
              rows={3}
              value={mentorInput}
              onChange={(e) => setMentorInput(e.target.value)}
              className={THEME.surface.input}
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={runMentorAllocation}
            >
              Re-Calculate Allocations
            </Button>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Allocated Groups:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {mentorAllocations.map((alloc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{alloc.mentorName}</span>
                    <Badge variant="primary">{alloc.students.length} Students</Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 max-h-24 overflow-y-auto space-y-0.5">
                    {alloc.students.map((s: any) => (
                      <div key={s.id} className="flex justify-between">
                        <span>{s.name}</span>
                        <span className="font-mono text-slate-400 dark:text-slate-500">{s.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
