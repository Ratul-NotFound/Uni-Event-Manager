"use client";

import React, { useState } from "react";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { MessageSquare, Send, Copy, Check, ExternalLink } from "lucide-react";

export interface WhatsAppBroadcasterProps {
  students: StudentRecord[];
}

export const WhatsAppBroadcaster: React.FC<WhatsAppBroadcasterProps> = ({
  students,
}) => {
  const [broadcastMessage, setBroadcastMessage] = useState(
    "📢 Event Update: Lunch has started in Cafeteria 2! Please proceed with your badge QR pass."
  );
  const [copiedBatch, setCopiedBatch] = useState(false);

  const phoneNumbers = students
    .map((s) => (s.phone || "").replace(/[^0-9+]/g, ""))
    .filter((p) => p.length >= 8);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Emergency WhatsApp & SMS Broadcast Formatter
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instant generation of deep-link WhatsApp messages and clean phone number batches with zero third-party API fees.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={copiedBatch ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          onClick={handleCopyNumbers}
        >
          {copiedBatch ? "Copied Phone Numbers!" : `Copy Phone List (${phoneNumbers.length})`}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                  className={`${THEME.surface.input} mt-1 text-xs`}
                />
              </div>

              {/* Quick Template Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 mr-1">Presets:</span>
                <button
                  onClick={() =>
                    setBroadcastMessage(
                      "📢 Food Alert: Lunch has officially started! Please visit the food desk with your digital pass."
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer text-[10px]"
                >
                  Meal Started
                </button>
                <button
                  onClick={() =>
                    setBroadcastMessage(
                      "⚡ Venue Change: The Keynote Session has moved to Auditorium Hall A. Please assemble now."
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer text-[10px]"
                >
                  Hall Change
                </button>
                <button
                  onClick={() =>
                    setBroadcastMessage(
                      "⏳ Deadline Notice: Hackathon submission portal closes in 30 minutes. Ensure your GitHub repo is public!"
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer text-[10px]"
                >
                  Submission Deadline
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <Card padding="md" className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
              Broadcast Dispatch Links
            </h3>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Valid Phones:</span>
                <span className="text-slate-900 dark:text-white font-bold">{phoneNumbers.length} Attendees</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Delivery Cost:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">$0.00 (Native WhatsApp)</span>
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
