"use client";

import React from "react";
import { THEME } from "@/styles/theme";

export interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  sublabel?: string;
  variant?: "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  sublabel,
  variant = "primary",
  size = "md",
  showPercentage = true,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3.5" : "h-2.5";

  const colorClass =
    variant === "success"
      ? "bg-emerald-600 dark:bg-emerald-500"
      : variant === "warning"
      ? "bg-amber-600 dark:bg-amber-500"
      : variant === "danger"
      ? "bg-rose-600 dark:bg-rose-500"
      : "bg-blue-600 dark:bg-blue-500";

  return (
    <div className="w-full space-y-1.5">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-700 dark:text-slate-300">{label}</span>
          <div className="flex items-center gap-2">
            {sublabel && <span className="text-slate-500 dark:text-slate-400">{sublabel}</span>}
            {showPercentage && (
              <span className={THEME.typography.mono}>
                {Math.round(clampedProgress)}%
              </span>
            )}
          </div>
        </div>
      )}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
        <div
          className={`${heightClass} rounded-full ${colorClass} transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};
