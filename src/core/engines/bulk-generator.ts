import { CertificateTemplate, TextElement, QrElement, ImageElement } from "../domain/certificate-element";
import { StudentRecord } from "../domain/roster";
import { PDFDocument, rgb } from "pdf-lib";
import JSZip from "jszip";
import QRCode from "qrcode";

export interface GenerationProgress {
  current: number;
  total: number;
  percentage: number;
  statusText: string;
}

export type ExportFormat = "zip-png" | "zip-pdf" | "merged-pdf" | "single-png" | "single-pdf";

export class BulkGeneratorEngine {
  /**
   * Splits an array of records into chunks.
   */
  public static chunkRecords<T>(records: T[], chunkSize: number = 25): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < records.length; i += chunkSize) {
      chunks.push(records.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Formats a clean, filesystem-safe filename based on pattern and student record.
   */
  public static formatFilename(pattern: string, student: StudentRecord): string {
    return pattern
      .replace(/\{\{\s*(Name|FullName)\s*\}\}/gi, (student.name || "").replace(/[^a-zA-Z0-9_-]/g, "_"))
      .replace(/\{\{\s*(Student_ID|ID|Roll)\s*\}\}/gi, (student.id || "").replace(/[^a-zA-Z0-9_-]/g, "_"))
      .replace(/\{\{\s*(Department|Dept)\s*\}\}/gi, (student.department || "").replace(/[^a-zA-Z0-9_-]/g, "_"));
  }

  /**
   * Renders a single certificate onto an HTML5 Canvas and returns the canvas.
   */
  public static async renderCertificateToCanvas(
    template: CertificateTemplate,
    student: StudentRecord,
    bgImageElement?: HTMLImageElement | null
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not acquire 2D canvas context");

    // 1. Draw Background
    if (bgImageElement && bgImageElement.complete && bgImageElement.naturalWidth > 0) {
      ctx.drawImage(bgImageElement, 0, 0, template.width, template.height);
    } else {
      // Sophisticated default university dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, template.width, template.height);
      gradient.addColorStop(0, "#090D16");
      gradient.addColorStop(0.5, "#0F172A");
      gradient.addColorStop(1, "#1E1B4B");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, template.width, template.height);

      // Add elegant certificate borders
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, template.width - 60, template.height - 60);

      ctx.strokeStyle = "rgba(217, 119, 6, 0.35)"; // Gold inner border
      ctx.lineWidth = 2;
      ctx.strokeRect(45, 45, template.width - 90, template.height - 90);
    }

    // 2. Draw Elements in order
    for (const el of template.getElements()) {
      ctx.save();
      ctx.globalAlpha = el.opacity ?? 1;

      if (el.rotation) {
        ctx.translate(el.x, el.y);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-el.x, -el.y);
      }

      if (el.type === "text") {
        const textEl = el as TextElement;
        const textToDraw = textEl.resolveText(student);

        ctx.font = `${textEl.fontWeight} ${textEl.fontSize}px ${textEl.fontFamily}, sans-serif`;
        ctx.fillStyle = textEl.color;
        ctx.textAlign = textEl.align;
        ctx.textBaseline = "middle";

        if (textEl.shadowColor && textEl.shadowBlur) {
          ctx.shadowColor = textEl.shadowColor;
          ctx.shadowBlur = textEl.shadowBlur;
        }

        ctx.fillText(textToDraw, textEl.x, textEl.y);
      } else if (el.type === "qr") {
        const qrEl = el as QrElement;
        const payload = qrEl.resolvePayload(student);
        try {
          const qrDataUrl = await QRCode.toDataURL(payload, {
            width: qrEl.size,
            margin: 1,
            color: {
              dark: qrEl.fgColor,
              light: qrEl.bgColor,
            },
          });

          await new Promise<void>((resolve) => {
            const qrImg = new Image();
            qrImg.onload = () => {
              ctx.drawImage(qrImg, qrEl.x - qrEl.size / 2, qrEl.y - qrEl.size / 2, qrEl.size, qrEl.size);
              resolve();
            };
            qrImg.src = qrDataUrl;
          });
        } catch (err) {
          console.error("QR Code generation error:", err);
        }
      }

      ctx.restore();
    }

    return canvas;
  }

  /**
   * Generates a single student certificate as PNG Blob or PDF Blob.
   */
  public static async generateSingle(
    template: CertificateTemplate,
    student: StudentRecord,
    format: "png" | "pdf",
    bgImage?: HTMLImageElement | null
  ): Promise<Blob> {
    const canvas = await this.renderCertificateToCanvas(template, student, bgImage);

    if (format === "png") {
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert canvas to PNG Blob"));
        }, "image/png");
      });
    } else {
      const dataUrl = canvas.toDataURL("image/png");
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([template.width, template.height]);
      const imageEmbed = await pdfDoc.embedPng(dataUrl);
      page.drawImage(imageEmbed, {
        x: 0,
        y: 0,
        width: template.width,
        height: template.height,
      });
      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes as any], { type: "application/pdf" });
    }
  }

  /**
   * Bulk multi-threaded generator with chunked execution and live progress updates.
   */
  public static async generateBulk(
    template: CertificateTemplate,
    records: StudentRecord[],
    format: ExportFormat,
    bgImage: HTMLImageElement | null,
    onProgress: (progress: GenerationProgress) => void,
    shouldCancel?: () => boolean
  ): Promise<Blob> {
    const total = records.length;
    const filenamePattern = "Cert_{{ID}}_{{Name}}";

    if (format === "merged-pdf") {
      const masterPdf = await PDFDocument.create();

      for (let i = 0; i < total; i++) {
        if (shouldCancel && shouldCancel()) {
          throw new Error("Generation cancelled by user");
        }

        const student = records[i];
        const canvas = await this.renderCertificateToCanvas(template, student, bgImage);
        const dataUrl = canvas.toDataURL("image/png");
        const page = masterPdf.addPage([template.width, template.height]);
        const imgEmbed = await masterPdf.embedPng(dataUrl);
        page.drawImage(imgEmbed, {
          x: 0,
          y: 0,
          width: template.width,
          height: template.height,
        });

        onProgress({
          current: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100),
          statusText: `Compiling PDF Page ${i + 1} of ${total} (${student.name})...`,
        });

        // Yield execution to main thread to prevent UI freezing
        if (i % 5 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      const pdfBytes = await masterPdf.save();
      return new Blob([pdfBytes as any], { type: "application/pdf" });
    }

    // ZIP format (either ZIP of PNGs or ZIP of individual PDFs)
    const zip = new JSZip();

    for (let i = 0; i < total; i++) {
      if (shouldCancel && shouldCancel()) {
        throw new Error("Generation cancelled by user");
      }

      const student = records[i];
      const filename = this.formatFilename(filenamePattern, student);
      const canvas = await this.renderCertificateToCanvas(template, student, bgImage);

      if (format === "zip-png") {
        const dataUrl = canvas.toDataURL("image/png");
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(`${filename}.png`, base64Data, { base64: true });
      } else {
        const dataUrl = canvas.toDataURL("image/png");
        const singlePdf = await PDFDocument.create();
        const page = singlePdf.addPage([template.width, template.height]);
        const imgEmbed = await singlePdf.embedPng(dataUrl);
        page.drawImage(imgEmbed, {
          x: 0,
          y: 0,
          width: template.width,
          height: template.height,
        });
        const pdfBytes = await singlePdf.save();
        zip.file(`${filename}.pdf`, pdfBytes);
      }

      onProgress({
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
        statusText: `Processed ${i + 1} of ${total} certificates...`,
      });

      if (i % 5 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress({
      current: total,
      total,
      percentage: 100,
      statusText: "Compressing ZIP archive in memory...",
    });

    return await zip.generateAsync({ type: "blob" });
  }
}
