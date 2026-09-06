"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

export interface CertificateStudioViewProps {
  students: StudentRecord[];
}

export const CertificateStudioView: React.FC<CertificateStudioViewProps> = ({
  students,
}) => {
  // Active Template State
  const [template, setTemplate] = useState<CertificateTemplate>(() => {
    const tpl = new CertificateTemplate("University Merit Certificate", 1920, 1080);
    tpl.addElement(
      new TextElement({
        id: "title",
        x: 960,
        y: 260,
        text: "CERTIFICATE OF EXCELLENCE",
        fontSize: 52,
        fontFamily: "Cinzel, serif",
        fontWeight: "bold",
        color: "#F59E0B",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "sub",
        x: 960,
        y: 350,
        text: "THIS PROUDLY CERTIFIES THAT",
        fontSize: 22,
        fontFamily: "Inter, sans-serif",
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
        y: 470,
        text: "{{Name}}",
        fontSize: 64,
        fontFamily: "Playfair Display, serif",
        fontWeight: "bold",
        color: "#FFFFFF",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "desc",
        x: 960,
        y: 590,
        text: "has served as an honorable {{Position}} representing {{Department}}",
        fontSize: 26,
        fontFamily: "Inter, sans-serif",
        color: "#CBD5E1",
        align: "center",
      })
    );
    tpl.addElement(
      new TextElement({
        id: "id_and_date",
        x: 960,
        y: 660,
        text: "Student ID: {{Student_ID}} | Issued on {{Date}}",
        fontSize: 20,
        fontFamily: "Inter, sans-serif",
        color: "#6366F1",
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
  });

  // Selected Student for Live Preview
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const activeStudent: StudentRecord = students[selectedStudentIndex] || {
    id: "CSE-2026-1024",
    name: "Alexandria Morgan",
    department: "Computer Science & Engineering",
    batch: "Batch 52",
    section: "A",
    extra: { position: "1st Place Winner" },
  };

  // Selected Element for Inspector
  const [selectedElementId, setSelectedElementId] = useState<string | null>("name");

  // Canvas & Background Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

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

  // Drag-and-Drop on Canvas State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Re-render preview canvas whenever template, student, or background changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    BulkGeneratorEngine.renderCertificateToCanvas(template, activeStudent, bgImage).then(
      (rendered) => {
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(rendered, 0, 0);

          // Highlight selected element bounding box
          const selected = template.getElements().find((e) => e.id === selectedElementId);
          if (selected) {
            ctx.save();
            ctx.strokeStyle = "#6366F1";
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            if (selected.type === "text") {
              const textEl = selected as TextElement;
              const text = textEl.resolveText(activeStudent);
              ctx.font = `${textEl.fontWeight} ${textEl.fontSize}px ${textEl.fontFamily}, sans-serif`;
              const metrics = ctx.measureText(text);
              const w = metrics.width + 40;
              const h = textEl.fontSize * 1.5;
              const x = textEl.align === "center" ? textEl.x - w / 2 : textEl.x - 10;
              const y = textEl.y - h / 2;
              ctx.strokeRect(x, y, w, h);
            } else if (selected.type === "qr") {
              const qrEl = selected as QrElement;
              ctx.strokeRect(
                qrEl.x - qrEl.size / 2 - 8,
                qrEl.y - qrEl.size / 2 - 8,
                qrEl.size + 16,
                qrEl.size + 16
              );
            }
            ctx.restore();
          }
        }
      }
    );
  }, [template, activeStudent, bgImage, selectedElementId]);

  // Upload Custom Background Image
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
        setTemplate(updated);
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Upload Custom TTF / OTF Font File
  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fontName = file.name.replace(/\.[^/.]+$/, "");
    const buffer = await file.arrayBuffer();
    const font = new FontFace(fontName, buffer);
    await font.load();
    (document.fonts as any).add(font);

    // Update selected element font
    if (selectedElementId) {
      updateSelectedElement({ fontFamily: fontName });
    }
  };

  // Add New Element
  const addTextElement = () => {
    const newEl = new TextElement({
      id: `text-${Date.now()}`,
      x: 960,
      y: 540,
      text: "New Dynamic Text {{Department}}",
      fontSize: 28,
      color: "#FFFFFF",
      align: "center",
    });
    const updated = CertificateTemplate.fromJSON(template.toJSON());
    updated.addElement(newEl);
    setTemplate(updated);
    setSelectedElementId(newEl.id);
  };

  const addQrElement = () => {
    const newQr = new QrElement({
      id: `qr-${Date.now()}`,
      x: 960,
      y: 800,
      size: 120,
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

  // Start Bulk Generation
  const startBulkGeneration = async () => {
    if (students.length === 0) {
      alert("Please load or upload student records in the Data Refinery first!");
      return;
    }
    cancelRef.current = false;
    setIsGenerating(true);
    setIsGenModalOpen(true);

    try {
      const blob = await BulkGeneratorEngine.generateBulk(
        template,
        students,
        exportFormat,
        bgImage,
        (prog) => setProgress(prog),
        () => cancelRef.current
      );

      const filename =
        exportFormat === "merged-pdf"
          ? `All_Certificates_${students.length}_Pages.pdf`
          : `Certificates_${students.length}_Batch.zip`;

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
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Certificate Studio & 1,000+ Bulk Generator
              </h2>
              <p className="text-xs text-slate-400">
                Visual drag-and-drop designer with Google Fonts, dynamic QR codes, and client-side background rendering.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ImageIcon className="w-4 h-4" />}
            onClick={() => bgInputRef.current?.click()}
          >
            Upload Background
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Type className="w-4 h-4" />}
            onClick={() => fontInputRef.current?.click()}
          >
            Upload Custom Font (.ttf)
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => handleDownloadSingle("png")}
          >
            Download Preview (PNG)
          </Button>
          <Button
            variant="success"
            size="sm"
            leftIcon={<Play className="w-4 h-4" />}
            onClick={() => setIsGenModalOpen(true)}
          >
            Bulk Generate ({students.length > 0 ? students.length : 1} Certs)
          </Button>
        </div>
      </div>

      {/* Main Studio Grid: Left Canvas, Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: WYSIWYG Canvas & Student Switcher (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card padding="sm" className="relative overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col items-center border border-slate-200 dark:border-slate-800">
            {/* Live Interactive Record Switcher */}
            <div className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 rounded-t-xl text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Live Previewing:</span>
                <span className="font-bold text-slate-900 dark:text-white">{activeStudent.name}</span>
                <Badge variant="primary">{activeStudent.id}</Badge>
              </div>
              {students.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    Row {selectedStudentIndex + 1} of {students.length}
                  </span>
                  <select
                    value={selectedStudentIndex}
                    onChange={(e) => setSelectedStudentIndex(Number(e.target.value))}
                    className={`${THEME.surface.inputSm} w-36`}
                  >
                    {students.map((s, idx) => (
                      <option key={s.id} value={idx}>
                        {idx + 1}. {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Canvas Display */}
            <div className="w-full p-4 flex items-center justify-center overflow-auto bg-slate-200/50 dark:bg-slate-950/80">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-xl shadow-md border border-slate-300 dark:border-slate-800 cursor-crosshair transition-all"
                style={{ maxHeight: "540px" }}
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
                  Add Text
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<QrCode className="w-3.5 h-3.5" />}
                  onClick={addQrElement}
                >
                  Add Dynamic QR
                </Button>
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Resolution: {template.width} × {template.height}px (Full High-DPI Vector/Raster)
              </span>
            </div>
          </Card>
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
                  title="Delete element"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Element Selector Dropdown */}
            <div>
              <label className={THEME.typography.label}>Select Layer:</label>
              <select
                value={selectedElementId || ""}
                onChange={(e) => setSelectedElementId(e.target.value)}
                className={`${THEME.surface.select} mt-1`}
              >
                {template.getElements().map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.type === "text"
                      ? `Text: ${(el as TextElement).text.slice(0, 24)}...`
                      : `QR Code (${el.id})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Properties for Text Element */}
            {selectedElement && selectedElement.type === "text" && (
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className={THEME.typography.label}>Text Content / Tags:</label>
                  <input
                    type="text"
                    value={(selectedElement as TextElement).text}
                    onChange={(e) => updateSelectedElement({ text: e.target.value })}
                    className={`${THEME.surface.input} mt-1 font-mono text-xs`}
                  />
                  <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-slate-400">
                    <span
                      onClick={() =>
                        updateSelectedElement({
                          text: (selectedElement as TextElement).text + " {{Name}}",
                        })
                      }
                      className="cursor-pointer hover:text-indigo-300 underline"
                    >
                      +Name
                    </span>
                    <span
                      onClick={() =>
                        updateSelectedElement({
                          text: (selectedElement as TextElement).text + " {{Student_ID}}",
                        })
                      }
                      className="cursor-pointer hover:text-indigo-300 underline"
                    >
                      +ID
                    </span>
                    <span
                      onClick={() =>
                        updateSelectedElement({
                          text: (selectedElement as TextElement).text + " {{Department}}",
                        })
                      }
                      className="cursor-pointer hover:text-indigo-300 underline"
                    >
                      +Dept
                    </span>
                    <span
                      onClick={() =>
                        updateSelectedElement({
                          text: (selectedElement as TextElement).text + " {{Position}}",
                        })
                      }
                      className="cursor-pointer hover:text-indigo-300 underline"
                    >
                      +Position
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={THEME.typography.label}>Font Size (px):</label>
                    <input
                      type="number"
                      value={(selectedElement as TextElement).fontSize}
                      onChange={(e) =>
                        updateSelectedElement({ fontSize: Number(e.target.value) })
                      }
                      className={`${THEME.surface.input} mt-1`}
                    />
                  </div>

                  <div>
                    <label className={THEME.typography.label}>Text Color:</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={(selectedElement as TextElement).color}
                        onChange={(e) => updateSelectedElement({ color: e.target.value })}
                        className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={(selectedElement as TextElement).color}
                        onChange={(e) => updateSelectedElement({ color: e.target.value })}
                        className={`${THEME.surface.input} font-mono text-xs`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={THEME.typography.label}>Font Family:</label>
                  <select
                    value={(selectedElement as TextElement).fontFamily}
                    onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                    className={`${THEME.surface.select} mt-1`}
                  >
                    <option value="Inter, sans-serif">Inter (Modern Sans)</option>
                    <option value="Playfair Display, serif">Playfair Display (Luxury Serif)</option>
                    <option value="Cinzel, serif">Cinzel (Formal Classic)</option>
                    <option value="Montserrat, sans-serif">Montserrat (Geometric Sans)</option>
                    <option value="serif">Times New Roman / Serif</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className={THEME.typography.label}>Font Weight:</label>
                    <select
                      value={(selectedElement as TextElement).fontWeight}
                      onChange={(e) => updateSelectedElement({ fontWeight: e.target.value })}
                      className={`${THEME.surface.select} mt-1`}
                    >
                      <option value="normal">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="bold">Bold (700)</option>
                      <option value="800">Heavy (800)</option>
                    </select>
                  </div>
                </div>

                {/* X and Y Position Adjusters */}
                <div className="grid grid-cols-2 gap-3 pt-1">
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
        </div>
      </div>

      {/* Bulk Generation Modal */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => !isGenerating && setIsGenModalOpen(false)}
        title="1,000+ Bulk Certificate Generation Engine"
        subtitle="Processes in local browser memory without server timeouts or costs"
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
                Start Generating ({students.length > 0 ? students.length : 1} Records)
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
                      All 1,000 pages in one book for university printing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Total Records:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{students.length || 1} Students</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Processing Time:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ~{Math.max(1, Math.round((students.length || 1) * 0.04))} seconds (Local CPU)
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
