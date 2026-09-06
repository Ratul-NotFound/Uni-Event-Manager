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

  it("should parse custom row ranges like '20-30, 40-50, 65' into 0-indexed numbers", () => {
    const totalRecords = 100;
    const indices = BulkGeneratorEngine.parseRowRange("20-30, 40-50, 65", totalRecords);
    
    // 20-30 is 11 records (index 19 to 29)
    // 40-50 is 11 records (index 39 to 49)
    // 65 is 1 record (index 64)
    expect(indices.length).toBe(23);
    expect(indices[0]).toBe(19); // 20th record is index 19
    expect(indices[10]).toBe(29); // 30th record is index 29
    expect(indices[11]).toBe(39); // 40th record is index 39
    expect(indices[21]).toBe(49); // 50th record is index 49
    expect(indices[22]).toBe(64); // 65th record is index 64
  });

  it("should return all rows if range string is empty", () => {
    const all = BulkGeneratorEngine.parseRowRange("", 50);
    expect(all.length).toBe(50);
    expect(all[0]).toBe(0);
    expect(all[49]).toBe(49);
  });
});
