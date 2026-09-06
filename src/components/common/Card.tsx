"use client";

import React from "react";
import { THEME } from "@/styles/theme";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = true,
  padding = "md",
  className = "",
  ...props
}) => {
  const paddingClass =
    padding === "none"
      ? ""
      : padding === "sm"
      ? "p-4"
      : padding === "lg"
      ? "p-8"
      : "p-6";

  return (
    <div
      className={`${THEME.surface.card} ${
        hoverable ? THEME.surface.cardHover : ""
      } ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
