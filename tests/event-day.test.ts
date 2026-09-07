import { describe, it, expect } from "vitest";
import {
  EventDayManager,
  JudgeScoreSheet,
  EVENT_DAY_SESSIONS,
  TokenSessionType,
} from "../src/core/domain/event-day";
import { StudentRecord } from "../src/core/domain/roster";

describe("EventDayManager - Real-Time Operations", () => {
  it("should record meal claim and prevent duplicate food theft", () => {
    const manager = new EventDayManager();

    // First scan: should succeed
    const firstClaim = manager.claimToken("CSE-1024", "Rahim Ahmed", "LUNCH");
    expect(firstClaim.success).toBe(true);
    expect(firstClaim.status).toBe("CLAIMED");

    // Second scan for same session: should reject with duplicate warning
    const secondClaim = manager.claimToken("CSE-1024", "Rahim Ahmed", "LUNCH");
    expect(secondClaim.success).toBe(false);
    expect(secondClaim.status).toBe("DUPLICATE");
    expect(secondClaim.message).toContain("already claimed");
  });

  it("should permit claims across different sessions (e.g. Lunch vs Kit vs Snacks)", () => {
    const manager = new EventDayManager();

    const lunchClaim = manager.claimToken("CSE-1024", "Rahim Ahmed", "LUNCH");
    expect(lunchClaim.success).toBe(true);

    // Claiming Kit session should succeed even though Lunch was claimed
    const kitClaim = manager.claimToken("CSE-1024", "Rahim Ahmed", "SWAG_KIT");
    expect(kitClaim.success).toBe(true);
    expect(kitClaim.status).toBe("CLAIMED");

    // Duplicate kit claim should fail
    const dupKit = manager.claimToken("CSE-1024", "Rahim Ahmed", "SWAG_KIT");
    expect(dupKit.success).toBe(false);
    expect(dupKit.status).toBe("DUPLICATE");
  });

  it("should record gate check-ins and detect duplicate entries", () => {
    const manager = new EventDayManager();

    const check1 = manager.checkInGate("CSE-1024", "Rahim Ahmed", "Gate North");
    expect(check1.success).toBe(true);
    expect(check1.isDuplicate).toBe(false);

    const check2 = manager.checkInGate("CSE-1024", "Rahim Ahmed", "Gate South");
    expect(check2.success).toBe(true);
    expect(check2.isDuplicate).toBe(true);
    expect(check2.message).toContain("already checked in");

    expect(manager.getTotalCheckedIn()).toBe(1);
  });

  it("should compute accurate real-time turnout metrics and session counts", () => {
    const sampleStudents: StudentRecord[] = [
      { id: "S1", name: "Alice", email: "alice@test.com" },
      { id: "S2", name: "Bob", email: "bob@test.com" },
      { id: "S3", name: "Charlie", email: "charlie@test.com" },
      { id: "S4", name: "Dana", email: "dana@test.com" },
    ];

    const manager = new EventDayManager();
    manager.checkInGate("S1", "Alice");
    manager.checkInGate("S2", "Bob");

    manager.claimToken("S1", "Alice", "LUNCH");
    manager.claimToken("S2", "Bob", "LUNCH");
    manager.claimToken("S1", "Alice", "SWAG_KIT");

    const stats = manager.getTurnoutStats(sampleStudents);
    expect(stats.totalRegistered).toBe(4);
    expect(stats.checkedInCount).toBe(2);
    expect(stats.absentCount).toBe(2);
    expect(stats.turnoutPercentage).toBe(50);
    expect(stats.sessionClaimCounts["LUNCH"]).toBe(2);
    expect(stats.sessionClaimCounts["SWAG_KIT"]).toBe(1);
  });

  it("should sync event-day check-in status back into StudentRecord objects", () => {
    const sampleStudents: StudentRecord[] = [
      { id: "S1", name: "Alice", email: "alice@test.com" },
      { id: "S2", name: "Bob", email: "bob@test.com" },
    ];

    const manager = new EventDayManager();
    manager.checkInGate("S1", "Alice");
    manager.claimToken("S1", "Alice", "LUNCH");

    const synced = manager.applyToRoster(sampleStudents);
    expect(synced[0].gateCheckedIn).toBe(true);
    expect(synced[0].attendanceStatus).toBe("CHECKED_IN");
    expect(synced[0].claimedTokens).toContain("LUNCH");

    expect(synced[1].gateCheckedIn).toBe(false);
    expect(synced[1].attendanceStatus).toBe("ABSENT");
  });

  it("should compute Olympic average judging score to eliminate bias", () => {
    // Scores: 60, 90, 85, 95, 40 -> drops highest (95) and lowest (40) -> average of (60+90+85)/3 = 78.33
    const scores = [60, 90, 85, 95, 40];
    const olympicAvg = JudgeScoreSheet.calculateOlympicAverage(scores);
    expect(olympicAvg).toBeCloseTo(78.33, 1);
  });
});
