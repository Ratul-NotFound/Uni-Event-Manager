/**
 * Centralized Design System & Theme Engine for CampusClub Suite
 * Professional, clean SaaS palette supporting both Light (White) and Dark themes.
 * Zero "vibe-coding" neon glows; built for clarity, legibility, and high performance.
 */

export const THEME = {
  // Core Color Tokens (Standard Professional SaaS Palette)
  colors: {
    // Primary: Clean University Royal Blue
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    primaryLight: "#EFF6FF",
    primaryBorder: "#BFDBFE",

    // Accent: Slate Navy
    accent: "#3B82F6",
    accentHover: "#2563EB",
    accentLight: "#F0FDF4",

    // Success: Crisp Emerald
    success: "#10B981",
    successHover: "#059669",
    successLight: "#ECFDF5",
    successBorder: "#A7F3D0",

    // Warning: Warm Amber
    warning: "#D97706",
    warningHover: "#B45309",
    warningLight: "#FFFBEB",
    warningBorder: "#FDE68A",

    // Danger: Clean Rose / Crimson
    danger: "#E11D48",
    dangerHover: "#BE123C",
    dangerLight: "#FFF1F2",
    dangerBorder: "#FECDD3",

    // Info: Sky Blue
    info: "#0284C7",
    infoLight: "#F0F9FF",

    // Neutral Surfaces & Backgrounds
    bgBaseLight: "#F8FAFC",
    bgBaseDark: "#0B0F19",
    bgCardLight: "#FFFFFF",
    bgCardDark: "#111827",

    // Neutral Typography
    textPrimaryLight: "#0F172A",
    textPrimaryDark: "#F8FAFC",
    textSecondaryLight: "#475569",
    textSecondaryDark: "#94A3B8",
    textMuted: "#64748B",

    // Neutral Borders
    borderSubtleLight: "#E2E8F0",
    borderSubtleDark: "#1E293B",
  },

  // Surface & Container Styles (Clean Modern Light & Dark)
  surface: {
    card: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors",
    cardHover: "hover:border-slate-300 dark:hover:border-slate-700 transition-colors",
    panel: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs",
    subtlePanel: "bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4",
    input: "w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors",
    inputSm: "w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors",
    select: "bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors",
  },

  // Button Presets (Clean, Accessible, Crisp)
  buttons: {
    primary: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
    secondary: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
    success: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
    danger: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
    ghost: "inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer",
    sm: "px-3 py-1.5 text-xs rounded-md",
    lg: "px-5 py-2.5 text-base rounded-xl",
  },

  // Badge Presets
  badge: {
    primary: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    success: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    warning: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    danger: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
    neutral: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
  },

  // Typography Hierarchy
  typography: {
    title: "text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white",
    subtitle: "text-sm sm:text-base text-slate-500 dark:text-slate-400 font-normal",
    sectionHeading: "text-lg font-semibold tracking-tight text-slate-900 dark:text-white",
    label: "text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase",
    body: "text-sm text-slate-700 dark:text-slate-300 leading-relaxed",
    bodySmall: "text-xs text-slate-500 dark:text-slate-400 leading-normal",
    mono: "font-mono text-xs text-blue-600 dark:text-blue-400",
  },

  // Transitions
  animations: {
    transitionFast: "transition-colors duration-150 ease-out",
    transitionNormal: "transition-all duration-200 ease-in-out",
  },
} as const;

export type ThemeType = typeof THEME;
