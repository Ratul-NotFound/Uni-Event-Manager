"use client";

import React, { useState } from "react";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Search, Send, CheckCircle2, Edit3 } from "lucide-react";

export interface TypoCorrectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentRecord[];
  onUpdateStudent: (id: string, updates: Partial<StudentRecord>) => void;
}

export const TypoCorrectorModal: React.FC<TypoCorrectorModalProps> = ({
  isOpen,
  onClose,
  students,
  onUpdateStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedDept, setEditedDept] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const filtered = students.filter(
    (s) =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectStudent = (s: StudentRecord) => {
    setSelectedStudent(s);
    setEditedName(s.name);
    setEditedEmail(s.email);
    setEditedDept(s.department || "");
    setStatusMsg("");
  };

  const handleSaveAndResend = () => {
    if (!selectedStudent) return;
    onUpdateStudent(selectedStudent.id, {
      name: editedName,
      email: editedEmail,
      department: editedDept,
    });
    setStatusMsg(`✓ Saved! Re-generated certificate and resent email to ${editedEmail}.`);
    setTimeout(() => {
      onClose();
      setStatusMsg("");
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="1-Click Typo Auto-Corrector & Resend Tool"
      subtitle="Quickly fix a student's misspelled name or email without re-running the entire 1,000 batch"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student by ID or Name to fix typo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${THEME.surface.input} pl-9`}
          />
        </div>

        {/* Search Results List */}
        {!selectedStudent && (
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {filtered.slice(0, 8).map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectStudent(s)}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-mono ml-2">{s.id}</span>
                </div>
                <Badge variant="neutral">{s.department}</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Selected Student Edit Form */}
        {selectedStudent && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-blue-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                Editing: {selectedStudent.id}
              </span>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline text-[11px] cursor-pointer"
              >
                Change Student
              </button>
            </div>

            <div>
              <label className={THEME.typography.label}>Corrected Full Name:</label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className={`${THEME.surface.input} mt-1`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={THEME.typography.label}>Email Address:</label>
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>

              <div>
                <label className={THEME.typography.label}>Department:</label>
                <input
                  type="text"
                  value={editedDept}
                  onChange={(e) => setEditedDept(e.target.value)}
                  className={`${THEME.surface.input} mt-1`}
                />
              </div>
            </div>

            <Button
              variant="success"
              className="w-full mt-2"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleSaveAndResend}
            >
              Update, Re-render & Resend to This Student
            </Button>

            {statusMsg && (
              <p className="text-emerald-400 font-semibold text-center mt-2">
                {statusMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
