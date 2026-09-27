import { describe, it, expect } from "vitest";
import { IdCardEngine } from "../src/core/engines/id-card-engine";
import { StudentRecord } from "../src/core/domain/roster";

describe("ID Card Bulk Generation & Photo Engine", () => {
  it("normalizes photo filenames into clean matching keys", () => {
    expect(IdCardEngine.normalizePhotoId("CSE-1024.jpg")).toBe("cse1024");
    expect(IdCardEngine.normalizePhotoId("2026_001.PNG")).toBe("2026001");
    expect(IdCardEngine.normalizePhotoId("ID# 9901.jpeg")).toBe("9901");
    expect(IdCardEngine.normalizePhotoId("Alexandria Morgan.webp")).toBe("alexandriamorgan");
  });

  it("accurately matches extracted photo map to student records", () => {
    const photoMap = new Map<string, string>();
    photoMap.set("cse1024", "data:image/jpeg;base64,mockAlexPhoto");
    photoMap.set("2026001", "data:image/png;base64,mockRahimPhoto");

    const students: StudentRecord[] = [
      { id: "CSE-1024", name: "Alexandria Morgan", email: "alex@university.edu" },
      { id: "2026-001", name: "Rahim Ahmed", email: "rahim@university.edu" },
      { id: "BBA-5002", name: "Sara Khan", email: "sara@university.edu" },
    ];

    const matchResult = IdCardEngine.matchPhotosToStudents(photoMap, students);
    expect(matchResult.matchedCount).toBe(2);
    expect(matchResult.unmatchedCount).toBe(1);
    expect(matchResult.unmatchedIds).toEqual(["BBA-5002"]);
  });

  it("calculates accurate A4 tiling grid layout with cut margins", () => {
    // Standard CR-80 Portrait: 54mm width, 85.6mm height
    // A4 sheet is 210mm × 297mm
    // Max fits: 210 / 54 = 3 cols, 297 / 85.6 = 3 rows -> 9 cards or with comfortable margin 2 cols × 3 rows or 3 cols × 3 rows
    const tiling = IdCardEngine.calculateA4Tiling(54, 85.6);
    expect(tiling.cols).toBeGreaterThanOrEqual(2);
    expect(tiling.rows).toBeGreaterThanOrEqual(3);
    expect(tiling.cardsPerPage).toBe(tiling.cols * tiling.rows);
    expect(tiling.marginX).toBeGreaterThanOrEqual(0);
    expect(tiling.marginY).toBeGreaterThanOrEqual(0);
  });

  it("generates initials and theme color for fallback avatars", () => {
    const avatarInfo1 = IdCardEngine.getInitialsAvatarInfo("Alexandria Morgan", "Computer Science");
    expect(avatarInfo1.initials).toBe("AM");
    expect(avatarInfo1.bgColor).toBeDefined();

    const avatarInfo2 = IdCardEngine.getInitialsAvatarInfo("John", "Business");
    expect(avatarInfo2.initials).toBe("J");
    expect(avatarInfo2.bgColor).toBeDefined();
  });

  it("retrieves student photo by ID first, falling back to student Name", () => {
    const photoMap = new Map<string, string>();
    photoMap.set("cse1024", "data:image/jpeg;base64,photoById");
    photoMap.set("rahimahmed", "data:image/jpeg;base64,photoByName");

    const studentById: StudentRecord = { id: "CSE-1024", name: "Alex Morgan", email: "alex@edu" };
    const studentByName: StudentRecord = { id: "BBA-9999", name: "Rahim Ahmed", email: "rahim@edu" };
    const studentNoPhoto: StudentRecord = { id: "EEE-0001", name: "Unknown Person", email: "un@edu" };

    expect(IdCardEngine.getStudentPhoto(studentById, photoMap)).toBe("data:image/jpeg;base64,photoById");
    expect(IdCardEngine.getStudentPhoto(studentByName, photoMap)).toBe("data:image/jpeg;base64,photoByName");
    expect(IdCardEngine.getStudentPhoto(studentNoPhoto, photoMap)).toBeUndefined();
  });
});
