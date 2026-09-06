import { describe, it, expect } from "vitest";
import { THEME } from "../src/styles/theme";

describe("Centralized Theme Engine", () => {
  it("should define core university colors and brand accents", () => {
    expect(THEME.colors.primary).toBeDefined();
    expect(THEME.colors.primaryHover).toBeDefined();
    expect(THEME.colors.success).toBeDefined();
    expect(THEME.colors.danger).toBeDefined();
    expect(THEME.colors.warning).toBeDefined();
    expect(THEME.colors.accent).toBeDefined();
  });

  it("should define consistent surface and clean SaaS classes", () => {
    expect(THEME.surface.card).toContain("bg-white");
    expect(THEME.surface.card).toContain("dark:bg-slate-900");
    expect(THEME.surface.panel).toBeDefined();
    expect(THEME.surface.input).toBeDefined();
  });

  it("should define typography scales and font presets", () => {
    expect(THEME.typography.title).toBeDefined();
    expect(THEME.typography.body).toBeDefined();
    expect(THEME.typography.mono).toBeDefined();
  });
});
