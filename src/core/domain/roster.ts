/**
 * Student Roster Domain Entity & Data Models
 */

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  batch?: string;
  section?: string;
  tshirtSize?: string;
  foodPreference?: string;
  paymentStatus?: "Paid" | "Pending" | "Unverified";
  paymentTxId?: string;
  assignedRoom?: string;
  assignedRow?: string;
  assignedSeat?: string;
  certificateIssued?: boolean;
  emailSent?: boolean;
  advisor?: string;
  supervisor?: string;
  extra?: Record<string, string>;
  [key: string]: any;
}

export interface SortCriterion {
  key: keyof StudentRecord | string;
  direction: "asc" | "desc";
}

export interface MentorAllocation {
  mentorName: string;
  students: StudentRecord[];
}

export interface TShirtMatrix {
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
  XXL: number;
  "3XL": number;
  Other: number;
  Total: number;
  byDepartment: Record<string, Record<string, number>>;
}

export class StudentRoster {
  private records: StudentRecord[];
  private columnHeaders: string[];

  constructor(initialRecords: StudentRecord[] = [], initialHeaders: string[] = []) {
    this.records = [...initialRecords];
    this.columnHeaders = initialHeaders.length > 0 
      ? [...initialHeaders]
      : ["Student ID", "Full Name", "Email Address", "Department", "Batch", "Section", "T-Shirt Size", "Meal Preference", "Payment Status"];
  }

  public getRecords(): StudentRecord[] {
    return [...this.records];
  }

  public setRecords(records: StudentRecord[]): void {
    this.records = [...records];
  }

  public getColumnHeaders(): string[] {
    return [...this.columnHeaders];
  }

  public setColumnHeaders(headers: string[]): void {
    this.columnHeaders = [...headers];
  }

  public addColumn(headerName: string, defaultValue: string = ""): void {
    const trimmed = headerName.trim();
    if (!trimmed || this.columnHeaders.includes(trimmed)) return;
    this.columnHeaders.push(trimmed);
    this.records = this.records.map((r) => ({
      ...r,
      [trimmed]: defaultValue,
    }));
  }

  public removeColumn(headerName: string): void {
    this.columnHeaders = this.columnHeaders.filter((h) => h !== headerName);
    this.records = this.records.map((r) => {
      const copy = { ...r };
      delete copy[headerName];
      return copy;
    });
  }

  public renameColumn(oldName: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    this.columnHeaders = this.columnHeaders.map((h) => (h === oldName ? trimmed : h));
    this.records = this.records.map((r) => {
      const copy = { ...r };
      if (copy[oldName] !== undefined) {
        copy[trimmed] = copy[oldName];
        delete copy[oldName];
      }
      return copy;
    });
  }

  public count(): number {
    return this.records.length;
  }

  public addRecord(record: StudentRecord): void {
    this.records.push(record);
  }

  public updateRecord(id: string, updates: Partial<StudentRecord>): boolean {
    const index = this.records.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.records[index] = { ...this.records[index], ...updates };
      return true;
    }
    return false;
  }

  public removeRecord(id: string): boolean {
    const initialLength = this.records.length;
    this.records = this.records.filter((r) => r.id !== id);
    return this.records.length < initialLength;
  }
}
