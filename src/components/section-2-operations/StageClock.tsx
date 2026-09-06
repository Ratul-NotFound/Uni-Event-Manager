"use client";

import React, { useState, useEffect } from "react";
import { THEME } from "@/styles/theme";
import { StageCue } from "@/core/domain/event-day";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mic,
} from "lucide-react";

export const StageClock: React.FC = () => {
  const [cues, setCues] = useState<StageCue[]>([
    {
      id: "c1",
      time: "10:00 AM",
      title: "Opening Ceremony & National Anthem",
      speaker: "Club President & Host",
      durationMinutes: 15,
      isCompleted: false,
    },
    {
      id: "c2",
      time: "10:15 AM",
      title: "Keynote Address: Future of AI & Computing",
      speaker: "Chief Guest / Dean of Engineering",
      durationMinutes: 30,
      isCompleted: false,
    },
    {
      id: "c3",
      time: "10:45 AM",
      title: "Hackathon Finalist Project Pitches (Top 5)",
      speaker: "Selected Finalist Teams",
      durationMinutes: 45,
      isCompleted: false,
    },
    {
      id: "c4",
      time: "11:30 AM",
      title: "Awards & Prize Distribution Gala",
      speaker: "Faculty Advisors & Judges",
      durationMinutes: 30,
      isCompleted: false,
    },
  ]);

  const [activeCueIndex, setActiveCueIndex] = useState(0);
  const activeCue = cues[activeCueIndex] || cues[0];

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(
    (activeCue?.durationMinutes || 15) * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [stageCueMessage, setStageCueMessage] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    setSecondsRemaining((activeCue?.durationMinutes || 15) * 60);
  }, [activeCueIndex]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((s) => s - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const timerColor =
    secondsRemaining <= 60
      ? "text-rose-500 animate-pulse"
      : secondsRemaining <= 180
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Stage Program Rundown & Presenter Countdown Monitor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Keep guest speakers, deans, and panels on strict schedule with high-contrast stage display and silent cue prompts.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          leftIcon={<Maximize2 className="w-4 h-4" />}
          onClick={() => setIsFullScreen(!isFullScreen)}
        >
          {isFullScreen ? "Exit Fullscreen" : "Presenter Fullscreen Mode"}
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: High-Contrast Presenter Countdown Clock (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            padding="lg"
            className={`flex flex-col items-center justify-center text-center p-8 transition-all ${
              isFullScreen
                ? "fixed inset-0 z-50 rounded-none bg-black flex flex-col justify-center p-12"
                : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Current Speaker / Segment:
              </span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeCue?.title}
            </h3>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
              {activeCue?.speaker}
            </p>

            {/* Giant Presenter Digits */}
            <div className={`font-mono text-7xl sm:text-9xl font-black tracking-tighter my-6 select-none ${timerColor}`}>
              {formatTimer(secondsRemaining)}
            </div>

            {/* Silent On-Stage Cue Banner */}
            {stageCueMessage && (
              <div className="w-full py-3 px-6 rounded-2xl bg-amber-50 dark:bg-amber-500/20 border-2 border-amber-500 text-amber-800 dark:text-amber-300 font-extrabold text-sm sm:text-base tracking-wide mb-6 animate-pulse">
                🔔 STAGE CUE: {stageCueMessage}
              </div>
            )}

            {/* Stage Timer Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant={isRunning ? "secondary" : "success"}
                leftIcon={isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? "Pause Speaker" : "Start Countdown"}
              </Button>
              <Button
                variant="secondary"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => {
                  setIsRunning(false);
                  setSecondsRemaining((activeCue?.durationMinutes || 15) * 60);
                }}
              >
                Reset Clock
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (activeCueIndex < cues.length - 1) {
                    setActiveCueIndex(activeCueIndex + 1);
                    setIsRunning(false);
                  }
                }}
              >
                Next Segment &rarr;
              </Button>
            </div>

            {/* Quick Silent Prompts Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6 border-t border-slate-200 dark:border-slate-800 w-full mt-6 text-xs">
              <span className="text-slate-500 font-medium">Quick Silent Cues:</span>
              <button
                onClick={() => setStageCueMessage("Wrap up in 2 minutes")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                "2 Mins Left"
              </button>
              <button
                onClick={() => setStageCueMessage("Please conclude now")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                "Conclude Now"
              </button>
              <button
                onClick={() => setStageCueMessage("Open Floor for Q&A")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                "Start Q&A"
              </button>
              {stageCueMessage && (
                <button
                  onClick={() => setStageCueMessage("")}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side: Program Schedule Rundown (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
              Program Rundown Cue Sheet
            </h3>

            <div className="space-y-2.5 text-xs">
              {cues.map((cue, idx) => {
                const isActive = idx === activeCueIndex;
                return (
                  <div
                    key={cue.id}
                    onClick={() => {
                      setActiveCueIndex(idx);
                      setIsRunning(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-50 dark:bg-amber-500/15 border-amber-500/50 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{cue.time}</span>
                      <Badge variant={isActive ? "warning" : "neutral"}>
                        {cue.durationMinutes} mins
                      </Badge>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white mt-1 text-sm">{cue.title}</h4>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{cue.speaker}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
