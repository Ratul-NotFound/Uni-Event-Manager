import { describe, it, expect } from "vitest";
import {
  CARD_DIMENSION_PRESETS,
  IdCardTextElement,
  IdCardPhotoElement,
  IdCardBarcodeQrElement,
  createDefaultIdCardTemplate,
  resolveIdCardText,
} from "../src/core/domain/id-card-element";
import { StudentRecord } from "../src/core/domain/roster";

describe("ID Card Domain Models & Dimensions", () => {
  it("defines standard card dimension presets with accurate aspect ratios", () => {
    const cr80Portrait = CARD_DIMENSION_PRESETS.cr80_portrait;
    expect(cr80Portrait).toBeDefined();
    expect(cr80Portrait.widthMm).toBe(54);
    expect(cr80Portrait.heightMm).toBe(85.6);
    expect(cr80Portrait.aspectRatio).toBeCloseTo(54 / 85.6, 2);
    expect(cr80Portrait.canvasWidth).toBe(638);
    expect(cr80Portrait.canvasHeight).toBe(1012);

    const cr80Landscape = CARD_DIMENSION_PRESETS.cr80_landscape;
    expect(cr80Landscape).toBeDefined();
    expect(cr80Landscape.widthMm).toBe(85.6);
    expect(cr80Landscape.heightMm).toBe(54);
    expect(cr80Landscape.aspectRatio).toBeCloseTo(85.6 / 54, 2);
    expect(cr80Landscape.canvasWidth).toBe(1012);
    expect(cr80Landscape.canvasHeight).toBe(638);
  });

  it("creates default ID card template with front and back elements", () => {
    const template = createDefaultIdCardTemplate();
    expect(template).toBeDefined();
    expect(template.sidedness).toBe("dual");
    expect(template.dimensions.presetName).toBe("cr80_portrait");
    expect(template.frontElements.length).toBeGreaterThan(0);
    expect(template.backElements.length).toBeGreaterThan(0);

    const photoEl = template.frontElements.find((el) => el.type === "photo");
    expect(photoEl).toBeDefined();
    expect((photoEl as IdCardPhotoElement).shape).toBe("rounded");

    const qrEl = template.frontElements.find((el) => el.type === "barcode_qr");
    expect(qrEl).toBeDefined();
  });

  it("resolves dynamic student mustache tags correctly", () => {
    const student: StudentRecord = {
      id: "CSE-1024",
      name: "Alexandria Morgan",
      email: "alex@university.edu",
      department: "Computer Science",
      batch: "2026",
      section: "A",
      assignedSeat: "A-12",
      extra: {
        team: "Alpha Hackers",
        university: "Apex University",
        bloodGroup: "O+",
      },
    };

    const text = "{{Name}} - {{ID}} ({{Department}}, Batch {{Batch}})";
    const resolved = resolveIdCardText(text, student);
    expect(resolved).toBe("Alexandria Morgan - CSE-1024 (Computer Science, Batch 2026)");

    const customText = "Team: {{Team}} | Univ: {{University}} | Blood: {{Blood_Group}}";
    const resolvedCustom = resolveIdCardText(customText, student);
    expect(resolvedCustom).toBe("Team: Alpha Hackers | Univ: Apex University | Blood: O+");
  });

  it("handles missing or undefined dynamic tags by resolving to empty string", () => {
    const student: StudentRecord = {
      id: "CSE-1024",
      name: "Alexandria Morgan",
      email: "alex@university.edu",
    };

    const text = "Member: {{Name}} | Dept: {{Department}} | Team: {{NonExistentField}}";
    const resolved = resolveIdCardText(text, student);
    expect(resolved).toBe("Member: Alexandria Morgan | Dept:  | Team: ");
    expect(resolved).not.toContain("undefined");
    expect(resolved).not.toContain("{{NonExistentField}}");
  });

  it("resolves dynamic Excel column headers with spaces and special characters", () => {
    const student: StudentRecord = {
      id: "CSE-1024",
      name: "Alexandria Morgan",
      email: "alex@university.edu",
      "Student Name": "Alexandria Morgan",
      "Roll Number": "1024-CSE",
      "Course Teacher / Advisor": "Prof. Turing",
      "Project Title": "Autonomous AI Agent",
      extra: {
        "Blood Group": "B+",
        "Guardian Phone": "+8801700000000",
      },
    };

    const text = "{{Student Name}} [{{Roll Number}}] - Advisor: {{Course Teacher / Advisor}}, Project: {{Project Title}}, Blood: {{Blood Group}}";
    const resolved = resolveIdCardText(text, student);
    expect(resolved).toBe("Alexandria Morgan [1024-CSE] - Advisor: Prof. Turing, Project: Autonomous AI Agent, Blood: B+");
  });

  it("resolves common aliases with spaces like {{Student Name}} and {{Student ID}} from core student fields", () => {
    const student: StudentRecord = {
      id: "CSE-1024",
      name: "Alexandria Morgan",
      email: "alex@university.edu",
      department: "CSE",
      batch: "54",
    };

    const text = "{{Student Name}} | {{Student ID}} | {{Dept}} | {{Intake}}";
    const resolved = resolveIdCardText(text, student);
    expect(resolved).toBe("Alexandria Morgan | CSE-1024 | CSE | 54");
  });

  it("resolves domain fields teamName, role, institution, bloodGroup, advisor in resolveIdCardText", () => {
    const student: StudentRecord = {
      id: "CSE-1024",
      name: "Alexandria Morgan",
      email: "alex@university.edu",
      department: "Computer Science",
      teamName: "ByteForce",
      role: "Lead Strategist",
      institution: "Dhaka University",
      bloodGroup: "A+",
      advisor: "Prof. Ada Lovelace",
    };

    const text = "{{Name}} ({{Role}}) - {{Team_Name}} | {{Institution}} | Blood: {{Blood_Group}} | Mentor: {{Advisor}}";
    const resolved = resolveIdCardText(text, student);
    expect(resolved).toBe("Alexandria Morgan (Lead Strategist) - ByteForce | Dhaka University | Blood: A+ | Mentor: Prof. Ada Lovelace");

    // Test selective variables - e.g. student card with only Name + ID
    const nameIdOnly = "{{Name}} - {{ID}}";
    expect(resolveIdCardText(nameIdOnly, student)).toBe("Alexandria Morgan - CSE-1024");

    // Test contest card with Name + ID + Team
    const nameIdTeam = "{{Name}} | {{ID}} | Team: {{Team}}";
    expect(resolveIdCardText(nameIdTeam, student)).toBe("Alexandria Morgan | CSE-1024 | Team: ByteForce");
  });
});
