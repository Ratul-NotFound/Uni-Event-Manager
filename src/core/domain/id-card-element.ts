import { StudentRecord } from "./roster";

export type IdCardElementType = "text" | "photo" | "barcode_qr" | "image" | "shape";

export interface IdCardBaseElementProps {
  id: string;
  type: IdCardElementType;
  x: number; // percentage coordinate 0 - 100
  y: number; // percentage coordinate 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
  rotation?: number; // degrees 0 - 360
  opacity?: number; // 0 - 1
  isLocked?: boolean;
}

export abstract class IdCardElement {
  public id: string;
  public type: IdCardElementType;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public rotation: number;
  public opacity: number;
  public isLocked: boolean;

  constructor(props: IdCardBaseElementProps) {
    this.id = props.id;
    this.type = props.type;
    this.x = props.x;
    this.y = props.y;
    this.width = props.width;
    this.height = props.height;
    this.rotation = props.rotation ?? 0;
    this.opacity = props.opacity ?? 1;
    this.isLocked = props.isLocked ?? false;
  }

  public abstract toJSON(): Record<string, any>;
}

export interface IdCardTextElementProps extends IdCardBaseElementProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "capitalize" | "lowercase";
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export class IdCardTextElement extends IdCardElement {
  public text: string;
  public fontSize: number;
  public fontFamily: string;
  public fontWeight: string | number;
  public color: string;
  public align: "left" | "center" | "right";
  public letterSpacing: number;
  public lineHeight: number;
  public textTransform: "none" | "uppercase" | "capitalize" | "lowercase";
  public shadowColor?: string;
  public shadowBlur?: number;
  public shadowOffsetX?: number;
  public shadowOffsetY?: number;

  constructor(props: Omit<IdCardTextElementProps, "type"> & { type?: "text" }) {
    super({ ...props, type: "text" });
    this.text = props.text;
    this.fontSize = props.fontSize ?? 16;
    this.fontFamily = props.fontFamily ?? "Inter";
    this.fontWeight = props.fontWeight ?? "bold";
    this.color = props.color ?? "#0F172A";
    this.align = props.align ?? "center";
    this.letterSpacing = props.letterSpacing ?? 0;
    this.lineHeight = props.lineHeight ?? 1.2;
    this.textTransform = props.textTransform ?? "none";
    this.shadowColor = props.shadowColor;
    this.shadowBlur = props.shadowBlur;
    this.shadowOffsetX = props.shadowOffsetX ?? 0;
    this.shadowOffsetY = props.shadowOffsetY ?? 0;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      opacity: this.opacity,
      isLocked: this.isLocked,
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      color: this.color,
      align: this.align,
      letterSpacing: this.letterSpacing,
      lineHeight: this.lineHeight,
      textTransform: this.textTransform,
      shadowColor: this.shadowColor,
      shadowBlur: this.shadowBlur,
      shadowOffsetX: this.shadowOffsetX,
      shadowOffsetY: this.shadowOffsetY,
    };
  }
}

export interface IdCardPhotoElementProps extends IdCardBaseElementProps {
  shape?: "rounded" | "circle" | "square";
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  hasShadow?: boolean;
  fallbackColor?: string;
}

export class IdCardPhotoElement extends IdCardElement {
  public shape: "rounded" | "circle" | "square";
  public borderRadius: number;
  public borderWidth: number;
  public borderColor: string;
  public hasShadow: boolean;
  public fallbackColor: string;

  constructor(props: Omit<IdCardPhotoElementProps, "type"> & { type?: "photo" }) {
    super({ ...props, type: "photo" });
    this.shape = props.shape ?? "rounded";
    this.borderRadius = props.borderRadius ?? 16;
    this.borderWidth = props.borderWidth ?? 2;
    this.borderColor = props.borderColor ?? "#2563EB";
    this.hasShadow = props.hasShadow ?? true;
    this.fallbackColor = props.fallbackColor ?? "#3B82F6";
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      opacity: this.opacity,
      isLocked: this.isLocked,
      shape: this.shape,
      borderRadius: this.borderRadius,
      borderWidth: this.borderWidth,
      borderColor: this.borderColor,
      hasShadow: this.hasShadow,
      fallbackColor: this.fallbackColor,
    };
  }
}

export interface IdCardBarcodeQrElementProps extends IdCardBaseElementProps {
  codeType?: "qr" | "code128_barcode";
  valuePattern: string; // e.g. "{{ID}}"
  fgColor?: string;
  bgColor?: string;
  showLabel?: boolean;
}

export class IdCardBarcodeQrElement extends IdCardElement {
  public codeType: "qr" | "code128_barcode";
  public valuePattern: string;
  public fgColor: string;
  public bgColor: string;
  public showLabel: boolean;

  constructor(props: Omit<IdCardBarcodeQrElementProps, "type"> & { type?: "barcode_qr" }) {
    super({ ...props, type: "barcode_qr" });
    this.codeType = props.codeType ?? "qr";
    this.valuePattern = props.valuePattern || "{{ID}}";
    this.fgColor = props.fgColor ?? "#0F172A";
    this.bgColor = props.bgColor ?? "#FFFFFF";
    this.showLabel = props.showLabel ?? true;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      opacity: this.opacity,
      isLocked: this.isLocked,
      codeType: this.codeType,
      valuePattern: this.valuePattern,
      fgColor: this.fgColor,
      bgColor: this.bgColor,
      showLabel: this.showLabel,
    };
  }
}

export interface IdCardImageElementProps extends IdCardBaseElementProps {
  src: string;
  objectFit?: "contain" | "cover";
}

export class IdCardImageElement extends IdCardElement {
  public src: string;
  public objectFit: "contain" | "cover";

  constructor(props: Omit<IdCardImageElementProps, "type"> & { type?: "image" }) {
    super({ ...props, type: "image" });
    this.src = props.src;
    this.objectFit = props.objectFit ?? "contain";
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      opacity: this.opacity,
      isLocked: this.isLocked,
      src: this.src,
      objectFit: this.objectFit,
    };
  }
}

export interface IdCardShapeElementProps extends IdCardBaseElementProps {
  shapeType?: "rectangle" | "line" | "pill" | "badge_ribbon";
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export class IdCardShapeElement extends IdCardElement {
  public shapeType: "rectangle" | "line" | "pill" | "badge_ribbon";
  public fillColor: string;
  public strokeColor?: string;
  public strokeWidth?: number;
  public borderRadius?: number;

  constructor(props: Omit<IdCardShapeElementProps, "type"> & { type?: "shape" }) {
    super({ ...props, type: "shape" });
    this.shapeType = props.shapeType ?? "rectangle";
    this.fillColor = props.fillColor ?? "#2563EB";
    this.strokeColor = props.strokeColor;
    this.strokeWidth = props.strokeWidth ?? 0;
    this.borderRadius = props.borderRadius ?? 0;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      opacity: this.opacity,
      isLocked: this.isLocked,
      shapeType: this.shapeType,
      fillColor: this.fillColor,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      borderRadius: this.borderRadius,
    };
  }
}

export type CardOrientation = "portrait" | "landscape";
export type CardSidedness = "single" | "dual";

export interface CardDimensions {
  presetName: "cr80_portrait" | "cr80_landscape" | "lanyard_badge" | "custom";
  name: string;
  widthMm: number;
  heightMm: number;
  aspectRatio: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const CARD_DIMENSION_PRESETS: Record<
  "cr80_portrait" | "cr80_landscape" | "lanyard_badge",
  CardDimensions
> = {
  cr80_portrait: {
    presetName: "cr80_portrait",
    name: "Standard CR-80 Portrait (54 × 85.6 mm)",
    widthMm: 54,
    heightMm: 85.6,
    aspectRatio: 54 / 85.6,
    canvasWidth: 638,
    canvasHeight: 1012,
  },
  cr80_landscape: {
    presetName: "cr80_landscape",
    name: "Standard CR-80 Landscape (85.6 × 54 mm)",
    widthMm: 85.6,
    heightMm: 54,
    aspectRatio: 85.6 / 54,
    canvasWidth: 1012,
    canvasHeight: 638,
  },
  lanyard_badge: {
    presetName: "lanyard_badge",
    name: "Large Lanyard Pass (70 × 100 mm)",
    widthMm: 70,
    heightMm: 100,
    aspectRatio: 70 / 100,
    canvasWidth: 826,
    canvasHeight: 1181,
  },
};

export interface IdCardTemplate {
  id: string;
  name: string;
  dimensions: CardDimensions;
  sidedness: CardSidedness;
  frontBackground?: string; // image DataURL or theme gradient name
  backBackground?: string;
  frontElements: IdCardElement[];
  backElements: IdCardElement[];
  activeSide: "front" | "back";
}

/**
 * Resolves mustache-style dynamic tags from student record.
 * Handles standard fields and custom spreadsheet columns.
 */
export function resolveIdCardText(text: string, student: StudentRecord): string {
  if (!text) return "";

  let resolved = text
    .replace(/\{\{\s*(Name|FullName|Student_Name|StudentName)\s*\}\}/gi, student.name || "")
    .replace(/\{\{\s*(Student_ID|ID|Roll|StudentID)\s*\}\}/gi, student.id || "")
    .replace(/\{\{\s*(Department|Dept)\s*\}\}/gi, student.department || "")
    .replace(/\{\{\s*(Batch)\s*\}\}/gi, student.batch || "")
    .replace(/\{\{\s*(Section|Sec)\s*\}\}/gi, student.section || "")
    .replace(/\{\{\s*(Email)\s*\}\}/gi, student.email || "")
    .replace(/\{\{\s*(Phone|Mobile|Contact)\s*\}\}/gi, student.phone || "")
    .replace(/\{\{\s*(AssignedSeat|Seat|SeatNo)\s*\}\}/gi, student.assignedSeat || "")
    .replace(/\{\{\s*(AssignedRoom|Room|Venue)\s*\}\}/gi, student.assignedRoom || "")
    .replace(/\{\{\s*(Date)\s*\}\}/gi, new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));

  // Check student extra properties
  if (student.extra) {
    if (student.extra.team) {
      resolved = resolved.replace(/\{\{\s*(Team|TeamName|Team_Name)\s*\}\}/gi, student.extra.team);
    }
    if (student.extra.university) {
      resolved = resolved.replace(/\{\{\s*(University|Institution|College|Univ)\s*\}\}/gi, student.extra.university);
    }
    if (student.extra.bloodGroup) {
      resolved = resolved.replace(/\{\{\s*(BloodGroup|Blood_Group|Blood)\s*\}\}/gi, student.extra.bloodGroup);
    }
  }

  // Dynamic regex for any other arbitrary custom column from uploaded Excel sheets
  resolved = resolved.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, rawKey) => {
    const key = rawKey.trim();
    const lowerKey = key.toLowerCase();

    // Check direct property
    if ((student as any)[key] !== undefined && (student as any)[key] !== null) {
      return String((student as any)[key]);
    }

    // Check student.extra
    if (student.extra) {
      for (const [k, v] of Object.entries(student.extra)) {
        if (k.toLowerCase() === lowerKey || k.toLowerCase().replace(/[\s_-]/g, "") === lowerKey.replace(/[\s_-]/g, "")) {
          return String(v ?? "");
        }
      }
    }

    // Check student case-insensitive
    for (const [k, v] of Object.entries(student)) {
      if (k.toLowerCase() === lowerKey || k.toLowerCase().replace(/[\s_-]/g, "") === lowerKey.replace(/[\s_-]/g, "")) {
        return String(v ?? "");
      }
    }

    // Fallback: missing tag resolves safely to empty string
    return "";
  });

  return resolved;
}

export function createDefaultIdCardTemplate(): IdCardTemplate {
  return {
    id: "default-university-cr80",
    name: "Modern University Student ID",
    dimensions: { ...CARD_DIMENSION_PRESETS.cr80_portrait },
    sidedness: "dual",
    frontBackground: "theme:dark-slate",
    backBackground: "theme:clean-white",
    activeSide: "front",
    frontElements: [
      // Top header banner
      new IdCardShapeElement({
        id: "header-stripe",
        x: 0,
        y: 0,
        width: 100,
        height: 12,
        shapeType: "rectangle",
        fillColor: "#1E293B",
      }),
      // Institution Header Text
      new IdCardTextElement({
        id: "institution-title",
        x: 5,
        y: 3.5,
        width: 90,
        height: 5,
        text: "METROPOLITAN UNIVERSITY",
        fontSize: 13,
        fontWeight: "900",
        color: "#FFFFFF",
        align: "center",
        letterSpacing: 2,
        textTransform: "uppercase",
      }),
      // Subtitle
      new IdCardTextElement({
        id: "institution-subtitle",
        x: 5,
        y: 8,
        width: 90,
        height: 3,
        text: "STUDENT IDENTITY CARD",
        fontSize: 8,
        fontWeight: "700",
        color: "#94A3B8",
        align: "center",
        letterSpacing: 1.5,
      }),
      // Student Photo Avatar
      new IdCardPhotoElement({
        id: "student-photo",
        x: 26,
        y: 16,
        width: 48,
        height: 30,
        shape: "rounded",
        borderRadius: 16,
        borderWidth: 3,
        borderColor: "#3B82F6",
        hasShadow: true,
      }),
      // Student Name
      new IdCardTextElement({
        id: "student-name",
        x: 5,
        y: 49,
        width: 90,
        height: 6,
        text: "{{Name}}",
        fontSize: 18,
        fontWeight: "900",
        color: "#FFFFFF",
        align: "center",
        textTransform: "capitalize",
      }),
      // Department
      new IdCardTextElement({
        id: "student-dept",
        x: 5,
        y: 56,
        width: 90,
        height: 4,
        text: "{{Department}}",
        fontSize: 11,
        fontWeight: "600",
        color: "#60A5FA",
        align: "center",
      }),
      // ID Pill Badge
      new IdCardShapeElement({
        id: "id-pill",
        x: 25,
        y: 62,
        width: 50,
        height: 5,
        shapeType: "pill",
        fillColor: "#0F172A",
        strokeColor: "#334155",
        strokeWidth: 1,
        borderRadius: 999,
      }),
      // Student ID Text
      new IdCardTextElement({
        id: "student-id-text",
        x: 25,
        y: 63,
        width: 50,
        height: 3.5,
        text: "ID: {{ID}}",
        fontSize: 10,
        fontFamily: "JetBrains Mono",
        fontWeight: "bold",
        color: "#F8FAFC",
        align: "center",
      }),
      // QR Code
      new IdCardBarcodeQrElement({
        id: "student-qr",
        x: 35,
        y: 70,
        width: 30,
        height: 19,
        codeType: "qr",
        valuePattern: "{{ID}}",
        fgColor: "#0F172A",
        bgColor: "#FFFFFF",
        showLabel: false,
      }),
      // Role Banner footer
      new IdCardShapeElement({
        id: "footer-banner",
        x: 0,
        y: 92,
        width: 100,
        height: 8,
        shapeType: "rectangle",
        fillColor: "#2563EB",
      }),
      new IdCardTextElement({
        id: "role-text",
        x: 0,
        y: 94,
        width: 100,
        height: 4,
        text: "OFFICIAL STUDENT PASS",
        fontSize: 9,
        fontWeight: "900",
        color: "#FFFFFF",
        align: "center",
        letterSpacing: 2,
      }),
    ],
    backElements: [
      // Back Header
      new IdCardTextElement({
        id: "back-header",
        x: 10,
        y: 6,
        width: 80,
        height: 5,
        text: "TERMS & CONDITIONS",
        fontSize: 11,
        fontWeight: "800",
        color: "#0F172A",
        align: "center",
        letterSpacing: 1.5,
      }),
      // Terms body text
      new IdCardTextElement({
        id: "back-terms",
        x: 8,
        y: 13,
        width: 84,
        height: 25,
        text: "1. This card is non-transferable and remains the property of the University.\n2. Cardholder must present this ID upon request by campus authorities.\n3. If found, please return to the Office of Student Affairs.",
        fontSize: 8,
        fontWeight: "500",
        color: "#475569",
        align: "left",
        lineHeight: 1.4,
      }),
      // Divider
      new IdCardShapeElement({
        id: "back-divider",
        x: 10,
        y: 42,
        width: 80,
        height: 0.5,
        shapeType: "line",
        fillColor: "#CBD5E1",
      }),
      // Emergency Info
      new IdCardTextElement({
        id: "back-emergency-label",
        x: 8,
        y: 46,
        width: 84,
        height: 3,
        text: "CAMPUS EMERGENCY HOTLINE",
        fontSize: 8,
        fontWeight: "800",
        color: "#DC2626",
        align: "center",
      }),
      new IdCardTextElement({
        id: "back-emergency-phone",
        x: 8,
        y: 50,
        width: 84,
        height: 4,
        text: "+880 1711-000000 | info@campus.edu",
        fontSize: 9,
        fontFamily: "JetBrains Mono",
        fontWeight: "600",
        color: "#1E293B",
        align: "center",
      }),
      // Barcode back
      new IdCardBarcodeQrElement({
        id: "back-barcode",
        x: 15,
        y: 60,
        width: 70,
        height: 18,
        codeType: "code128_barcode",
        valuePattern: "{{ID}}",
        fgColor: "#0F172A",
        bgColor: "#F8FAFC",
        showLabel: true,
      }),
      // Authorized Signature line
      new IdCardShapeElement({
        id: "signature-line",
        x: 25,
        y: 86,
        width: 50,
        height: 0.4,
        shapeType: "line",
        fillColor: "#64748B",
      }),
      new IdCardTextElement({
        id: "signature-label",
        x: 20,
        y: 88,
        width: 60,
        height: 4,
        text: "Authorized Registrar Signature",
        fontSize: 7.5,
        fontWeight: "600",
        color: "#64748B",
        align: "center",
      }),
      // Validity
      new IdCardTextElement({
        id: "validity-text",
        x: 10,
        y: 94,
        width: 80,
        height: 3,
        text: "VALID THRU: 2026-2027 ACADEMIC YEAR",
        fontSize: 7,
        fontWeight: "800",
        color: "#2563EB",
        align: "center",
        letterSpacing: 1,
      }),
    ],
  };
}
