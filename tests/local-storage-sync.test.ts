import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalStorageSyncService, STORAGE_KEYS } from "../src/core/storage/local-storage-sync";
import { StudentRecord } from "../src/core/domain/roster";
import { createDefaultIdCardTemplate } from "../src/core/domain/id-card-element";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("LocalStorageSyncService", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("should save and load student records safely", () => {
    const sampleStudents: StudentRecord[] = [
      {
        id: "STU-001",
        name: "Alice Smith",
        email: "alice@example.com",
        department: "Computer Science",
        batch: "2026",
      },
      {
        id: "STU-002",
        name: "Bob Jones",
        email: "bob@example.com",
        department: "Electrical Engineering",
        batch: "2025",
      },
    ];

    LocalStorageSyncService.saveStudents(sampleStudents, "Spring2026.xlsx");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.ROSTER_STUDENTS,
      expect.any(String)
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.LAST_ROSTER_UPLOAD_NAME,
      "Spring2026.xlsx"
    );

    const loaded = LocalStorageSyncService.loadStudents();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].name).toBe("Alice Smith");
    expect(loaded[1].id).toBe("STU-002");

    const rosterName = LocalStorageSyncService.loadLastRosterName();
    expect(rosterName).toBe("Spring2026.xlsx");
  });

  it("should save, deduplicate, and load column headers", () => {
    const headers = ["Student ID", "Full Name", "Email Address", "Team Name", "  Full Name  ", ""];
    LocalStorageSyncService.saveHeaders(headers);

    const loaded = LocalStorageSyncService.loadHeaders();
    expect(loaded).toContain("Student ID");
    expect(loaded).toContain("Full Name");
    expect(loaded).toContain("Team Name");
    // Should be trimmed and deduplicated
    expect(loaded.filter((h) => h === "Full Name")).toHaveLength(1);
    expect(loaded).not.toContain("");
  });

  it("should save and rehydrate custom ID card templates with element classes", () => {
    const tpl = createDefaultIdCardTemplate();
    tpl.name = "My Custom Lanyard";

    LocalStorageSyncService.saveIdCardTemplate(tpl);
    const restored = LocalStorageSyncService.loadIdCardTemplate();

    expect(restored).not.toBeNull();
    expect(restored?.name).toBe("My Custom Lanyard");
    expect(restored?.frontElements.length).toBe(tpl.frontElements.length);
    // Check that methods and properties survived
    const textEl = restored?.frontElements.find((el) => el.type === "text");
    expect(textEl).toBeDefined();
    expect(typeof textEl?.toJSON).toBe("function");
  });

  it("should gracefully clear roster from storage", () => {
    LocalStorageSyncService.saveStudents([{ id: "1", name: "Test", email: "t@e.com" }]);
    LocalStorageSyncService.saveHeaders(["Col1"]);

    expect(LocalStorageSyncService.loadStudents()).toHaveLength(1);

    LocalStorageSyncService.clearRoster();
    expect(LocalStorageSyncService.loadStudents()).toHaveLength(0);
    expect(LocalStorageSyncService.loadHeaders()).toHaveLength(0);
    expect(LocalStorageSyncService.loadLastRosterName()).toBeNull();
  });
});
