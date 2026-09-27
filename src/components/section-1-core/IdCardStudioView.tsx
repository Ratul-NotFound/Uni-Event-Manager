"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import saveAs from "file-saver";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import {
  IdCardTemplate,
  IdCardElement,
  IdCardTextElement,
  IdCardPhotoElement,
  IdCardBarcodeQrElement,
  IdCardImageElement,
  IdCardShapeElement,
  CARD_DIMENSION_PRESETS,
  CardDimensions,
  createDefaultIdCardTemplate,
  resolveIdCardText,
} from "@/core/domain/id-card-element";
import {
  IdCardEngine,
  IdCardGenerationProgress,
  PhotoMatchResult,
} from "@/core/engines/id-card-engine";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { ProgressBar } from "@/components/common/ProgressBar";
import {
  IdCard,
  Printer,
  Download,
  Plus,
  Trash2,
  QrCode,
  Type,
  Image as ImageIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  UploadCloud,
  FolderArchive,
  Palette,
  Eye,
  Sliders,
  Sparkles,
  RefreshCw,
  Copy,
  ScanLine,
  Square,
  Circle,
  Shapes,
  FileText,
  UserCheck,
  AlertCircle,
  SplitSquareVertical,
} from "lucide-react";

export interface IdCardStudioViewProps {
  students: StudentRecord[];
}

export const ID_CARD_FONTS = [
  { name: "Inter", label: "Inter (Modern Clean)" },
  { name: "Outfit", label: "Outfit (Geometric Tech)" },
  { name: "Montserrat", label: "Montserrat (Architectural Sans)" },
  { name: "Poppins", label: "Poppins (Soft Rounded)" },
  { name: "Oswald", label: "Oswald (Condensed Athletic)" },
  { name: "JetBrains Mono", label: "JetBrains Mono (Security Code)" },
  { name: "Cinzel", label: "Cinzel (Prestigious Regal)" },
  { name: "Playfair Display", label: "Playfair Display (Luxury Editorial)" },
  { name: "Roboto", label: "Roboto (Universal Standard)" },
];

export const IdCardStudioView: React.FC<IdCardStudioViewProps> = ({ students }) => {
  // Safe sample student fallback if roster is empty
  const activeAttendees = useMemo(() => {
    if (students && students.length > 0) return students;
    return [
      {
        id: "CSE-1024",
        name: "Alexandria Morgan",
        email: "alex@university.edu",
        department: "Computer Science",
        batch: "2026",
        section: "A",
        assignedSeat: "A-12",
        assignedRoom: "Main Auditorium",
        extra: {
          team: "Cyber Vanguard",
          university: "Metropolitan University",
          bloodGroup: "O+",
        },
      },
      {
        id: "BBA-2001",
        name: "Rahim Ahmed",
        email: "rahim@university.edu",
        department: "Business Admin",
        batch: "2026",
        section: "B",
        assignedSeat: "B-05",
        assignedRoom: "Hall 2",
        extra: {
          team: "Marketing Mavericks",
          university: "Metropolitan University",
          bloodGroup: "B+",
        },
      },
    ];
  }, [students]);

  // Core Template State
  const [template, setTemplate] = useState<IdCardTemplate>(() => createDefaultIdCardTemplate());
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [selectedElementId, setSelectedElementId] = useState<string | null>("student-name");
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Student Carousel & Photo Map State
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());
  const [photoMatchStats, setPhotoMatchStats] = useState<PhotoMatchResult | null>(null);

  // Export & Progress Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"merged-pdf" | "a4-tiled" | "zip-png">("merged-pdf");
  const [exportRange, setExportRange] = useState<"all" | "range">("all");
  const [customRangeText, setCustomRangeText] = useState<string>("1-50");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<IdCardGenerationProgress | null>(null);

  // Canvas Reference
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentStudent: StudentRecord = activeAttendees[previewIndex] || activeAttendees[0];

  // Active elements on current face
  const activeElements = activeSide === "front" ? template.frontElements : template.backElements;
  const selectedElement = activeElements.find((el) => el.id === selectedElementId) || null;

  // Auto-detect dynamic Excel columns from first student record
  const availableColumns = useMemo(() => {
    const cols = new Set<string>(["Name", "ID", "Department", "Batch", "Section", "Email", "Phone", "Seat", "Room"]);
    if (currentStudent.extra) {
      Object.keys(currentStudent.extra).forEach((k) => cols.add(k));
    }
    // Also scan custom properties on record
    Object.keys(currentStudent).forEach((k) => {
      if (!["id", "name", "email", "department", "batch", "section", "phone", "assignedSeat", "assignedRoom", "extra"].includes(k)) {
        cols.add(k);
      }
    });
    return Array.from(cols);
  }, [currentStudent]);

  // Re-render Preview Canvas whenever template, student, or photos change
  useEffect(() => {
    let isCancelled = false;

    const renderPreview = async () => {
      if (!previewCanvasRef.current) return;
      const studentPhoto = IdCardEngine.getStudentPhoto(currentStudent, photoMap);

      try {
        const rendered = await IdCardEngine.renderFaceToCanvas(
          template,
          activeSide,
          currentStudent,
          studentPhoto
        );

        if (isCancelled) return;
        const targetCanvas = previewCanvasRef.current;
        targetCanvas.width = rendered.width;
        targetCanvas.height = rendered.height;
        const targetCtx = targetCanvas.getContext("2d");
        if (targetCtx) {
          targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
          targetCtx.drawImage(rendered, 0, 0);
        }
      } catch (err) {
        console.warn("Could not render card preview canvas:", err);
      }
    };

    renderPreview();
    return () => {
      isCancelled = true;
    };
  }, [template, activeSide, currentStudent, photoMap]);

  // Handle Preset Selection
  const handleSelectPreset = (presetKey: "cr80_portrait" | "cr80_landscape" | "lanyard_badge") => {
    const preset = CARD_DIMENSION_PRESETS[presetKey];
    setTemplate((prev) => ({
      ...prev,
      dimensions: { ...preset },
    }));
  };

  // Handle Dimension Ratio Update
  const handleCustomDimensions = (widthMm: number, heightMm: number) => {
    const w = Math.max(30, Math.min(200, widthMm));
    const h = Math.max(30, Math.min(200, heightMm));
    const aspectRatio = w / h;
    const canvasWidth = Math.round(w * 11.81); // ~300 DPI
    const canvasHeight = Math.round(h * 11.81);

    const customDim: CardDimensions = {
      presetName: "custom",
      name: `Custom (${w} × ${h} mm)`,
      widthMm: w,
      heightMm: h,
      aspectRatio,
      canvasWidth,
      canvasHeight,
    };

    setTemplate((prev) => ({
      ...prev,
      dimensions: customDim,
    }));
  };

  // Sidedness Toggle
  const handleToggleSidedness = (sidedness: "single" | "dual") => {
    setTemplate((prev) => ({ ...prev, sidedness }));
    if (sidedness === "single") {
      setActiveSide("front");
    }
  };

  // Flip Face Button
  const handleFlipFace = () => {
    if (template.sidedness === "single") return;
    const nextSide = activeSide === "front" ? "back" : "front";
    setActiveSide(nextSide);
    setSelectedElementId(null);
  };

  // Element Update Dispatcher
  const updateElement = (id: string, updates: Partial<any>) => {
    setTemplate((prev) => {
      const isFront = activeSide === "front";
      const targetList = isFront ? prev.frontElements : prev.backElements;
      const updatedList = targetList.map((el) => {
        if (el.id !== id) return el;
        // Merge updates
        const json = el.toJSON();
        const merged = { ...json, ...updates };

        if (el.type === "text") return new IdCardTextElement(merged as any);
        if (el.type === "photo") return new IdCardPhotoElement(merged as any);
        if (el.type === "barcode_qr") return new IdCardBarcodeQrElement(merged as any);
        if (el.type === "image") return new IdCardImageElement(merged as any);
        if (el.type === "shape") return new IdCardShapeElement(merged as any);
        return el;
      });

      return {
        ...prev,
        frontElements: isFront ? updatedList : prev.frontElements,
        backElements: !isFront ? updatedList : prev.backElements,
      };
    });
  };

  // Add New Element to Active Face
  const addElement = (type: "text" | "photo" | "barcode_qr" | "shape") => {
    const newId = `${type}-${Date.now()}`;
    let newEl: IdCardElement;

    if (type === "text") {
      newEl = new IdCardTextElement({
        id: newId,
        x: 10,
        y: 20,
        width: 80,
        height: 6,
        text: "New Text Field",
        fontSize: 14,
        fontWeight: "bold",
        color: activeSide === "front" ? "#FFFFFF" : "#0F172A",
        align: "center",
      });
    } else if (type === "photo") {
      newEl = new IdCardPhotoElement({
        id: newId,
        x: 30,
        y: 20,
        width: 40,
        height: 25,
        shape: "rounded",
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#3B82F6",
      });
    } else if (type === "barcode_qr") {
      newEl = new IdCardBarcodeQrElement({
        id: newId,
        x: 20,
        y: 65,
        width: 60,
        height: 18,
        codeType: "code128_barcode",
        valuePattern: "{{ID}}",
        fgColor: "#0F172A",
        bgColor: "#FFFFFF",
      });
    } else {
      newEl = new IdCardShapeElement({
        id: newId,
        x: 10,
        y: 50,
        width: 80,
        height: 4,
        shapeType: "pill",
        fillColor: "#2563EB",
      });
    }

    setTemplate((prev) => {
      const isFront = activeSide === "front";
      return {
        ...prev,
        frontElements: isFront ? [...prev.frontElements, newEl] : prev.frontElements,
        backElements: !isFront ? [...prev.backElements, newEl] : prev.backElements,
      };
    });
    setSelectedElementId(newId);
  };

  // Delete Selected Element
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    setTemplate((prev) => {
      const isFront = activeSide === "front";
      return {
        ...prev,
        frontElements: isFront
          ? prev.frontElements.filter((el) => el.id !== selectedElementId)
          : prev.frontElements,
        backElements: !isFront
          ? prev.backElements.filter((el) => el.id !== selectedElementId)
          : prev.backElements,
      };
    });
    setSelectedElementId(null);
  };

  // Reorder Element (Bring forward / send backward)
  const handleMoveLayer = (direction: "up" | "down") => {
    if (!selectedElementId) return;
    setTemplate((prev) => {
      const isFront = activeSide === "front";
      const list = isFront ? [...prev.frontElements] : [...prev.backElements];
      const idx = list.findIndex((el) => el.id === selectedElementId);
      if (idx === -1) return prev;

      if (direction === "up" && idx < list.length - 1) {
        const temp = list[idx];
        list[idx] = list[idx + 1];
        list[idx + 1] = temp;
      } else if (direction === "down" && idx > 0) {
        const temp = list[idx];
        list[idx] = list[idx - 1];
        list[idx - 1] = temp;
      }

      return {
        ...prev,
        frontElements: isFront ? list : prev.frontElements,
        backElements: !isFront ? list : prev.backElements,
      };
    });
  };

  // Handle Photo ZIP Upload
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const { photoMap: extractedMap, totalPhotos } = await IdCardEngine.extractPhotosFromZip(buffer);
      setPhotoMap(extractedMap);

      const stats = IdCardEngine.matchPhotosToStudents(extractedMap, activeAttendees);
      setPhotoMatchStats(stats);
    } catch (err) {
      console.error("Failed to parse photo zip:", err);
      alert("Could not extract photos from ZIP file. Please ensure it is a valid zip archive.");
    }
  };

  // Handle Background Upload
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setTemplate((prev) => ({
        ...prev,
        frontBackground: activeSide === "front" ? dataUrl : prev.frontBackground,
        backBackground: activeSide === "back" ? dataUrl : prev.backBackground,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Direct Browser Print
  const handleDirectPrint = async () => {
    const studentPhoto = IdCardEngine.getStudentPhoto(currentStudent, photoMap);

    const canvas = await IdCardEngine.renderFaceToCanvas(
      template,
      activeSide,
      currentStudent,
      studentPhoto
    );

    const dataUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ID Card Print - ${currentStudent.name}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f1f5f9; }
              img { width: ${template.dimensions.widthMm}mm; height: ${template.dimensions.heightMm}mm; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px; }
              @media print { body { background: none; } img { box-shadow: none; } }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" />
            <script>window.onload = function() { window.print(); window.close(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Run Bulk Generation
  const handleExecuteBulkExport = async () => {
    setIsGenerating(true);
    setGenerationProgress({
      current: 0,
      total: activeAttendees.length,
      percentage: 0,
      statusText: "Initializing ID card generator...",
    });

    try {
      // Determine student list based on range
      let targetStudents = activeAttendees;
      if (exportRange === "range" && customRangeText.trim()) {
        const parts = customRangeText.split("-");
        const start = Math.max(1, parseInt(parts[0] || "1", 10));
        const end = Math.min(activeAttendees.length, parseInt(parts[1] || String(activeAttendees.length), 10));
        targetStudents = activeAttendees.slice(start - 1, end);
      }

      if (exportFormat === "merged-pdf") {
        const pdfBytes = await IdCardEngine.generateMergedPdf(
          template,
          targetStudents,
          photoMap,
          (prog) => setGenerationProgress(prog)
        );
        const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
        saveAs(blob, `ID_Cards_${template.dimensions.presetName}_Batch.pdf`);
      } else if (exportFormat === "a4-tiled") {
        const pdfBytes = await IdCardEngine.generateA4TiledPdf(
          template,
          targetStudents,
          photoMap,
          (prog) => setGenerationProgress(prog)
        );
        const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
        saveAs(blob, `ID_Cards_A4_Tiled_PrintSheets.pdf`);
      } else if (exportFormat === "zip-png") {
        const zipBlob = await IdCardEngine.generateZipArchive(
          template,
          targetStudents,
          photoMap,
          (prog) => setGenerationProgress(prog)
        );
        saveAs(zipBlob, `ID_Cards_HighRes_Images.zip`);
      }

      setIsExportModalOpen(false);
    } catch (err) {
      console.error("Bulk export failed:", err);
      alert("Bulk generation encountered an error. Please check console for details.");
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Preset Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  ID Card & Attendee Pass Studio
                </h2>
                <Badge variant="primary">300 DPI Print-Ready</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Design custom CR-80 cards, auto-match bulk student photos, and export high-res print sheets.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handleSelectPreset("cr80_portrait")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                template.dimensions.presetName === "cr80_portrait"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              CR-80 Vertical
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("cr80_landscape")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                template.dimensions.presetName === "cr80_landscape"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              CR-80 Horizontal
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("lanyard_badge")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                template.dimensions.presetName === "lanyard_badge"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Lanyard Pass
            </button>
          </div>

          {/* Sidedness Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handleToggleSidedness("single")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                template.sidedness === "single"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              1-Sided
            </button>
            <button
              type="button"
              onClick={() => handleToggleSidedness("dual")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                template.sidedness === "dual"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Dual-Sided
            </button>
          </div>

          {/* Quick Print Single */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={handleDirectPrint}
          >
            Print Sample
          </Button>

          {/* Bulk Export Modal Trigger */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => setIsExportModalOpen(true)}
          >
            Bulk Export ({activeAttendees.length})
          </Button>
        </div>
      </div>

      {/* Main Studio 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Toolbox, Excel Fields, Bulk Photo Upload */}
        <div className="lg:col-span-3 space-y-4">
          {/* Card Dimensions & Aspect Ratio Customizer */}
          <Card padding="sm" className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Card Size & Ratio
              </span>
              <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                {template.dimensions.widthMm} × {template.dimensions.heightMm} mm
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase">Width (mm)</label>
                <input
                  type="number"
                  min="30"
                  max="200"
                  value={template.dimensions.widthMm}
                  onChange={(e) =>
                    handleCustomDimensions(parseFloat(e.target.value) || 54, template.dimensions.heightMm)
                  }
                  className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase">Height (mm)</label>
                <input
                  type="number"
                  min="30"
                  max="200"
                  value={template.dimensions.heightMm}
                  onChange={(e) =>
                    handleCustomDimensions(template.dimensions.widthMm, parseFloat(e.target.value) || 85.6)
                  }
                  className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>
            </div>
          </Card>

          {/* Add Elements Panel */}
          <Card padding="sm" className="space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Add Elements to {activeSide.toUpperCase()}
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => addElement("text")}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-all font-semibold cursor-pointer"
              >
                <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Text Field
              </button>

              <button
                type="button"
                onClick={() => addElement("photo")}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-all font-semibold cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Photo Frame
              </button>

              <button
                type="button"
                onClick={() => addElement("barcode_qr")}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-all font-semibold cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                QR / Barcode
              </button>

              <button
                type="button"
                onClick={() => addElement("shape")}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-all font-semibold cursor-pointer"
              >
                <Shapes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Shape / Ribbon
              </button>
            </div>
          </Card>

          {/* Dynamic Excel Fields Pill Bar */}
          <Card padding="sm" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Excel Columns ({availableColumns.length})
              </span>
              <span className="text-[10px] text-slate-500">Click to insert</span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select any text element and click a column tag to dynamically insert attendee data.
            </p>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {availableColumns.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => {
                    if (selectedElement && selectedElement.type === "text") {
                      const curText = (selectedElement as IdCardTextElement).text;
                      updateElement(selectedElement.id, { text: `${curText} {{${col}}}` });
                    } else {
                      // Add new text element with column tag
                      const newId = `text-${Date.now()}`;
                      const newEl = new IdCardTextElement({
                        id: newId,
                        x: 10,
                        y: 40,
                        width: 80,
                        height: 5,
                        text: `{{${col}}}`,
                        fontSize: 12,
                        fontWeight: "bold",
                        color: activeSide === "front" ? "#FFFFFF" : "#0F172A",
                        align: "center",
                      });
                      setTemplate((prev) => ({
                        ...prev,
                        frontElements: activeSide === "front" ? [...prev.frontElements, newEl] : prev.frontElements,
                        backElements: activeSide === "back" ? [...prev.backElements, newEl] : prev.backElements,
                      }));
                      setSelectedElementId(newId);
                    }
                  }}
                  className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-mono hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                >
                  +{col}
                </button>
              ))}
            </div>
          </Card>

          {/* Bulk Photo ZIP Matching Widget */}
          <Card padding="sm" className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FolderArchive className="w-3.5 h-3.5 text-emerald-500" />
                Bulk Photo ZIP
              </span>
              {photoMatchStats && (
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {photoMatchStats.matchedCount}/{activeAttendees.length} Matched
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Upload a ZIP of photos named by Student ID (e.g. <code className="text-blue-500">CSE-1024.jpg</code>).
            </p>

            <label className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-900 cursor-pointer transition-colors text-center">
              <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose Photo ZIP File
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP inside ZIP</span>
              <input type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
            </label>

            {photoMatchStats && photoMatchStats.unmatchedCount > 0 && (
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  {photoMatchStats.unmatchedCount} student(s) will use smart initials monogram fallback.
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* CENTER COLUMN: Interactive Workspace Canvas & Bottom Attendee Switcher */}
        <div className="lg:col-span-6 flex flex-col items-center space-y-4">
          {/* Top Canvas Controls Bar */}
          <div className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            {/* Flip Face Button */}
            <div className="flex items-center gap-2">
              {template.sidedness === "dual" ? (
                <button
                  type="button"
                  onClick={handleFlipFace}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Flip to {activeSide === "front" ? "Back Face" : "Front Face"}
                </button>
              ) : (
                <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                  Single-Sided (Front Face)
                </span>
              )}
              <Badge variant={activeSide === "front" ? "primary" : "neutral"}>
                Showing: {activeSide.toUpperCase()}
              </Badge>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400 min-w-10 text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Visual Interactive Canvas Workspace */}
          <div
            ref={containerRef}
            className="w-full min-h-[500px] flex items-center justify-center p-6 bg-slate-200/60 dark:bg-slate-950/80 rounded-3xl border border-slate-300 dark:border-slate-800 relative overflow-hidden"
          >
            {/* Real Rendered Canvas at accurate aspect ratio */}
            <div
              className="relative shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden select-none"
              style={{
                width: `${Math.round((template.dimensions.canvasWidth / 2.2) * (zoomLevel / 100))}px`,
                height: `${Math.round((template.dimensions.canvasHeight / 2.2) * (zoomLevel / 100))}px`,
              }}
            >
              {/* HTML5 Canvas */}
              <canvas
                ref={previewCanvasRef}
                className="w-full h-full block rounded-2xl cursor-crosshair"
              />

              {/* Interactive DOM Selection Handles overlay */}
              {activeElements.map((el) => {
                const isSelected = el.id === selectedElementId;
                return (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(el.id);
                    }}
                    className={`absolute transition-all cursor-move ${
                      isSelected
                        ? "ring-2 ring-blue-500 bg-blue-500/10 rounded-sm"
                        : "hover:ring-1 hover:ring-blue-300"
                    }`}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: `${el.height}%`,
                      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    }}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-blue-600 border border-white rounded-full shadow-xs" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attendee Carousel & Switcher */}
          <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
              disabled={previewIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer font-bold transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <div className="text-center">
              <p className="font-bold text-slate-900 dark:text-white">
                {currentStudent.name}{" "}
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  ({currentStudent.id})
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Previewing Attendee {previewIndex + 1} of {activeAttendees.length}
                {photoMap.has(IdCardEngine.normalizePhotoId(currentStudent.id)) && (
                  <span className="ml-1.5 text-emerald-600 font-semibold">• Photo Loaded</span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPreviewIndex((i) => Math.min(activeAttendees.length - 1, i + 1))}
              disabled={previewIndex >= activeAttendees.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer font-bold transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Property Inspector & Styling */}
        <div className="lg:col-span-3 space-y-4">
          <Card padding="sm" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                Element Inspector
              </span>
              {selectedElement && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  title="Delete element"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {selectedElement ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Type: <strong className="text-slate-800 dark:text-slate-200 uppercase">{selectedElement.type}</strong></span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveLayer("up")}
                      className="p-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Bring layer forward"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveLayer("down")}
                      className="p-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Send layer backward"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* Specific Inspector for Text Elements */}
                {selectedElement.type === "text" && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Text Template</label>
                      <textarea
                        rows={2}
                        value={(selectedElement as IdCardTextElement).text}
                        onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                        className="w-full py-1.5 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Font Family</label>
                      <select
                        value={(selectedElement as IdCardTextElement).fontFamily}
                        onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                        className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                      >
                        {ID_CARD_FONTS.map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Font Size (pt)</label>
                        <input
                          type="number"
                          min="6"
                          max="48"
                          value={(selectedElement as IdCardTextElement).fontSize}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { fontSize: parseInt(e.target.value, 10) || 12 })
                          }
                          className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Text Color</label>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input
                            type="color"
                            value={(selectedElement as IdCardTextElement).color || "#0F172A"}
                            onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                            className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={(selectedElement as IdCardTextElement).color || "#0F172A"}
                            onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                            className="w-full py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Weight</label>
                        <select
                          value={String((selectedElement as IdCardTextElement).fontWeight || "bold")}
                          onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value })}
                          className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        >
                          <option value="normal">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="bold">Bold (700)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Transform</label>
                        <select
                          value={(selectedElement as IdCardTextElement).textTransform || "none"}
                          onChange={(e) => updateElement(selectedElement.id, { textTransform: e.target.value })}
                          className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        >
                          <option value="none">None</option>
                          <option value="uppercase">UPPERCASE</option>
                          <option value="capitalize">Capitalize</option>
                          <option value="lowercase">lowercase</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific Inspector for Photo Elements */}
                {selectedElement.type === "photo" && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Frame Shape</label>
                      <div className="grid grid-cols-3 gap-1.5 mt-0.5">
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { shape: "rounded", borderRadius: 16 })}
                          className={`py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                            (selectedElement as IdCardPhotoElement).shape === "rounded"
                              ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                              : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          Rounded
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { shape: "circle" })}
                          className={`py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                            (selectedElement as IdCardPhotoElement).shape === "circle"
                              ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                              : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          Circle
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { shape: "square", borderRadius: 0 })}
                          className={`py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                            (selectedElement as IdCardPhotoElement).shape === "square"
                              ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                              : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          Square
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Border Width</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={(selectedElement as IdCardPhotoElement).borderWidth}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { borderWidth: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Border Color</label>
                        <input
                          type="color"
                          value={(selectedElement as IdCardPhotoElement).borderColor}
                          onChange={(e) => updateElement(selectedElement.id, { borderColor: e.target.value })}
                          className="w-full h-7 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific Inspector for Barcode / QR */}
                {selectedElement.type === "barcode_qr" && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Code Type</label>
                      <select
                        value={(selectedElement as IdCardBarcodeQrElement).codeType}
                        onChange={(e) => updateElement(selectedElement.id, { codeType: e.target.value })}
                        className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="qr">2D QR Code</option>
                        <option value="code128_barcode">1D Barcode (Code-128)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Value Pattern</label>
                      <input
                        type="text"
                        value={(selectedElement as IdCardBarcodeQrElement).valuePattern}
                        onChange={(e) => updateElement(selectedElement.id, { valuePattern: e.target.value })}
                        className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Specific Inspector for Shapes */}
                {selectedElement.type === "shape" && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Shape Type</label>
                      <select
                        value={(selectedElement as IdCardShapeElement).shapeType}
                        onChange={(e) => updateElement(selectedElement.id, { shapeType: e.target.value })}
                        className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="rectangle">Rectangle / Header Ribbon</option>
                        <option value="pill">Pill Badge</option>
                        <option value="line">Divider Line</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Fill Color</label>
                      <input
                        type="color"
                        value={(selectedElement as IdCardShapeElement).fillColor}
                        onChange={(e) => updateElement(selectedElement.id, { fillColor: e.target.value })}
                        className="w-full h-7 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 mt-0.5"
                      />
                    </div>
                  </div>
                )}

                {/* Position & Size Sliders */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">X Pos (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(selectedElement.x)}
                        onChange={(e) => updateElement(selectedElement.id, { x: parseFloat(e.target.value) || 0 })}
                        className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Y Pos (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(selectedElement.y)}
                        onChange={(e) => updateElement(selectedElement.id, { y: parseFloat(e.target.value) || 0 })}
                        className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Width (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={Math.round(selectedElement.width)}
                        onChange={(e) => updateElement(selectedElement.id, { width: parseFloat(e.target.value) || 1 })}
                        className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Height (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={Math.round(selectedElement.height)}
                        onChange={(e) => updateElement(selectedElement.id, { height: parseFloat(e.target.value) || 1 })}
                        className="w-full py-1 px-2 mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Sliders className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Click any element on the card canvas to customize its typography, colors, and layout.</p>
              </div>
            )}
          </Card>

          {/* Background Artwork & Preset Themes */}
          <Card padding="sm" className="space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-500" />
              {activeSide.toUpperCase()} Background Art
            </span>

            <label className="flex items-center justify-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-all font-semibold cursor-pointer text-xs">
              <UploadCloud className="w-4 h-4 text-blue-500" />
              Upload Template Image
              <input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />
            </label>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({
                    ...prev,
                    frontBackground: activeSide === "front" ? "theme:dark-slate" : prev.frontBackground,
                    backBackground: activeSide === "back" ? "theme:dark-slate" : prev.backBackground,
                  }))
                }
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 text-white font-bold cursor-pointer"
              >
                Dark Slate
              </button>
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({
                    ...prev,
                    frontBackground: activeSide === "front" ? "theme:clean-white" : prev.frontBackground,
                    backBackground: activeSide === "back" ? "theme:clean-white" : prev.backBackground,
                  }))
                }
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white text-slate-900 font-bold cursor-pointer"
              >
                Clean White
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Bulk Export Modal */}
      {isExportModalOpen && (
        <Modal
          isOpen={isExportModalOpen}
          onClose={() => !isGenerating && setIsExportModalOpen(false)}
          title="Bulk ID Card Export & High-Res Generation"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Generate 300 DPI print-ready ID cards for all <strong>{activeAttendees.length} attendees</strong> in the selected format.
            </p>

            {/* Export Format Selector */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px]">
                Choose Export Format:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("merged-pdf")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    exportFormat === "merged-pdf"
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white">Merged CR-80 PDF</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Duplex pages for PVC plastic card printers (Zebra, Evolis).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("a4-tiled")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    exportFormat === "a4-tiled"
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white">A4 Tiled Sheet</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Multi-card grid with cut guide lines for office printers & laminates.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("zip-png")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    exportFormat === "zip-png"
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white">ZIP of PNGs</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Individual high-resolution image files named by ID and Name.
                  </p>
                </button>
              </div>
            </div>

            {/* Range Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px]">
                Attendees to Include:
              </label>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={exportRange === "all"}
                    onChange={() => setExportRange("all")}
                    className="text-blue-600"
                  />
                  <span>All Attendees ({activeAttendees.length})</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={exportRange === "range"}
                    onChange={() => setExportRange("range")}
                    className="text-blue-600"
                  />
                  <span>Row Range (e.g. 1-50)</span>
                </label>
              </div>

              {exportRange === "range" && (
                <input
                  type="text"
                  value={customRangeText}
                  onChange={(e) => setCustomRangeText(e.target.value)}
                  placeholder="1-50"
                  className="w-32 py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              )}
            </div>

            {/* Generation Progress Bar */}
            {isGenerating && generationProgress && (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-blue-900 dark:text-blue-200">
                    {generationProgress.statusText}
                  </span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {generationProgress.percentage}%
                  </span>
                </div>
                <ProgressBar progress={generationProgress.percentage} variant="primary" />
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                disabled={isGenerating}
                onClick={() => setIsExportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={isGenerating}
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleExecuteBulkExport}
              >
                {isGenerating ? "Exporting..." : "Start Export"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
