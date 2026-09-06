import Dexie, { Table } from "dexie";

export interface StoredTemplate {
  id: string;
  name: string;
  templateJson: string;
  updatedAt: number;
}

export interface StoredRoomGrid {
  id: string;
  name: string;
  gridJson: string;
  updatedAt: number;
}

export interface StoredRoster {
  id: string;
  name: string;
  recordsJson: string;
  count: number;
  updatedAt: number;
}

export interface StoredAuditLog {
  id?: number;
  eventType: "EMAIL_SENT" | "CERT_GENERATED" | "MEAL_CLAIMED" | "ATTENDANCE_CHECKIN";
  studentId: string;
  studentName: string;
  details: string;
  timestamp: number;
  status: "SUCCESS" | "FAILED";
}

export class CampusClubDatabase extends Dexie {
  public templates!: Table<StoredTemplate, string>;
  public roomGrids!: Table<StoredRoomGrid, string>;
  public rosters!: Table<StoredRoster, string>;
  public auditLogs!: Table<StoredAuditLog, number>;

  constructor() {
    super("CampusClubDB");
    this.version(1).stores({
      templates: "id, name, updatedAt",
      roomGrids: "id, name, updatedAt",
      rosters: "id, name, updatedAt",
      auditLogs: "++id, eventType, studentId, timestamp, status",
    });
  }
}

export const db = new CampusClubDatabase();
