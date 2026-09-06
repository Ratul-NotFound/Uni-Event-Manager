import { StudentRecord } from "./roster";

export type ElementType = "text" | "qr" | "image";

export interface BaseElementProps {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation?: number;
  opacity?: number;
  isLocked?: boolean;
}

export abstract class CanvasElement {
  public id: string;
  public type: ElementType;
  public x: number;
  public y: number;
  public rotation: number;
  public opacity: number;
  public isLocked: boolean;

  constructor(props: BaseElementProps) {
    this.id = props.id;
    this.type = props.type;
    this.x = props.x;
    this.y = props.y;
    this.rotation = props.rotation ?? 0;
    this.opacity = props.opacity ?? 1;
    this.isLocked = props.isLocked ?? false;
  }

  public abstract toJSON(): Record<string, any>;
}

export interface TextElementProps extends BaseElementProps {
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

export class TextElement extends CanvasElement {
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

  constructor(props: Omit<TextElementProps, "type"> & { type?: "text" }) {
    super({ ...props, type: "text" });
    this.text = props.text;
    this.fontSize = props.fontSize ?? 32;
    this.fontFamily = props.fontFamily ?? "Inter";
    this.fontWeight = props.fontWeight ?? "bold";
    this.color = props.color ?? "#FFFFFF";
    this.align = props.align ?? "center";
    this.letterSpacing = props.letterSpacing ?? 0;
    this.lineHeight = props.lineHeight ?? 1.2;
    this.textTransform = props.textTransform ?? "none";
    this.shadowColor = props.shadowColor;
    this.shadowBlur = props.shadowBlur;
    this.shadowOffsetX = props.shadowOffsetX ?? 0;
    this.shadowOffsetY = props.shadowOffsetY ?? 0;
  }

  public resolveText(student: StudentRecord): string {
    let resolved = this.text
      .replace(/\{\{\s*(Name|FullName|Student_Name)\s*\}\}/gi, student.name || "")
      .replace(/\{\{\s*(Student_ID|ID|Roll)\s*\}\}/gi, student.id || "")
      .replace(/\{\{\s*(Department|Dept)\s*\}\}/gi, student.department || "")
      .replace(/\{\{\s*(Batch)\s*\}\}/gi, student.batch || "")
      .replace(/\{\{\s*(Section)\s*\}\}/gi, student.section || "")
      .replace(/\{\{\s*(Position|Rank)\s*\}\}/gi, (student.extra?.position) || "Participant")
      .replace(/\{\{\s*(Course_Teacher|CourseTeacher|Course\s+Teacher|Teacher|Advisor|Supervisor|Mentor)\s*\}\}/gi, String((student as any)["Course Teacher / Advisor"] || student.advisor || student.supervisor || (student as any).mentor || ""))
      .replace(/\{\{\s*(Date)\s*\}\}/gi, new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
      .replace(/\{\{\s*(Certificate_No|CertNo)\s*\}\}/gi, `CERT-${student.id}`);

    // Dynamic resolution for any custom column from uploaded sheets (e.g. {{Project_Title}}, {{College}}, etc.)
    resolved = resolved.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, rawKey) => {
      const key = rawKey.trim();
      if ((student as any)[key] !== undefined && (student as any)[key] !== null) {
        return String((student as any)[key]);
      }
      if (student.extra && (student.extra as any)[key] !== undefined) {
        return String((student.extra as any)[key]);
      }
      // Fuzzy case-insensitive match
      const lower = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const found = Object.keys(student).find(
        (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === lower
      );
      if (found && (student as any)[found] !== undefined && (student as any)[found] !== null) {
        return String((student as any)[found]);
      }
      return match;
    });

    if (this.textTransform === "uppercase") {
      resolved = resolved.toUpperCase();
    } else if (this.textTransform === "lowercase") {
      resolved = resolved.toLowerCase();
    }
    return resolved;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
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
    };
  }
}

export interface QrElementProps extends BaseElementProps {
  size?: number;
  payloadPattern?: string;
  fgColor?: string;
  bgColor?: string;
}

export class QrElement extends CanvasElement {
  public size: number;
  public payloadPattern: string;
  public fgColor: string;
  public bgColor: string;

  constructor(props: Omit<QrElementProps, "type"> & { type?: "qr" }) {
    super({ ...props, type: "qr" });
    this.size = props.size ?? 120;
    this.payloadPattern = props.payloadPattern ?? "https://verify.club/cert/{{Student_ID}}";
    this.fgColor = props.fgColor ?? "#000000";
    this.bgColor = props.bgColor ?? "#FFFFFF";
  }

  public resolvePayload(student: StudentRecord): string {
    let resolved = this.payloadPattern
      .replace(/\{\{\s*(Name|FullName)\s*\}\}/gi, student.name || "")
      .replace(/\{\{\s*(Student_ID|ID|Roll)\s*\}\}/gi, student.id || "")
      .replace(/\{\{\s*(Department|Dept)\s*\}\}/gi, student.department || "");

    // Dynamic resolution for custom columns
    resolved = resolved.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, rawKey) => {
      const key = rawKey.trim();
      if ((student as any)[key] !== undefined && (student as any)[key] !== null) return String((student as any)[key]);
      if (student.extra && (student.extra as any)[key] !== undefined) return String((student.extra as any)[key]);
      return match;
    });

    return resolved;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      opacity: this.opacity,
      isLocked: this.isLocked,
      size: this.size,
      payloadPattern: this.payloadPattern,
      fgColor: this.fgColor,
      bgColor: this.bgColor,
    };
  }
}

export interface ImageElementProps extends BaseElementProps {
  src: string;
  width: number;
  height: number;
}

export class ImageElement extends CanvasElement {
  public src: string;
  public width: number;
  public height: number;

  constructor(props: Omit<ImageElementProps, "type"> & { type?: "image" }) {
    super({ ...props, type: "image" });
    this.src = props.src;
    this.width = props.width;
    this.height = props.height;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      opacity: this.opacity,
      isLocked: this.isLocked,
      src: this.src,
      width: this.width,
      height: this.height,
    };
  }
}

export class CertificateTemplate {
  public id: string;
  public name: string;
  public width: number;
  public height: number;
  public backgroundUrl?: string;
  public backgroundColor: string;
  public showDecorativeBorders: boolean;
  public backgroundDim: number;
  private elements: CanvasElement[];

  constructor(
    name: string = "Default Certificate",
    width: number = 1920,
    height: number = 1080,
    id: string = `tpl-${Date.now()}`
  ) {
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.backgroundColor = "#0F172A";
    this.showDecorativeBorders = true;
    this.backgroundDim = 0;
    this.elements = [];
  }

  public getElements(): CanvasElement[] {
    return [...this.elements];
  }

  public addElement(element: CanvasElement): void {
    this.elements.push(element);
  }

  public updateElement(id: string, updates: Partial<CanvasElement>): void {
    const index = this.elements.findIndex((e) => e.id === id);
    if (index !== -1) {
      Object.assign(this.elements[index], updates);
    }
  }

  public removeElement(id: string): void {
    this.elements = this.elements.filter((e) => e.id !== id);
  }

  public setElements(elements: CanvasElement[]): void {
    this.elements = [...elements];
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      backgroundUrl: this.backgroundUrl,
      backgroundColor: this.backgroundColor,
      showDecorativeBorders: this.showDecorativeBorders,
      backgroundDim: this.backgroundDim,
      elements: this.elements.map((e) => e.toJSON()),
    };
  }

  public static fromJSON(json: Record<string, any>): CertificateTemplate {
    const tpl = new CertificateTemplate(
      json.name,
      json.width,
      json.height,
      json.id
    );
    tpl.backgroundUrl = json.backgroundUrl;
    tpl.backgroundColor = json.backgroundColor ?? "#0F172A";
    tpl.showDecorativeBorders = json.showDecorativeBorders ?? true;
    tpl.backgroundDim = json.backgroundDim ?? 0;

    const elements: CanvasElement[] = (json.elements || []).map((elJson: any) => {
      if (elJson.type === "text") {
        return new TextElement(elJson);
      } else if (elJson.type === "qr") {
        return new QrElement(elJson);
      } else if (elJson.type === "image") {
        return new ImageElement(elJson);
      }
      return new TextElement(elJson);
    });

    tpl.setElements(elements);
    return tpl;
  }
}
