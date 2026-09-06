"use client";

import React, { useState } from "react";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { GitMerge, Users, Trophy, Play, CheckCircle2 } from "lucide-react";

export interface TeamAndBracketsProps {
  students: StudentRecord[];
}

export const TeamAndBrackets: React.FC<TeamAndBracketsProps> = ({ students }) => {
  const [activeTab, setActiveTab] = useState<"brackets" | "matcher">("brackets");

  // Bracket Matches State
  const [matches, setMatches] = useState([
    { id: "m1", round: 1, teamA: "CyberWarriors", teamB: "ByteKnights", winner: "CyberWarriors" },
    { id: "m2", round: 1, teamA: "RoboTitans", teamB: "CodeCrafters", winner: "RoboTitans" },
    { id: "m3", round: 1, teamA: "QuantumHack", teamB: "DataDynamos", winner: "QuantumHack" },
    { id: "m4", round: 1, teamA: "AlgoAssassins", teamB: "PixelPioneers", winner: "PixelPioneers" },
    { id: "m5", round: 2, teamA: "CyberWarriors", teamB: "RoboTitans", winner: "CyberWarriors" },
    { id: "m6", round: 2, teamA: "QuantumHack", teamB: "PixelPioneers", winner: "PixelPioneers" },
    { id: "m7", round: 3, teamA: "CyberWarriors", teamB: "PixelPioneers", winner: "" },
  ]);

  // Team Matcher State
  const [teamSize, setTeamSize] = useState(3);
  const [formedTeams, setFormedTeams] = useState<Array<{ name: string; members: StudentRecord[] }>>([]);

  const handleAutoMatchTeams = () => {
    const list = students.length > 0 ? [...students] : [
      { id: "S1", name: "Alice (Developer)", department: "CSE" },
      { id: "S2", name: "Bob (Designer)", department: "BBA" },
      { id: "S3", name: "Charlie (Presenter)", department: "ENG" },
      { id: "S4", name: "Diana (Hardware)", department: "EEE" },
      { id: "S5", name: "Evan (Coder)", department: "CSE" },
      { id: "S6", name: "Fiona (Business)", department: "BBA" },
    ];

    const teams: Array<{ name: string; members: StudentRecord[] }> = [];
    let currentMembers: StudentRecord[] = [];
    let teamCounter = 1;

    list.forEach((s) => {
      currentMembers.push(s as any);
      if (currentMembers.length === teamSize) {
        teams.push({
          name: `Squad ${teamCounter++}`,
          members: [...currentMembers],
        });
        currentMembers = [];
      }
    });

    if (currentMembers.length > 0) {
      teams.push({
        name: `Squad ${teamCounter} (Incomplete)`,
        members: [...currentMembers],
      });
    }

    setFormedTeams(teams);
  };

  const handlePickWinner = (matchId: string, winnerTeam: string) => {
    setMatches(
      matches.map((m) => (m.id === matchId ? { ...m, winner: winnerTeam } : m))
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Team Auto-Matcher & Tournament Elimination Brackets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pair solo hackathon registrants into balanced teams or run interactive tournament bracket progression.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("brackets")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "brackets"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Tournament Brackets
          </button>
          <button
            onClick={() => setActiveTab("matcher")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "matcher"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Solo Team Matcher
          </button>
        </div>
      </div>

      {activeTab === "brackets" ? (
        <Card padding="lg" className="overflow-x-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Interactive Elimination Bracket</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Click any team to advance them to the next round
            </span>
          </div>

          <div className="flex items-center gap-12 min-w-[700px] justify-between py-4">
            {/* Round 1: Quarter Finals */}
            <div className="space-y-6 w-52">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                Round 1: Quarter-Finals
              </h4>
              {matches
                .filter((m) => m.round === 1)
                .map((m) => (
                  <div key={m.id} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div
                      onClick={() => handlePickWinner(m.id, m.teamA)}
                      className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex justify-between ${
                        m.winner === m.teamA
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span>{m.teamA}</span>
                      {m.winner === m.teamA && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      onClick={() => handlePickWinner(m.id, m.teamB)}
                      className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex justify-between ${
                        m.winner === m.teamB
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span>{m.teamB}</span>
                      {m.winner === m.teamB && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                ))}
            </div>

            {/* Round 2: Semi Finals */}
            <div className="space-y-12 w-52">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                Round 2: Semi-Finals
              </h4>
              {matches
                .filter((m) => m.round === 2)
                .map((m) => (
                  <div key={m.id} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div
                      onClick={() => handlePickWinner(m.id, m.teamA)}
                      className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex justify-between ${
                        m.winner === m.teamA
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span>{m.teamA}</span>
                      {m.winner === m.teamA && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      onClick={() => handlePickWinner(m.id, m.teamB)}
                      className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex justify-between ${
                        m.winner === m.teamB
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span>{m.teamB}</span>
                      {m.winner === m.teamB && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                ))}
            </div>

            {/* Round 3: Grand Finals */}
            <div className="space-y-6 w-52">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-center">
                Grand Finals
              </h4>
              {matches
                .filter((m) => m.round === 3)
                .map((m) => (
                  <div key={m.id} className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-500/60 space-y-2">
                    <div
                      onClick={() => handlePickWinner(m.id, m.teamA)}
                      className={`p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex justify-between ${
                        m.winner === m.teamA
                          ? "bg-amber-500 text-slate-950 shadow-xs font-bold"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span>{m.teamA}</span>
                      {m.winner === m.teamA && <Trophy className="w-4 h-4 text-black" />}
                    </div>
                    <div
                      onClick={() => handlePickWinner(m.id, m.teamB)}
                      className={`p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex justify-between ${
                        m.winner === m.teamB
                          ? "bg-amber-500 text-slate-950 shadow-xs font-bold"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span>{m.teamB}</span>
                      {m.winner === m.teamB && <Trophy className="w-4 h-4 text-black" />}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Solo Registrant Team Matcher
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically combines solo students into balanced project teams.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">Members Per Team:</label>
              <select
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className={`${THEME.surface.select} py-1 text-xs`}
              >
                <option value={2}>2 Members</option>
                <option value={3}>3 Members (Standard)</option>
                <option value={4}>4 Members (Hackathon)</option>
                <option value={5}>5 Members (Case Comp)</option>
              </select>
              <Button variant="primary" size="sm" onClick={handleAutoMatchTeams}>
                Run Matcher
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {formedTeams.map((team, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">{team.name}</h4>
                  <Badge variant="primary">{team.members.length} Members</Badge>
                </div>
                <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                  {team.members.map((m) => (
                    <div key={m.id} className="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-0.5">
                      <span>{m.name}</span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono">{m.department}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
