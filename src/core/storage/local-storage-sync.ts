/**
 * Local Storage & Database Synchronization Service
 * 
 * Provides robust, offline-first client-side persistence for:
 * 1. Attendee Roster Records (StudentRecord[])
 * 2. Dynamic Spreadsheet Headers (string[])
 * 3. ID Card Studio Custom Templates (IdCardTemplate)
 * 4. Certificate Studio Custom Templates
 * 5. IndexedDB (Dexie) Long-Term Mirroring
 */

import { StudentRecord } from "../domain/roster";
import { IdCardTemplate, IdCardElement, IdCardTextElement, IdCardPhotoElement, IdCardBarcodeQrElement, IdCardImageElement, IdCardShapeElement } from "../domain/id-card-element";
import { db } from "./db";

export const STORAGE_KEYS = {
  ROSTER_STUDENTS: "campusclub_roster_students",
  ROSTER_HEADERS: "campusclub_roster_headers",
  IDCARD_TEMPLATE: "campusclub_idcard_template",
  CERT_TEMPLATE: "campusclub_cert_template",
  LAST_ROSTER_UPLOAD_NAME: "campusclub_last_roster_name",
  SEAT_PLAN_CONFIG: "campusclub_seat_plan_config",
} as const;

export class LocalStorageSyncService {
  /**
   * Safe check for window/localStorage availability in SSR / Node
   */
  private static isBrowser(): boolean {
    return (
      (typeof window !== "undefined" && typeof window.localStorage !== "undefined") ||
      (typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined")
    );
  }

  // =========================================================================
  // 1. ROSTER & ATTENDEE SYNC
  // =========================================================================

  /**
   * Load attendee records from localStorage
   */
  public static loadStudents(): StudentRecord[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROSTER_STUDENTS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed as StudentRecord[];
      }
      return [];
    } catch (e) {
      console.warn("Failed to load students from localStorage:", e);
      return [];
    }
  }

  /**
   * Save attendee records to localStorage & mirror to IndexedDB
   */
  public static saveStudents(students: StudentRecord[], rosterName?: string): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ROSTER_STUDENTS, JSON.stringify(students));
      if (rosterName) {
        localStorage.setItem(STORAGE_KEYS.LAST_ROSTER_UPLOAD_NAME, rosterName);
      }
      // Mirror asynchronously to IndexedDB for safety
      this.mirrorRosterToDexie(students, rosterName || "Active Event Roster");
    } catch (e) {
      console.warn("Failed to save students to localStorage:", e);
    }
  }

  /**
   * Load spreadsheet column headers
   */
  public static loadHeaders(): string[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROSTER_HEADERS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((h): h is string => typeof h === "string" && h.trim().length > 0);
      }
      return [];
    } catch (e) {
      console.warn("Failed to load headers from localStorage:", e);
      return [];
    }
  }

  /**
   * Save spreadsheet column headers
   */
  public static saveHeaders(headers: string[]): void {
    if (!this.isBrowser()) return;
    try {
      const clean = Array.from(new Set(headers.map((h) => h.trim()).filter(Boolean)));
      localStorage.setItem(STORAGE_KEYS.ROSTER_HEADERS, JSON.stringify(clean));
    } catch (e) {
      console.warn("Failed to save headers to localStorage:", e);
    }
  }

  /**
   * Load last uploaded roster filename
   */
  public static loadLastRosterName(): string | null {
    if (!this.isBrowser()) return null;
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_ROSTER_UPLOAD_NAME);
    } catch {
      return null;
    }
  }

  /**
   * Clears saved roster from localStorage and IndexedDB
   */
  public static clearRoster(): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(STORAGE_KEYS.ROSTER_STUDENTS);
      localStorage.removeItem(STORAGE_KEYS.ROSTER_HEADERS);
      localStorage.removeItem(STORAGE_KEYS.LAST_ROSTER_UPLOAD_NAME);
      db.rosters.delete("active-event-roster").catch(() => {});
    } catch (e) {
      console.warn("Failed to clear roster from localStorage:", e);
    }
  }

  // =========================================================================
  // 2. ID CARD TEMPLATE SYNC
  // =========================================================================

  /**
   * Rehydrates an IdCardElement instance from raw JSON
   */
  public static rehydrateIdCardElement(json: Record<string, any>): IdCardElement | null {
    if (!json || !json.type) return null;
    try {
      if (json.type === "text") return new IdCardTextElement(json as any);
      if (json.type === "photo") return new IdCardPhotoElement(json as any);
      if (json.type === "barcode_qr") return new IdCardBarcodeQrElement(json as any);
      if (json.type === "image") return new IdCardImageElement(json as any);
      if (json.type === "shape") return new IdCardShapeElement(json as any);
      return null;
    } catch (e) {
      console.warn("Failed to rehydrate ID card element:", e);
      return null;
    }
  }

  /**
   * Loads custom ID Card Template from localStorage
   */
  public static loadIdCardTemplate(): IdCardTemplate | null {
    if (!this.isBrowser()) return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IDCARD_TEMPLATE);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (!parsed || !parsed.dimensions) return null;

      const frontElements: IdCardElement[] = (parsed.frontElements || [])
        .map((el: any) => this.rehydrateIdCardElement(el))
        .filter((el: any): el is IdCardElement => el !== null);

      const backElements: IdCardElement[] = (parsed.backElements || [])
        .map((el: any) => this.rehydrateIdCardElement(el))
        .filter((el: any): el is IdCardElement => el !== null);

      return {
        ...parsed,
        frontElements,
        backElements,
      };
    } catch (e) {
      console.warn("Failed to load ID card template from localStorage:", e);
      return null;
    }
  }

  /**
   * Saves custom ID Card Template to localStorage
   */
  public static saveIdCardTemplate(template: IdCardTemplate): void {
    if (!this.isBrowser()) return;
    try {
      const serialized = {
        ...template,
        frontElements: template.frontElements.map((el) => (el.toJSON ? el.toJSON() : el)),
        backElements: template.backElements.map((el) => (el.toJSON ? el.toJSON() : el)),
      };
      localStorage.setItem(STORAGE_KEYS.IDCARD_TEMPLATE, JSON.stringify(serialized));
    } catch (e) {
      console.warn("Failed to save ID card template to localStorage:", e);
    }
  }

  // =========================================================================
  // 3. CERTIFICATE TEMPLATE SYNC
  // =========================================================================

  /**
   * Loads certificate template JSON from localStorage
   */
  public static loadCertTemplateJSON(): Record<string, any> | null {
    if (!this.isBrowser()) return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CERT_TEMPLATE);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.warn("Failed to load cert template from localStorage:", e);
      return null;
    }
  }

  /**
   * Saves certificate template JSON to localStorage
   */
  public static saveCertTemplateJSON(templateJson: Record<string, any>): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CERT_TEMPLATE, JSON.stringify(templateJson));
    } catch (e) {
      console.warn("Failed to save cert template to localStorage:", e);
    }
  }

  // =========================================================================
  // 4. INDEXEDDB (DEXIE) MIRROR
  // =========================================================================

  /**
   * Mirrors attendee roster to IndexedDB for high-volume safe storage
   */
  private static async mirrorRosterToDexie(students: StudentRecord[], name: string): Promise<void> {
    try {
      await db.rosters.put({
        id: "active-event-roster",
        name,
        recordsJson: JSON.stringify(students),
        count: students.length,
        updatedAt: Date.now(),
      });
    } catch (e) {
      // IndexedDB might fail in private browsing mode, gracefully ignored
    }
  }

  /**
   * Attempts to restore from IndexedDB if localStorage was cleared
   */
  public static async restoreFromDexie(): Promise<StudentRecord[] | null> {
    try {
      const stored = await db.rosters.get("active-event-roster");
      if (stored && stored.recordsJson) {
        const parsed = JSON.parse(stored.recordsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as StudentRecord[];
        }
      }
    } catch (e) {
      console.warn("Failed to restore from IndexedDB:", e);
    }
    return null;
  }
}
