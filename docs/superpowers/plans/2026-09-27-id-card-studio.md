# ID Card Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, professional ID Card Studio with customizable card dimensions/aspect ratios, single/dual-sided editing, Excel dynamic variable binding, bulk photo ZIP extraction & ID auto-matching, and multi-format bulk printing/exporting.

**Architecture:** A dedicated domain layer (`id-card-element.ts`) models card dimensions, front/back faces, and specialized elements (Text, Photo, Barcode/QR, Image/Logo, Shapes). An engine layer (`id-card-engine.ts`) handles client-side photo ZIP extraction, 300 DPI canvas rendering, variable interpolation, and chunked batch generation into Merged PDF, A4 Tiled Grid, and ZIP PNG archives. A rich React studio component (`IdCardStudioView.tsx`) provides an interactive drag-and-drop workspace, 3D flip toggle, dynamic column pill bar, and live attendee preview switcher, wired directly into `src/app/page.tsx`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, `pdf-lib`, `jszip`, `qrcode`, `file-saver`, `vitest`.

**Spec:** `docs/superpowers/specs/2026-09-27-id-card-studio-design.md`

## Global Constraints
- Target standard: Standard CR-80 card dimensions (54 mm × 85.6 mm portrait / 85.6 mm × 54 mm landscape), with custom width/height/ratio support.
- Dependency rules: Use existing project packages (`pdf-lib`, `jszip`, `qrcode`, `file-saver`, `lucide-react`) without adding unvetted third-party runtime bloat.
- Memory & Performance: Bulk rendering must be processed in non-blocking chunks (chunk size ~20) to avoid locking the UI during large batch exports.
- Clean Architecture: Maintain complete separation from `CertificateStudioView.tsx` to prevent regressions in existing certificate flows.

## Review Focus
1. **Unmatched Photo Fallback**: When an attendee's ID is not found in the uploaded photo ZIP, verify the canvas renders a clean initials monogram avatar without throwing or stopping the batch.
2. **Dynamic Mustache Variable Tolerance**: When a custom Excel column (e.g. `{{Team_Name}}` or `{{Blood_Group}}`) is missing or undefined for a specific attendee, ensure it resolves to `""` rather than displaying raw `{{...}}` brackets or `undefined`.
3. **Dual-Sided vs Single-Sided Mode Consistency**: Ensure switching to Single-Sided mode exports only front card faces, while Dual-Sided exports interleaved/paired front and back pages in both Merged PDF and A4 Tiled sheets.
4. **Custom Aspect Ratio Rescaling**: When a user changes dimensions from CR-80 Portrait to Landscape or custom dimensions, ensure coordinates remain properly normalized within canvas boundaries.
5. **A4 Tiling Cut Guides**: Verify that multi-up grid calculations on A4 paper include dashed cutting lines with proper page margins.

---

### Task 1: Core Domain Models & Dimensions (`id-card-element.ts`)

**Files:**
- Create: `src/core/domain/id-card-element.ts`
- Test: `tests/id-card-element.test.ts`

**Interfaces:**
- Consumes: `StudentRecord` from `src/core/domain/roster.ts`
- Produces:
  - `CardDimensions`, `CardOrientation`, `CardSidedness`, `CARD_DIMENSION_PRESETS`
  - `IdCardElement`, `IdCardTextElement`, `IdCardPhotoElement`, `IdCardBarcodeQrElement`, `IdCardImageElement`, `IdCardShapeElement`
  - `IdCardTemplate`, `createDefaultIdCardTemplate()`
  - `resolveIdCardText(text: string, student: StudentRecord): string`

- [ ] **Step 1: Write failing tests for domain models, text interpolation, and presets**
Create `tests/id-card-element.test.ts` testing:
- Creation of `IdCardTextElement`, `IdCardPhotoElement`, and default template.
- Preset dimensions (CR-80 portrait aspect ratio ~0.63, landscape ~1.586, lanyard badge).
- `resolveIdCardText` resolving standard (`{{Name}}`, `{{ID}}`, `{{Department}}`, `{{Batch}}`) and custom keys (`{{Team}}`, `{{Blood_Group}}`), handling undefined values gracefully.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/id-card-element.test.ts`
Expected: FAIL (module `src/core/domain/id-card-element` not found)

- [ ] **Step 3: Implement domain models and resolution logic**
Create `src/core/domain/id-card-element.ts` implementing:
- Dimension presets with exact mm and 300 DPI pixel dimensions.
- Abstract and concrete element classes / interfaces (`text`, `photo`, `barcode_qr`, `image`, `shape`).
- `resolveIdCardText` with regex variable replacement and dynamic property fallback.
- `createDefaultIdCardTemplate()` producing a modern university student ID starter template (front and back).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/id-card-element.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/domain/id-card-element.ts tests/id-card-element.test.ts
git commit -m "feat(id-cards): implement core domain models and dimension presets"
```

---

### Task 2: Bulk Generation & Photo ZIP Engine (`id-card-engine.ts`)

**Files:**
- Create: `src/core/engines/id-card-engine.ts`
- Test: `tests/id-card-engine.test.ts`

**Interfaces:**
- Consumes: `IdCardTemplate`, `IdCardElement`, `resolveIdCardText` from `src/core/domain/id-card-element.ts`, `StudentRecord` from `src/core/domain/roster.ts`
- Produces:
  - `IdCardEngine.normalizePhotoId(filename: string): string`
  - `IdCardEngine.extractPhotosFromZip(zipBuffer: ArrayBuffer | Blob): Promise<{ photoMap: Map<string, string>, totalPhotos: number }>`
  - `IdCardEngine.matchPhotosToStudents(photoMap: Map<string, string>, students: StudentRecord[]): { matchedCount: number, unmatchedIds: string[] }`
  - `IdCardEngine.generateInitialsAvatar(name: string, department?: string): string`
  - `IdCardEngine.calculateA4Tiling(cardWidthMm: number, cardHeightMm: number): { cols: number, rows: number, cardsPerPage: number, marginX: number, marginY: number }`
  - `IdCardEngine.renderFaceToCanvas(template: IdCardTemplate, face: "front" | "back", student: StudentRecord, photoDataUrl?: string): Promise<HTMLCanvasElement>`
  - `IdCardEngine.generateMergedPdf(...)`, `IdCardEngine.generateA4TiledPdf(...)`, `IdCardEngine.generateZipArchive(...)`

- [ ] **Step 1: Write failing unit tests for photo extraction normalization and A4 tiling calculations**
Create `tests/id-card-engine.test.ts` testing:
- `normalizePhotoId` matching variants like `"2026-001.jpg"`, `"cse_1024.png"`, `"ID#9901.jpeg"` to their base clean IDs.
- `matchPhotosToStudents` identifying matched and unmatched student records.
- `calculateA4Tiling` calculating correct rows/columns for CR-80 portrait (2×4 or 2×5) on standard A4 (210×297mm).
- `generateInitialsAvatar` producing a valid data URL / avatar canvas representation.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/id-card-engine.test.ts`
Expected: FAIL (module `src/core/engines/id-card-engine` not found)

- [ ] **Step 3: Implement photo processing and bulk engine logic**
Create `src/core/engines/id-card-engine.ts` implementing:
- `extractPhotosFromZip` using `JSZip` client-side with base64 conversion.
- `renderFaceToCanvas` drawing background, photo avatar (or initials avatar fallback), dynamic text with alignment and shadows, barcode/QR codes via `qrcode`, and shapes.
- Chunked generator pipeline for Merged PDF (`pdf-lib`), A4 Tiled Grid (with crop marks and cut dashed lines), and ZIP archive (`jszip` + `file-saver`).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/id-card-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/engines/id-card-engine.ts tests/id-card-engine.test.ts
git commit -m "feat(id-cards): implement bulk generation engine and photo ZIP extractor"
```

---

### Task 3: Interactive ID Card Studio UI Component (`IdCardStudioView.tsx`)

**Files:**
- Create: `src/components/section-1-core/IdCardStudioView.tsx`

**Interfaces:**
- Consumes:
  - `StudentRecord` from `src/core/domain/roster.ts`
  - `IdCardTemplate`, `CARD_DIMENSION_PRESETS`, `createDefaultIdCardTemplate()` from `src/core/domain/id-card-element.ts`
  - `IdCardEngine` from `src/core/engines/id-card-engine.ts`
  - `Button`, `Card`, `Badge`, `Modal`, `ProgressBar` from `src/components/common`
- Produces:
  - `export const IdCardStudioView: React.FC<{ students: StudentRecord[] }>`

- [ ] **Step 1: Build the complete studio component**
Create `src/components/section-1-core/IdCardStudioView.tsx` including:
- **Top Control Bar**:
  - Card Size & Ratio Selector (CR-80 Portrait, CR-80 Landscape, Lanyard Badge, Custom mm/ratio).
  - Sidedness Toggle (Single-Sided vs Dual-Sided).
  - 3D Flip Face button (Front ⟷ Back) with visual flip indicator.
  - Bulk Export modal trigger button.
- **Left Panel (Toolbox & Data)**:
  - Add Element Buttons: Text, Student Photo, Barcode/QR, Logo Image, Shapes/Ribbons.
  - Excel Dynamic Column Pills: auto-detected from `students[0]` and extra keys (`{{Name}}`, `{{ID}}`, `{{Department}}`, `{{Batch}}`, `{{Team}}`, etc.).
  - Bulk Photo ZIP Uploader with instant match diagnostics widget (*"X / Y matched"*).
- **Center Canvas**:
  - Interactive drag-and-drop workspace with guidelines and selection bounding box.
  - Zoom controls (50%, 75%, 100%, 150%, Fit).
  - Background template upload (PNG/JPG) + preset background themes.
  - Bottom attendee preview switcher (`[◀ Previous] Student X of Y [Next ▶]`).
- **Right Panel (Properties Inspector)**:
  - Selected element typography (fonts, sizes, colors, weight, alignment, transform, shadow).
  - Photo frame styling (shape, borders, shadows).
  - Position coordinates (X, Y, W, H, rotation, layer ordering).
- **Export & Progress Modal**:
  - Format selection (Merged PDF, A4 Tiled Grid with Cut Marks, ZIP PNG).
  - Real-time chunked generation progress bar with cancellation support.

- [ ] **Step 2: Verify component compiles cleanly**
Run: `npx vitest run` to ensure no regressions in existing tests.

- [ ] **Step 3: Commit**
```bash
git add src/components/section-1-core/IdCardStudioView.tsx
git commit -m "feat(id-cards): create interactive IdCardStudioView component"
```

---

### Task 4: App Integration, Navigation & End-to-End Verification

**Files:**
- Modify: `src/app/page.tsx:1-700`

- [ ] **Step 1: Integrate IdCardStudioView into Section 1 navigation**
In `src/app/page.tsx`:
- Import `IdCardStudioView` from `@/components/section-1-core/IdCardStudioView`.
- In `Section 1: Pre-Event Planning & Design`, add `"idcards"` subtab button with icon.
- Render `<IdCardStudioView students={students} />` when `coreSubTab === "idcards"`.

- [ ] **Step 2: Run full automated test suite**
Run: `npx vitest run`
Expected: All tests pass (including new domain and engine tests).

- [ ] **Step 3: Run Next.js production build**
Run: `npm run build`
Expected: Build succeeds with zero TypeScript or JSX compile errors.

- [ ] **Step 4: Commit**
```bash
git add src/app/page.tsx
git commit -m "feat(id-cards): integrate ID Card Studio into main application workflow"
```
