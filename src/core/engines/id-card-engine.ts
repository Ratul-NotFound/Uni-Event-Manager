import {
  IdCardTemplate,
  IdCardElement,
  IdCardTextElement,
  IdCardPhotoElement,
  IdCardBarcodeQrElement,
  IdCardImageElement,
  IdCardShapeElement,
  resolveIdCardText,
} from "../domain/id-card-element";
import { StudentRecord } from "../domain/roster";
import { PDFDocument, rgb } from "pdf-lib";
import JSZip from "jszip";
import QRCode from "qrcode";
import saveAs from "file-saver";

export interface IdCardGenerationProgress {
  current: number;
  total: number;
  percentage: number;
  statusText: string;
}

export interface PhotoMatchResult {
  matchedCount: number;
  unmatchedCount: number;
  unmatchedIds: string[];
}

export interface A4TilingLayout {
  cols: number;
  rows: number;
  cardsPerPage: number;
  cardWidthMm: number;
  cardHeightMm: number;
  marginX: number;
  marginY: number;
  gapX: number;
  gapY: number;
}

export class IdCardEngine {
  private static imageCache = new Map<string, HTMLImageElement>();
  private static qrCache = new Map<string, HTMLImageElement>();

  /**
   * Clears the in-memory image and QR caches.
   */
  public static clearCache(): void {
    IdCardEngine.imageCache.clear();
    IdCardEngine.qrCache.clear();
  }

  /**
   * Normalizes a filename or student ID into a sanitized key for matching.
   * Example: "CSE-1024.jpg" -> "cse1024", "ID# 2026_001.png" -> "2026001"
   */
  public static normalizePhotoId(filename: string): string {
    if (!filename) return "";
    // Remove file extension
    const base = filename.replace(/\.[^/.]+$/, "");
    // Remove "id#", "id_", "id-" prefixes
    const withoutPrefix = base.replace(/^id[#_\s-]*/i, "");
    // Strip all non-alphanumeric characters and lowercase
    return withoutPrefix.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  }

  /**
   * Extracts photos from a user-uploaded ZIP archive client-side.
   */
  public static async extractPhotosFromZip(
    zipBuffer: ArrayBuffer | Blob
  ): Promise<{ photoMap: Map<string, string>; totalPhotos: number }> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipBuffer);
    const photoMap = new Map<string, string>();
    let totalPhotos = 0;

    const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".svg"];

    for (const [relativePath, fileEntry] of Object.entries(loadedZip.files)) {
      if (fileEntry.dir) continue;
      const lower = relativePath.toLowerCase();
      const hasValidExt = validExtensions.some((ext) => lower.endsWith(ext));
      if (!hasValidExt) continue;

      const filename = relativePath.split("/").pop() || relativePath;
      const normalizedKey = IdCardEngine.normalizePhotoId(filename);

      if (normalizedKey) {
        const base64 = await fileEntry.async("base64");
        let mime = "image/jpeg";
        if (lower.endsWith(".png")) mime = "image/png";
        else if (lower.endsWith(".webp")) mime = "image/webp";
        else if (lower.endsWith(".svg")) mime = "image/svg+xml";

        photoMap.set(normalizedKey, `data:${mime};base64,${base64}`);
        totalPhotos++;
      }
    }

    return { photoMap, totalPhotos };
  }

  /**
   * Matches in-memory photos to student records and provides statistics.
   */
  public static matchPhotosToStudents(
    photoMap: Map<string, string>,
    students: StudentRecord[]
  ): PhotoMatchResult {
    let matchedCount = 0;
    const unmatchedIds: string[] = [];

    for (const s of students) {
      const idKey = IdCardEngine.normalizePhotoId(s.id);
      const nameKey = IdCardEngine.normalizePhotoId(s.name);

      if (photoMap.has(idKey) || (nameKey && photoMap.has(nameKey))) {
        matchedCount++;
      } else {
        unmatchedIds.push(s.id);
      }
    }

    return {
      matchedCount,
      unmatchedCount: students.length - matchedCount,
      unmatchedIds,
    };
  }

  /**
   * Retrieves the student photo from the photo map.
   * Checks student ID first, then falls back to student Name.
   */
  public static getStudentPhoto(
    student: StudentRecord,
    photoMap: Map<string, string>
  ): string | undefined {
    if (!student || !photoMap || photoMap.size === 0) return undefined;
    const idKey = IdCardEngine.normalizePhotoId(student.id);
    if (photoMap.has(idKey)) return photoMap.get(idKey);
    const nameKey = IdCardEngine.normalizePhotoId(student.name);
    if (nameKey && photoMap.has(nameKey)) return photoMap.get(nameKey);
    return undefined;
  }

  /**
   * Generates initials and a deterministic theme color for monogram avatars.
   */
  public static getInitialsAvatarInfo(
    name: string,
    department?: string
  ): { initials: string; bgColor: string; fgColor: string } {
    const trimmed = (name || "").trim();
    let initials = "ID";
    if (trimmed) {
      const parts = trimmed.split(/\s+/).filter(Boolean);
      if (parts.length === 1) {
        initials = parts[0].slice(0, 1).toUpperCase();
      } else if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
    }

    // Deterministic palette
    const colors = [
      "#2563EB", // Blue
      "#7C3AED", // Violet
      "#059669", // Emerald
      "#D97706", // Amber
      "#E11D48", // Rose
      "#0891B2", // Cyan
      "#4F46E5", // Indigo
    ];

    let hash = 0;
    const str = (department || "") + (name || "");
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;

    return {
      initials,
      bgColor: colors[colorIndex],
      fgColor: "#FFFFFF",
    };
  }

  /**
   * Calculates A4 Multi-Up grid parameters with margins and cut guides.
   * Standard A4 dimensions: 210 mm × 297 mm
   */
  public static calculateA4Tiling(
    cardWidthMm: number,
    cardHeightMm: number
  ): A4TilingLayout {
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const gapMm = 3; // 3mm cutting gap
    const minMarginMm = 8;

    const availableWidth = pageWidthMm - minMarginMm * 2;
    const availableHeight = pageHeightMm - minMarginMm * 2;

    const cols = Math.max(1, Math.floor((availableWidth + gapMm) / (cardWidthMm + gapMm)));
    const rows = Math.max(1, Math.floor((availableHeight + gapMm) / (cardHeightMm + gapMm)));

    const usedWidth = cols * cardWidthMm + (cols - 1) * gapMm;
    const usedHeight = rows * cardHeightMm + (rows - 1) * gapMm;

    const marginX = (pageWidthMm - usedWidth) / 2;
    const marginY = (pageHeightMm - usedHeight) / 2;

    return {
      cols,
      rows,
      cardsPerPage: cols * rows,
      cardWidthMm,
      cardHeightMm,
      marginX,
      marginY,
      gapX: gapMm,
      gapY: gapMm,
    };
  }

  /**
   * Renders a 1D barcode on an HTML5 Canvas.
   */
  public static drawBarcode(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fgColor: string = "#0F172A",
    bgColor: string = "#FFFFFF",
    showLabel: boolean = true
  ): void {
    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    const barAreaHeight = showLabel ? height * 0.72 : height;
    ctx.fillStyle = fgColor;

    // Generate pseudo-code128 stripe pattern from hash/characters of text
    const pattern: number[] = [];
    pattern.push(2, 1, 1, 2); // Start guard
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      pattern.push((code % 3) + 1, ((code >> 2) % 3) + 1, ((code >> 4) % 2) + 1, 1);
    }
    pattern.push(2, 1, 1, 2, 2); // End guard

    const totalUnits = pattern.reduce((acc, val) => acc + val, 0);
    const unitWidth = Math.max(1, (width - 16) / totalUnits);
    let curX = x + 8;

    for (let i = 0; i < pattern.length; i++) {
      const w = pattern[i] * unitWidth;
      if (i % 2 === 0) {
        ctx.fillRect(curX, y + 4, w, barAreaHeight - 4);
      }
      curX += w;
    }

    if (showLabel) {
      ctx.fillStyle = fgColor;
      ctx.font = `bold ${Math.max(9, Math.floor(height * 0.2))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(text, x + width / 2, y + height - 2);
    }
  }

  /**
   * Renders a single card face onto an HTML5 Canvas at 300 DPI.
   */
  public static async renderFaceToCanvas(
    template: IdCardTemplate,
    face: "front" | "back",
    student: StudentRecord,
    photoDataUrl?: string,
    customBgImage?: HTMLImageElement | null
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = template.dimensions.canvasWidth;
    canvas.height = template.dimensions.canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not acquire 2D canvas context");

    const w = canvas.width;
    const h = canvas.height;
    const isFront = face === "front";
    const elements = isFront ? template.frontElements : template.backElements;
    const bgKey = isFront ? template.frontBackground : template.backBackground;

    // 1. Draw Background
    if (customBgImage && customBgImage.complete && customBgImage.naturalWidth > 0) {
      ctx.drawImage(customBgImage, 0, 0, w, h);
    } else if (bgKey && (bgKey.startsWith("data:") || bgKey.startsWith("http") || bgKey.startsWith("/"))) {
      try {
        const bgImg = await IdCardEngine.loadImage(bgKey);
        ctx.drawImage(bgImg, 0, 0, w, h);
      } catch (err) {
        console.warn("Could not draw uploaded background image:", err);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      // Draw theme gradient
      if (bgKey === "theme:dark-slate" || (!bgKey && isFront)) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#0F172A");
        grad.addColorStop(0.5, "#1E293B");
        grad.addColorStop(1, "#090D16");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else if (bgKey === "theme:clean-white" || (!bgKey && !isFront)) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
      } else if (bgKey === "theme:tech-blue") {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#1E3A8A");
        grad.addColorStop(1, "#0F172A");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
      }
    }

    // 2. Render Elements
    for (const el of elements) {
      ctx.save();
      const elX = (el.x / 100) * w;
      const elY = (el.y / 100) * h;
      const elW = (el.width / 100) * w;
      const elH = (el.height / 100) * h;

      if (el.opacity !== undefined && el.opacity < 1) {
        ctx.globalAlpha = el.opacity;
      }

      if (el.rotation) {
        ctx.translate(elX + elW / 2, elY + elH / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-(elX + elW / 2), -(elY + elH / 2));
      }

      if (el.type === "shape") {
        const shape = el as IdCardShapeElement;
        ctx.fillStyle = shape.fillColor;
        if (shape.strokeWidth && shape.strokeColor) {
          ctx.strokeStyle = shape.strokeColor;
          ctx.lineWidth = shape.strokeWidth;
        }

        if (shape.shapeType === "line") {
          ctx.beginPath();
          ctx.moveTo(elX, elY + elH / 2);
          ctx.lineTo(elX + elW, elY + elH / 2);
          ctx.strokeStyle = shape.fillColor;
          ctx.lineWidth = Math.max(1, elH);
          ctx.stroke();
        } else if (shape.shapeType === "pill") {
          const r = elH / 2;
          ctx.beginPath();
          ctx.roundRect(elX, elY, elW, elH, r);
          ctx.fill();
          if (shape.strokeWidth && shape.strokeColor) ctx.stroke();
        } else {
          // Rectangle or ribbon
          if (shape.borderRadius && shape.borderRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(elX, elY, elW, elH, shape.borderRadius);
            ctx.fill();
            if (shape.strokeWidth && shape.strokeColor) ctx.stroke();
          } else {
            ctx.fillRect(elX, elY, elW, elH);
            if (shape.strokeWidth && shape.strokeColor) ctx.strokeRect(elX, elY, elW, elH);
          }
        }
      } else if (el.type === "text") {
        const txt = el as IdCardTextElement;
        const resolved = resolveIdCardText(txt.text, student);

        let displayText = resolved;
        if (txt.textTransform === "uppercase") displayText = displayText.toUpperCase();
        else if (txt.textTransform === "lowercase") displayText = displayText.toLowerCase();
        else if (txt.textTransform === "capitalize") {
          displayText = displayText.replace(/\b\w/g, (c) => c.toUpperCase());
        }

        // Apply scale factor from preview font size to canvas resolution
        const scaleFactor = template.dimensions.canvasWidth / 360;
        const computedFontSize = Math.round((txt.fontSize || 16) * scaleFactor);

        ctx.font = `${txt.fontWeight || "bold"} ${computedFontSize}px ${txt.fontFamily || "Inter"}, sans-serif`;
        ctx.fillStyle = txt.color || "#0F172A";
        ctx.textAlign = txt.align || "center";
        ctx.textBaseline = "middle";

        if (txt.shadowColor && txt.shadowBlur) {
          ctx.shadowColor = txt.shadowColor;
          ctx.shadowBlur = txt.shadowBlur;
          ctx.shadowOffsetX = txt.shadowOffsetX || 0;
          ctx.shadowOffsetY = txt.shadowOffsetY || 0;
        }

        let anchorX = elX + elW / 2;
        if (txt.align === "left") anchorX = elX;
        else if (txt.align === "right") anchorX = elX + elW;

        // Multiline support
        const lines = displayText.split("\n");
        const lineSpacing = computedFontSize * (txt.lineHeight || 1.2);
        const startY = elY + elH / 2 - ((lines.length - 1) * lineSpacing) / 2;

        lines.forEach((line, i) => {
          ctx.fillText(line, anchorX, startY + i * lineSpacing);
        });
      } else if (el.type === "photo") {
        const photo = el as IdCardPhotoElement;

        // Clip and draw photo
        ctx.save();
        if (photo.hasShadow) {
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 4;
        }

        ctx.beginPath();
        if (photo.shape === "circle") {
          const r = Math.min(elW, elH) / 2;
          ctx.arc(elX + elW / 2, elY + elH / 2, r, 0, Math.PI * 2);
        } else if (photo.shape === "rounded") {
          ctx.roundRect(elX, elY, elW, elH, photo.borderRadius || 16);
        } else {
          ctx.rect(elX, elY, elW, elH);
        }
        ctx.clip();

        if (photoDataUrl) {
          try {
            const img = await IdCardEngine.loadImage(photoDataUrl);
            ctx.drawImage(img, elX, elY, elW, elH);
          } catch (e) {
            IdCardEngine.drawFallbackAvatar(ctx, elX, elY, elW, elH, student);
          }
        } else {
          IdCardEngine.drawFallbackAvatar(ctx, elX, elY, elW, elH, student);
        }
        ctx.restore();

        // Stroke border
        if (photo.borderWidth && photo.borderColor) {
          ctx.save();
          ctx.strokeStyle = photo.borderColor;
          ctx.lineWidth = photo.borderWidth * 2;
          ctx.beginPath();
          if (photo.shape === "circle") {
            const r = Math.min(elW, elH) / 2;
            ctx.arc(elX + elW / 2, elY + elH / 2, r, 0, Math.PI * 2);
          } else if (photo.shape === "rounded") {
            ctx.roundRect(elX, elY, elW, elH, photo.borderRadius || 16);
          } else {
            ctx.rect(elX, elY, elW, elH);
          }
          ctx.stroke();
          ctx.restore();
        }
      } else if (el.type === "barcode_qr") {
        const code = el as IdCardBarcodeQrElement;
        const val = resolveIdCardText(code.valuePattern, student);

        if (code.codeType === "code128_barcode") {
          IdCardEngine.drawBarcode(
            ctx,
            val,
            elX,
            elY,
            elW,
            elH,
            code.fgColor,
            code.bgColor,
            code.showLabel
          );
        } else {
          // QR Code with caching
          const qrKey = `${val}#${code.fgColor || "#0F172A"}#${code.bgColor || "#FFFFFF"}#${Math.round(Math.min(elW, elH))}`;
          let qrImg = IdCardEngine.qrCache.get(qrKey);
          if (!qrImg) {
            try {
              const qrDataUrl = await QRCode.toDataURL(val, {
                width: Math.round(Math.min(elW, elH)),
                margin: 1,
                color: {
                  dark: code.fgColor || "#0F172A",
                  light: code.bgColor || "#FFFFFF",
                },
              });
              qrImg = await IdCardEngine.loadImage(qrDataUrl);
              IdCardEngine.qrCache.set(qrKey, qrImg);
            } catch (err) {
              console.warn("QR code generation error", err);
            }
          }
          if (qrImg) {
            ctx.drawImage(qrImg, elX, elY, elW, elH);
          }
        }
      } else if (el.type === "image") {
        const imgEl = el as IdCardImageElement;
        if (imgEl.src) {
          try {
            const img = await IdCardEngine.loadImage(imgEl.src);
            ctx.drawImage(img, elX, elY, elW, elH);
          } catch (err) {
            console.warn("Failed to load asset image", err);
          }
        }
      }

      ctx.restore();
    }

    return canvas;
  }

  /**
   * Helper to draw initials monogram avatar on canvas.
   */
  private static drawFallbackAvatar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    student: StudentRecord
  ): void {
    const avatar = IdCardEngine.getInitialsAvatarInfo(student.name, student.department);
    ctx.fillStyle = avatar.bgColor;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = avatar.fgColor;
    const fontSize = Math.floor(Math.min(w, h) * 0.42);
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(avatar.initials, x + w / 2, y + h / 2);
  }

  /**
   * Helper to load an image safely into an HTMLImageElement with in-memory caching.
   */
  public static loadImage(src: string): Promise<HTMLImageElement> {
    const cached = this.imageCache.get(src);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  /**
   * Generates a Merged PDF (single or double-sided) for card printing.
   */
  public static async generateMergedPdf(
    template: IdCardTemplate,
    students: StudentRecord[],
    photoMap: Map<string, string>,
    onProgress?: (progress: IdCardGenerationProgress) => void
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    // 1 mm = 2.83465 pt
    const ptWidth = template.dimensions.widthMm * 2.83465;
    const ptHeight = template.dimensions.heightMm * 2.83465;
    const isDual = template.sidedness === "dual";

    const totalSteps = isDual ? students.length * 2 : students.length;
    let completedSteps = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const photoData = IdCardEngine.getStudentPhoto(student, photoMap);

      // Render Front
      const frontCanvas = await IdCardEngine.renderFaceToCanvas(
        template,
        "front",
        student,
        photoData
      );
      const frontImgData = frontCanvas.toDataURL("image/jpeg", 0.95);
      const frontPdfImg = await pdfDoc.embedJpg(frontImgData);

      const frontPage = pdfDoc.addPage([ptWidth, ptHeight]);
      frontPage.drawImage(frontPdfImg, {
        x: 0,
        y: 0,
        width: ptWidth,
        height: ptHeight,
      });

      completedSteps++;
      if (onProgress) {
        onProgress({
          current: completedSteps,
          total: totalSteps,
          percentage: Math.round((completedSteps / totalSteps) * 100),
          statusText: `Generating front pass for ${student.name}...`,
        });
      }

      // Render Back if dual-sided
      if (isDual) {
        const backCanvas = await IdCardEngine.renderFaceToCanvas(
          template,
          "back",
          student,
          photoData
        );
        const backImgData = backCanvas.toDataURL("image/jpeg", 0.95);
        const backPdfImg = await pdfDoc.embedJpg(backImgData);

        const backPage = pdfDoc.addPage([ptWidth, ptHeight]);
        backPage.drawImage(backPdfImg, {
          x: 0,
          y: 0,
          width: ptWidth,
          height: ptHeight,
        });

        completedSteps++;
        if (onProgress) {
          onProgress({
            current: completedSteps,
            total: totalSteps,
            percentage: Math.round((completedSteps / totalSteps) * 100),
            statusText: `Generating back pass for ${student.name}...`,
          });
        }
      }

      // Yield main thread every 10 records
      if (i % 10 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    return await pdfDoc.save();
  }

  /**
   * Generates an A4 Tiled Grid PDF with cutting guidelines.
   */
  public static async generateA4TiledPdf(
    template: IdCardTemplate,
    students: StudentRecord[],
    photoMap: Map<string, string>,
    onProgress?: (progress: IdCardGenerationProgress) => void
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    const a4WidthPt = 210 * 2.83465; // ~595.28 pt
    const a4HeightPt = 297 * 2.83465; // ~841.89 pt

    const tiling = IdCardEngine.calculateA4Tiling(
      template.dimensions.widthMm,
      template.dimensions.heightMm
    );

    const cardPtW = tiling.cardWidthMm * 2.83465;
    const cardPtH = tiling.cardHeightMm * 2.83465;
    const marginPtX = tiling.marginX * 2.83465;
    const marginPtY = tiling.marginY * 2.83465;
    const gapPtX = tiling.gapX * 2.83465;
    const gapPtY = tiling.gapY * 2.83465;

    const cardsPerPage = tiling.cardsPerPage;
    const isDual = template.sidedness === "dual";

    const totalPages = Math.ceil(students.length / cardsPerPage);

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageStudents = students.slice(
        pageIdx * cardsPerPage,
        (pageIdx + 1) * cardsPerPage
      );

      // 1. Draw Front Sheet
      const frontPage = pdfDoc.addPage([a4WidthPt, a4HeightPt]);
      const guideColor = rgb(0.75, 0.78, 0.82);

      // Draw crop cut guides on front page margins
      for (let r = 0; r <= tiling.rows; r++) {
        const lineY = a4HeightPt - marginPtY - r * (cardPtH + gapPtY);
        frontPage.drawLine({
          start: { x: Math.max(0, marginPtX - 12), y: lineY },
          end: { x: marginPtX - 2, y: lineY },
          thickness: 0.75,
          color: guideColor,
        });
        frontPage.drawLine({
          start: { x: a4WidthPt - marginPtX + 2, y: lineY },
          end: { x: Math.min(a4WidthPt, a4WidthPt - marginPtX + 12), y: lineY },
          thickness: 0.75,
          color: guideColor,
        });
      }
      for (let c = 0; c <= tiling.cols; c++) {
        const lineX = marginPtX + c * (cardPtW + gapPtX);
        frontPage.drawLine({
          start: { x: lineX, y: a4HeightPt - marginPtY + 2 },
          end: { x: lineX, y: Math.min(a4HeightPt, a4HeightPt - marginPtY + 12) },
          thickness: 0.75,
          color: guideColor,
        });
        frontPage.drawLine({
          start: { x: lineX, y: Math.max(0, marginPtY - 12) },
          end: { x: lineX, y: marginPtY - 2 },
          thickness: 0.75,
          color: guideColor,
        });
      }

      for (let sIdx = 0; sIdx < pageStudents.length; sIdx++) {
        const student = pageStudents[sIdx];
        const col = sIdx % tiling.cols;
        const row = Math.floor(sIdx / tiling.cols);

        const x = marginPtX + col * (cardPtW + gapPtX);
        const y = a4HeightPt - marginPtY - (row + 1) * cardPtH - row * gapPtY;

        const photoData = IdCardEngine.getStudentPhoto(student, photoMap);

        const canvas = await IdCardEngine.renderFaceToCanvas(
          template,
          "front",
          student,
          photoData
        );
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdfImg = await pdfDoc.embedJpg(imgData);

        frontPage.drawImage(pdfImg, {
          x,
          y,
          width: cardPtW,
          height: cardPtH,
        });
      }

      if (onProgress) {
        onProgress({
          current: pageIdx + 1,
          total: totalPages * (isDual ? 2 : 1),
          percentage: Math.round(((pageIdx + 1) / (totalPages * (isDual ? 2 : 1))) * 100),
          statusText: `Tiling A4 sheet ${pageIdx + 1} of ${totalPages}...`,
        });
      }

      // 2. Draw Back Sheet if Dual
      if (isDual) {
        const backPage = pdfDoc.addPage([a4WidthPt, a4HeightPt]);

        // Draw crop cut guides on back page margins
        for (let r = 0; r <= tiling.rows; r++) {
          const lineY = a4HeightPt - marginPtY - r * (cardPtH + gapPtY);
          backPage.drawLine({
            start: { x: Math.max(0, marginPtX - 12), y: lineY },
            end: { x: marginPtX - 2, y: lineY },
            thickness: 0.75,
            color: guideColor,
          });
          backPage.drawLine({
            start: { x: a4WidthPt - marginPtX + 2, y: lineY },
            end: { x: Math.min(a4WidthPt, a4WidthPt - marginPtX + 12), y: lineY },
            thickness: 0.75,
            color: guideColor,
          });
        }
        for (let c = 0; c <= tiling.cols; c++) {
          const lineX = marginPtX + c * (cardPtW + gapPtX);
          backPage.drawLine({
            start: { x: lineX, y: a4HeightPt - marginPtY + 2 },
            end: { x: lineX, y: Math.min(a4HeightPt, a4HeightPt - marginPtY + 12) },
            thickness: 0.75,
            color: guideColor,
          });
          backPage.drawLine({
            start: { x: lineX, y: Math.max(0, marginPtY - 12) },
            end: { x: lineX, y: marginPtY - 2 },
            thickness: 0.75,
            color: guideColor,
          });
        }

        for (let sIdx = 0; sIdx < pageStudents.length; sIdx++) {
          const student = pageStudents[sIdx];
          // Mirror column position for duplex flip on long edge (book-style flip)
          const col = tiling.cols - 1 - (sIdx % tiling.cols);
          const row = Math.floor(sIdx / tiling.cols);

          const x = marginPtX + col * (cardPtW + gapPtX);
          const y = a4HeightPt - marginPtY - (row + 1) * cardPtH - row * gapPtY;

          const photoData = IdCardEngine.getStudentPhoto(student, photoMap);

          const canvas = await IdCardEngine.renderFaceToCanvas(
            template,
            "back",
            student,
            photoData
          );
          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const pdfImg = await pdfDoc.embedJpg(imgData);

          backPage.drawImage(pdfImg, {
            x,
            y,
            width: cardPtW,
            height: cardPtH,
          });
        }
      }
    }

    return await pdfDoc.save();
  }

  /**
   * Generates a ZIP archive containing individual PNG files for all students.
   */
  public static async generateZipArchive(
    template: IdCardTemplate,
    students: StudentRecord[],
    photoMap: Map<string, string>,
    onProgress?: (progress: IdCardGenerationProgress) => void
  ): Promise<Blob> {
    const zip = new JSZip();
    const isDual = template.sidedness === "dual";
    const totalSteps = isDual ? students.length * 2 : students.length;
    let completedSteps = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const safeId = (student.id || `ID_${i}`).replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeName = (student.name || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
      const photoData = IdCardEngine.getStudentPhoto(student, photoMap);

      // Front
      const frontCanvas = await IdCardEngine.renderFaceToCanvas(
        template,
        "front",
        student,
        photoData
      );
      const frontBase64 = frontCanvas.toDataURL("image/png").split(",")[1];
      zip.file(`${safeId}_${safeName}_Front.png`, frontBase64, { base64: true });

      completedSteps++;
      if (onProgress) {
        onProgress({
          current: completedSteps,
          total: totalSteps,
          percentage: Math.round((completedSteps / totalSteps) * 100),
          statusText: `Zipping card for ${student.name}...`,
        });
      }

      // Back
      if (isDual) {
        const backCanvas = await IdCardEngine.renderFaceToCanvas(
          template,
          "back",
          student,
          photoData
        );
        const backBase64 = backCanvas.toDataURL("image/png").split(",")[1];
        zip.file(`${safeId}_${safeName}_Back.png`, backBase64, { base64: true });

        completedSteps++;
        if (onProgress) {
          onProgress({
            current: completedSteps,
            total: totalSteps,
            percentage: Math.round((completedSteps / totalSteps) * 100),
            statusText: `Zipping back card for ${student.name}...`,
          });
        }
      }

      if (i % 10 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    return await zip.generateAsync({ type: "blob" });
  }
}
