export interface MealClaimResult {
  success: boolean;
  status: "CLAIMED" | "DUPLICATE";
  studentId: string;
  studentName: string;
  mealType: string;
  timestamp: number;
  message: string;
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

export class EventDayManager {
  private mealClaims: Map<string, MealClaimResult>;
  private gateCheckins: Map<string, GateCheckInRecord>;

  constructor() {
    this.mealClaims = new Map();
    this.gateCheckins = new Map();
  }

  public claimMeal(
    studentId: string,
    studentName: string,
    mealType: string = "Lunch"
  ): MealClaimResult {
    const key = `${studentId.trim().toLowerCase()}-${mealType.toLowerCase()}`;

    if (this.mealClaims.has(key)) {
      const existing = this.mealClaims.get(key)!;
      const timeStr = new Date(existing.timestamp).toLocaleTimeString();
      return {
        success: false,
        status: "DUPLICATE",
        studentId,
        studentName,
        mealType,
        timestamp: Date.now(),
        message: `Meal was already claimed at ${timeStr} by ${studentName} (${studentId})!`,
      };
    }

    const claim: MealClaimResult = {
      success: true,
      status: "CLAIMED",
      studentId,
      studentName,
      mealType,
      timestamp: Date.now(),
      message: `Meal successfully verified for ${studentName} (${studentId})`,
    };

    this.mealClaims.set(key, claim);
    return claim;
  }

  public checkInGate(
    studentId: string,
    studentName: string,
    gateName: string = "Main Gate"
  ): { success: boolean; isDuplicate: boolean; message: string } {
    const key = studentId.trim().toLowerCase();

    if (this.gateCheckins.has(key)) {
      const existing = this.gateCheckins.get(key)!;
      return {
        success: true,
        isDuplicate: true,
        message: `Attendee already checked in at ${new Date(existing.timestamp).toLocaleTimeString()}`,
      };
    }

    this.gateCheckins.set(key, {
      studentId,
      studentName,
      timestamp: Date.now(),
      gateName,
    });

    return {
      success: true,
      isDuplicate: false,
      message: `Check-in confirmed for ${studentName}`,
    };
  }

  public getTotalCheckedIn(): number {
    return this.gateCheckins.size;
  }

  public getTotalMealsClaimed(): number {
    return this.mealClaims.size;
  }

  public getClaimsList(): MealClaimResult[] {
    return Array.from(this.mealClaims.values());
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
