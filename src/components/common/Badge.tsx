"use client";

import React from "react";
import { THEME } from "@/styles/theme";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  icon,
  className = "",
  ...props
}) => {
  const variantClass = THEME.badge[variant] || THEME.badge.primary;

  return (
    <span className={`${variantClass} ${className}`} {...props}>
      {icon}
      <span>{children}</span>
    </span>
  );
};
