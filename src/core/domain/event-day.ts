import { StudentRecord } from "./roster";

export type TokenSessionType =
  | "GATE"
  | "BREAKFAST"
  | "LUNCH"
  | "SNACKS"
  | "DINNER"
  | "SWAG_KIT";

export interface EventDaySessionConfig {
  id: TokenSessionType;
  label: string;
  category: "GATE" | "MEAL" | "MERCH";
  description: string;
}

export const EVENT_DAY_SESSIONS: Record<TokenSessionType, EventDaySessionConfig> = {
  GATE: {
    id: "GATE",
    label: "Main Gate Admission",
    category: "GATE",
    description: "Venue entrance check-in & attendance verification",
  },
  BREAKFAST: {
    id: "BREAKFAST",
    label: "Morning Breakfast Token",
    category: "MEAL",
    description: "Breakfast counter validation",
  },
  LUNCH: {
    id: "LUNCH",
    label: "Main Buffet Lunch Token",
    category: "MEAL",
    description: "Anti-duplicate lunch counter claim",
  },
  SNACKS: {
    id: "SNACKS",
    label: "Afternoon High Tea / Snacks",
    category: "MEAL",
    description: "Evening refreshment stall token",
  },
  DINNER: {
    id: "DINNER",
    label: "Gala Dinner Token",
    category: "MEAL",
    description: "Evening banquet access verification",
  },
  SWAG_KIT: {
    id: "SWAG_KIT",
    label: "Event Kit & T-Shirt Pickup",
    category: "MERCH",
    description: "Attendee badge, lanyard, and T-shirt distribution",
  },
};

export interface MealClaimResult {
  success: boolean;
  status: "CLAIMED" | "DUPLICATE";
  studentId: string;
  studentName: string;
  mealType: string;
  timestamp: number;
  message: string;
  sessionType?: TokenSessionType;
  details?: string;
}

export interface GateCheckInRecord {
  studentId: string;
  studentName: string;
  timestamp: number;
  gateName: string;
}

export interface VolunteerShift {
  id: string;
  name: string;
  station: string;
  timeSlot: string;
  supervisorPhone: string;
  notes?: string;
}

export interface StageCue {
  id: string;
  time: string;
  title: string;
  speaker: string;
  durationMinutes: number;
  isCompleted: boolean;
  notes?: string;
}

export interface TeamBracketMatch {
  id: string;
  round: number;
  teamA: string;
  teamB: string;
  winner?: string;
  scoreA?: number;
  scoreB?: number;
}

export interface TurnoutStats {
  totalRegistered: number;
  checkedInCount: number;
  absentCount: number;
  turnoutPercentage: number;
  sessionClaimCounts: Record<string, number>;
}

export class EventDayManager {
  private tokenClaims: Map<string, MealClaimResult>;
  private gateCheckins: Map<string, GateCheckInRecord>;

  constructor() {
    this.tokenClaims = new Map();
    this.gateCheckins = new Map();
  }

  /**
   * Generic token claim method supporting multi-session operations (Lunch, Kit, Snacks, etc.)
   */
  public claimToken(
    studentId: string,
    studentName: string,
    sessionType: TokenSessionType | string = "LUNCH",
    details?: string
  ): MealClaimResult {
    const normSession = (sessionType || "LUNCH").toUpperCase().trim();
    const key = `${studentId.trim().toLowerCase()}-${normSession}`;

    if (this.tokenClaims.has(key)) {
      const existing = this.tokenClaims.get(key)!;
      const timeStr = new Date(existing.timestamp).toLocaleTimeString();
      return {
        success: false,
        status: "DUPLICATE",
        studentId,
        studentName,
        mealType: normSession,
        sessionType: normSession as TokenSessionType,
        timestamp: Date.now(),
        message: `Token for ${normSession} was already claimed at ${timeStr} by ${studentName} (${studentId})!`,
        details: existing.details,
      };
    }

    const sessionLabel =
      EVENT_DAY_SESSIONS[normSession as TokenSessionType]?.label || normSession;

    const claim: MealClaimResult = {
      success: true,
      status: "CLAIMED",
      studentId,
      studentName,
      mealType: normSession,
      sessionType: normSession as TokenSessionType,
      timestamp: Date.now(),
      message: `${sessionLabel} successfully verified for ${studentName} (${studentId})`,
      details,
    };

    this.tokenClaims.set(key, claim);
    return claim;
  }

  /**
   * Backward-compatible alias for claimToken with mealType string
   */
  public claimMeal(
    studentId: string,
    studentName: string,
    mealType: string = "Lunch"
  ): MealClaimResult {
    const sessionKey = mealType.toUpperCase().includes("LUNCH")
      ? "LUNCH"
      : mealType.toUpperCase().includes("BREAKFAST")
      ? "BREAKFAST"
      : mealType.toUpperCase().includes("KIT")
      ? "SWAG_KIT"
      : mealType.toUpperCase();
    return this.claimToken(studentId, studentName, sessionKey);
  }

  public checkInGate(
    studentId: string,
    studentName: string,
    gateName: string = "Main Gate"
  ): { success: boolean; isDuplicate: boolean; message: string; timestamp?: number } {
    const key = studentId.trim().toLowerCase();

    if (this.gateCheckins.has(key)) {
      const existing = this.gateCheckins.get(key)!;
      return {
        success: true,
        isDuplicate: true,
        message: `Attendee already checked in at ${new Date(
          existing.timestamp
        ).toLocaleTimeString()} via ${existing.gateName}`,
        timestamp: existing.timestamp,
      };
    }

    const now = Date.now();
    this.gateCheckins.set(key, {
      studentId,
      studentName,
      timestamp: now,
      gateName,
    });

    return {
      success: true,
      isDuplicate: false,
      message: `Gate check-in confirmed for ${studentName} at ${gateName}`,
      timestamp: now,
    };
  }

  public getTotalCheckedIn(): number {
    return this.gateCheckins.size;
  }

  public getTotalMealsClaimed(): number {
    return this.tokenClaims.size;
  }

  public getClaimsList(): MealClaimResult[] {
    return Array.from(this.tokenClaims.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getGateCheckinsList(): GateCheckInRecord[] {
    return Array.from(this.gateCheckins.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Calculates overall attendance and session turnout statistics
   */
  public getTurnoutStats(students: StudentRecord[]): TurnoutStats {
    const totalRegistered = students.length;
    const checkedInCount = this.gateCheckins.size;
    const absentCount = Math.max(0, totalRegistered - checkedInCount);
    const turnoutPercentage =
      totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;

    const sessionClaimCounts: Record<string, number> = {};
    for (const claim of this.tokenClaims.values()) {
      const sess = claim.sessionType || claim.mealType;
      sessionClaimCounts[sess] = (sessionClaimCounts[sess] || 0) + 1;
    }

    return {
      totalRegistered,
      checkedInCount,
      absentCount,
      turnoutPercentage,
      sessionClaimCounts,
    };
  }

  /**
   * Synchronizes current check-ins and claimed tokens back into the StudentRecord roster
   */
  public applyToRoster(students: StudentRecord[]): StudentRecord[] {
    return students.map((s) => {
      const key = (s.id || "").trim().toLowerCase();
      const checkin = this.gateCheckins.get(key);
      const isCheckedIn = !!checkin;

      // Find all claimed tokens for this student
      const userTokens: string[] = [];
      for (const [claimKey, claim] of this.tokenClaims.entries()) {
        if (claimKey.startsWith(`${key}-`)) {
          userTokens.push(claim.sessionType || claim.mealType);
        }
      }

      return {
        ...s,
        gateCheckedIn: isCheckedIn,
        attendanceStatus: isCheckedIn ? ("CHECKED_IN" as const) : ("ABSENT" as const),
        checkInTime: checkin?.timestamp,
        claimedTokens: userTokens,
      };
    });
  }
}

export class JudgeScoreSheet {
  /**
   * Olympic Average: Drops the highest and lowest scores to eliminate judge bias,
   * then computes the arithmetic mean of the remaining scores.
   */
  public static calculateOlympicAverage(scores: number[]): number {
    if (scores.length === 0) return 0;
    if (scores.length <= 2) {
      const sum = scores.reduce((a, b) => a + b, 0);
      return sum / scores.length;
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const middleScores = sorted.slice(1, -1);
    const sum = middleScores.reduce((a, b) => a + b, 0);
    return sum / middleScores.length;
  }
}
