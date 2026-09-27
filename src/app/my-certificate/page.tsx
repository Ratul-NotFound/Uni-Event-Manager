"use client";

import React, { useState } from "react";
import Link from "next/link";
import saveAs from "file-saver";
import { THEME } from "@/styles/theme";
import { CertificateTemplate, TextElement, QrElement } from "@/core/domain/certificate-element";
import { BulkGeneratorEngine } from "@/core/engines/bulk-generator";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LocalStorageSyncService } from "@/core/storage/local-storage-sync";
import { Award, Search, Download, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function StudentKioskPage() {
  const [studentIdInput, setStudentIdInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundStudent, setFoundStudent] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setFoundStudent(null);
    const clean = studentIdInput.trim().toUpperCase();
    if (!clean) return;

    setIsSearching(true);

    setTimeout(() => {
      setIsSearching(false);
      const localStudents = LocalStorageSyncService.loadStudents();
      if (localStudents.length > 0) {
        const match = localStudents.find(
          (s) =>
            s.id?.trim().toUpperCase() === clean ||
            s.email?.trim().toUpperCase() === clean ||
            s.phone?.trim() === clean
        );
        if (match) {
          setFoundStudent(match);
        } else {
          setErrorMsg(`No record found matching "${clean}". Please verify your Student ID / Roll Number or contact the event organizers.`);
        }
      } else {
        // Fallback demo student if organizer has not uploaded a roster yet
        setFoundStudent({
          id: clean,
          name: clean.includes("1024") ? "Alexandria Morgan" : "Participant Student",
          department: clean.includes("CSE") ? "Computer Science & Engineering" : "General Department",
          batch: "Batch 52",
          section: "A",
          extra: { position: "Honorable Participant" },
        });
      }
    }, 400);
  };

  const handleDownloadCertificate = async (format: "png" | "pdf") => {
    if (!foundStudent) return;
    let template: CertificateTemplate;
    const savedTemplateJson = LocalStorageSyncService.loadCertTemplateJSON();
    if (savedTemplateJson) {
      try {
        template = CertificateTemplate.fromJSON(savedTemplateJson);
      } catch {
        template = new CertificateTemplate("University Event Award", 1920, 1080);
      }
    } else {
      template = new CertificateTemplate("University Event Award", 1920, 1080);
      template.addElement(
        new TextElement({
          id: "t1",
          x: 960,
          y: 280,
          text: "CERTIFICATE OF PARTICIPATION",
          fontSize: 48,
          color: "#D97706",
          align: "center",
        })
      );
      template.addElement(
        new TextElement({
          id: "t2",
          x: 960,
          y: 470,
          text: foundStudent.name,
          fontSize: 64,
          color: "#0F172A",
          align: "center",
        })
      );
      template.addElement(
        new TextElement({
          id: "t3",
          x: 960,
          y: 600,
          text: `Student ID: ${foundStudent.id} | Department: ${foundStudent.department}`,
          fontSize: 24,
          color: "#2563EB",
          align: "center",
        })
      );
      template.addElement(
        new QrElement({
          id: "qr",
          x: 1720,
          y: 920,
          size: 130,
          payloadPattern: `https://campusclub.vercel.app/verify?id=${foundStudent.id}`,
        })
      );
    }

    const blob = await BulkGeneratorEngine.generateSingle(template, foundStudent, format);
    saveAs(blob, `Certificate_${foundStudent.id}_${foundStudent.name}.${format}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 relative transition-colors">
      <div className="w-full max-w-lg space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Organizer Hub</span>
          </Link>
          <ThemeToggle />
        </div>

        <Card padding="lg" className="text-center space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Award className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Student Certificate Kiosk
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Enter your Student ID / Roll Number below to dynamically generate and download your official credentials.
            </p>
          </div>

          <form onSubmit={handleLookup} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. CSE-2026-1024 or 2021-1-60-123"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                className={`${THEME.surface.input} text-center font-mono py-2.5 text-sm`}
                required
              />
            </div>
            <Button
              variant="primary"
              className="w-full py-2.5"
              isLoading={isSearching}
              leftIcon={<Search className="w-4 h-4" />}
              type="submit"
            >
              Find My Certificate
            </Button>
          </form>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {foundStudent && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-800 space-y-3 text-left animate-in zoom-in-95 duration-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <Badge variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Credential Found</span>
                </Badge>
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">
                  {foundStudent.id}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{foundStudent.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{foundStudent.department}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleDownloadCertificate("pdf")}
                >
                  Download PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleDownloadCertificate("png")}
                >
                  Download PNG
                </Button>
              </div>
            </div>
          )}
        </Card>

        <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 flex items-center justify-center gap-1.5 font-medium">
          <span>Made with ❤️ by</span>
          <a
            href="https://ratul-dev.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
          >
            Ratul
          </a>
        </footer>
      </div>
    </div>
  );
}
