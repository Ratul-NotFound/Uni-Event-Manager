import { describe, it, expect } from "vitest";
import { CertificateTemplate, TextElement } from "../src/core/domain/certificate-element";
import { StudentRecord } from "../src/core/domain/roster";
import { BulkGeneratorEngine } from "../src/core/engines/bulk-generator";

describe("BulkGeneratorEngine", () => {
  const template = new CertificateTemplate("Test Award", 800, 600);
  template.addElement(
    new TextElement({
      id: "t1",
      x: 400,
      y: 300,
      text: "{{Name}}",
      fontSize: 28,
    })
  );

  const students: StudentRecord[] = [
    { id: "S1", name: "Alice Wonderland", email: "alice@test.com" },
    { id: "S2", name: "Bob Builder", email: "bob@test.com" },
    { id: "S3", name: "Charlie Chocolate", email: "charlie@test.com" },
  ];

  it("should estimate file sizes and processing batches", () => {
    const batches = BulkGeneratorEngine.chunkRecords(students, 2);
    expect(batches.length).toBe(2);
    expect(batches[0].length).toBe(2);
    expect(batches[1].length).toBe(1);
  });

  it("should generate valid filenames based on naming pattern", () => {
    const filename = BulkGeneratorEngine.formatFilename(
      "Cert_{{ID}}_{{Name}}",
      students[0]
    );
    expect(filename).toBe("Cert_S1_Alice_Wonderland");
  });
});
