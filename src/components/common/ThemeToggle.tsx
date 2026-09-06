"use client";

import React from "react";
import { useTheme } from "@/core/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC<{ showLabel?: boolean }> = ({ showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
      title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="w-4 h-4 text-slate-700" />
      ) : (
        <Sun className="w-4 h-4 text-amber-400" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </span>
      )}
    </button>
  );
};
