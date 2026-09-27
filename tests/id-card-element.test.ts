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
});
