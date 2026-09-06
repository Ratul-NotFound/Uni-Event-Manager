import { describe, it, expect } from "vitest";
import {
  CertificateTemplate,
  TextElement,
  QrElement,
  CanvasElement,
} from "../src/core/domain/certificate-element";
import { StudentRecord } from "../src/core/domain/roster";

describe("Certificate Studio Canvas & Element Engine", () => {
  const sampleStudent: StudentRecord = {
    id: "CSE-1024",
    name: "Rahim Ahmed",
    email: "rahim@university.edu",
    department: "Computer Science",
    batch: "2026",
  };

  it("should interpolate variable tokens like {{Name}} correctly", () => {
    const textEl = new TextElement({
      id: "el-1",
      x: 100,
      y: 200,
      text: "This certifies that {{Name}} has successfully participated",
      fontSize: 24,
      fontFamily: "Inter",
      color: "#FFFFFF",
      align: "center",
    });

    const renderedText = textEl.resolveText(sampleStudent);
    expect(renderedText).toBe(
      "This certifies that Rahim Ahmed has successfully participated"
    );
  });

  it("should interpolate multiple tokens in one element", () => {
    const textEl = new TextElement({
      id: "el-2",
      x: 50,
      y: 50,
      text: "ID: {{Student_ID}} | Dept: {{Department}}",
      fontSize: 16,
    });

    const renderedText = textEl.resolveText(sampleStudent);
    expect(renderedText).toBe("ID: CSE-1024 | Dept: Computer Science");
  });

  it("should serialize and deserialize a CertificateTemplate correctly", () => {
    const template = new CertificateTemplate("Hackathon Winner 2026", 1920, 1080);
    template.addElement(
      new TextElement({
        id: "t1",
        x: 960,
        y: 400,
        text: "{{Name}}",
        fontSize: 48,
        color: "#6366F1",
      })
    );
    template.addElement(
      new QrElement({
        id: "qr1",
        x: 1700,
        y: 900,
        size: 120,
        payloadPattern: "https://verify.club/cert/{{Student_ID}}",
      })
    );

    const json = template.toJSON();
    const restored = CertificateTemplate.fromJSON(json);

    expect(restored.name).toBe("Hackathon Winner 2026");
    expect(restored.width).toBe(1920);
    expect(restored.height).toBe(1080);
    expect(restored.getElements().length).toBe(2);
    expect(restored.getElements()[0].type).toBe("text");
    expect(restored.getElements()[1].type).toBe("qr");
  });

  it("should support showDecorativeBorders and backgroundDim for Photoshop/Illustrator templates", () => {
    const tpl = new CertificateTemplate("Photoshop Template", 3508, 2480);
    tpl.showDecorativeBorders = false;
    tpl.backgroundDim = 0.25;

    const json = tpl.toJSON();
    expect(json.showDecorativeBorders).toBe(false);
    expect(json.backgroundDim).toBe(0.25);
    expect(json.width).toBe(3508);
    expect(json.height).toBe(2480);

    const restored = CertificateTemplate.fromJSON(json);
    expect(restored.showDecorativeBorders).toBe(false);
    expect(restored.backgroundDim).toBe(0.25);
  });

  it("should preserve advanced typography attributes on TextElement", () => {
    const textEl = new TextElement({
      id: "title-1",
      x: 500,
      y: 300,
      text: "CERTIFICATE OF ACHIEVEMENT",
      fontFamily: "Cinzel",
      fontSize: 54,
      letterSpacing: 6,
      shadowColor: "rgba(0,0,0,0.8)",
      shadowBlur: 10,
      shadowOffsetX: 2,
      shadowOffsetY: 4,
    });

    expect(textEl.fontFamily).toBe("Cinzel");
    expect(textEl.letterSpacing).toBe(6);
    expect(textEl.shadowColor).toBe("rgba(0,0,0,0.8)");
    expect(textEl.shadowBlur).toBe(10);
    expect(textEl.shadowOffsetX).toBe(2);
    expect(textEl.shadowOffsetY).toBe(4);
  });
});
