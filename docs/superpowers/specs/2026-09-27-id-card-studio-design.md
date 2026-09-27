# ID Card Studio - System Design Specification

**Date**: 2026-09-27  
**Status**: Approved for Planning  
**Target Path**: `src/components/section-1-core/IdCardStudioView.tsx`, `src/core/domain/id-card-element.ts`, `src/core/engines/id-card-engine.ts`

---

## 1. Overview & Objectives

The **ID Card Studio** is a full-featured, professional card design and bulk issuance engine for CampusClub Suite. It empowers organizers, club administrators, and university event coordinators to create bespoke student and attendee ID cards, member badges, and VIP passes with pixel-perfect drag-and-drop customization, dynamic Excel data binding, automated bulk photo matching, dual-sided (front/back) layout controls, and high-resolution 300 DPI bulk exports.

### Key Capabilities
1. **Flexible Card Dimensions & Aspect Ratios**:
   - Presets for CR-80 Portrait (54 × 85.6 mm), CR-80 Landscape (85.6 × 54 mm), Lanyard Event Badge (70 × 100 mm), and fully custom width/height/ratio specifications.
2. **Single-Sided or Dual-Sided Mode**:
   - Organizers can select **Single-Sided** (front only) or **Dual-Sided** (front + back), with interactive 3D card flipping in the studio.
3. **Template Upload & Custom Canvas Building**:
   - Users can upload custom background artwork (PNG/JPG) for front and back faces, or build designs directly using built-in themes and design elements.
4. **Dynamic Data Binding from Excel/CSV**:
   - Automatically ingests attendee data from the active roster (Data Refinery).
   - Dynamic column pill picker automatically detects sheet columns (`{{Name}}`, `{{ID}}`, `{{Department}}`, `{{Batch}}`, `{{Team}}`, `{{University}}`, `{{Blood_Group}}`, etc.).
5. **Bulk Photo ZIP Extraction & ID Auto-Matching**:
   - Upload a ZIP containing student photos.
   - Client-side unzipping via `JSZip` and matching by Student ID (e.g. `CSE-1024.jpg` matches student with ID `CSE-1024`).
   - Diagnostic matching counter with manual override and smart monogram fallback for unmatched records.
6. **Multi-Format Bulk Export & Printing Engine**:
   - Merged 300 DPI CR-80 PDF (individual cards or alternating front/back pages for duplex PVC card printers).
   - Multi-Up A4 Tiled Grid (8–10 cards per sheet with cutting guidelines and crop marks).
   - ZIP archive of individual high-res PNG/PDF files.
   - Direct browser print preview dialog.

---

## 2. Domain Modeling (`src/core/domain/id-card-element.ts`)

### 2.1 Element Hierarchy
All visual elements inherit from a common `IdCardElement`:
```typescript
export type IdCardElementType = "text" | "photo" | "barcode_qr" | "image" | "shape";

export interface IdCardBaseElementProps {
  id: string;
  type: IdCardElementType;
  x: number; // percentage or normalized canvas coordinates (0 to 100)
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees 0-360
  opacity?: number; // 0 to 1
  isLocked?: boolean;
}
```

### 2.2 Specialized Elements
1. **`IdCardTextElement`**:
   - `text`: Template string with variable interpolation (e.g. `{{Name}}`, `{{ID}}`).
   - `fontSize`: Pt/Px size.
   - `fontFamily`: Supported Google font.
   - `fontWeight`: Regular (400), Medium (500), Bold (700), Black (900).
   - `color`: Hex color string.
   - `align`: "left" | "center" | "right".
   - `letterSpacing`: Numeric spacing.
   - `textTransform`: "none" | "uppercase" | "capitalize" | "lowercase".
   - `shadowColor`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY`.
2. **`IdCardPhotoElement`**:
   - `shape`: "rounded" | "circle" | "square".
   - `borderRadius`: In pixels/percentage.
   - `borderWidth`: Border thickness.
   - `borderColor`: Hex border color.
   - `hasShadow`: Boolean.
   - `fallbackColor`: Hex color for fallback monogram avatar.
3. **`IdCardBarcodeQrElement`**:
   - `codeType`: "qr" | "code128_barcode".
   - `valuePattern`: Dynamic string (e.g. `{{ID}}` or `https://verify.campus.edu/id/{{ID}}`).
   - `fgColor`: Dark color (default `#0F172A`).
   - `bgColor`: Background color (default `#FFFFFF` or transparent).
   - `showLabel`: Whether to show text ID underneath code.
4. **`IdCardImageElement`**:
   - `src`: Data URL or asset path (university crest, sponsor logo, signature scan).
   - `objectFit`: "contain" | "cover".
5. **`IdCardShapeElement`**:
   - `shapeType`: "rectangle" | "line" | "pill" | "badge_ribbon".
   - `fillColor`: Fill color.
   - `strokeColor`: Outline color.
   - `strokeWidth`: Outline width.
   - `borderRadius`: Corner rounding.

### 2.3 Template Definition
```typescript
export type CardOrientation = "portrait" | "landscape";
export type CardSidedness = "single" | "dual";

export interface CardDimensions {
  presetName: "cr80_portrait" | "cr80_landscape" | "lanyard_badge" | "custom";
  widthMm: number;
  heightMm: number;
  aspectRatio: number; // width / height
  canvasWidth: number; // e.g. 638 px (base rendering at 300 DPI preview)
  canvasHeight: number; // e.g. 1012 px
}

export interface IdCardTemplate {
  id: string;
  name: string;
  dimensions: CardDimensions;
  sidedness: CardSidedness;
  frontBackground?: string; // Data URL or preset name
  backBackground?: string;
  frontElements: IdCardElement[];
  backElements: IdCardElement[];
  activeSide: "front" | "back";
}
```

---

## 3. Bulk Engine Architecture (`src/core/engines/id-card-engine.ts`)

### 3.1 Photo ZIP Processing
- Uses `JSZip` to extract archives completely client-side in browser memory.
- Builds an in-memory index `Map<string, string>` where keys are normalized base filenames (e.g., `"cse-1024"`, `"2026001"`).
- Normalization removes file extensions, converts to lowercase, and strips hyphens/underscores for resilient matching against `student.id` or `student.name`.
- Returns matching statistics: `totalStudents`, `matchedCount`, `unmatchedIds`.

### 3.2 Canvas Rendering (`renderCardFaceToCanvas`)
- Sets canvas resolution at 300 DPI target (e.g., CR-80 card at 300 DPI = 1012 × 638 px).
- Draws background image or default high-end gradient.
- Iterates elements in z-order:
  - Text: Resolves `{{Field}}` variables, applies font styles, handles alignment and optional text shadows.
  - Photo: Loads mapped student photo from ZIP cache; if missing, dynamically draws a modern monogram avatar with student initials and gradient.
  - Barcode/QR: Encodes dynamic student value via `qrcode` or canvas barcode rendering.
  - Shapes & Logos: Renders vectors, lines, and transparency-preserving images.

### 3.3 Bulk Export Pipeline
- **Chunked Worker/Batch Loop**:
  - Processes students in chunks of 20 to yield to the main thread via `setTimeout(..., 0)` or `requestAnimationFrame`.
  - Emits `IdCardGenerationProgress` (`current`, `total`, `percentage`, `statusText`).
- **Merged PDF Export**:
  - Leverages `pdf-lib` to create a single PDF document.
  - Embeds each rendered card as a high-quality JPEG/PNG image.
  - For single-sided: 1 page per card.
  - For dual-sided: alternating Front and Back pages.
- **A4 Tiled Sheet Export**:
  - Calculates grid matrix (e.g., 2 cols × 4 rows = 8 cards per page with 3mm margins).
  - Draws dashed cut lines and crop marks between cards.
  - For dual-sided: Generates paired front and back sheets aligned for duplex printing.
- **ZIP PNG Archive**:
  - Compresses individual card face images into a `.zip` file using `JSZip` and triggers download via `file-saver`.

---

## 4. User Interface Architecture (`IdCardStudioView.tsx`)

### 4.1 Component Layout
```
+-------------------------------------------------------------------------------+
|  Header Bar: Tool Title | Preset Selector | Sidedness Toggle | Bulk Export Btn |
+-----------------------+-------------------------------+-----------------------+
|  LEFT SIDEBAR         |  CENTER WORKSPACE             |  RIGHT INSPECTOR      |
|                       |                               |                       |
|  - Add Elements       |  - 3D Flip Card Toggle        |  - Selected Element   |
|    * Text Field       |  - Zoom Controls (50%-150%)   |    Properties:        |
|    * Photo Frame      |  - Interactive Drag & Resize  |    * Typography       |
|    * QR/Barcode       |    Canvas (Front / Back)      |    * Colors & Fill    |
|    * Logo/Image       |                               |    * Coordinates/Size |
|    * Shapes/Ribbons   |  - Bottom Attendee Switcher   |    * Layer Order      |
|                       |    [◀ Prev] Student 4/150 [Next ▶] |                  |
|  - Excel Column Pills |                               |  - Card Background    |
|  - Bulk Photo ZIP Upload                              |    Upload & Themes    |
+-----------------------+-------------------------------+-----------------------+
```

### 4.2 Interactive State Management
- `template`: Active `IdCardTemplate` state (dimensions, frontElements, backElements, sidedness).
- `activeSide`: `"front"` | `"back"`.
- `selectedElementId`: string | null.
- `previewStudentIndex`: Current student being previewed on the canvas.
- `photoMap`: In-memory `Map<string, string>` storing student photos.
- `isGenerating`: Boolean flag controlling the progress modal.
- `generationProgress`: Progress counter and percentage.

---

## 5. Integration into CampusClub Suite

### 5.1 Navigation Update (`src/app/page.tsx`)
In `Section 1: Pre-Event Planning & Design`, add `"idcards"` subtab:
```tsx
<button
  type="button"
  onClick={() => selectCoreTool("idcards")}
  className={...}
>
  ID Card Studio
</button>
```
Renders:
```tsx
{coreSubTab === "idcards" && (
  <IdCardStudioView students={students} />
)}
```

---

## 6. Error Handling & Edge Cases

1. **Unmatched Photos**:
   - If a student's ID has no corresponding image in the uploaded ZIP, fallback gracefully to a clean monogram avatar without breaking the batch export.
2. **Missing Excel Columns**:
   - If a dynamic variable `{{Custom_Field}}` is missing for a particular student, resolves safely to an empty string `""` without displaying raw mustache tags.
3. **Very Long Names / Text Overflow**:
   - Canvas text rendering measures text width and auto-shrinks font size or truncates with ellipsis if maximum bounds are exceeded.
4. **Large Batch Memory Safety**:
   - Canvas buffers are garbage collected after each chunk is written into `pdf-lib` / `JSZip` to prevent browser memory exhaustion.

---

## 7. Verification & Testing Strategy

1. **Unit & Logic Verification**:
   - Photo ZIP filename normalizer and matching engine.
   - Dynamic variable replacement for all standard and custom columns.
   - Canvas rendering coordinates and aspect ratio calculations for CR-80 and custom presets.
2. **Interactive UI Verification**:
   - Dragging, resizing, and positioning elements.
   - Single-sided vs dual-sided toggling and 3D card flip.
   - Live attendee preview carousel updating fields in real time.
3. **Export Verification**:
   - Generate merged CR-80 PDF and inspect page dimensions.
   - Generate A4 tiled sheet with cut guides.
   - Generate ZIP archive of individual cards.
4. **Build & Lint Verification**:
   - Run `npm run lint` and `npm run build` to guarantee zero TypeScript or Next.js build errors.
