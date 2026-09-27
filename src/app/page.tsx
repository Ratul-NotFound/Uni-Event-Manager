"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { THEME } from "@/styles/theme";
import { StudentRecord, StudentRoster } from "@/core/domain/roster";
import { LocalStorageSyncService } from "@/core/storage/local-storage-sync";
import { ThemeToggle } from "@/components/common/ThemeToggle";

// Section 1: Core Event Pipeline Components
import { DataRefineryView } from "@/components/section-1-core/DataRefineryView";
import { CertificateStudioView } from "@/components/section-1-core/CertificateStudioView";
import { IdCardStudioView } from "@/components/section-1-core/IdCardStudioView";
import { SeatPlanView } from "@/components/section-1-core/SeatPlanView";
import { BulkEmailView } from "@/components/section-1-core/BulkEmailView";

// Section 2: Event Day Operations Components
import { MealAndGateScanner } from "@/components/section-2-operations/MealAndGateScanner";
import { BadgeGenerator } from "@/components/section-2-operations/BadgeGenerator";
import { VolunteerRoster } from "@/components/section-2-operations/VolunteerRoster";
import { StageClock } from "@/components/section-2-operations/StageClock";
import { JudgingLeaderboard } from "@/components/section-2-operations/JudgingLeaderboard";
import { TeamAndBrackets } from "@/components/section-2-operations/TeamAndBrackets";
import { WhatsAppBroadcaster } from "@/components/section-2-operations/WhatsAppBroadcaster";

// Section 3: Club Administration Components
import { DeanReportGenerator } from "@/components/section-3-admin/DeanReportGenerator";
import { BudgetReconciler } from "@/components/section-3-admin/BudgetReconciler";
import { SponsorAutoTiler } from "@/components/section-3-admin/SponsorAutoTiler";
import { ClubVaultBackup } from "@/components/section-3-admin/ClubVaultBackup";
import { TypoCorrectorModal } from "@/components/section-3-admin/TypoCorrectorModal";

// Icons
import {
  FileSpreadsheet,
  Award,
  LayoutGrid,
  Mail,
  QrCode,
  IdCard,
  Users2,
  Timer,
  Trophy,
  GitMerge,
  MessageSquare,
  FileText,
  DollarSign,
  Image as ImageIcon,
  Lock,
  ExternalLink,
  Edit3,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function CampusClubApp() {
  // Global Roster State (Shared across all modules)
  const [roster] = useState(() => new StudentRoster());
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Restore saved roster and headers from Local Storage on initial load
  useEffect(() => {
    const savedStudents = LocalStorageSyncService.loadStudents();
    const savedHeaders = LocalStorageSyncService.loadHeaders();
    if (savedStudents && savedStudents.length > 0) {
      roster.setRecords(savedStudents);
      if (savedHeaders && savedHeaders.length > 0) {
        roster.setColumnHeaders(savedHeaders);
      }
      setStudents(savedStudents);
    }
    setIsStorageLoaded(true);
  }, [roster]);

  // Navigation State
  const [activeSection, setActiveSection] = useState<"pipeline" | "operations" | "admin">("pipeline");
  const [pipelineSubTab, setPipelineSubTab] = useState<"refinery" | "certificates" | "idcards" | "seatplan" | "email">("refinery");
  const [opsSubTab, setOpsSubTab] = useState<"scanner" | "badges" | "volunteers" | "stage" | "judging" | "brackets" | "whatsapp">("scanner");
  const [adminSubTab, setAdminSubTab] = useState<"report" | "budget" | "sponsors" | "vault">("report");

  // Mobile Sidebar Drawer Toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Typo Corrector Modal State
  const [isTypoModalOpen, setIsTypoModalOpen] = useState(false);

  // Sync roster updates to domain model, react state, and persistent local storage
  const handleRosterUpdate = (updated: StudentRecord[], headers?: string[]) => {
    roster.setRecords(updated);
    if (headers && headers.length > 0) {
      roster.setColumnHeaders(headers);
      LocalStorageSyncService.saveHeaders(headers);
    }
    setStudents([...updated]);
    if (updated.length > 0) {
      LocalStorageSyncService.saveStudents(updated);
    } else {
      LocalStorageSyncService.clearRoster();
    }
  };

  const handleUpdateSingleStudent = (id: string, updates: Partial<StudentRecord>) => {
    roster.updateRecord(id, updates);
    const recs = roster.getRecords();
    setStudents(recs);
    LocalStorageSyncService.saveStudents(recs);
  };

  const handleClearSavedStorage = () => {
    if (window.confirm("Clear active attendee roster from local storage? This will reset all modules.")) {
      handleRosterUpdate([]);
    }
  };

  // Nav Item Selectors
  const selectPipelineTool = (tab: typeof pipelineSubTab) => {
    setActiveSection("pipeline");
    setPipelineSubTab(tab);
    setIsMobileMenuOpen(false);
  };

  const selectOpsTool = (tab: typeof opsSubTab) => {
    setActiveSection("operations");
    setOpsSubTab(tab);
    setIsMobileMenuOpen(false);
  };

  const selectAdminTool = (tab: typeof adminSubTab) => {
    setActiveSection("admin");
    setAdminSubTab(tab);
    setIsMobileMenuOpen(false);
  };

  // Breadcrumb Title Helper
  const getActiveTitle = () => {
    if (activeSection === "pipeline") {
      if (pipelineSubTab === "refinery") return { section: "Core Pipeline", tool: "Google Form & Excel Refinery" };
      if (pipelineSubTab === "certificates") return { section: "Core Pipeline", tool: "Certificate Studio (1,000+ Gen)" };
      if (pipelineSubTab === "idcards") return { section: "Core Pipeline", tool: "ID Card & Attendee Pass Studio" };
      if (pipelineSubTab === "seatplan") return { section: "Core Pipeline", tool: "Smart Seat Plan & Hall Engine" };
      if (pipelineSubTab === "email") return { section: "Core Pipeline", tool: "Direct Bulk Email Pipeline" };
    }
    if (activeSection === "operations") {
      if (opsSubTab === "scanner") return { section: "Event Day Operations", tool: "Anti-Theft Meal & Gate Scanner" };
      if (opsSubTab === "badges") return { section: "Event Day Operations", tool: "Event Badges & Lanyard ID Passes" };
      if (opsSubTab === "volunteers") return { section: "Event Day Operations", tool: "Volunteer Shift Roster" };
      if (opsSubTab === "stage") return { section: "Event Day Operations", tool: "Stage Program Rundown & Clock" };
      if (opsSubTab === "judging") return { section: "Event Day Operations", tool: "Competition Judging & Leaderboard" };
      if (opsSubTab === "brackets") return { section: "Event Day Operations", tool: "Team Matcher & Tournament Brackets" };
      if (opsSubTab === "whatsapp") return { section: "Event Day Operations", tool: "WhatsApp Broadcast Formatter" };
    }
    if (activeSection === "admin") {
      if (adminSubTab === "report") return { section: "Club Administration", tool: "Dean & Student Affairs Report (PDF)" };
      if (adminSubTab === "budget") return { section: "Club Administration", tool: "Treasurer Budget & Cashflow Reconciler" };
      if (adminSubTab === "sponsors") return { section: "Club Administration", tool: "Sponsor Logo Wall & Banner Auto-Tiler" };
      if (adminSubTab === "vault") return { section: "Club Administration", tool: "Annual Club Vault Handover & Validator" };
    }
    return { section: "CampusClub", tool: "Dashboard" };
  };

  const currentInfo = getActiveTitle();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ========================================================= */}
      {/* LEFT SIDEBAR NAVIGATION                                   */}
      {/* ========================================================= */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              CC
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  CampusClub
                </h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  SUITE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                University Operations Engine
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Middle: Scrollable Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
          {/* SECTION 1: CORE PIPELINE */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>1. Core Event Pipeline</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 font-mono">
                {students.length > 0 ? `${students.length} loaded` : "Ready"}
              </span>
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => selectPipelineTool("refinery")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "pipeline" && pipelineSubTab === "refinery"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  <span>Google Form Refinery</span>
                </div>
                {students.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold font-mono">
                    {students.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => selectPipelineTool("certificates")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "pipeline" && pipelineSubTab === "certificates"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Certificate Studio</span>
                </div>
                <span className="text-[10px] text-slate-400">1,000+</span>
              </button>

              <button
                onClick={() => selectPipelineTool("idcards")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "pipeline" && pipelineSubTab === "idcards"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IdCard className="w-4 h-4 text-indigo-500" />
                  <span>ID Card Studio</span>
                </div>
                <span className="text-[10px] text-indigo-500 font-bold">New</span>
              </button>

              <button
                onClick={() => selectPipelineTool("seatplan")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "pipeline" && pipelineSubTab === "seatplan"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="w-4 h-4 text-emerald-500" />
                  <span>Smart Seat Plan</span>
                </div>
              </button>

              <button
                onClick={() => selectPipelineTool("email")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "pipeline" && pipelineSubTab === "email"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span>Direct Bulk Email</span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: EVENT DAY OPERATIONS */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              2. Event Day Operations
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => selectOpsTool("scanner")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "operations" && opsSubTab === "scanner"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <span>Meal & Gate QR Scanner</span>
                </div>
              </button>

              <button
                onClick={() => selectOpsTool("badges")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "operations" && opsSubTab === "badges"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IdCard className="w-4 h-4 text-blue-500" />
                  <span>Event Badges (A4 Tiled)</span>
                </div>
              </button>

              <button
                onClick={() => selectOpsTool("volunteers")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "operations" && opsSubTab === "volunteers"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users2 className="w-4 h-4 text-sky-500" />
                  <span>Volunteer Shifts Roster</span>
                </div>
              </button>

              <button
                onClick={() => selectOpsTool("stage")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "operations" && opsSubTab === "stage"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Timer className="w-4 h-4 text-amber-500" />
                  <span>Stage Presenter Clock</span>
                </div>
              </button>

              <button
                onClick={() => selectOpsTool("judging")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "operations" && opsSubTab === "judging"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Judging & Leaderboard</span>
                </div>
              </button>

              <button
                onClick={() => selectOpsTool("brackets")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "operations" && opsSubTab === "brackets"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GitMerge className="w-4 h-4 text-purple-500" />
                  <span>Brackets & Matcher</span>
                </div>
              </button>

              <button
                onClick={() => selectOpsTool("whatsapp")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "operations" && opsSubTab === "whatsapp"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>WhatsApp Broadcast</span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 3: CLUB ADMINISTRATION */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              3. Club Administration
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => selectAdminTool("report")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "admin" && adminSubTab === "report"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Dean Official Report (PDF)</span>
                </div>
              </button>

              <button
                onClick={() => selectAdminTool("budget")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "admin" && adminSubTab === "budget"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Budget & Cashflow Reconciler</span>
                </div>
              </button>

              <button
                onClick={() => selectAdminTool("sponsors")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "admin" && adminSubTab === "sponsors"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  <span>Sponsor Wall Auto-Tiler</span>
                </div>
              </button>

              <button
                onClick={() => selectAdminTool("vault")}
                className={`w-full px-3 py-2 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === "admin" && adminSubTab === "vault"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border-l-2 border-blue-600"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-sky-500" />
                  <span>Annual Vault Handover</span>
                </div>
              </button>
            </div>
          </div>
        </nav>

        {/* Bottom: Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
          {students.length > 0 && (
            <button
              onClick={() => setIsTypoModalOpen(true)}
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                <span>Fix Student Typo</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">1-Click</span>
            </button>
          )}

          <Link
            href="/my-certificate"
            target="_blank"
            className="w-full px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-between transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Student Public Kiosk</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.2 rounded">Live</span>
          </Link>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Theme Mode</span>
            <ThemeToggle />
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>Created by</span>
            <a
              href="https://ratul-dev.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
            >
              Ratul
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA                                         */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Minimal Workspace Header Bar */}
        <header className="sticky top-0 z-30 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shadow-2xs">
          {/* Left: Mobile Drawer Trigger & Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
                {currentInfo.section}
              </span>
              <ChevronRight className="w-3.5 h-3.5 hidden sm:inline" />
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {currentInfo.tool}
              </span>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2">
            {students.length > 0 ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>{students.length} Synced Locally</span>
                <button
                  type="button"
                  onClick={handleClearSavedStorage}
                  className="ml-1 text-slate-400 hover:text-rose-500 cursor-pointer text-xs"
                  title="Clear saved roster from browser storage"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="hidden md:inline-flex text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                Zero Server Cost • Local Compute
              </span>
            )}

            {students.length > 0 && (
              <button
                onClick={() => setIsTypoModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                <span>Fix Typo</span>
              </button>
            )}

            <Link
              href="/my-certificate"
              target="_blank"
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Kiosk</span>
            </Link>

            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content Workspace Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Section 1: Core Event Pipeline */}
          {activeSection === "pipeline" && (
            <div>
              {pipelineSubTab === "refinery" && (
                <DataRefineryView
                  roster={roster}
                  onRosterUpdate={handleRosterUpdate}
                />
              )}
              {pipelineSubTab === "certificates" && (
                <CertificateStudioView
                  students={students}
                  columnHeaders={roster.getColumnHeaders()}
                />
              )}
              {pipelineSubTab === "idcards" && (
                <IdCardStudioView
                  students={students}
                  columnHeaders={roster.getColumnHeaders()}
                  onRosterUpdate={handleRosterUpdate}
                />
              )}
              {pipelineSubTab === "seatplan" && (
                <SeatPlanView
                  students={students}
                  onRosterUpdate={handleRosterUpdate}
                />
              )}
              {pipelineSubTab === "email" && (
                <BulkEmailView students={students} />
              )}
            </div>
          )}

          {/* Section 2: Event Day Operations */}
          {activeSection === "operations" && (
            <div className="space-y-6">
              {/* Event Day Mission Control Command Bar */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>OPS COMMAND CENTER</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Live Turnout: </span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {students.filter((s) => s.gateCheckedIn).length} / {students.length || 0}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1.5">
                      ({students.length > 0 ? Math.round((students.filter((s) => s.gateCheckedIn).length / students.length) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                {/* Quick Sub-tab Switcher Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  <button
                    type="button"
                    onClick={() => selectOpsTool("scanner")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      opsSubTab === "scanner"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Scanner
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOpsTool("badges")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      opsSubTab === "badges"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Badges
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOpsTool("volunteers")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      opsSubTab === "volunteers"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Volunteers
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOpsTool("stage")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      opsSubTab === "stage"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Stage Clock
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOpsTool("judging")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      opsSubTab === "judging"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Judging
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOpsTool("brackets")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      opsSubTab === "brackets"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Brackets
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOpsTool("whatsapp")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      opsSubTab === "whatsapp"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Broadcast
                  </button>
                </div>
              </div>

              {opsSubTab === "scanner" && (
                <MealAndGateScanner
                  students={students}
                  onUpdateStudent={handleUpdateSingleStudent}
                  onRosterSync={handleRosterUpdate}
                />
              )}
              {opsSubTab === "badges" && (
                <BadgeGenerator students={students} />
              )}
              {opsSubTab === "volunteers" && <VolunteerRoster />}
              {opsSubTab === "stage" && <StageClock />}
              {opsSubTab === "judging" && <JudgingLeaderboard />}
              {opsSubTab === "brackets" && (
                <TeamAndBrackets students={students} />
              )}
              {opsSubTab === "whatsapp" && (
                <WhatsAppBroadcaster students={students} />
              )}
            </div>
          )}

          {/* Section 3: Club Administration */}
          {activeSection === "admin" && (
            <div className="space-y-6">
              {adminSubTab === "report" && (
                <DeanReportGenerator students={students} />
              )}
              {adminSubTab === "budget" && <BudgetReconciler />}
              {adminSubTab === "sponsors" && <SponsorAutoTiler />}
              {adminSubTab === "vault" && (
                <ClubVaultBackup
                  students={students}
                  onRosterUpdate={handleRosterUpdate}
                />
              )}
            </div>
          )}
        </main>

        {/* Global Typo Corrector Modal */}
        <TypoCorrectorModal
          isOpen={isTypoModalOpen}
          onClose={() => setIsTypoModalOpen(false)}
          students={students}
          onUpdateStudent={handleUpdateSingleStudent}
        />

        {/* Professional Footer */}
        <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
            <span className="font-semibold text-slate-900 dark:text-white">CampusClub Suite</span>
            <span>•</span>
            <span>Zero-Cost University Operations Engine</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">$0.00 Serverless Vercel Architecture</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
            All data processing, high-volume PDF & ZIP rendering, and seating allocation execute in local browser memory.
          </p>
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <span>Made with ❤️ by</span>
            <a
              href="https://ratul-dev.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Ratul
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
