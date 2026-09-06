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
  ChevronRight,
  Database,
  Printer,
  Search,
  Filter,
  Users,
  Calendar,
  GraduationCap,
  Hash,
} from "lucide-react";

export interface CertificateStudioViewProps {
  students: StudentRecord[];
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
}) => {
  // =========================================================================
  // GUIDED 3-STEP PIPELINE NAVIGATION STATE
  // =========================================================================
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(2);

  // Data Source Mode in Step 1: "sheet" (bulk dataset) vs "individual" (one-off custom certificate)
  const [dataSourceMode, setDataSourceMode] = useState<"sheet" | "individual">("sheet");

  // Step 1: One-Off Custom Individual Entry Form
  const [customStudent, setCustomStudent] = useState<StudentRecord>({
    id: "VIP-2026-001",
    name: "Dr. Eleanor Vance",
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

  // Active Template State
  const [template, setTemplate] = useState<CertificateTemplate>(() =>
    createPresetTemplate("academic")
  );

  // Active Template Preset Name
  const [activePreset, setActivePreset] = useState<string>("academic");

  // Step 3: Scoping & Range Filtering State
  const [generationScope, setGenerationScope] = useState<"all" | "range" | "filter">("all");
  const [customRangeText, setCustomRangeText] = useState<string>("1-20, 25-40");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");

  // Selected Student for Live Preview
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);

  // Active Student: Depends on whether user is in individual custom mode or sheet mode
  const activeStudent: StudentRecord = useMemo(() => {
    if (dataSourceMode === "individual") {
      return customStudent;
    }
    if (students.length > 0 && students[selectedStudentIndex]) {
      return students[selectedStudentIndex];
    }
    return customStudent;
  }, [dataSourceMode, customStudent, students, selectedStudentIndex]);

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

  // Extract distinct teams & departments for Step 3 filter
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

  // Compute records targeted by Step 3 scoping criteria
  const targetedRecords = useMemo(() => {
    if (dataSourceMode === "individual") {
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
  }, [dataSourceMode, customStudent, students, generationScope, customRangeText, filterTeam, filterDept]);

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

  // Convert Mouse Coordinates to Canvas Space
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
        updated.updateElement(selectedEl.id, { fontSize: newSize });
      } else if (selectedEl.type === "qr") {
        const newSize = Math.max(60, Math.min(400, Math.round(resizeInitial.initialVal + delta * 0.6)));
        updated.updateElement(selectedEl.id, { size: newSize });
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
  // RE-RENDER PREVIEW CANVAS (Runs in Step 2 & Live Preview)
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
  }, [template, activeStudent, bgImage, selectedElementId, snapGuides, getElementBounds, currentStep]);

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

  const addDynamicTagElement = (tag: string) => {
    const newEl = new TextElement({
      id: `text-${Date.now()}`,
      x: template.width / 2,
      y: template.height / 2,
      text: tag,
      fontSize: 32,
      fontFamily: "Outfit",
      color: "#38BDF8",
      align: "center",
      fontWeight: "bold",
    });
    const updated = CertificateTemplate.fromJSON(template.toJSON());
    updated.addElement(newEl);
    setTemplate(updated);
    setSelectedElementId(newEl.id);
  };

  const addTextElement = () => addDynamicTagElement("New Text Layer");

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

  return (
    <div className="w-full space-y-5">
      {/* ========================================================================= */}
      {/* GUIDED 3-STEP PIPELINE NAVIGATION HEADER                                 */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Certificate Studio & Guided Generation Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step-by-step workflow: Connect data & fields ➔ Design canvas ➔ Scope generation (Single or Custom Ranges).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="primary">
              {dataSourceMode === "individual"
                ? "One-Off Custom Mode"
                : `${students.length} Records Connected`}
            </Badge>
          </div>
        </div>

        {/* 3-Step Guided Stepper Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-3 ${
              currentStep === 1
                ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-2xs"
                : "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 1 ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}>
              1
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Data & Fields</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {dataSourceMode === "individual" ? "One-Off Custom Entry" : `${students.length} Sheet Rows`}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-3 ${
              currentStep === 2
                ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-2xs"
                : "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 2 ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}>
              2
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Design & Canvas</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Photoshop Template, Fonts & Drag-and-Drop
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-3 ${
              currentStep === 3
                ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-2xs"
                : "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 3 ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}>
              3
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Generate & Scope</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Single or Bulk (e.g. Rows 20–30, 40–70)
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: DATA SOURCE & FIELD MAPPING VIEW                                 */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Select Data Ingestion Mode
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose between connected spreadsheet data or filling in a one-off custom individual certificate.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDataSourceMode("sheet")}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-xs border cursor-pointer transition-all ${
                    dataSourceMode === "sheet"
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  Bulk Spreadsheet Data ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDataSourceMode("individual")}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-xs border cursor-pointer transition-all ${
                    dataSourceMode === "individual"
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  One-Off Custom Individual Entry
                </button>
              </div>
            </div>

            {dataSourceMode === "sheet" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 font-medium">Total Connected Records</span>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                      {students.length} <span className="text-xs text-slate-400 font-normal">Students</span>
                    </h4>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 font-medium">Contest Teams Detected</span>
                    <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {distinctTeams.length} <span className="text-xs text-slate-400 font-normal">Teams</span>
                    </h4>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 font-medium">Departments</span>
                    <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {distinctDepts.length} <span className="text-xs text-slate-400 font-normal">Academic Depts</span>
                    </h4>
                  </div>
                </div>

                {/* Field Mapping Guide */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Certificate Field Mapping Reference:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                    {[
                      { label: "Recipient Name", tag: "{{Name}}", desc: "Maps to student's full name" },
                      { label: "Course Teacher / Advisor", tag: "{{Course_Teacher}}", desc: "Assigned faculty advisor" },
                      { label: "Contest Team", tag: "{{Team_Name}}", desc: "Participant's team name" },
                      { label: "Academic Department", tag: "{{Department}}", desc: "Student department or faculty" },
                      { label: "Student ID / Roll", tag: "{{Student_ID}}", desc: "Unique registration code" },
                      { label: "Award Title / Rank", tag: "{{Position}}", desc: "Winner rank or honor title" },
                      { label: "Project Title", tag: "{{Project_Title}}", desc: "Contest project submission title" },
                      { label: "Issue Date", tag: "{{Date}}", desc: "Formatted certificate date" },
                      { label: "Verification Hash", tag: "{{Certificate_No}}", desc: "Unique QR serial hash" },
                    ].map((mapItem) => (
                      <div
                        key={mapItem.label}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{mapItem.label}</span>
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {mapItem.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{mapItem.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* One-Off Individual Custom Entry Form */
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                  Fill in this form to generate a custom certificate for a specific person (e.g. guest speaker, VIP, or individual award winner) without needing an Excel sheet.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className={THEME.typography.label}>Full Name:</label>
                    <input
                      type="text"
                      value={customStudent.name}
                      onChange={(e) => setCustomStudent({ ...customStudent, name: e.target.value })}
                      className={`${THEME.surface.input} mt-1`}
                    />
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Student ID / Roll / Code:</label>
                    <input
                      type="text"
                      value={customStudent.id}
                      onChange={(e) => setCustomStudent({ ...customStudent, id: e.target.value })}
                      className={`${THEME.surface.input} mt-1 font-mono`}
                    />
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Department / Faculty:</label>
                    <input
                      type="text"
                      value={customStudent.department || ""}
                      onChange={(e) => setCustomStudent({ ...customStudent, department: e.target.value })}
                      className={`${THEME.surface.input} mt-1`}
                    />
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Course Teacher / Advisor / Supervisor:</label>
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
                    <label className={THEME.typography.label}>Award Title / Rank / Position:</label>
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
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="primary"
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={() => setCurrentStep(2)}
              >
                Proceed to Step 2: Design Certificate Layout
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CERTIFICATE DESIGN & CANVAS LAYOUT VIEW                          */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {/* Preset Picker & Dimensions Bar */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Designer Presets:
              </span>
              {[
                { key: "academic", label: "University Honor", icon: "🏛️" },
                { key: "hackathon", label: "Contest Champion", icon: "🏆" },
                { key: "summit", label: "Tech Summit", icon: "🌐" },
                { key: "minimal", label: "Swiss Modern", icon: "📐" },
                { key: "illustrator-blank", label: "Photoshop/Illustrator Blank Slate", icon: "🎨" },
              ].map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handleApplyPreset(preset.key)}
                  className={`px-3 py-1.5 rounded-xl font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePreset === preset.key
                      ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            {/* Dimension Aspect Presets */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Dimensions:
              </span>
              <select
                onChange={(e) => handleDimensionsPreset(e.target.value as any)}
                className={`${THEME.surface.select} py-1 text-xs`}
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
                <option value="web">🖥️ Web 16:9 (1920 × 1080 px)</option>
                <option value="a4-land">📜 Print A4 Landscape (3508 × 2480 px, 300 DPI)</option>
                <option value="a4-port">📄 Print A4 Portrait (2480 × 3508 px, 300 DPI)</option>
                <option value="us-letter">🖨️ US Letter Landscape (3300 × 2550 px)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Placeholder Tag Inserter Strip */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Insert Dynamic Placeholder:</span>
            </span>
            {[
              { label: "Name", tag: "{{Name}}" },
              { label: "Student ID", tag: "{{Student_ID}}" },
              { label: "Advisor / Teacher", tag: "{{Course_Teacher}}" },
              { label: "Team Name", tag: "{{Team_Name}}" },
              { label: "Department", tag: "{{Department}}" },
              { label: "College", tag: "{{College}}" },
              { label: "Project Title", tag: "{{Project_Title}}" },
              { label: "Rank / Position", tag: "{{Position}}" },
              { label: "Issue Date", tag: "{{Date}}" },
              { label: "Cert Hash", tag: "{{Certificate_No}}" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => addDynamicTagElement(item.tag)}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shadow-2xs"
              >
                +{item.label}
              </button>
            ))}
          </div>

          {/* Main Studio Grid: Left Canvas, Right Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side: Interactive Canvas (8 cols) */}
            <div className="lg:col-span-8 space-y-3">
              <Card padding="sm" className="relative overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col items-center border border-slate-200 dark:border-slate-800">
                {/* Live Student Record Switcher & Canvas Controls */}
                <div className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 rounded-t-xl text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Live Previewing:</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">{activeStudent.name}</span>
                    <Badge variant="primary">{activeStudent.id}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {dataSourceMode === "sheet" && students.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px]">
                          Row {selectedStudentIndex + 1}/{students.length}
                        </span>
                        <select
                          value={selectedStudentIndex}
                          onChange={(e) => setSelectedStudentIndex(Number(e.target.value))}
                          className={`${THEME.surface.inputSm} w-32`}
                        >
                          {students.map((s, idx) => (
                            <option key={s.id} value={idx}>
                              {idx + 1}. {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Canvas Zoom Controls */}
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
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
                </div>

                {/* Canvas Display Viewport with Mouse Events */}
                <div className="w-full p-4 flex items-center justify-center overflow-auto bg-slate-200/60 dark:bg-slate-950/80 min-h-[480px]">
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

                {/* Canvas Toolbar Footer */}
                <div className="w-full flex flex-wrap items-center justify-between p-3 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 rounded-b-xl gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={addTextElement}
                    >
                      Add Text Layer
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<QrCode className="w-3.5 h-3.5 text-blue-500" />}
                      onClick={addQrElement}
                    >
                      Add Dynamic QR
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Move className="w-3 h-3 text-indigo-500" />
                      <span>Click & Drag elements on canvas | Arrow keys to nudge</span>
                    </span>
                    <span>•</span>
                    <span className="font-mono">
                      {template.width} × {template.height}px
                    </span>
                  </div>
                </div>
              </Card>

              {/* Bottom Stepper Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="secondary" size="sm" onClick={() => setCurrentStep(1)}>
                  ← Back to Step 1: Data
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setCurrentStep(3)}
                >
                  Proceed to Step 3: Scope & Generate →
                </Button>
              </div>
            </div>

            {/* Right Side: Element Inspector & Typography Controls (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <Card padding="md" className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Element Inspector
                    </h3>
                  </div>
                  {selectedElement && (
                    <button
                      onClick={() => removeElement(selectedElement.id)}
                      className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                      title="Delete layer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Element Selector Dropdown */}
                <div>
                  <label className={THEME.typography.label}>Selected Layer:</label>
                  <select
                    value={selectedElementId || ""}
                    onChange={(e) => setSelectedElementId(e.target.value)}
                    className={`${THEME.surface.select} mt-1 font-medium`}
                  >
                    {template.getElements().map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.type === "text"
                          ? `Text: "${(el as TextElement).text.slice(0, 24)}..."`
                          : `QR Code (${el.id})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Properties for Text Element */}
                {selectedElement && selectedElement.type === "text" && (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <label className={THEME.typography.label}>Text Content / Tags:</label>
                      <input
                        type="text"
                        value={(selectedElement as TextElement).text}
                        onChange={(e) => updateSelectedElement({ text: e.target.value })}
                        className={`${THEME.surface.input} mt-1 font-mono text-xs`}
                      />
                    </div>

                    {/* Typography: Font Family Selector (Grouped 15+ Google Fonts) */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={THEME.typography.label}>Google Font Family:</label>
                        <span
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono"
                          style={{ fontFamily: `"${(selectedElement as TextElement).fontFamily}", sans-serif` }}
                        >
                          Sample
                        </span>
                      </div>
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

                    {/* Font Size & Weight */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={THEME.typography.label}>
                          Font Size: {(selectedElement as TextElement).fontSize}px
                        </label>
                        <input
                          type="range"
                          min={12}
                          max={140}
                          value={(selectedElement as TextElement).fontSize}
                          onChange={(e) => updateSelectedElement({ fontSize: Number(e.target.value) })}
                          className="w-full mt-1.5 accent-blue-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className={THEME.typography.label}>Font Weight:</label>
                        <select
                          value={(selectedElement as TextElement).fontWeight}
                          onChange={(e) => updateSelectedElement({ fontWeight: e.target.value })}
                          className={`${THEME.surface.select} mt-1`}
                        >
                          <option value="300">Light (300)</option>
                          <option value="normal">Regular (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="bold">Bold (700)</option>
                          <option value="800">Extra Bold (800)</option>
                        </select>
                      </div>
                    </div>

                    {/* Text Color & Alignment */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={THEME.typography.label}>Text Color:</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={(selectedElement as TextElement).color}
                            onChange={(e) => updateSelectedElement({ color: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
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
                        <label className={THEME.typography.label}>Alignment:</label>
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

                    {/* Letter Spacing (Tracking) & Text Transform */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={THEME.typography.label}>
                          Letter Spacing: {(selectedElement as TextElement).letterSpacing || 0}px
                        </label>
                        <input
                          type="range"
                          min={-2}
                          max={16}
                          value={(selectedElement as TextElement).letterSpacing || 0}
                          onChange={(e) => updateSelectedElement({ letterSpacing: Number(e.target.value) })}
                          className="w-full mt-1.5 accent-blue-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className={THEME.typography.label}>Text Transform:</label>
                        <select
                          value={(selectedElement as TextElement).textTransform || "none"}
                          onChange={(e) => updateSelectedElement({ textTransform: e.target.value })}
                          className={`${THEME.surface.select} mt-1`}
                        >
                          <option value="none">Normal</option>
                          <option value="uppercase">UPPERCASE</option>
                          <option value="lowercase">lowercase</option>
                        </select>
                      </div>
                    </div>

                    {/* Text Shadow / Glow (Essential for contrast on Photoshop/Illustrator artwork) */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Drop Shadow & Glow Effect:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedElement({
                              shadowColor: (selectedElement as TextElement).shadowColor ? undefined : "rgba(0,0,0,0.8)",
                              shadowBlur: (selectedElement as TextElement).shadowBlur ? 0 : 8,
                            })
                          }
                          className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold cursor-pointer"
                        >
                          {(selectedElement as TextElement).shadowBlur ? "Disable" : "Enable Glow"}
                        </button>
                      </div>

                      {(selectedElement as TextElement).shadowBlur ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="text-[10px] text-slate-400">Glow Blur:</label>
                            <input
                              type="range"
                              min={1}
                              max={30}
                              value={(selectedElement as TextElement).shadowBlur || 8}
                              onChange={(e) => updateSelectedElement({ shadowBlur: Number(e.target.value) })}
                              className="w-full accent-blue-600"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">Glow Color:</label>
                            <input
                              type="color"
                              value={(selectedElement as TextElement).shadowColor || "#000000"}
                              onChange={(e) => updateSelectedElement({ shadowColor: e.target.value })}
                              className="w-full h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* X and Y Exact Coordinates */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className={THEME.typography.label}>Position X (px):</label>
                        <input
                          type="number"
                          value={selectedElement.x}
                          onChange={(e) => updateSelectedElement({ x: Number(e.target.value) })}
                          className={`${THEME.surface.input} mt-1`}
                        />
                      </div>
                      <div>
                        <label className={THEME.typography.label}>Position Y (px):</label>
                        <input
                          type="number"
                          value={selectedElement.y}
                          onChange={(e) => updateSelectedElement({ y: Number(e.target.value) })}
                          className={`${THEME.surface.input} mt-1`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Properties for QR Element */}
                {selectedElement && selectedElement.type === "qr" && (
                  <div className="space-y-3 pt-2 text-xs">
                    <div>
                      <label className={THEME.typography.label}>Verification URL / Payload:</label>
                      <input
                        type="text"
                        value={(selectedElement as QrElement).payloadPattern}
                        onChange={(e) =>
                          updateSelectedElement({ payloadPattern: e.target.value })
                        }
                        className={`${THEME.surface.input} mt-1 font-mono text-xs`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={THEME.typography.label}>Size (px):</label>
                        <input
                          type="number"
                          value={(selectedElement as QrElement).size}
                          onChange={(e) =>
                            updateSelectedElement({ size: Number(e.target.value) })
                          }
                          className={`${THEME.surface.input} mt-1`}
                        />
                      </div>

                      <div>
                        <label className={THEME.typography.label}>QR Foreground:</label>
                        <input
                          type="color"
                          value={(selectedElement as QrElement).fgColor}
                          onChange={(e) => updateSelectedElement({ fgColor: e.target.value })}
                          className="w-full h-9 mt-1 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={THEME.typography.label}>Position X:</label>
                        <input
                          type="number"
                          value={selectedElement.x}
                          onChange={(e) => updateSelectedElement({ x: Number(e.target.value) })}
                          className={`${THEME.surface.input} mt-1`}
                        />
                      </div>
                      <div>
                        <label className={THEME.typography.label}>Position Y:</label>
                        <input
                          type="number"
                          value={selectedElement.y}
                          onChange={(e) => updateSelectedElement({ y: Number(e.target.value) })}
                          className={`${THEME.surface.input} mt-1`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Background & Decorative Borders Settings */}
              <Card padding="md" className="space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    Artwork & Background
                  </span>
                  {bgImage && (
                    <button
                      onClick={() => setBgImage(null)}
                      className="text-rose-500 hover:text-rose-600 text-[11px] cursor-pointer"
                    >
                      Remove Background
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Default Decorative Borders:</span>
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
                    {template.showDecorativeBorders ? "Enabled (SVG)" : "Disabled (Blank)"}
                  </button>
                </div>

                {bgImage && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Background Dimmer:</span>
                      <span className="font-mono text-slate-500">{Math.round((template.backgroundDim || 0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.8}
                      step={0.05}
                      value={template.backgroundDim || 0}
                      onChange={(e) => {
                        const updated = CertificateTemplate.fromJSON(template.toJSON());
                        updated.backgroundDim = Number(e.target.value);
                        setTemplate(updated);
                      }}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: GENERATION SCOPE & OUTPUT DISPATCH VIEW                           */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <Card padding="md" className="space-y-5">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Certificate Generation Scope & Dispatch
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate for a single recipient, all rows, or specify custom row numbers (e.g. 20–30, 40–70).
              </p>
            </div>

            {/* Mode A: Single Certificate Dispatch */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Option A: Single Certificate Generation
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Generate and download high-DPI certificate for the current active student ({activeStudent.name}).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4 text-blue-500" />}
                    onClick={() => handleDownloadSingle("png")}
                  >
                    Download PNG
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={() => handleDownloadSingle("pdf")}
                  >
                    Download Vector PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Mode B: Bulk Certificate Engine & Scoping */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Option B: Bulk Certificate Generation
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose which records to generate: all records, custom row numbers (e.g. 20–30), or filtered groups.
                </p>
              </div>

              {/* Scoping Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setGenerationScope("all")}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    generationScope === "all"
                      ? "bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>All Records</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Generate for all {students.length || 1} records in the dataset (Rows 1 to {students.length || 1}).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGenerationScope("range")}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    generationScope === "range"
                      ? "bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Custom Row Range</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Specify exact row numbers or ranges (e.g. 20–30, 40–70, 85).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGenerationScope("filter")}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    generationScope === "filter"
                      ? "bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Filter by Team / Dept</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Generate only for a chosen contest team or academic department.
                  </p>
                </button>
              </div>

              {/* Custom Row Range Input Box */}
              {generationScope === "range" && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Enter Row Numbers / Ranges (1-indexed based on sheet rows):
                    </label>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {targetedRecords.length} Rows Matched
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customRangeText}
                    onChange={(e) => setCustomRangeText(e.target.value)}
                    placeholder="e.g. 20-30, 40-70, 85"
                    className={`${THEME.surface.input} font-mono`}
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                    <span className="text-slate-400">Quick ranges:</span>
                    {[
                      { label: "First 10 (1-10)", val: "1-10" },
                      { label: "Rows 11-30", val: "11-30" },
                      { label: "Rows 20-40", val: "20-40" },
                      { label: "Last 20 Rows", val: `${Math.max(1, students.length - 19)}-${students.length}` },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCustomRangeText(preset.val)}
                        className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter by Team / Dept Inputs */}
              {generationScope === "filter" && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Filter by Contest Team:
                    </label>
                    <select
                      value={filterTeam}
                      onChange={(e) => setFilterTeam(e.target.value)}
                      className={THEME.surface.select}
                    >
                      <option value="all">All Teams</option>
                      {distinctTeams.map((t) => (
                        <option key={t} value={t}>
                          Team: {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Filter by Academic Department:
                    </label>
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      className={THEME.surface.select}
                    >
                      <option value="all">All Departments</option>
                      {distinctDepts.map((d) => (
                        <option key={d} value={d}>
                          Dept: {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Generation Scope Summary Pill Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Target Ready: {targetedRecords.length} Certificates
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({Math.round((targetedRecords.length / Math.max(1, students.length)) * 100)}% of dataset)
                  </span>
                </div>

                <Button
                  variant="success"
                  size="sm"
                  leftIcon={<Play className="w-4 h-4" />}
                  onClick={() => setIsGenModalOpen(true)}
                >
                  Launch Bulk Generator ({targetedRecords.length} Certs)
                </Button>
              </div>

              {/* Scoped Table Preview */}
              <div className="space-y-2 pt-1 text-xs">
                <h5 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  Records in Generation Scope (First 10 Preview):
                </h5>
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 sticky top-0">
                      <tr>
                        <th className="p-2">Row #</th>
                        <th className="p-2">Student ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Dept</th>
                        <th className="p-2">Team Name</th>
                        <th className="p-2">Course Teacher / Advisor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {targetedRecords.slice(0, 10).map((r, idx) => (
                        <tr key={r.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-mono">{r.id}</td>
                          <td className="p-2 font-semibold text-slate-900 dark:text-white">{r.name}</td>
                          <td className="p-2">{r.department}</td>
                          <td className="p-2 font-medium text-amber-600 dark:text-amber-400">
                            {r["Team Name"] || (r as any).team || "—"}
                          </td>
                          <td className="p-2 font-medium text-emerald-600 dark:text-emerald-400">
                            {r["Course Teacher / Advisor"] || r.advisor || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setCurrentStep(2)}>
                ← Back to Step 2: Design
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK GENERATION PROGRESS MODAL                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => !isGenerating && setIsGenModalOpen(false)}
        title="1,000+ Bulk Certificate Generation Engine"
        subtitle="Processes locally in browser memory with zero server timeouts or costs"
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
