"use client";

import React, { useState } from "react";
import { THEME } from "@/styles/theme";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Image as ImageIcon, Plus, Trash2, Download } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  tier: "TITLE" | "GOLD" | "SILVER" | "MEDIA";
}

export const SponsorAutoTiler: React.FC = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([
    { id: "s1", name: "Google Cloud Campus", tier: "TITLE" },
    { id: "s2", name: "Intel AI Academy", tier: "GOLD" },
    { id: "s3", name: "Red Bull Energy", tier: "SILVER" },
    { id: "s4", name: "Campus Tech Radio", tier: "MEDIA" },
  ]);

  const [newSponsorName, setNewSponsorName] = useState("");
  const [newSponsorTier, setNewSponsorTier] = useState<Sponsor["tier"]>("GOLD");

  const handleAddSponsor = () => {
    if (!newSponsorName.trim()) return;
    setSponsors([
      ...sponsors,
      {
        id: `s-${Date.now()}`,
        name: newSponsorName,
        tier: newSponsorTier,
      },
    ]);
    setNewSponsorName("");
  };

  const handleRemoveSponsor = (id: string) => {
    setSponsors(sponsors.filter((s) => s.id !== id));
  };

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Sponsor Logo Wall & Banner Auto-Tiler
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {sponsors.length} Active Partners
        </span>
      </div>

      {/* Generated Sponsor Wall Visual Preview */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 text-center">
        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
          Auto-Tiled Certificate Footer & Backdrop Strip:
        </span>
        <div className="flex flex-wrap items-center justify-center gap-6 py-4">
          {sponsors.map((s) => (
            <div
              key={s.id}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  s.tier === "TITLE"
                    ? "bg-amber-400"
                    : s.tier === "GOLD"
                    ? "bg-amber-500"
                    : s.tier === "SILVER"
                    ? "bg-slate-400"
                    : "bg-blue-500"
                }`}
              />
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">{s.name}</span>
              <span className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">{s.tier}</span>
              <button
                onClick={() => handleRemoveSponsor(s.id)}
                className="text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Sponsor Form */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2 text-xs">
        <input
          type="text"
          placeholder="New Partner / Sponsor Name..."
          value={newSponsorName}
          onChange={(e) => setNewSponsorName(e.target.value)}
          className={`${THEME.surface.input}`}
        />
        <select
          value={newSponsorTier}
          onChange={(e) => setNewSponsorTier(e.target.value as any)}
          className={`${THEME.surface.select} sm:w-40`}
        >
          <option value="TITLE">Title Sponsor</option>
          <option value="GOLD">Gold Partner</option>
          <option value="SILVER">Silver Partner</option>
          <option value="MEDIA">Media Partner</option>
        </select>
        <Button variant="primary" size="sm" onClick={handleAddSponsor}>
          Add
        </Button>
      </div>
    </Card>
  );
};
