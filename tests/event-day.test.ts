import { describe, it, expect } from "vitest";
import { EventDayManager, JudgeScoreSheet } from "../src/core/domain/event-day";

describe("EventDayManager", () => {
  it("should record meal claim and prevent duplicate food theft", () => {
    const manager = new EventDayManager();

    // First scan: should succeed
    const firstClaim = manager.claimMeal("CSE-1024", "Rahim Ahmed", "Lunch");
    expect(firstClaim.success).toBe(true);
    expect(firstClaim.status).toBe("CLAIMED");

    // Second scan: should reject with duplicate fraud warning
    const secondClaim = manager.claimMeal("CSE-1024", "Rahim Ahmed", "Lunch");
    expect(secondClaim.success).toBe(false);
    expect(secondClaim.status).toBe("DUPLICATE");
    expect(secondClaim.message).toContain("already claimed");
  });

  it("should compute Olympic average judging score to eliminate bias", () => {
    // Scores: 60, 90, 85, 95, 40 -> drops highest (95) and lowest (40) -> average of (60+90+85)/3 = 78.33
    const scores = [60, 90, 85, 95, 40];
    const olympicAvg = JudgeScoreSheet.calculateOlympicAverage(scores);
    expect(olympicAvg).toBeCloseTo(78.33, 1);
  });
});
