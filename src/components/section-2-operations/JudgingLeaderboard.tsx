"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { THEME } from "@/styles/theme";
import { JudgeScoreSheet } from "@/core/domain/event-day";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Trophy, Medal, Award, Sparkles, Plus, Star } from "lucide-react";

export interface ParticipantScore {
  id: string;
  name: string;
  projectTitle: string;
  department: string;
  judgeScores: number[]; // e.g. [85, 90, 95, 80, 88]
  calculatedAverage?: number;
  rank?: number;
}

export const JudgingLeaderboard: React.FC = () => {
  const [participants, setParticipants] = useState<ParticipantScore[]>([
    {
      id: "T-01",
      name: "Team NeuralForge",
      projectTitle: "Autonomous Campus Disaster Drone",
      department: "CSE & Robotics",
      judgeScores: [88, 94, 96, 85, 91],
    },
    {
      id: "T-02",
      name: "Team BioPulse",
      projectTitle: "Low-Cost Smart ECG Monitor",
      department: "EEE & Biomedical",
      judgeScores: [92, 89, 90, 95, 87],
    },
    {
      id: "T-03",
      name: "Team EcoChain",
      projectTitle: "Campus Food Waste Decentralized Ledger",
      department: "BBA & Software",
      judgeScores: [84, 82, 88, 86, 80],
    },
    {
      id: "T-04",
      name: "Team QuantumLeap",
      projectTitle: "Photonic Encryption Gateway",
      department: "Physics & CSE",
      judgeScores: [79, 85, 80, 82, 78],
    },
  ]);

  // Compute Olympic Average and Rank Participants
  const rankedParticipants = participants
    .map((p) => {
      const avg = JudgeScoreSheet.calculateOlympicAverage(p.judgeScores);
      return {
        ...p,
        calculatedAverage: Number(avg.toFixed(2)),
      };
    })
    .sort((a, b) => (b.calculatedAverage || 0) - (a.calculatedAverage || 0))
    .map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Competition Judging & Live Leaderboard Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-judge rubric matrix with Olympic average calculation to eliminate bias, and 1-click winner award pipeline.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="success"
          leftIcon={<Sparkles className="w-4 h-4" />}
          onClick={triggerCelebration}
        >
          Announce Winners & Celebrate
        </Button>
      </div>

      {/* Leaderboard Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rank 1 Champion */}
        {rankedParticipants[0] && (
          <Card
            padding="lg"
            className="bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-600/60 text-center relative overflow-hidden order-1 sm:order-2 shadow-xs"
          >
            <div className="p-3 mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8" />
            </div>
            <Badge variant="warning" className="text-xs uppercase font-extrabold tracking-widest">
              CHAMPION / RANK 1
            </Badge>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
              {rankedParticipants[0].name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-0.5">
              "{rankedParticipants[0].projectTitle}"
            </p>
            <div className="font-mono text-3xl font-black text-amber-600 dark:text-amber-400 my-3">
              {rankedParticipants[0].calculatedAverage} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">pts</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {rankedParticipants[0].department}
            </p>
          </Card>
        )}

        {/* Rank 2 - 1st Runner Up */}
        {rankedParticipants[1] && (
          <Card
            padding="md"
            className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-center order-2 sm:order-1"
          >
            <div className="p-2.5 mx-auto w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-2">
              <Medal className="w-6 h-6" />
            </div>
            <Badge variant="neutral" className="text-[10px] uppercase font-bold tracking-widest">
              1ST RUNNER-UP / RANK 2
            </Badge>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mt-2">
              {rankedParticipants[1].name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
              "{rankedParticipants[1].projectTitle}"
            </p>
            <div className="font-mono text-2xl font-black text-slate-800 dark:text-slate-200 my-2">
              {rankedParticipants[1].calculatedAverage} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">pts</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {rankedParticipants[1].department}
            </p>
          </Card>
        )}

        {/* Rank 3 - 2nd Runner Up */}
        {rankedParticipants[2] && (
          <Card
            padding="md"
            className="bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 text-center order-3"
          >
            <div className="p-2.5 mx-auto w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 flex items-center justify-center mb-2">
              <Award className="w-6 h-6" />
            </div>
            <Badge variant="neutral" className="text-[10px] uppercase font-bold tracking-widest text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60">
              2ND RUNNER-UP / RANK 3
            </Badge>
            <h4 className="text-base font-bold text-slate-900 dark:text-white mt-2">
              {rankedParticipants[2].name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
              "{rankedParticipants[2].projectTitle}"
            </p>
            <div className="font-mono text-2xl font-black text-amber-700 dark:text-amber-400/90 my-2">
              {rankedParticipants[2].calculatedAverage} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">pts</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {rankedParticipants[2].department}
            </p>
          </Card>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <Card padding="md" className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
          Full Score Sheet & Olympic Average Breakdown
        </h3>

        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <th className="p-3">Rank</th>
                <th className="p-3">Team / Candidate</th>
                <th className="p-3">Project Title</th>
                <th className="p-3">Judge Scores (Raw)</th>
                <th className="p-3 text-right">Olympic Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {rankedParticipants.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="p-3">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">#{p.rank}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{p.id}</div>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">{p.projectTitle}</td>
                  <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                    [{p.judgeScores.join(", ")}]
                  </td>
                  <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {p.calculatedAverage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
