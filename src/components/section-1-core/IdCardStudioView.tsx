"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import saveAs from "file-saver";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { THEME } from "@/styles/theme";
import { StudentRecord } from "@/core/domain/roster";
import { DataRefineryEngine } from "@/core/engines/data-refinery";
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
import { LocalStorageSyncService } from "@/core/storage/local-storage-sync";
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
  ChevronUp,
  ChevronDown,
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
  FileSpreadsheet,
  Eraser,
  RotateCcw,
  CheckCircle2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

export interface IdCardStudioViewProps {
  students: StudentRecord[];
  columnHeaders?: string[];
  onRosterUpdate?: (records: StudentRecord[], headers?: string[]) => void;
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

export const IdCardStudioView: React.FC<IdCardStudioViewProps> = ({
  students,
  columnHeaders,
  onRosterUpdate,
}) => {
  // Local roster state synchronized with parent or spreadsheet upload
  const [localStudents, setLocalStudents] = useState<StudentRecord[]>(() => {
    if (students && students.length > 0) return students;
    const stored = LocalStorageSyncService.loadStudents();
    if (stored && stored.length > 0) return stored;
    return [];
  });
  const [uploadedRosterName, setUploadedRosterName] = useState<string | null>(() => {
    return LocalStorageSyncService.loadLastRosterName();
  });
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>(() => {
    if (columnHeaders && columnHeaders.length > 0) return columnHeaders;
    return LocalStorageSyncService.loadHeaders();
  });

  // Sync when parent students prop changes
  useEffect(() => {
    if (students && students.length > 0) {
      setLocalStudents(students);
    }
  }, [students]);

  // Sync when parent columnHeaders prop changes
  useEffect(() => {
    if (columnHeaders && columnHeaders.length > 0) {
      setDetectedHeaders(columnHeaders);
    }
  }, [columnHeaders]);

  // Fallback: If detectedHeaders is empty, load from LocalStorage or extract from localStudents
  useEffect(() => {
    if (detectedHeaders.length === 0) {
      const stored = LocalStorageSyncService.loadHeaders();
      if (stored && stored.length > 0) {
        setDetectedHeaders(stored);
      } else if (localStudents.length > 0) {
        const extracted = DataRefineryEngine.extractHeaders(localStudents);
        if (extracted.length > 0) {
          setDetectedHeaders(extracted);
        }
      }
    }
  }, [localStudents, detectedHeaders.length]);

  // Safe sample student fallback if roster is empty
  const sampleAttendees: StudentRecord[] = useMemo(
    () => [
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
          role: "Team Captain",
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
          role: "Speaker",
        },
      },
    ],
    []
  );

  const activeAttendees = useMemo(() => {
    if (localStudents && localStudents.length > 0) return localStudents;
    return sampleAttendees;
  }, [localStudents, sampleAttendees]);

  // Core Template State (restored from LocalStorage if user previously edited)
  const [template, setTemplate] = useState<IdCardTemplate>(() => {
    const saved = LocalStorageSyncService.loadIdCardTemplate();
    if (saved) return saved;
    return createDefaultIdCardTemplate();
  });

  // Auto-save template changes to LocalStorage
  useEffect(() => {
    LocalStorageSyncService.saveIdCardTemplate(template);
  }, [template]);

  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [selectedElementId, setSelectedElementId] = useState<string | null>("student-name");
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Dragging & Resizing State on Canvas
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isResizingElement, setIsResizingElement] = useState(false);
  const isPointerDownRef = useRef(false);
  const dragModeRef = useRef<"drag" | "resize" | null>(null);
  const dragTargetIdRef = useRef<string | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const initialElementPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const justDraggedRef = useRef(false);
  const hasMovedSignificantlyRef = useRef(false);

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

  // Element and File References
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const rosterInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);

  const currentStudent: StudentRecord = activeAttendees[previewIndex] || activeAttendees[0];

  // Active elements on current face
  const activeElements = activeSide === "front" ? template.frontElements : template.backElements;
  const selectedElement = activeElements.find((el) => el.id === selectedElementId) || null;

  // Auto-detect dynamic Excel columns from uploaded headers and student records
  const availableColumns = useMemo(() => {
    const cols = new Set<string>();

    // 1. If spreadsheet headers are detected from uploaded file, show them in original sheet order!
    if (detectedHeaders && detectedHeaders.length > 0) {
      detectedHeaders.forEach((h) => {
        if (h && typeof h === "string" && h.trim()) {
          cols.add(h.trim());
        }
      });
    }

    // 2. Scan all attendees in activeAttendees to collect any dynamic columns present on records
    activeAttendees.forEach((st) => {
      Object.keys(st).forEach((k) => {
        if (
          ![
            "id",
            "name",
            "email",
            "phone",
            "department",
            "batch",
            "section",
            "tshirtSize",
            "foodPreference",
            "paymentStatus",
            "paymentTxId",
            "assignedRoom",
            "assignedRow",
            "assignedSeat",
            "attendanceStatus",
            "certificateIssued",
            "claimedTokens",
            "checkInTime",
            "emailSent",
            "gateCheckedIn",
            "extra",
            "teamName",
            "role",
            "institution",
            "bloodGroup",
            "advisor",
          ].includes(k) &&
          typeof (st as any)[k] !== "object" &&
          k &&
          k.trim()
        ) {
          cols.add(k.trim());
        }
      });
      if (st.extra && typeof st.extra === "object") {
        Object.keys(st.extra).forEach((k) => {
          if (k && k.trim() && typeof (st.extra as any)[k] !== "object") {
            cols.add(k.trim());
          }
        });
      }
    });

    // 3. Fallback to standard core columns ONLY when no spreadsheet columns exist (e.g. fresh empty or demo state)
    if (cols.size === 0) {
      ["Name", "ID", "Department", "Team Name", "Role", "Institution", "Blood Group", "Batch", "Section"].forEach(
        (c) => cols.add(c)
      );
    }

    return Array.from(cols);
  }, [detectedHeaders, activeAttendees]);

  // Resolves the current attendee's real value for a field (for live preview in selector)
  const getFieldSampleValue = useCallback(
    (fieldName: string): string => {
      if (!currentStudent) return "";
      return resolveIdCardText(`{{${fieldName}}}`, currentStudent);
    },
    [currentStudent]
  );

  // Re-render Preview Canvas whenever template, student, or photos change
  useEffect(() => {
    let isCancelled = false;

    // Debounce rendering slightly while actively dragging or resizing to ensure 60fps performance
    const timer = setTimeout(
      async () => {
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
      },
      isDraggingElement || isResizingElement ? 35 : 40
    );

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [template, activeSide, currentStudent, photoMap, isDraggingElement, isResizingElement]);

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
  const updateElement = useCallback((id: string, updates: Partial<any>) => {
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
  }, [activeSide]);

  // Add New Element to Active Face
  const addElement = (type: "text" | "photo" | "barcode_qr" | "shape") => {
    const newId = `${type}-${Date.now()}`;
    let newEl: IdCardElement;

    const currentBg = activeSide === "front" ? template.frontBackground : template.backBackground;
    const isLightBg = currentBg?.startsWith("data:") || currentBg === "theme:clean-white";

    // Compute staggered position so newly added elements don't stack directly on top of each other
    const currentList = activeSide === "front" ? template.frontElements : template.backElements;
    const offset = (currentList.length % 6) * 5;

    if (type === "text") {
      newEl = new IdCardTextElement({
        id: newId,
        x: 10,
        y: Math.min(80, 42 + offset),
        width: 80,
        height: 6,
        text: "Attendee Field",
        fontSize: 14,
        fontWeight: "bold",
        color: isLightBg ? "#0F172A" : "#FFFFFF",
        align: "center",
      });
    } else if (type === "photo") {
      newEl = new IdCardPhotoElement({
        id: newId,
        x: 28,
        y: Math.min(60, 18 + offset),
        width: 44,
        height: 28,
        shape: "rounded",
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#3B82F6",
      });
    } else if (type === "barcode_qr") {
      newEl = new IdCardBarcodeQrElement({
        id: newId,
        x: 20,
        y: Math.min(75, 55 + offset),
        width: 60,
        height: 16,
        codeType: "code128_barcode",
        valuePattern: "{{ID}}",
        fgColor: "#0F172A",
        bgColor: "#FFFFFF",
      });
    } else {
      newEl = new IdCardShapeElement({
        id: newId,
        x: 10,
        y: Math.min(85, 30 + offset),
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

  // Delete Element (by target ID or selected)
  const handleDeleteElement = (targetId?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const idToDelete = targetId || selectedElementId;
    if (!idToDelete) return;
    setTemplate((prev) => {
      const isFront = activeSide === "front";
      return {
        ...prev,
        frontElements: isFront
          ? prev.frontElements.filter((el) => el.id !== idToDelete)
          : prev.frontElements,
        backElements: !isFront
          ? prev.backElements.filter((el) => el.id !== idToDelete)
          : prev.backElements,
      };
    });
    if (selectedElementId === idToDelete) {
      setSelectedElementId(null);
    }
  };

  const handleDeleteSelected = () => handleDeleteElement();

  // Reorder Element (Bring forward / send backward)
  const handleMoveLayer = (direction: "up" | "down", targetId?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const idToMove = targetId || selectedElementId;
    if (!idToMove) return;
    setTemplate((prev) => {
      const isFront = activeSide === "front";
      const list = isFront ? [...prev.frontElements] : [...prev.backElements];
      const idx = list.findIndex((el) => el.id === idToMove);
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

  // Handle Excel / CSV Roster Upload
  const handleRosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedRosterName(file.name);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawRows = results.data as Record<string, any>[];
          if (rawRows.length > 0) {
            const detected = DataRefineryEngine.extractHeaders(rawRows);
            const headers = detected.length > 0 ? detected : Object.keys(rawRows[0] || {});
            setDetectedHeaders(headers);

            const mapped = rawRows.map((row: any, i: number) =>
              DataRefineryEngine.mapRawRowToStudent(row, i)
            );
            setLocalStudents(mapped);
            setPreviewIndex(0);
            LocalStorageSyncService.saveStudents(mapped, file.name);
            LocalStorageSyncService.saveHeaders(headers);
            onRosterUpdate?.(mapped, headers);
          }
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (rawRows.length > 0) {
          const detected = DataRefineryEngine.extractHeaders(rawRows);
          const headers = detected.length > 0 ? detected : Object.keys(rawRows[0] || {});
          setDetectedHeaders(headers);

          const mapped = rawRows.map((row: any, i: number) =>
            DataRefineryEngine.mapRawRowToStudent(row, i)
          );
          setLocalStudents(mapped);
          setPreviewIndex(0);
          LocalStorageSyncService.saveStudents(mapped, file.name);
          LocalStorageSyncService.saveHeaders(headers);
          onRosterUpdate?.(mapped, headers);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  // Reset to Demo Sample Roster
  const handleLoadSampleRoster = () => {
    setLocalStudents(sampleAttendees);
    setUploadedRosterName(null);
    setDetectedHeaders([]);
    setPreviewIndex(0);
    LocalStorageSyncService.saveStudents(sampleAttendees, "Demo Sample Roster");
    onRosterUpdate?.(sampleAttendees);
  };

  // Clear Roster
  const handleClearRoster = () => {
    setLocalStudents([]);
    setUploadedRosterName(null);
    setDetectedHeaders([]);
    setPreviewIndex(0);
    LocalStorageSyncService.clearRoster();
    onRosterUpdate?.([]);
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

  // Handle Background Upload with Auto-Fitting Dimensions
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = (img.naturalWidth || 638) / (img.naturalHeight || 1011);
        let wMm = 54;
        let hMm = 85.6;

        if (aspect > 1) {
          // Landscape card
          wMm = 85.6;
          hMm = Math.round((85.6 / aspect) * 10) / 10;
        } else {
          // Portrait card
          hMm = 85.6;
          wMm = Math.round((85.6 * aspect) * 10) / 10;
        }

        const customDim: CardDimensions = {
          presetName: "custom",
          name: `Uploaded Template (${img.naturalWidth}×${img.naturalHeight})`,
          widthMm: wMm,
          heightMm: hMm,
          aspectRatio: aspect,
          canvasWidth: img.naturalWidth || Math.round(wMm * 11.81),
          canvasHeight: img.naturalHeight || Math.round(hMm * 11.81),
        };

        setTemplate((prev) => ({
          ...prev,
          dimensions: customDim,
          frontBackground: activeSide === "front" ? dataUrl : prev.frontBackground,
          backBackground: activeSide === "back" ? dataUrl : prev.backBackground,
        }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Clear starter shapes (e.g. solid header/footer bars) so uploaded template is clean
  const handleClearStarterShapes = () => {
    setTemplate((prev) => {
      const isFront = activeSide === "front";
      const filterElements = (els: IdCardElement[]) => els.filter((el) => el.type !== "shape");
      return {
        ...prev,
        frontElements: isFront ? filterElements(prev.frontElements) : prev.frontElements,
        backElements: !isFront ? filterElements(prev.backElements) : prev.backElements,
      };
    });
  };

  // Clear all elements (blank canvas)
  const handleClearAllElements = () => {
    setTemplate((prev) => {
      const isFront = activeSide === "front";
      return {
        ...prev,
        frontElements: isFront ? [] : prev.frontElements,
        backElements: !isFront ? [] : prev.backElements,
      };
    });
    setSelectedElementId(null);
  };

  // Reset to default university template
  const handleResetStarterTemplate = () => {
    setTemplate(createDefaultIdCardTemplate());
    setSelectedElementId("student-name");
  };

  // Check if a field tag or alias is currently present on the active card face
  const isFieldOnCard = useCallback(
    (fieldName: string): boolean => {
      const norm = fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const currentEls = activeSide === "front" ? template.frontElements : template.backElements;
      return currentEls.some((el) => {
        if (el.type !== "text") return false;
        const text = (el as IdCardTextElement).text;
        const textNorm = text.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (text.includes(`{{${fieldName}}}`) || textNorm.includes(norm)) {
          return true;
        }

        const isNameField = ["name", "fullname", "studentname", "participant", "participantname"].includes(norm);
        if (isNameField && (textNorm.includes("name") || textNorm.includes("fullname"))) return true;

        const isIdField = ["id", "studentid", "roll", "rollno", "rollnumber", "reg", "registration"].includes(norm);
        if (isIdField && (textNorm.includes("id") || textNorm.includes("roll") || textNorm.includes("reg"))) return true;

        const isTeamField = ["team", "teamname", "contestteam", "squad", "club"].includes(norm);
        if (isTeamField && textNorm.includes("team")) return true;

        const isDeptField = ["department", "dept", "program", "major"].includes(norm);
        if (isDeptField && (textNorm.includes("dept") || textNorm.includes("department"))) return true;

        return false;
      });
    },
    [activeSide, template]
  );

  // Add a dedicated, neatly placed text field element for a dynamic column
  const handleAddDedicatedField = useCallback(
    (col: string) => {
      const tag = `{{${col}}}`;
      const currentEls = activeSide === "front" ? template.frontElements : template.backElements;
      const textEls = currentEls.filter((el) => el.type === "text");
      const lowestY = textEls.reduce((max, el) => Math.max(max, el.y + el.height), 42);
      const nextY = Math.min(84, Math.max(46, Math.round(lowestY + 2)));

      const newId = `field-${col.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`;
      const currentBg = activeSide === "front" ? template.frontBackground : template.backBackground;
      const isLightBg = currentBg?.startsWith("data:") || currentBg === "theme:clean-white";

      const newEl = new IdCardTextElement({
        id: newId,
        x: 10,
        y: nextY,
        width: 80,
        height: 5.5,
        text: tag,
        fontSize: 13,
        fontWeight: "bold",
        color: isLightBg ? "#0F172A" : "#FFFFFF",
        align: "center",
      });

      setTemplate((prev) => ({
        ...prev,
        frontElements: activeSide === "front" ? [...prev.frontElements, newEl] : prev.frontElements,
        backElements: activeSide === "back" ? [...prev.backElements, newEl] : prev.backElements,
      }));
      setSelectedElementId(newId);
    },
    [activeSide, template]
  );

  // Append dynamic column tag to selected text element (e.g. for multi-variable lines like "ID: {{ID}} • Team: {{Team}}")
  const handleAppendTagToSelected = useCallback(
    (col: string) => {
      const tag = `{{${col}}}`;
      if (selectedElement && selectedElement.type === "text") {
        const curText = (selectedElement as IdCardTextElement).text;
        updateElement(selectedElement.id, { text: `${curText} ${tag}`.trim() });
      } else {
        handleAddDedicatedField(col);
      }
    },
    [selectedElement, updateElement, handleAddDedicatedField]
  );

  // Toggle field on/off on active face
  const handleToggleField = useCallback(
    (fieldName: string) => {
      const norm = fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const currentEls = activeSide === "front" ? template.frontElements : template.backElements;
      const existing = currentEls.find((el) => {
        if (el.type !== "text") return false;
        const text = (el as IdCardTextElement).text;
        const textNorm = text.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (text.includes(`{{${fieldName}}}`) || textNorm.includes(norm)) return true;

        const isNameField = ["name", "fullname", "studentname", "participant", "participantname"].includes(norm);
        if (isNameField && (textNorm.includes("name") || textNorm.includes("fullname"))) return true;

        const isIdField = ["id", "studentid", "roll", "rollno", "rollnumber", "reg", "registration"].includes(norm);
        if (isIdField && (textNorm.includes("id") || textNorm.includes("roll") || textNorm.includes("reg"))) return true;

        const isTeamField = ["team", "teamname", "contestteam", "squad", "club"].includes(norm);
        if (isTeamField && textNorm.includes("team")) return true;

        const isDeptField = ["department", "dept", "program", "major"].includes(norm);
        if (isDeptField && (textNorm.includes("dept") || textNorm.includes("department"))) return true;

        return false;
      });

      if (existing) {
        handleDeleteElement(existing.id);
      } else {
        handleAddDedicatedField(fieldName);
      }
    },
    [activeSide, template, handleDeleteElement, handleAddDedicatedField]
  );

  // Quick Preset Layouts: "name_id", "name_id_team", "name_id_dept", "full"
  const handleQuickPresetFields = useCallback(
    (preset: "name_id" | "name_id_team" | "name_id_dept" | "full") => {
      setTemplate((prev) => {
        const isFront = activeSide === "front";
        const newFrontElements: IdCardElement[] = [];

        // 1. Institution Header Banner
        newFrontElements.push(
          new IdCardShapeElement({
            id: "header-stripe",
            x: 0,
            y: 0,
            width: 100,
            height: 12,
            shapeType: "rectangle",
            fillColor: "#1E293B",
          }),
          new IdCardTextElement({
            id: "institution-title",
            x: 5,
            y: 3.5,
            width: 90,
            height: 5,
            text: "CAMPUS EVENT PASS",
            fontSize: 13,
            fontWeight: "900",
            color: "#FFFFFF",
            align: "center",
            letterSpacing: 2,
            textTransform: "uppercase",
          }),
          new IdCardTextElement({
            id: "institution-subtitle",
            x: 5,
            y: 8,
            width: 90,
            height: 3,
            text: "OFFICIAL IDENTITY BADGE",
            fontSize: 8,
            fontWeight: "700",
            color: "#94A3B8",
            align: "center",
            letterSpacing: 1.5,
          }),
          // 2. Photo Frame
          new IdCardPhotoElement({
            id: "student-photo",
            x: 26,
            y: 15,
            width: 48,
            height: 28,
            shape: "rounded",
            borderRadius: 14,
            borderWidth: 3,
            borderColor: "#3B82F6",
            hasShadow: true,
          })
        );

        // Find best matching dynamic tags from available columns if available
        const findColTag = (candidates: string[], fallback: string) => {
          for (const col of availableColumns) {
            const n = col.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (candidates.includes(n)) return col;
          }
          return fallback;
        };
        const nameTag = findColTag(["fullname", "studentname", "participantname", "name", "candidatename"], "Name");
        const idTag = findColTag(["studentid", "rollno", "rollnumber", "roll", "registrationno", "regno", "id"], "ID");
        const teamTag = findColTag(["teamname", "team", "contestteam", "groupname"], "Team_Name");
        const deptTag = findColTag(["department", "dept", "program", "major"], "Department");

        if (preset === "name_id") {
          // Minimalist: ONLY Name and ID!
          newFrontElements.push(
            new IdCardTextElement({
              id: "field-name",
              x: 5,
              y: 48,
              width: 90,
              height: 7,
              text: `{{${nameTag}}}`,
              fontSize: 20,
              fontWeight: "900",
              color: "#FFFFFF",
              align: "center",
              textTransform: "capitalize",
            }),
            new IdCardShapeElement({
              id: "id-pill",
              x: 20,
              y: 58,
              width: 60,
              height: 6,
              shapeType: "pill",
              fillColor: "#0F172A",
              strokeColor: "#3B82F6",
              strokeWidth: 1.5,
              borderRadius: 999,
            }),
            new IdCardTextElement({
              id: "field-id",
              x: 20,
              y: 59.5,
              width: 60,
              height: 4,
              text: `ID: {{${idTag}}}`,
              fontSize: 12,
              fontFamily: "JetBrains Mono",
              fontWeight: "bold",
              color: "#38BDF8",
              align: "center",
            }),
            new IdCardBarcodeQrElement({
              id: "student-qr",
              x: 35,
              y: 69,
              width: 30,
              height: 18,
              codeType: "qr",
              valuePattern: `{{${idTag}}}`,
              fgColor: "#0F172A",
              bgColor: "#FFFFFF",
              showLabel: false,
            })
          );
        } else if (preset === "name_id_team") {
          // Name + ID + Team Name!
          newFrontElements.push(
            new IdCardTextElement({
              id: "field-name",
              x: 5,
              y: 46,
              width: 90,
              height: 6,
              text: `{{${nameTag}}}`,
              fontSize: 18,
              fontWeight: "900",
              color: "#FFFFFF",
              align: "center",
              textTransform: "capitalize",
            }),
            new IdCardShapeElement({
              id: "team-badge",
              x: 15,
              y: 53.5,
              width: 70,
              height: 5,
              shapeType: "pill",
              fillColor: "#1E3A8A",
              strokeColor: "#60A5FA",
              strokeWidth: 1,
              borderRadius: 999,
            }),
            new IdCardTextElement({
              id: "field-team",
              x: 15,
              y: 54.5,
              width: 70,
              height: 3.5,
              text: `TEAM: {{${teamTag}}}`,
              fontSize: 10,
              fontWeight: "800",
              color: "#93C5FD",
              align: "center",
              letterSpacing: 1,
            }),
            new IdCardTextElement({
              id: "field-id",
              x: 10,
              y: 60.5,
              width: 80,
              height: 4,
              text: `ID: {{${idTag}}}`,
              fontSize: 11,
              fontFamily: "JetBrains Mono",
              fontWeight: "bold",
              color: "#F8FAFC",
              align: "center",
            }),
            new IdCardBarcodeQrElement({
              id: "student-qr",
              x: 36,
              y: 68,
              width: 28,
              height: 18,
              codeType: "qr",
              valuePattern: `{{${idTag}}}`,
              fgColor: "#0F172A",
              bgColor: "#FFFFFF",
              showLabel: false,
            })
          );
        } else if (preset === "name_id_dept") {
          // Name + ID + Department!
          newFrontElements.push(
            new IdCardTextElement({
              id: "field-name",
              x: 5,
              y: 46,
              width: 90,
              height: 6,
              text: `{{${nameTag}}}`,
              fontSize: 18,
              fontWeight: "900",
              color: "#FFFFFF",
              align: "center",
              textTransform: "capitalize",
            }),
            new IdCardTextElement({
              id: "field-dept",
              x: 5,
              y: 53.5,
              width: 90,
              height: 4,
              text: `{{${deptTag}}}`,
              fontSize: 11,
              fontWeight: "600",
              color: "#60A5FA",
              align: "center",
            }),
            new IdCardShapeElement({
              id: "id-pill",
              x: 25,
              y: 60,
              width: 50,
              height: 5,
              shapeType: "pill",
              fillColor: "#0F172A",
              strokeColor: "#334155",
              strokeWidth: 1,
              borderRadius: 999,
            }),
            new IdCardTextElement({
              id: "field-id",
              x: 25,
              y: 61,
              width: 50,
              height: 3.5,
              text: `ID: {{${idTag}}}`,
              fontSize: 10,
              fontFamily: "JetBrains Mono",
              fontWeight: "bold",
              color: "#F8FAFC",
              align: "center",
            }),
            new IdCardBarcodeQrElement({
              id: "student-qr",
              x: 35,
              y: 68,
              width: 30,
              height: 19,
              codeType: "qr",
              valuePattern: `{{${idTag}}}`,
              fgColor: "#0F172A",
              bgColor: "#FFFFFF",
              showLabel: false,
            })
          );
        } else {
          // Full Pass: Name + ID + Team + Department + QR!
          newFrontElements.push(
            new IdCardTextElement({
              id: "field-name",
              x: 5,
              y: 45,
              width: 90,
              height: 6,
              text: `{{${nameTag}}}`,
              fontSize: 17,
              fontWeight: "900",
              color: "#FFFFFF",
              align: "center",
              textTransform: "capitalize",
            }),
            new IdCardTextElement({
              id: "field-dept",
              x: 5,
              y: 51.5,
              width: 90,
              height: 3.5,
              text: `{{${deptTag}}}`,
              fontSize: 10,
              fontWeight: "600",
              color: "#94A3B8",
              align: "center",
            }),
            new IdCardShapeElement({
              id: "team-badge",
              x: 15,
              y: 56.5,
              width: 70,
              height: 4.5,
              shapeType: "pill",
              fillColor: "#1E3A8A",
              strokeColor: "#60A5FA",
              strokeWidth: 1,
              borderRadius: 999,
            }),
            new IdCardTextElement({
              id: "field-team",
              x: 15,
              y: 57.3,
              width: 70,
              height: 3,
              text: `TEAM: {{${teamTag}}}`,
              fontSize: 9,
              fontWeight: "800",
              color: "#93C5FD",
              align: "center",
              letterSpacing: 1,
            }),
            new IdCardTextElement({
              id: "field-id",
              x: 10,
              y: 63,
              width: 80,
              height: 3.5,
              text: `ID: {{${idTag}}}`,
              fontSize: 10.5,
              fontFamily: "JetBrains Mono",
              fontWeight: "bold",
              color: "#F8FAFC",
              align: "center",
            }),
            new IdCardBarcodeQrElement({
              id: "student-qr",
              x: 36,
              y: 69.5,
              width: 28,
              height: 18,
              codeType: "qr",
              valuePattern: `{{${idTag}}}`,
              fgColor: "#0F172A",
              bgColor: "#FFFFFF",
              showLabel: false,
            })
          );
        }

        // Validity Footer
        newFrontElements.push(
          new IdCardTextElement({
            id: "validity-text",
            x: 5,
            y: 94.5,
            width: 90,
            height: 3,
            text: "OFFICIAL EVENT ACCESS PASS",
            fontSize: 7,
            fontFamily: "JetBrains Mono",
            fontWeight: "bold",
            color: "#94A3B8",
            align: "center",
            letterSpacing: 1,
          })
        );

        return {
          ...prev,
          frontElements: isFront ? newFrontElements : prev.frontElements,
          backElements: !isFront ? newFrontElements : prev.backElements,
        };
      });
      setSelectedElementId("field-name");
    },
    [activeSide]
  );

  // Backward compatible handleInsertTag: adds dedicated field if no text element is selected
  const handleInsertTag = (col: string) => {
    if (selectedElement && selectedElement.type === "text") {
      handleAppendTagToSelected(col);
    } else {
      handleAddDedicatedField(col);
    }
  };

  // Canvas Mouse Drag & Resize Handlers
  const handleElementMouseDown = (e: React.MouseEvent, el: IdCardElement) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(el.id);
    isPointerDownRef.current = true;
    dragModeRef.current = "drag";
    dragTargetIdRef.current = el.id;
    hasMovedSignificantlyRef.current = false;
    justDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialElementPosRef.current = { x: el.x, y: el.y, width: el.width, height: el.height };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, el: IdCardElement) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(el.id);
    isPointerDownRef.current = true;
    dragModeRef.current = "resize";
    dragTargetIdRef.current = el.id;
    hasMovedSignificantlyRef.current = false;
    justDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialElementPosRef.current = { x: el.x, y: el.y, width: el.width, height: el.height };
  };

  useEffect(() => {
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerDownRef.current || !dragModeRef.current || !dragTargetIdRef.current) return;

      const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
      if (dist < 4) return; // Prevent minor jitter from triggering drag jump

      hasMovedSignificantlyRef.current = true;
      justDraggedRef.current = true;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const cardEl = canvasWrapperRef.current;
        const targetId = dragTargetIdRef.current;
        if (!cardEl || !targetId) return;

        const rect = cardEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const deltaXPercent = ((e.clientX - dragStartPosRef.current.x) / rect.width) * 100;
        const deltaYPercent = ((e.clientY - dragStartPosRef.current.y) / rect.height) * 100;

        if (dragModeRef.current === "drag") {
          setIsDraggingElement(true);
          const newX = Math.max(0, Math.min(100 - initialElementPosRef.current.width, Math.round(initialElementPosRef.current.x + deltaXPercent)));
          const newY = Math.max(0, Math.min(100 - initialElementPosRef.current.height, Math.round(initialElementPosRef.current.y + deltaYPercent)));
          updateElement(targetId, { x: newX, y: newY });
        } else if (dragModeRef.current === "resize") {
          setIsResizingElement(true);
          const newW = Math.max(5, Math.min(100 - initialElementPosRef.current.x, Math.round(initialElementPosRef.current.width + deltaXPercent)));
          const newH = Math.max(2, Math.min(100 - initialElementPosRef.current.y, Math.round(initialElementPosRef.current.height + deltaYPercent)));
          updateElement(targetId, { width: newW, height: newH });
        }
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      isPointerDownRef.current = false;
      dragModeRef.current = null;
      dragTargetIdRef.current = null;
      setIsDraggingElement(false);
      setIsResizingElement(false);

      if (hasMovedSignificantlyRef.current) {
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 120);
      } else {
        justDraggedRef.current = false;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, { capture: true });
    window.addEventListener("pointerup", handleMouseUp, { capture: true });
    window.addEventListener("blur", handleMouseUp);
    window.addEventListener("contextmenu", handleMouseUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp, { capture: true });
      window.removeEventListener("pointerup", handleMouseUp, { capture: true });
      window.removeEventListener("blur", handleMouseUp);
      window.removeEventListener("contextmenu", handleMouseUp);
    };
  }, [updateElement]);

  // Single preview photo upload for current attendee
  const handleSinglePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoMap((prev) => {
        const next = new Map(prev);
        next.set(currentStudent.id, dataUrl);
        next.set(IdCardEngine.normalizePhotoId(currentStudent.id), dataUrl);
        if (currentStudent.name) {
          next.set(currentStudent.name.toLowerCase().trim(), dataUrl);
        }
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // Remove single custom photo
  const handleRemoveSinglePhoto = () => {
    setPhotoMap((prev) => {
      const next = new Map(prev);
      next.delete(currentStudent.id);
      next.delete(IdCardEngine.normalizePhotoId(currentStudent.id));
      if (currentStudent.name) {
        next.delete(currentStudent.name.toLowerCase().trim());
      }
      return next;
    });
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

          {/* Attendee Roster (Excel / CSV) Uploader */}
          <Card padding="sm" className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                Attendee Roster
              </span>
              {uploadedRosterName ? (
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {localStudents.length} Loaded
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">
                  {localStudents.length > 0 ? `${localStudents.length} Attendees` : "Demo Mode"}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Upload an Excel (.xlsx, .xls) or CSV sheet. All column headers are dynamically extracted.
            </p>

            <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-900 cursor-pointer transition-colors text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
              <UploadCloud className="w-4 h-4 text-emerald-500" />
              <span>{uploadedRosterName ? "Replace Excel / CSV" : "Upload Excel / CSV Roster"}</span>
              <input
                ref={rosterInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleRosterUpload}
                className="hidden"
              />
            </label>

            {uploadedRosterName && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                    {uploadedRosterName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearRoster}
                  className="text-slate-400 hover:text-rose-500 ml-2 font-bold cursor-pointer text-[10px]"
                  title="Clear Roster"
                >
                  Clear
                </button>
              </div>
            )}

            {!uploadedRosterName && localStudents.length === 0 && (
              <button
                type="button"
                onClick={handleLoadSampleRoster}
                className="w-full py-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Load Demo Sample Roster
              </button>
            )}
          </Card>

          {/* Card Data Fields & Multi-Select Sync Control */}
          <Card padding="sm" className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Select Card Fields
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-bold">
                Live Synced
              </span>
            </div>

            {/* Quick 1-Click Layout Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">
                Quick Field Layouts:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickPresetFields("name_id")}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors cursor-pointer text-left"
                  title="Only ID and Name on card"
                >
                  ⚡ ID + Name Only
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPresetFields("name_id_team")}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors cursor-pointer text-left"
                  title="Name, ID, and Team Name"
                >
                  🏆 Name + ID + Team
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPresetFields("name_id_dept")}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors cursor-pointer text-left"
                  title="Name, ID, and Department"
                >
                  🎓 Name + ID + Dept
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPresetFields("full")}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors cursor-pointer text-left"
                  title="Name, ID, Team, Dept, and QR"
                >
                  🌟 Full Pass (All 5)
                </button>
              </div>
            </div>

            {/* Individual Field Inclusion List */}
            <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-1">
                <span>Spreadsheet Columns ({availableColumns.length})</span>
                <span>Active on Card</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {availableColumns.map((col) => {
                  const onCard = isFieldOnCard(col);
                  const sampleVal = getFieldSampleValue(col);

                  return (
                    <div
                      key={col}
                      className={`p-2 rounded-xl border transition-all text-xs ${
                        onCard
                          ? "border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 shadow-2xs"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={onCard}
                            onChange={() => handleToggleField(col)}
                            className="rounded text-blue-600 cursor-pointer w-3.5 h-3.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate text-[11px]">
                              {col}
                            </span>
                            {sampleVal ? (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate block max-w-[130px]">
                                {sampleVal}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic block">Empty</span>
                            )}
                          </div>
                        </label>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAddDedicatedField(col)}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-medium transition-colors cursor-pointer"
                            title={`Add separate {{${col}}} box on card`}
                          >
                            + Field
                          </button>
                          {selectedElement && selectedElement.type === "text" && (
                            <button
                              type="button"
                              onClick={() => handleAppendTagToSelected(col)}
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono transition-colors cursor-pointer"
                              title={`Insert {{${col}}} into selected text element`}
                            >
                              Insert
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            {/* Flip Face Button & Quick Clean Button */}
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
                  Single-Sided (Front)
                </span>
              )}
              <Badge variant={activeSide === "front" ? "primary" : "neutral"}>
                {activeSide.toUpperCase()}
              </Badge>
              <button
                type="button"
                onClick={handleClearStarterShapes}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-all cursor-pointer text-[11px]"
                title="Removes starter header/footer bars so your custom background artwork is clear"
              >
                <Eraser className="w-3 h-3 text-blue-500" />
                Clear Starter Shapes
              </button>
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
            {(() => {
              const isLandscape = (template.dimensions?.aspectRatio || 1) > 1;
              const baseDisplayWidth = isLandscape ? 460 : 320;
              const displayWidth = Math.round(baseDisplayWidth * (zoomLevel / 100));
              const displayHeight = Math.round(
                (baseDisplayWidth / (template.dimensions.aspectRatio || (54 / 85.6))) * (zoomLevel / 100)
              );

              return (
                <div
                  ref={canvasWrapperRef}
                  onClick={(e) => {
                    if (justDraggedRef.current) return;
                    // Only deselect if clicked directly on canvas background, not on an element handle
                    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "CANVAS") {
                      setSelectedElementId(null);
                    }
                  }}
                  className="relative shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden select-none"
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                  }}
                >
                  {/* HTML5 Canvas */}
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-full block rounded-2xl cursor-crosshair pointer-events-none"
                  />

                  {/* Interactive DOM Selection Handles overlay with drag & drop */}
                  {activeElements.map((el) => {
                    const isSelected = el.id === selectedElementId;
                    return (
                      <div
                        key={el.id}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        onMouseDown={(e) => handleElementMouseDown(e, el)}
                        className={`absolute select-none transition-shadow ${
                          isSelected
                            ? "ring-2 ring-blue-500 bg-blue-500/10 rounded-sm z-20 cursor-move"
                            : "hover:ring-1 hover:ring-blue-300 z-10 cursor-pointer"
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
                          <>
                            <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-blue-600 text-white font-mono text-[9px] uppercase tracking-wide whitespace-nowrap shadow-xs pointer-events-none">
                              {el.type === "text"
                                ? (el as IdCardTextElement).text.slice(0, 16) || "Text"
                                : el.type}
                            </span>
                            <div
                              draggable={false}
                              onDragStart={(e) => e.preventDefault()}
                              onMouseDown={(e) => handleResizeMouseDown(e, el)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElementId(el.id);
                              }}
                              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md cursor-se-resize hover:scale-125 transition-transform"
                              title="Drag corner to resize"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
                      {/* Quick Insert Variable Chips */}
                      <div className="mt-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">
                          + Insert Dynamic Variable:
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {availableColumns.map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => {
                                const cur = (selectedElement as IdCardTextElement).text;
                                updateElement(selectedElement.id, { text: `${cur} {{${col}}}`.trim() });
                              }}
                              className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-mono border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer transition-colors"
                            >
                              + {col}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Font Family & Alignment */}
                    <div className="grid grid-cols-2 gap-2">
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
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Alignment</label>
                        <div className="grid grid-cols-3 gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => updateElement(selectedElement.id, { align: "left" })}
                            className={`py-1 rounded-lg border text-xs font-semibold cursor-pointer flex items-center justify-center ${
                              (selectedElement as IdCardTextElement).align === "left"
                                ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                            title="Align Left"
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateElement(selectedElement.id, { align: "center" })}
                            className={`py-1 rounded-lg border text-xs font-semibold cursor-pointer flex items-center justify-center ${
                              !(selectedElement as IdCardTextElement).align ||
                              (selectedElement as IdCardTextElement).align === "center"
                                ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                            title="Align Center"
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateElement(selectedElement.id, { align: "right" })}
                            className={`py-1 rounded-lg border text-xs font-semibold cursor-pointer flex items-center justify-center ${
                              (selectedElement as IdCardTextElement).align === "right"
                                ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                            title="Align Right"
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
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

                    {/* Single Photo Upload for Current Attendee */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">
                          Test / Preview Photo:
                        </span>
                        {photoMap.has(IdCardEngine.normalizePhotoId(currentStudent.id)) && (
                          <span className="text-[10px] text-emerald-600 font-semibold">• Custom Active</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                          <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSinglePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        {photoMap.has(IdCardEngine.normalizePhotoId(currentStudent.id)) && (
                          <button
                            type="button"
                            onClick={handleRemoveSinglePhoto}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs cursor-pointer"
                            title="Remove custom photo and revert to initials monogram avatar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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

          {/* Card Layers & Hierarchy Panel */}
          <Card padding="sm" className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                {activeSide.toUpperCase()} Layers ({activeElements.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => addElement("text")}
                  className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Text
                </button>
                <button
                  type="button"
                  onClick={() => addElement("photo")}
                  className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Photo
                </button>
              </div>
            </div>

            {activeElements.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                No elements on this card face. Click + Text or + Photo above to add.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                {[...activeElements].reverse().map((el, revIdx) => {
                  const isSelected = el.id === selectedElementId;
                  const originalIdx = activeElements.length - 1 - revIdx;
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`group flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 shadow-2xs font-medium"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {el.type === "text" && <Type className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                        {el.type === "photo" && <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {el.type === "barcode_qr" && <QrCode className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                        {el.type === "shape" && <Shapes className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {el.type === "image" && <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}

                        <div className="truncate flex-1">
                          <span className="block truncate text-xs">
                            {el.type === "text"
                              ? (el as IdCardTextElement).text || "Text Field"
                              : el.type === "photo"
                              ? `Photo Frame (${(el as IdCardPhotoElement).shape || "rounded"})`
                              : el.type === "barcode_qr"
                              ? (el as IdCardBarcodeQrElement).codeType === "qr"
                                ? "QR Code"
                                : "Barcode (1D)"
                              : el.type === "shape"
                              ? `Shape (${(el as IdCardShapeElement).shapeType || "rectangle"})`
                              : "Custom Image"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          disabled={originalIdx === activeElements.length - 1}
                          onClick={(e) => handleMoveLayer("up", el.id, e)}
                          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer disabled:cursor-not-allowed"
                          title="Bring Forward (Higher Layer)"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={originalIdx === 0}
                          onClick={(e) => handleMoveLayer("down", el.id, e)}
                          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer disabled:cursor-not-allowed"
                          title="Send Backward (Lower Layer)"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteElement(el.id, e)}
                          className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Delete Element"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Background Artwork & Preset Themes */}
          <Card padding="sm" className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-500" />
                {activeSide.toUpperCase()} Background Art
              </span>
              {(activeSide === "front" ? template.frontBackground : template.backBackground)?.startsWith("data:") && (
                <Badge variant="success">Custom Template</Badge>
              )}
            </div>

            <label className="flex items-center justify-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-all font-semibold cursor-pointer text-xs">
              <UploadCloud className="w-4 h-4 text-blue-500" />
              Upload Template Image (PNG/JPG)
              <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />
            </label>

            {/* Template Actions if Custom Background is Loaded */}
            {(activeSide === "front" ? template.frontBackground : template.backBackground)?.startsWith("data:") && (
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-800 dark:text-blue-200 font-semibold">Template Active:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {template.dimensions.canvasWidth} × {template.dimensions.canvasHeight} px
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearStarterShapes}
                    className="w-full py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    title="Removes default solid banners so your custom template graphic is unobstructed"
                  >
                    <Eraser className="w-3.5 h-3.5 text-blue-500" />
                    Clear Starter Shapes (Template Only)
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllElements}
                    className="w-full py-1 px-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Elements (Blank Canvas)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplate((prev) => ({
                        ...prev,
                        frontBackground: activeSide === "front" ? "theme:dark-slate" : prev.frontBackground,
                        backBackground: activeSide === "back" ? "theme:clean-white" : prev.backBackground,
                      }));
                    }}
                    className="w-full py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 font-medium text-[11px] transition-colors cursor-pointer text-center"
                  >
                    Remove Uploaded Image
                  </button>
                </div>
              </div>
            )}

            {/* Quick Themes */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Or Choose Theme Preset:</span>
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 text-white font-bold cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white text-slate-900 font-bold cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  Clean White
                </button>
              </div>
              <button
                type="button"
                onClick={handleResetStarterTemplate}
                className="w-full py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restore Default University Template
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
