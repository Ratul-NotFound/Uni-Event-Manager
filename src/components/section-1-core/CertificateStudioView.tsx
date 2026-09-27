"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import saveAs from "file-saver";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import {
  CertificateTemplate,
  TextElement,
  QrElement,
  CanvasElement,
} from "@/core/domain/certificate-element";
import { BulkGeneratorEngine, ExportFormat, GenerationProgress } from "@/core/engines/bulk-generator";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { ProgressBar } from "@/components/common/ProgressBar";
import {
  Award,
  Download,
  Plus,
  QrCode,
  Type,
  Image as ImageIcon,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  Move,
  Layers,
  FileText,
  Archive,
  UserCheck,
  Trophy,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Palette,
  Check,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Database,
  Printer,
  Search,
  Filter,
  Users,
  Calendar,
  GraduationCap,
  Hash,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { LocalStorageSyncService } from "@/core/storage/local-storage-sync";

export interface CertificateStudioViewProps {
  students: StudentRecord[];
  columnHeaders?: string[];
}

// 15+ Curated Certificate Google Fonts
export const CERTIFICATE_FONT_GROUPS = [
  {
    group: "Formal & Luxury Serif",
    fonts: [
      { name: "Cinzel", label: "Cinzel (Diploma & Regal)" },
      { name: "Playfair Display", label: "Playfair Display (Editorial Luxury)" },
      { name: "Cormorant Garamond", label: "Cormorant Garamond (Traditional Elegance)" },
      { name: "Bodoni Moda", label: "Bodoni Moda (Prestige Contrast)" },
      { name: "Merriweather", label: "Merriweather (Academic Classic)" },
    ],
  },
  {
    group: "Calligraphy & Script Signatures",
    fonts: [
      { name: "Great Vibes", label: "Great Vibes (Formal Flowing Script)" },
      { name: "Dancing Script", label: "Dancing Script (Lively Modern Cursive)" },
      { name: "Alex Brush", label: "Alex Brush (Balanced Calligraphy)" },
      { name: "Pinyon Script", label: "Pinyon Script (Vintage French Script)" },
      { name: "MonteCarlo", label: "MonteCarlo (Flourished Signature)" },
    ],
  },
  {
    group: "Modern Clean Sans-Serif",
    fonts: [
      { name: "Outfit", label: "Outfit (Modern Geometric Tech)" },
      { name: "Inter", label: "Inter (Clean & Crisp)" },
      { name: "Montserrat", label: "Montserrat (Architectural Bold Sans)" },
      { name: "Poppins", label: "Poppins (Soft Geometric Sans)" },
      { name: "Oswald", label: "Oswald (Condensed Bold Titles)" },
    ],
  },
  {
    group: "Security & Monospace",
    fonts: [
      { name: "JetBrains Mono", label: "JetBrains Mono (Serial & Hash)" },
    ],
  },
];

// Presets Factory
const createPresetTemplate = (presetKey: string): CertificateTemplate => {
  if (presetKey === "hackathon") {
    const tpl = new CertificateTemplate("Hackathon & Contest Winner", 1920, 1080);
    tpl.showDecorativeBorders = true;
    tpl.addElement(
      new TextElement({
        id: "title",
        x: 960,
        y: 220,
        text: "🏆 CODE-STORM HACKATHON 2026",
        fontSize: 46,
        fontFamily: "Outfit",
        fontWeight: "bold",
        color: "#38BDF8",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "sub",
        x: 960,
        y: 310,
        text: "THIS CERTIFICATE OF DISTINCTION IS PROUDLY CONFERRED TO",
        fontSize: 20,
        fontFamily: "Montserrat",
        fontWeight: "600",
        color: "#94A3B8",
        align: "center",
        letterSpacing: 4,
      })
    );
    tpl.addElement(
      new TextElement({
        id: "name",
        x: 960,
        y: 430,
        text: "{{Name}}",
        fontSize: 70,
        fontFamily: "Great Vibes",
        fontWeight: "bold",
        color: "#F59E0B",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "team_project",
        x: 960,
        y: 550,
        text: "Representing {{Team_Name}} for project {{Project_Title}}",
        fontSize: 24,
        fontFamily: "Inter",
        color: "#E2E8F0",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "advisor",
        x: 960,
        y: 620,
        text: "Course Teacher / Advisor: {{Course_Teacher}}",
        fontSize: 22,
        fontFamily: "Outfit",
        color: "#10B981",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "meta",
        x: 960,
        y: 690,
        text: "Rank: {{Position}} | Student ID: {{Student_ID}} | Issued: {{Date}}",
        fontSize: 18,
        fontFamily: "Inter",
        color: "#A5B4FC",
        align: "center",
      })
    );
    tpl.addElement(
      new QrElement({
        id: "qr",
        x: 1720,
        y: 920,
        size: 130,
        payloadPattern: "https://campusclub.vercel.app/verify?id={{Student_ID}}",
      })
    );
    return tpl;
  }

  if (presetKey === "summit") {
    const tpl = new CertificateTemplate("Corporate Tech Summit", 1920, 1080);
    tpl.showDecorativeBorders = true;
    tpl.addElement(
      new TextElement({
        id: "title",
        x: 960,
        y: 240,
        text: "NATIONAL TECH CONVERGENCE 2026",
        fontSize: 50,
        fontFamily: "Oswald",
        fontWeight: "bold",
        color: "#FFFFFF",
        align: "center",
        letterSpacing: 3,
      })
    );
    tpl.addElement(
      new TextElement({
        id: "sub",
        x: 960,
        y: 340,
        text: "OFFICIAL CERTIFICATE OF PARTICIPATION",
        fontSize: 22,
        fontFamily: "Outfit",
        fontWeight: "500",
        color: "#60A5FA",
        align: "center",
        letterSpacing: 3,
      })
    );
    tpl.addElement(
      new TextElement({
        id: "name",
        x: 960,
        y: 470,
        text: "{{Name}}",
        fontSize: 64,
        fontFamily: "Montserrat",
        fontWeight: "bold",
        color: "#38BDF8",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "meta",
        x: 960,
        y: 590,
        text: "{{Department}} • {{College}}",
        fontSize: 26,
        fontFamily: "Inter",
        color: "#CBD5E1",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "serial",
        x: 960,
        y: 670,
        text: "VERIFICATION HASH: CERT-{{Student_ID}}-2026",
        fontSize: 16,
        fontFamily: "JetBrains Mono",
        color: "#94A3B8",
        align: "center",
      })
    );
    tpl.addElement(
      new QrElement({
        id: "qr",
        x: 1720,
        y: 920,
        size: 130,
        payloadPattern: "https://campusclub.vercel.app/verify?id={{Student_ID}}",
      })
    );
    return tpl;
  }

  if (presetKey === "minimal") {
    const tpl = new CertificateTemplate("Minimalist Swiss Modernist", 1920, 1080);
    tpl.showDecorativeBorders = false;
    tpl.backgroundColor = "#0F172A";
    tpl.addElement(
      new TextElement({
        id: "title",
        x: 960,
        y: 280,
        text: "C E R T I F I C A T E",
        fontSize: 48,
        fontFamily: "Bodoni Moda",
        fontWeight: "normal",
        color: "#F8FAFC",
        align: "center",
        letterSpacing: 8,
      })
    );
    tpl.addElement(
      new TextElement({
        id: "sub",
        x: 960,
        y: 380,
        text: "P R E S E N T E D   T O",
        fontSize: 16,
        fontFamily: "Inter",
        fontWeight: "500",
        color: "#94A3B8",
        align: "center",
        letterSpacing: 4,
      })
    );
    tpl.addElement(
      new TextElement({
        id: "name",
        x: 960,
        y: 500,
        text: "{{Name}}",
        fontSize: 62,
        fontFamily: "Bodoni Moda",
        fontWeight: "bold",
        color: "#FFFFFF",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "body",
        x: 960,
        y: 620,
        text: "for exemplary merit in {{Department}} under {{Course_Teacher}}",
        fontSize: 22,
        fontFamily: "Inter",
        color: "#E2E8F0",
        align: "center",
      })
    );
    tpl.addElement(
      new QrElement({
        id: "qr",
        x: 1720,
        y: 920,
        size: 110,
        payloadPattern: "https://campusclub.vercel.app/verify?id={{Student_ID}}",
      })
    );
    return tpl;
  }

  if (presetKey === "illustrator-blank") {
    const tpl = new CertificateTemplate("Illustrator / Photoshop Blank Slate", 1920, 1080);
    tpl.showDecorativeBorders = false;
    tpl.backgroundColor = "#FFFFFF";
    tpl.addElement(
      new TextElement({
        id: "name",
        x: 960,
        y: 480,
        text: "{{Name}}",
        fontSize: 64,
        fontFamily: "Playfair Display",
        fontWeight: "bold",
        color: "#0F172A",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "details",
        x: 960,
        y: 580,
        text: "{{Department}} • {{Course_Teacher}}",
        fontSize: 24,
        fontFamily: "Inter",
        color: "#334155",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "date_id",
        x: 960,
        y: 650,
        text: "ID: {{Student_ID}} | {{Date}}",
        fontSize: 18,
        fontFamily: "Inter",
        color: "#64748B",
        align: "center",
      })
    );
    tpl.addElement(
      new QrElement({
        id: "qr",
        x: 1700,
        y: 900,
        size: 130,
        payloadPattern: "https://campusclub.vercel.app/verify?id={{Student_ID}}",
      })
    );
    return tpl;
  }

  // Default Academic Honor
  const tpl = new CertificateTemplate("University Academic Honor", 1920, 1080);
  tpl.showDecorativeBorders = true;
  tpl.addElement(
    new TextElement({
      id: "title",
      x: 960,
      y: 250,
      text: "CERTIFICATE OF EXCELLENCE",
      fontSize: 52,
      fontFamily: "Cinzel",
      fontWeight: "bold",
      color: "#F59E0B",
      align: "center",
    })
  );
  tpl.addElement(
    new TextElement({
      id: "sub",
      x: 960,
      y: 340,
      text: "THIS PROUDLY CERTIFIES THAT",
      fontSize: 22,
      fontFamily: "Inter",
      fontWeight: "500",
      color: "#94A3B8",
      align: "center",
      letterSpacing: 4,
    })
  );
  tpl.addElement(
    new TextElement({
      id: "name",
      x: 960,
      y: 460,
      text: "{{Name}}",
      fontSize: 66,
      fontFamily: "Playfair Display",
      fontWeight: "bold",
      color: "#FFFFFF",
      align: "center",
    })
  );
  tpl.addElement(
    new TextElement({
      id: "desc",
      x: 960,
      y: 570,
      text: "has served as an honorable {{Position}} representing {{Department}}",
      fontSize: 26,
      fontFamily: "Merriweather",
      color: "#CBD5E1",
      align: "center",
    })
  );
  tpl.addElement(
    new TextElement({
      id: "advisor_row",
      x: 960,
      y: 640,
      text: "Course Teacher / Advisor: {{Course_Teacher}}",
      fontSize: 22,
      fontFamily: "Outfit",
      color: "#10B981",
      align: "center",
    })
  );
  tpl.addElement(
    new TextElement({
      id: "id_and_date",
      x: 960,
      y: 710,
      text: "Student ID: {{Student_ID}} | Issued on {{Date}}",
      fontSize: 18,
      fontFamily: "Inter",
      color: "#818CF8",
      align: "center",
    })
  );
  tpl.addElement(
    new QrElement({
      id: "qr",
      x: 1720,
      y: 920,
      size: 130,
      payloadPattern: "https://campusclub.vercel.app/verify?id={{Student_ID}}",
    })
  );
  return tpl;
};

export const CertificateStudioView: React.FC<CertificateStudioViewProps> = ({
  students,
  columnHeaders,
}) => {
  // =========================================================================
  // WORKFLOW PANEL ACTIVE TAB (1: Data & Scope | 2: Artwork | 3: Fields | 4: Export)
  // =========================================================================
  const [activeTab, setActiveTab] = useState<"data" | "artwork" | "fields" | "export">("fields");

  // Data Mode: "sheet" vs "individual"
  const [dataMode, setDataMode] = useState<"sheet" | "individual">("sheet");

  // Step 1: One-Off Custom Individual Entry
  const [customStudent, setCustomStudent] = useState<StudentRecord>({
    id: "VIP-2026-001",
    name: "Dr. Eleanor Vance",
    email: "eleanor.vance@university.edu",
    department: "Computer Science & Engineering",
    batch: "2026",
    section: "Honors",
    "Team Name": "Team NeuralNet",
    "Course Teacher / Advisor": "Prof. Alan Turing",
    advisor: "Prof. Alan Turing",
    extra: {
      position: "Distinguished Keynote Speaker",
      "Project Title": "Autonomous AI Systems",
      College: "Faculty of Engineering",
    },
  });

  // Active Template State (Restored from Local Storage if available)
  const [template, setTemplate] = useState<CertificateTemplate>(() => {
    const saved = LocalStorageSyncService.loadCertTemplateJSON();
    if (saved) {
      try {
        return CertificateTemplate.fromJSON(saved);
      } catch {
        // fallback
      }
    }
    return createPresetTemplate("academic");
  });

  // Automatically persist customized certificate template to Local Storage
  useEffect(() => {
    if (template) {
      LocalStorageSyncService.saveCertTemplateJSON(template.toJSON());
    }
  }, [template]);

  // Detected Dynamic Spreadsheet Column Headers
  const detectedHeaders = useMemo(() => {
    const set = new Set<string>();
    (columnHeaders || LocalStorageSyncService.loadHeaders() || []).forEach((h) => set.add(h));
    students.forEach((st) => {
      Object.keys(st).forEach((k) => {
        if (!["extra", "claimedTokens"].includes(k) && typeof (st as any)[k] !== "object") {
          set.add(k);
        }
      });
      if (st.extra) {
        Object.keys(st.extra).forEach((k) => set.add(k));
      }
    });
    return Array.from(set);
  }, [columnHeaders, students]);

  // Active Template Preset Name
  const [activePreset, setActivePreset] = useState<string>("academic");

  // Step 1/4: Scoping & Range Filtering State
  const [generationScope, setGenerationScope] = useState<"all" | "range" | "filter">("all");
  const [customRangeText, setCustomRangeText] = useState<string>("1-20, 25-40");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");

  // Selected Student Index for Live Navigator Preview
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);

  // Active Student being rendered right now
  const activeStudent: StudentRecord = useMemo(() => {
    if (dataMode === "individual") {
      return customStudent;
    }
    if (students.length > 0 && students[previewStudentIndex]) {
      return students[previewStudentIndex];
    }
    return customStudent;
  }, [dataMode, customStudent, students, previewStudentIndex]);

  // Selected Element for Inspector
  const [selectedElementId, setSelectedElementId] = useState<string | null>("name");

  // Canvas & Background Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Canvas Zoom Level
  const [canvasZoom, setCanvasZoom] = useState<number>(1);

  // Mouse Drag-and-Drop & Resizing Engine State
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeInitial, setResizeInitial] = useState({ startX: 0, startY: 0, initialVal: 0 });
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});
  const [canvasCursor, setCanvasCursor] = useState<string>("crosshair");

  // Bulk Generation Modal State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("zip-pdf");
  const [progress, setProgress] = useState<GenerationProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    statusText: "",
  });
  const cancelRef = useRef(false);

  // Extract distinct teams & departments
  const distinctTeams = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const val = s["Team Name"] || (s as any).team;
      if (val) set.add(String(val).trim());
    });
    return Array.from(set);
  }, [students]);

  const distinctDepts = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department.trim());
    });
    return Array.from(set);
  }, [students]);

  // Compute records targeted by scoping criteria
  const targetedRecords = useMemo(() => {
    if (dataMode === "individual") {
      return [customStudent];
    }
    if (students.length === 0) {
      return [customStudent];
    }

    if (generationScope === "all") {
      return students;
    }

    if (generationScope === "range") {
      const indices = BulkGeneratorEngine.parseRowRange(customRangeText, students.length);
      return indices.map((idx) => students[idx]).filter(Boolean);
    }

    if (generationScope === "filter") {
      return students.filter((s) => {
        const matchesTeam = filterTeam === "all" || String(s["Team Name"] || (s as any).team) === filterTeam;
        const matchesDept = filterDept === "all" || s.department === filterDept;
        return matchesTeam && matchesDept;
      });
    }

    return students;
  }, [dataMode, customStudent, students, generationScope, customRangeText, filterTeam, filterDept]);

  // Calculate Element Bounding Box on Canvas
  const getElementBounds = useCallback(
    (el: CanvasElement, ctx: CanvasRenderingContext2D, student: StudentRecord) => {
      if (el.type === "text") {
        const textEl = el as TextElement;
        const text = textEl.resolveText(student);
        ctx.font = `${textEl.fontWeight} ${textEl.fontSize}px "${textEl.fontFamily}", sans-serif`;
        const metrics = ctx.measureText(text);
        const w = metrics.width + 30;
        const h = textEl.fontSize * 1.4;
        const x =
          textEl.align === "center"
            ? textEl.x - w / 2
            : textEl.align === "right"
            ? textEl.x - w
            : textEl.x - 5;
        const y = textEl.y - h / 2;
        return { x, y, width: w, height: h };
      } else if (el.type === "qr") {
        const qrEl = el as QrElement;
        return {
          x: qrEl.x - qrEl.size / 2 - 8,
          y: qrEl.y - qrEl.size / 2 - 8,
          width: qrEl.size + 16,
          height: qrEl.size + 16,
        };
      }
      return { x: el.x - 50, y: el.y - 50, width: 100, height: 100 };
    },
    []
  );

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const isOverResizeHandle = useCallback(
    (coords: { x: number; y: number }, bounds: { x: number; y: number; width: number; height: number }) => {
      const handleX = bounds.x + bounds.width;
      const handleY = bounds.y + bounds.height;
      const radius = 24;
      return Math.hypot(coords.x - handleX, coords.y - handleY) <= radius;
    },
    []
  );

  // =========================================================================
  // CANVAS MOUSE EVENTS: DRAG-AND-DROP & RESIZING
  // =========================================================================
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoords(e);
    const elements = template.getElements();

    if (selectedElementId) {
      const activeEl = elements.find((el) => el.id === selectedElementId);
      if (activeEl) {
        const bounds = getElementBounds(activeEl, ctx, activeStudent);
        if (isOverResizeHandle(coords, bounds)) {
          setIsResizing(true);
          const initialVal =
            activeEl.type === "text"
              ? (activeEl as TextElement).fontSize
              : (activeEl as QrElement).size;
          setResizeInitial({
            startX: coords.x,
            startY: coords.y,
            initialVal,
          });
          return;
        }
      }
    }

    let hitEl: CanvasElement | null = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const bounds = getElementBounds(el, ctx, activeStudent);
      if (
        coords.x >= bounds.x &&
        coords.x <= bounds.x + bounds.width &&
        coords.y >= bounds.y &&
        coords.y <= bounds.y + bounds.height
      ) {
        hitEl = el;
        break;
      }
    }

    if (hitEl) {
      setSelectedElementId(hitEl.id);
      setIsDragging(true);
      setDragOffset({
        x: coords.x - hitEl.x,
        y: coords.y - hitEl.y,
      });
      setCanvasCursor("grabbing");
      setActiveTab("fields");
    } else {
      setSelectedElementId(null);
      setSnapGuides({});
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoords(e);
    const elements = template.getElements();
    const selectedEl = elements.find((el) => el.id === selectedElementId);

    if (isResizing && selectedEl) {
      const delta = (coords.x - resizeInitial.startX + (coords.y - resizeInitial.startY)) / 2;
      const updated = CertificateTemplate.fromJSON(template.toJSON());
      if (selectedEl.type === "text") {
        const newSize = Math.max(12, Math.min(180, Math.round(resizeInitial.initialVal + delta * 0.4)));
        updated.updateElement(selectedEl.id, { fontSize: newSize } as any);
      } else if (selectedEl.type === "qr") {
        const newSize = Math.max(60, Math.min(400, Math.round(resizeInitial.initialVal + delta * 0.6)));
        updated.updateElement(selectedEl.id, { size: newSize } as any);
      }
      setTemplate(updated);
      return;
    }

    if (isDragging && selectedEl) {
      let nextX = Math.round(coords.x - dragOffset.x);
      let nextY = Math.round(coords.y - dragOffset.y);

      const guides: { x?: number; y?: number } = {};
      const centerX = template.width / 2;
      const centerY = template.height / 2;

      if (Math.abs(nextX - centerX) < 24) {
        nextX = centerX;
        guides.x = centerX;
      }
      if (Math.abs(nextY - centerY) < 24) {
        nextY = centerY;
        guides.y = centerY;
      }
      setSnapGuides(guides);

      const updated = CertificateTemplate.fromJSON(template.toJSON());
      updated.updateElement(selectedEl.id, { x: nextX, y: nextY });
      setTemplate(updated);
      return;
    }

    if (selectedEl) {
      const bounds = getElementBounds(selectedEl, ctx, activeStudent);
      if (isOverResizeHandle(coords, bounds)) {
        setCanvasCursor("nwse-resize");
        return;
      }
    }

    let isOverAny = false;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const bounds = getElementBounds(el, ctx, activeStudent);
      if (
        coords.x >= bounds.x &&
        coords.x <= bounds.x + bounds.width &&
        coords.y >= bounds.y &&
        coords.y <= bounds.y + bounds.height
      ) {
        isOverAny = true;
        break;
      }
    }
    setCanvasCursor(isOverAny ? "grab" : "crosshair");
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setSnapGuides({});
    setCanvasCursor("grab");
  };

  const handleCanvasMouseLeave = () => {
    setIsDragging(false);
    setIsResizing(false);
    setSnapGuides({});
    setCanvasCursor("crosshair");
  };

  // Keyboard Nudge Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElementId) return;
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      const selectedEl = template.getElements().find((el) => el.id === selectedElementId);
      if (!selectedEl) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        updateSelectedElement({ x: selectedEl.x - step });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        updateSelectedElement({ x: selectedEl.x + step });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        updateSelectedElement({ y: selectedEl.y - step });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        updateSelectedElement({ y: selectedEl.y + step });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeElement(selectedElementId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, template]);

  // =========================================================================
  // RE-RENDER PREVIEW CANVAS (Always Active)
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    BulkGeneratorEngine.renderCertificateToCanvas(template, activeStudent, bgImage).then(
      (rendered) => {
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(rendered, 0, 0);

        if (snapGuides.x !== undefined) {
          ctx.save();
          ctx.strokeStyle = "#EC4899";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(snapGuides.x, 0);
          ctx.lineTo(snapGuides.x, canvas.height);
          ctx.stroke();
          ctx.restore();
        }
        if (snapGuides.y !== undefined) {
          ctx.save();
          ctx.strokeStyle = "#06B6D4";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(0, snapGuides.y);
          ctx.lineTo(canvas.width, snapGuides.y);
          ctx.stroke();
          ctx.restore();
        }

        const selected = template.getElements().find((e) => e.id === selectedElementId);
        if (selected) {
          ctx.save();
          const bounds = getElementBounds(selected, ctx, activeStudent);

          ctx.strokeStyle = "#6366F1";
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

          const handleRadius = 7;
          ctx.fillStyle = "#FFFFFF";
          ctx.strokeStyle = "#4F46E5";
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(bounds.x + bounds.width, bounds.y + bounds.height, handleRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          const pillText = `X:${selected.x} Y:${selected.y} | ${
            selected.type === "text" ? `${(selected as TextElement).fontSize}px` : `${(selected as QrElement).size}px`
          }`;
          ctx.font = "bold 13px Inter, sans-serif";
          const pillMetrics = ctx.measureText(pillText);
          const pillW = pillMetrics.width + 16;
          const pillH = 22;
          const pillX = bounds.x;
          const pillY = bounds.y - 28 > 0 ? bounds.y - 28 : bounds.y + bounds.height + 6;

          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.roundRect(pillX, pillY, pillW, pillH, 6);
          ctx.fill();
          ctx.fillStyle = "#38BDF8";
          ctx.fillText(pillText, pillX + 8, pillY + 15);

          ctx.restore();
        }
      }
    );
  }, [template, activeStudent, bgImage, selectedElementId, snapGuides, getElementBounds]);

  // Background & Font Handlers
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
        const updated = CertificateTemplate.fromJSON(template.toJSON());
        updated.width = img.naturalWidth || 1920;
        updated.height = img.naturalHeight || 1080;
        updated.showDecorativeBorders = false;
        setTemplate(updated);
        setActiveTab("artwork");
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fontName = file.name.replace(/\.[^/.]+$/, "");
    const buffer = await file.arrayBuffer();
    const font = new FontFace(fontName, buffer);
    await font.load();
    (document.fonts as any).add(font);

    if (selectedElementId) {
      updateSelectedElement({ fontFamily: fontName });
    }
  };

  // Select or Add Dynamic Field to Canvas
  const handleSelectOrAddField = (tag: string, defaultLabel: string, defaultSize: number = 32) => {
    const elements = template.getElements();
    const existing = elements.find(
      (el) => el.type === "text" && (el as TextElement).text.includes(tag)
    );

    if (existing) {
      setSelectedElementId(existing.id);
      setActiveTab("fields");
      return;
    }

    // Add new
    const newEl = new TextElement({
      id: `text-${Date.now()}`,
      x: template.width / 2,
      y: template.height / 2,
      text: tag,
      fontSize: defaultSize,
      fontFamily: "Outfit",
      color: "#38BDF8",
      align: "center",
      fontWeight: "bold",
    });
    const updated = CertificateTemplate.fromJSON(template.toJSON());
    updated.addElement(newEl);
    setTemplate(updated);
    setSelectedElementId(newEl.id);
    setActiveTab("fields");
  };

  const addQrElement = () => {
    const newQr = new QrElement({
      id: `qr-${Date.now()}`,
      x: template.width - 200,
      y: template.height - 200,
      size: 130,
      payloadPattern: "https://campusclub.vercel.app/verify?id={{Student_ID}}",
    });
    const updated = CertificateTemplate.fromJSON(template.toJSON());
    updated.addElement(newQr);
    setTemplate(updated);
    setSelectedElementId(newQr.id);
    setActiveTab("fields");
  };

  const removeElement = (id: string) => {
    const updated = CertificateTemplate.fromJSON(template.toJSON());
    updated.removeElement(id);
    setTemplate(updated);
    setSelectedElementId(null);
  };

  const updateSelectedElement = (updates: any) => {
    if (!selectedElementId) return;
    const updated = CertificateTemplate.fromJSON(template.toJSON());
    updated.updateElement(selectedElementId, updates);
    setTemplate(updated);
  };

  const handleApplyPreset = (key: string) => {
    setActivePreset(key);
    const newTpl = createPresetTemplate(key);
    setTemplate(newTpl);
    setSelectedElementId("name");
  };

  const handleDimensionsPreset = (dim: "web" | "a4-land" | "a4-port" | "us-letter") => {
    const updated = CertificateTemplate.fromJSON(template.toJSON());
    if (dim === "web") {
      updated.width = 1920;
      updated.height = 1080;
    } else if (dim === "a4-land") {
      updated.width = 3508;
      updated.height = 2480;
    } else if (dim === "a4-port") {
      updated.width = 2480;
      updated.height = 3508;
    } else if (dim === "us-letter") {
      updated.width = 3300;
      updated.height = 2550;
    }
    setTemplate(updated);
  };

  const selectedElement = template.getElements().find((e) => e.id === selectedElementId);

  // Single Certificate Download
  const handleDownloadSingle = async (format: "png" | "pdf") => {
    const blob = await BulkGeneratorEngine.generateSingle(
      template,
      activeStudent,
      format,
      bgImage
    );
    const ext = format === "png" ? "png" : "pdf";
    saveAs(blob, `Certificate_${activeStudent.id}_${activeStudent.name}.${ext}`);
  };

  // Start Scoped Bulk Generation
  const startBulkGeneration = async () => {
    if (targetedRecords.length === 0) {
      alert("No students match the chosen scope criteria!");
      return;
    }
    cancelRef.current = false;
    setIsGenerating(true);
    setIsGenModalOpen(true);

    try {
      const blob = await BulkGeneratorEngine.generateBulk(
        template,
        targetedRecords,
        exportFormat,
        bgImage,
        (prog) => setProgress(prog),
        () => cancelRef.current
      );

      const filename =
        exportFormat === "merged-pdf"
          ? `All_Certificates_${targetedRecords.length}_Pages.pdf`
          : `Certificates_${targetedRecords.length}_Batch.zip`;

      saveAs(blob, filename);
    } catch (err: any) {
      console.error(err);
      if (err.message !== "Generation cancelled by user") {
        alert(`Generation error: ${err.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // List of standard and dynamic spreadsheet fields for Tab 3 Information Placement
  const availableFields = useMemo(() => {
    const base = [
      { label: "Recipient Full Name", tag: "{{Name}}", desc: "Student or Award Winner Name", defaultSize: 64 },
      { label: "Course Teacher / Advisor", tag: "{{Course_Teacher}}", desc: "Faculty Advisor or Supervisor", defaultSize: 22 },
      { label: "Contest Team Name", tag: "{{Team_Name}}", desc: "Participating Team", defaultSize: 24 },
      { label: "Academic Department", tag: "{{Department}}", desc: "Faculty / Major", defaultSize: 24 },
      { label: "Student Roll / ID", tag: "{{Student_ID}}", desc: "Official University ID", defaultSize: 18 },
      { label: "Award / Rank / Position", tag: "{{Position}}", desc: "Champion, Runner-Up, Participant", defaultSize: 26 },
      { label: "Project Title", tag: "{{Project_Title}}", desc: "Submission or Project Title", defaultSize: 22 },
      { label: "Issue Date", tag: "{{Date}}", desc: "Event or Graduation Date", defaultSize: 18 },
      { label: "Cert Hash / ID", tag: "{{Certificate_No}}", desc: "Unique Verification Code", defaultSize: 16 },
    ];

    const standardTags = new Set(["name", "id", "department", "batch", "section", "email", "phone", "courseteacher", "teamname", "projecttitle", "certificateno", "position"]);
    detectedHeaders.forEach((header) => {
      const cleanHeader = header.trim();
      const norm = cleanHeader.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!standardTags.has(norm) && !base.some((b) => b.tag.toLowerCase().replace(/[^a-z0-9]/g, "") === norm)) {
        base.push({
          label: cleanHeader.replace(/_/g, " "),
          tag: `{{${cleanHeader}}}`,
          desc: `Custom column from uploaded spreadsheet`,
          defaultSize: 22,
        });
      }
    });

    return base;
  }, [detectedHeaders]);

  return (
    <div className="w-full space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        onChange={handleBgUpload}
        className="hidden"
      />
      <input
        ref={fontInputRef}
        type="file"
        accept=".ttf,.otf"
        onChange={handleCustomFontUpload}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN UNIFIED WORKFLOW STUDIO                                   */}
      {/* Left (8 cols): Always-Visible Interactive Canvas with Live Flip-Through  */}
      {/* Right (4 cols): Logical 4-Phase Task Control Panel                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ======================================================================= */}
        {/* LEFT CANVAS WORKSPACE (ALWAYS PROMINENT & VISIBLE)                      */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 space-y-3">
          <Card padding="sm" className="relative overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col items-center border border-slate-200 dark:border-slate-800 shadow-2xs">
            
            {/* Live Recipient Flip-Through Navigator Header */}
            <div className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 rounded-t-xl text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Live Previewing:</span>

                {dataMode === "sheet" && students.length > 0 ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={() => setPreviewStudentIndex((i) => Math.max(0, i - 1))}
                      disabled={previewStudentIndex === 0}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Previous Recipient"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                      {activeStudent.name}
                    </span>
                    <button
                      onClick={() => setPreviewStudentIndex((i) => Math.min(students.length - 1, i + 1))}
                      disabled={previewStudentIndex >= students.length - 1}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Next Recipient"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <Badge variant="primary">{previewStudentIndex + 1}/{students.length}</Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{activeStudent.name}</span>
                    <Badge variant="success">Custom One-Off</Badge>
                  </div>
                )}
              </div>

              {/* Canvas Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCanvasZoom((z) => Math.max(0.5, z - 0.1))}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 w-9 text-center">
                  {Math.round(canvasZoom * 100)}%
                </span>
                <button
                  onClick={() => setCanvasZoom((z) => Math.min(1.5, z + 0.1))}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCanvasZoom(1)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Display Viewport with Real-Time Mouse Events */}
            <div className="w-full p-4 flex items-center justify-center overflow-auto bg-slate-200/60 dark:bg-slate-950/80 min-h-[500px]">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseLeave}
                className="max-w-full h-auto rounded-xl shadow-lg border border-slate-300 dark:border-slate-800 select-none transition-transform"
                style={{
                  maxHeight: "560px",
                  cursor: canvasCursor,
                  transform: `scale(${canvasZoom})`,
                  transformOrigin: "center center",
                }}
              />
            </div>

            {/* Interactive Canvas Footer */}
            <div className="w-full flex flex-wrap items-center justify-between p-3 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 rounded-b-xl gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5 text-blue-500" />}
                  onClick={() => handleDownloadSingle("png")}
                >
                  Download PNG
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5 text-emerald-500" />}
                  onClick={() => handleDownloadSingle("pdf")}
                >
                  Download PDF
                </Button>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Move className="w-3 h-3 text-indigo-500" />
                  <span>Drag & Drop with mouse | Arrow keys to nudge (1px/10px)</span>
                </span>
                <span>•</span>
                <span className="font-mono">
                  {template.width} × {template.height}px
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT CONTROL PANEL (DEEPLY LOGICAL 4-PHASE WORKFLOW)                  */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Top 4-Phase Stepper Tabs */}
          <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setActiveTab("data")}
              className={`py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                activeTab === "data"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              1. Data
            </button>
            <button
              onClick={() => setActiveTab("artwork")}
              className={`py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                activeTab === "artwork"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              2. Artwork
            </button>
            <button
              onClick={() => setActiveTab("fields")}
              className={`py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                activeTab === "fields"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              3. Fields
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                activeTab === "export"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              4. Export
            </button>
          </div>

          {/* ===================================================================== */}
          {/* TAB 1: DATA & RECIPIENTS (SPREADSHEET SCOPING OR INDIVIDUAL CUSTOM)    */}
          {/* ===================================================================== */}
          {activeTab === "data" && (
            <Card padding="md" className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>Recipient Data Source</span>
                </span>
                <span className="text-[11px] text-slate-400">Step 1 of 4</span>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDataMode("sheet")}
                  className={`p-2 rounded-xl text-center font-semibold border cursor-pointer ${
                    dataMode === "sheet"
                      ? "bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  Spreadsheet ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDataMode("individual")}
                  className={`p-2 rounded-xl text-center font-semibold border cursor-pointer ${
                    dataMode === "individual"
                      ? "bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  One-Off Custom
                </button>
              </div>

              {dataMode === "sheet" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className={THEME.typography.label}>Target Generation Scope:</label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <input
                          type="radio"
                          name="scope"
                          checked={generationScope === "all"}
                          onChange={() => setGenerationScope("all")}
                          className="text-blue-600"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          All Records ({students.length} Total)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <input
                          type="radio"
                          name="scope"
                          checked={generationScope === "range"}
                          onChange={() => setGenerationScope("range")}
                          className="text-blue-600"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Custom Row Range
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            e.g. 1–3 for Champions, 4–50 for Participants
                          </span>
                        </div>
                      </label>

                      {generationScope === "range" && (
                        <div className="pl-6 space-y-1">
                          <input
                            type="text"
                            value={customRangeText}
                            onChange={(e) => setCustomRangeText(e.target.value)}
                            placeholder="e.g. 1-10, 20-30, 45"
                            className={`${THEME.surface.input} font-mono py-1`}
                          />
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">
                            Matched: {targetedRecords.length} student certificates
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300">
                    Use the ◀ / ▶ arrows above the canvas to preview each recipient's actual certificate before generating!
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => setActiveTab("artwork")}
                  >
                    Next: Artwork & Template
                  </Button>
                </div>
              ) : (
                /* One-Off Individual Custom Entry Form */
                <div className="space-y-3">
                  <div>
                    <label className={THEME.typography.label}>Recipient Name:</label>
                    <input
                      type="text"
                      value={customStudent.name}
                      onChange={(e) => setCustomStudent({ ...customStudent, name: e.target.value })}
                      className={`${THEME.surface.input} mt-1`}
                    />
                  </div>

                  <div>
                    <label className={THEME.typography.label}>ID / Roll:</label>
                    <input
                      type="text"
                      value={customStudent.id}
                      onChange={(e) => setCustomStudent({ ...customStudent, id: e.target.value })}
                      className={`${THEME.surface.input} mt-1 font-mono`}
                    />
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Course Teacher / Advisor:</label>
                    <input
                      type="text"
                      value={String(customStudent["Course Teacher / Advisor"] || customStudent.advisor || "")}
                      onChange={(e) =>
                        setCustomStudent({
                          ...customStudent,
                          "Course Teacher / Advisor": e.target.value,
                          advisor: e.target.value,
                        })
                      }
                      className={`${THEME.surface.input} mt-1`}
                    />
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Contest Team Name:</label>
                    <input
                      type="text"
                      value={String(customStudent["Team Name"] || "")}
                      onChange={(e) =>
                        setCustomStudent({
                          ...customStudent,
                          "Team Name": e.target.value,
                        })
                      }
                      className={`${THEME.surface.input} mt-1`}
                    />
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Award / Position Title:</label>
                    <input
                      type="text"
                      value={customStudent.extra?.position || ""}
                      onChange={(e) =>
                        setCustomStudent({
                          ...customStudent,
                          extra: { ...customStudent.extra, position: e.target.value },
                        })
                      }
                      className={`${THEME.surface.input} mt-1`}
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => setActiveTab("artwork")}
                  >
                    Next: Artwork & Template
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: ARTWORK & TEMPLATE (ILLUSTRATOR / PHOTOSHOP BACKGROUND)        */}
          {/* ===================================================================== */}
          {activeTab === "artwork" && (
            <Card padding="md" className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-purple-500" />
                  <span>Artwork & Background</span>
                </span>
                <span className="text-[11px] text-slate-400">Step 2 of 4</span>
              </div>

              {/* Illustrator / Photoshop Import Dropzone */}
              <div
                onClick={() => bgInputRef.current?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 bg-slate-50 dark:bg-slate-950/60 text-center cursor-pointer transition-all space-y-1.5"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                  Import Illustrator / Photoshop Template
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Drop high-res PNG, JPEG, or SVG export. Auto-matches aspect ratio.
                </p>
              </div>

              {/* Blank Slate Mode Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Default Decorative Borders:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = CertificateTemplate.fromJSON(template.toJSON());
                      updated.showDecorativeBorders = !template.showDecorativeBorders;
                      setTemplate(updated);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      template.showDecorativeBorders
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    }`}
                  >
                    {template.showDecorativeBorders ? "Enabled (Built-in)" : "Disabled (Photoshop Blank)"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Disable built-in borders when using your own Illustrator design with premade borders.
                </p>
              </div>

              {/* Canvas Dimensions Presets */}
              <div className="space-y-1.5">
                <label className={THEME.typography.label}>Dimensions & Aspect Ratio:</label>
                <select
                  onChange={(e) => handleDimensionsPreset(e.target.value as any)}
                  className={`${THEME.surface.select} py-1.5 font-medium`}
                  value={
                    template.width === 1920 && template.height === 1080
                      ? "web"
                      : template.width === 3508 && template.height === 2480
                      ? "a4-land"
                      : template.width === 2480 && template.height === 3508
                      ? "a4-port"
                      : template.width === 3300 && template.height === 2550
                      ? "us-letter"
                      : "web"
                  }
                >
                  <option value="web">🖥️ Web 16:9 Landscape (1920 × 1080 px)</option>
                  <option value="a4-land">📜 Print A4 Landscape (3508 × 2480 px, 300 DPI)</option>
                  <option value="a4-port">📄 Print A4 Portrait (2480 × 3508 px, 300 DPI)</option>
                  <option value="us-letter">🖨️ US Letter Landscape (3300 × 2550 px)</option>
                </select>
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <label className={THEME.typography.label}>Or Pick a Curated Preset:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "academic", label: "🏛️ Academic" },
                    { key: "hackathon", label: "🏆 Contest" },
                    { key: "summit", label: "🌐 Summit" },
                    { key: "minimal", label: "📐 Swiss" },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => handleApplyPreset(p.key)}
                      className={`px-2 py-1 rounded-lg border text-left font-semibold cursor-pointer ${
                        activePreset === p.key
                          ? "bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={() => setActiveTab("fields")}
              >
                Next: Place Information Fields
              </Button>
            </Card>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: FIELDS & PLACEMENT ("WHAT TO ADD, WHERE TO ADD, HOW TO ADD")    */}
          {/* ===================================================================== */}
          {activeTab === "fields" && (
            <Card padding="md" className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-emerald-500" />
                  <span>Information & Field Placement</span>
                </span>
                <span className="text-[11px] text-slate-400">Step 3 of 4</span>
              </div>

              {/* Information Fields Selector List */}
              <div className="space-y-1.5">
                <label className={THEME.typography.label}>
                  Click to Place / Select Field on Canvas:
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {availableFields.map((field) => {
                    const isPlaced = template
                      .getElements()
                      .some((el) => el.type === "text" && (el as TextElement).text.includes(field.tag));

                    return (
                      <div
                        key={field.tag}
                        onClick={() => handleSelectOrAddField(field.tag, field.label, field.defaultSize)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isPlaced
                            ? "bg-blue-50/70 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs flex items-center gap-1.5">
                            <span>{field.label}</span>
                            <span className="font-mono text-[10px] text-slate-400">{field.tag}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">{field.desc}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isPlaced
                            ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}>
                          {isPlaced ? "On Canvas" : "+ Add"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Typography / Inspector for Selected Element */}
              {selectedElement && selectedElement.type === "text" && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider">
                      Edit Selected Layer Styling
                    </span>
                    <button
                      onClick={() => removeElement(selectedElement.id)}
                      className="text-rose-500 hover:text-rose-600 text-xs p-0.5 cursor-pointer"
                      title="Delete layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Google Font Family:</label>
                    <select
                      value={(selectedElement as TextElement).fontFamily}
                      onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                      className={`${THEME.surface.select} mt-1 font-medium`}
                    >
                      {CERTIFICATE_FONT_GROUPS.map((grp) => (
                        <optgroup key={grp.group} label={grp.group}>
                          {grp.fonts.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={THEME.typography.label}>
                        Size: {(selectedElement as TextElement).fontSize}px
                      </label>
                      <input
                        type="range"
                        min={12}
                        max={140}
                        value={(selectedElement as TextElement).fontSize}
                        onChange={(e) => updateSelectedElement({ fontSize: Number(e.target.value) })}
                        className="w-full mt-1 accent-blue-600"
                      />
                    </div>
                    <div>
                      <label className={THEME.typography.label}>Weight:</label>
                      <select
                        value={(selectedElement as TextElement).fontWeight}
                        onChange={(e) => updateSelectedElement({ fontWeight: e.target.value })}
                        className={`${THEME.surface.select} mt-1`}
                      >
                        <option value="300">Light (300)</option>
                        <option value="normal">Regular (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="bold">Bold (700)</option>
                        <option value="800">Black (800)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={THEME.typography.label}>Color:</label>
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="color"
                          value={(selectedElement as TextElement).color}
                          onChange={(e) => updateSelectedElement({ color: e.target.value })}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <input
                          type="text"
                          value={(selectedElement as TextElement).color}
                          onChange={(e) => updateSelectedElement({ color: e.target.value })}
                          className={`${THEME.surface.input} font-mono text-xs py-1`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={THEME.typography.label}>Align:</label>
                      <select
                        value={(selectedElement as TextElement).align}
                        onChange={(e) => updateSelectedElement({ align: e.target.value })}
                        className={`${THEME.surface.select} mt-1`}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={() => setActiveTab("export")}
              >
                Next: Export & Dispatch
              </Button>
            </Card>
          )}

          {/* ===================================================================== */}
          {/* TAB 4: EXPORT & DISPATCH (SINGLE VS BULK DISPATCH)                    */}
          {/* ===================================================================== */}
          {activeTab === "export" && (
            <Card padding="md" className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-emerald-500" />
                  <span>Generate & Export</span>
                </span>
                <span className="text-[11px] text-slate-400">Step 4 of 4</span>
              </div>

              {/* Single Certificate Dispatch */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Single Certificate:</span>
                  <Badge variant="primary">{activeStudent.name}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="justify-center"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadSingle("png")}
                  >
                    Download PNG
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="justify-center"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadSingle("pdf")}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Bulk Certificate Batch Dispatch */}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Bulk Batch Generation:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {targetedRecords.length} Ready
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div>Scope: <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{generationScope === "all" ? "All Sheet Rows" : `Rows ${customRangeText}`}</span></div>
                  <div>Output: <span className="font-semibold text-slate-700 dark:text-slate-300">{exportFormat === "merged-pdf" ? "Merged PDF" : "ZIP Archive"}</span></div>
                </div>

                <Button
                  variant="success"
                  size="sm"
                  className="w-full justify-center"
                  leftIcon={<Play className="w-4 h-4" />}
                  onClick={() => setIsGenModalOpen(true)}
                >
                  Launch Bulk Generator ({targetedRecords.length} Certs)
                </Button>
              </div>
            </Card>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* BULK GENERATION MODAL                                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => !isGenerating && setIsGenModalOpen(false)}
        title="1,000+ Bulk Certificate Generation Engine"
        subtitle="Processes locally in browser memory without server timeouts or costs"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            {isGenerating ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  cancelRef.current = true;
                }}
              >
                Cancel Generation
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIsGenModalOpen(false)}>
                Close
              </Button>
            )}

            {!isGenerating && (
              <Button
                variant="success"
                leftIcon={<Play className="w-4 h-4" />}
                onClick={startBulkGeneration}
              >
                Start Generating ({targetedRecords.length} Records)
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {!isGenerating ? (
            <div className="space-y-4">
              <div>
                <label className={THEME.typography.label}>Select Export Format:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div
                    onClick={() => setExportFormat("zip-pdf")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      exportFormat === "zip-pdf"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">ZIP of PDFs</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Individual print-ready PDF per student.
                    </p>
                  </div>

                  <div
                    onClick={() => setExportFormat("zip-png")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      exportFormat === "zip-png"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <Archive className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">ZIP of PNGs</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      High-resolution images with custom filenames.
                    </p>
                  </div>

                  <div
                    onClick={() => setExportFormat("merged-pdf")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      exportFormat === "merged-pdf"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">Single Merged PDF</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      All pages merged into one file for university printing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Targeted Records:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{targetedRecords.length} Students</span>
                </div>
                <div className="flex justify-between">
                  <span>Scope Filter:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium capitalize">
                    {generationScope === "all" ? "All Sheet Rows" : generationScope === "range" ? `Rows ${customRangeText}` : "Filtered Group"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Local Processing Time:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ~{Math.max(1, Math.round(targetedRecords.length * 0.04))} seconds (Local CPU)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Serverless Quota Consumed:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">0 ms ($0.00 Vercel Cost)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 space-y-4 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/15 text-indigo-400 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Generating Certificates in Background...
                </h4>
                <p className="text-xs text-slate-400 mt-1">{progress.statusText}</p>
              </div>

              <ProgressBar
                progress={progress.percentage}
                label={`Progress: ${progress.current} / ${progress.total}`}
                sublabel={`${progress.percentage}% Complete`}
                variant="primary"
                size="lg"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
