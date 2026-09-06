# CampusClub Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-cost, high-performance, 3-section University Club Operations & Event Suite hosted 100% free on Vercel with local client-side compute power for generating 1,000+ certificates, smart seat plans, direct bulk email pipelines, event-day tools, and club administration portals.

**Architecture:** Client-compute SPA using Next.js (App Router, TypeScript) + Tailwind CSS + Web Workers + `OffscreenCanvas` + `pdf-lib` + `xlsx` + `JSZip` + IndexedDB (`dexie`). A single lightweight `/api/send-email` route acts as an SMTP bridge for university/Gmail credentials without CORS. All heavy operations (1,000+ batch rendering, seat layout matrix, and data transformations) run in background threads on the user's browser, completely bypassing Vercel serverless timeouts and costs.

**Tech Stack:** Next.js 15 / 14, React 19 / 18, TypeScript, Tailwind CSS, Lucide React, `pdf-lib`, `xlsx` (SheetJS), `papaparse`, `jszip`, `file-saver`, `dexie` (IndexedDB), `canvas-confetti`, `qrcode`, `html5-qrcode`.

**Spec:** [docs/superpowers/specs/2026-09-06-campus-club-suite-design.md](file:///d:/Projects/Club%20tool/docs/superpowers/specs/2026-09-06-campus-club-suite-design.md)

## Global Constraints
- 100% Free on Vercel: All heavy computations (1,000+ certificates/seat plans) must execute client-side via Web Workers.
- Centralized Design Tokens: All colors, typography, surface tokens, and component themes must be controlled from a single source of truth (`src/styles/theme.ts`).
- Object-Oriented Domain Architecture: Data structures (Canvas Elements, Rosters, Seating Grids, Queue Items) must follow clean OOP models with clear interfaces and separation of concerns.
- 60 FPS Performance: No main-thread blocking during large file generation or rendering.
- Complete Data Privacy: Student lists, IDs, and phone numbers remain strictly local in browser memory / IndexedDB.

---

### File Structure Map

```
src/
├── app/
│   ├── layout.tsx                     # Root layout with theme provider & meta tags
│   ├── page.tsx                       # Main 3-Section Hub & Dashboard
│   ├── my-certificate/
│   │   └── page.tsx                   # Section 3.1: Student Self-Service Kiosk
│   └── api/
│       └── send-email/
│           └── route.ts               # Lightweight SMTP dispatch proxy (Nodemailer)
├── core/
│   ├── domain/                        # OOP Domain Models & Entities
│   │   ├── roster.ts                  # StudentRoster, StudentRecord, ColumnMapping
│   │   ├── certificate-element.ts     # CanvasElement hierarchy (Text, QR, Image)
│   │   ├── seating-matrix.ts          # RoomGrid, Desk, Seat, AllocationStrategy
│   │   ├── email-queue.ts             # EmailJob, ProviderConfig, QueueDispatcher
│   │   ├── event-day.ts               # MealToken, GateAttendance, VolunteerShift, StageCue
│   │   └── ledger.ts                  # ExpenseItem, RevenueItem, FinancialReport
│   ├── engines/                       # Algorithmic & Transformation Engines
│   │   ├── data-refinery.ts           # Sorting, Normalizing, Casing, Deduplication, Matrices
│   │   ├── seating-allocator.ts       # Interleaved, Sequential, Random algorithms
│   │   ├── crypto-verifier.ts         # HMAC-SHA256 signature generator & validator
│   │   └── vault-manager.ts           # .clubvault JSON encrypted export & import
│   ├── storage/
│   │   └── db.ts                      # Dexie IndexedDB schemas (templates, rosters, drafts)
│   └── workers/
│       └── generator.worker.ts        # OffscreenCanvas + pdf-lib + JSZip worker thread
├── components/
│   ├── common/                        # Reusable Atomic UI Components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Tabs.tsx
│   │   ├── ProgressBar.tsx
│   │   └── DataTable.tsx
│   ├── section-1-core/                # Section 1: Core Event Pipeline
│   │   ├── DataRefineryView.tsx       # 1.1 Google Form Data Cleaner & Vendor Matrices
│   │   ├── CertificateStudioView.tsx  # 1.2 WYSIWYG Visual Designer & 1000+ Generator
│   │   ├── SeatPlanView.tsx           # 1.3 Multi-Room Seating Grid & Door Notices
│   │   └── BulkEmailView.tsx          # 1.4 Direct 1-Click Batch Email Dispatcher
│   ├── section-2-operations/          # Section 2: Event Day Operations
│   │   ├── MealAndGateScanner.tsx     # 2.1 Anti-Theft Meal Tokens & Gate Check-in
│   │   ├── BadgeGenerator.tsx         # 2.2 Event Badges & Lanyard Passes
│   │   ├── VolunteerRoster.tsx        # 2.3 Volunteer Shift Planner & Pocket Passes
│   │   ├── StageClock.tsx             # 2.4 Stage Program Cue Sheet & Presenter Clock
│   │   ├── JudgingLeaderboard.tsx     # 2.5 Multi-Judge Scoring & Live Leaderboard
│   │   ├── TeamAndBrackets.tsx        # 2.6 Team Matcher & Tournament Brackets
│   │   └── WhatsAppBroadcaster.tsx    # 2.7 Emergency Broadcast Link Formatter
│   └── section-3-admin/               # Section 3: Club Administration
│       ├── SelfServiceKioskView.tsx   # 3.1 Public Student Certificate Download Portal
│       ├── TypoCorrectorModal.tsx     # 3.2 1-Click Typo Fix & Resend Tool
│       ├── DeanReportGenerator.tsx    # 3.3 Official Dean Event Report PDF Builder
│       ├── BudgetReconciler.tsx       # 3.4 Treasurer Budget & Balance Sheet
│       ├── SponsorAutoTiler.tsx       # 3.5 Sponsor Wall & Banner Generator
│       └── ClubVaultBackup.tsx        # 3.6 & 3.7 Crypto Verify & Vault Handover
└── styles/
    ├── theme.ts                       # Single-Source-Of-Truth OOP Color & Theme Tokens
    └── globals.css                    # Tailwind directives & CSS custom properties
```

---

## Tasks

### Task 1: Scaffolding, Centralized Design System & Theme Engine

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/styles/theme.ts`
- Create: `src/styles/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/components/common/Button.tsx`
- Create: `src/components/common/Card.tsx`
- Create: `src/components/common/Tabs.tsx`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Produces: `THEME` object in `src/styles/theme.ts`, `Button`, `Card`, `Tabs` common components.

- [ ] **Step 1: Write test for Theme Token Consistency**
Create `tests/theme.test.ts` validating that color tokens, surface classes, and typography scales exist and return proper hex/tailwind variables.
- [ ] **Step 2: Run test to verify it fails**
Run test using node/vitest. Expected: FAIL (files missing).
- [ ] **Step 3: Implement Project Scaffolding & Central Theme Tokens**
Initialize Next.js project with Tailwind CSS, Lucide React, and create `src/styles/theme.ts` exporting centralized theme tokens (`THEME.colors.primary`, `THEME.surface`, `THEME.typography`).
- [ ] **Step 4: Implement Common Atomic UI Components**
Build `Button.tsx`, `Card.tsx`, `Tabs.tsx`, and `ProgressBar.tsx` consuming `THEME` tokens.
- [ ] **Step 5: Run tests and verify they pass**
Verify theme test passes and component builds.

---

### Task 2: Module 1.1 — Google Form Data Refinery & Event Intelligence Engine

**Files:**
- Create: `src/core/domain/roster.ts`
- Create: `src/core/engines/data-refinery.ts`
- Create: `src/components/common/DataTable.tsx`
- Create: `src/components/section-1-core/DataRefineryView.tsx`
- Test: `tests/data-refinery.test.ts`

**Interfaces:**
- Consumes: `THEME` from `src/styles/theme.ts`.
- Produces: `StudentRecord`, `StudentRoster`, `DataRefineryEngine` with methods: `parseFile()`, `multiSort()`, `shuffle()`, `normalizeNames()`, `deduplicate()`, `getTShirtMatrix()`, `getMealMatrix()`, `allocateToMentors()`.

- [ ] **Step 1: Write unit tests for Data Refinery logic**
Test multi-column sorting (Department $\rightarrow$ Batch $\rightarrow$ ID), title casing (`"JOHN DOE"` $\rightarrow$ `"John Doe"`), duplicate removal, and T-shirt size aggregation matrix in `tests/data-refinery.test.ts`.
- [ ] **Step 2: Run test to verify failure**
Run tests. Expected: FAIL (engine not implemented).
- [ ] **Step 3: Implement `StudentRoster` and `DataRefineryEngine`**
Write TypeScript classes in `src/core/domain/roster.ts` and `src/core/engines/data-refinery.ts` using `xlsx` and `PapaParse`.
- [ ] **Step 4: Build `DataRefineryView` UI Component**
Create drag-and-drop file uploader, live searchable data table, T-shirt count badge grid, meal count badges, and mentor allocation modal.
- [ ] **Step 5: Verify all data refinery tests pass**
Run `tests/data-refinery.test.ts` and confirm 100% pass.

---

### Task 3: Module 1.2 — Certificate Studio WYSIWYG & OOP Canvas Engine

**Files:**
- Create: `src/core/domain/certificate-element.ts`
- Create: `src/core/storage/db.ts`
- Create: `src/components/section-1-core/CertificateStudioView.tsx`
- Test: `tests/certificate-canvas.test.ts`

**Interfaces:**
- Consumes: `StudentRoster` from `src/core/domain/roster.ts`.
- Produces: `CanvasElement` base class, `TextElement`, `QrElement`, `ImageElement`, and `CertificateTemplate` model with serialization to/from JSON.

- [ ] **Step 1: Write unit tests for Canvas Elements & Template Serialization**
Test coordinate calculation, font style rendering parameters, variable replacement (`{{Name}}` with row data), and QR code payload generation in `tests/certificate-canvas.test.ts`.
- [ ] **Step 2: Run test to verify failure**
Run tests. Expected: FAIL.
- [ ] **Step 3: Implement `CertificateTemplate` and `CanvasElement` hierarchy**
Build OOP element classes in `src/core/domain/certificate-element.ts` with methods `render(ctx, record)`, `clone()`, `toJSON()`, `fromJSON()`. Setup Dexie in `src/core/storage/db.ts` to persist templates locally.
- [ ] **Step 4: Build WYSIWYG `CertificateStudioView` Component**
Interactive HTML5 Canvas with draggable handles, alignment snap guides, Google Font picker dropdown, color picker, custom font file uploader, and live row switcher.
- [ ] **Step 5: Verify tests pass**
Confirm element math, variable replacement, and JSON serialization pass.

---

### Task 4: Module 1.2 Multi-Threaded Bulk Generation Engine (Web Worker)

**Files:**
- Create: `src/core/workers/generator.worker.ts`
- Create: `src/core/engines/bulk-generator.ts`
- Modify: `src/components/section-1-core/CertificateStudioView.tsx`
- Test: `tests/bulk-generator.test.ts`

**Interfaces:**
- Consumes: `CertificateTemplate` and `StudentRoster`.
- Produces: `BulkGeneratorClient` dispatching work to `generator.worker.ts`, yielding real-time progress callbacks and returning `Blob` for ZIP or merged PDF.

- [ ] **Step 1: Write integration tests for Bulk Generator**
Test batching logic, worker message exchange, and ZIP generation with sample student records.
- [ ] **Step 2: Run test to verify failure**
Run tests. Expected: FAIL.
- [ ] **Step 3: Implement `generator.worker.ts`**
Worker receives template + chunk of records, renders to `OffscreenCanvas`, builds images and PDFs using `pdf-lib`, packs them into `JSZip`, and posts progress updates.
- [ ] **Step 4: Connect Progress UI in `CertificateStudioView`**
Add progress modal with live completed counter (`Rendering 450/1000`), ETA timer, cancel button, and 4 export format download triggers (ZIP of PNGs, ZIP of PDFs, Master Merged PDF, Single Preview).
- [ ] **Step 5: Verify generation tests pass**
Ensure generation completes smoothly with zero main-thread freeze.

---

### Task 5: Module 1.3 — Smart Seat Plan & Hall Allocation Module

**Files:**
- Create: `src/core/domain/seating-matrix.ts`
- Create: `src/core/engines/seating-allocator.ts`
- Create: `src/components/section-1-core/SeatPlanView.tsx`
- Test: `tests/seating-allocator.test.ts`

**Interfaces:**
- Consumes: `StudentRoster` from `src/core/domain/roster.ts`.
- Produces: `RoomGrid`, `Desk`, `AllocationStrategy`, `SeatPlanEngine` (Interleaved, Sequential, Random), and printable HTML/PDF generator for Door Notices & Desk Chits.

- [ ] **Step 1: Write tests for Allocation Strategies**
Test `InterleavedStrategy` ensures adjacent desks do not share the same department; test `SequentialStrategy` preserves roll order; test multi-room capacity distribution in `tests/seating-allocator.test.ts`.
- [ ] **Step 2: Run test to verify failure**
Run tests. Expected: FAIL.
- [ ] **Step 3: Implement Seating Domain Models & Strategies**
Build `RoomGrid` matrix builder, `InterleavedAllocationStrategy`, `SequentialAllocationStrategy`, and `RandomAllocationStrategy` in `src/core/engines/seating-allocator.ts`.
- [ ] **Step 4: Build `SeatPlanView` UI Component**
Visual hall grid visualizer, room tabs, drag-and-drop seat swapper, Door Notice Poster print preview, and A4 Desk Chit cutting-sheet generator with QR codes.
- [ ] **Step 5: Verify seating tests pass**
Confirm algorithm anti-cheating separation and print layout rendering pass.

---

### Task 6: Module 1.4 — Direct Bulk Email Pipeline

**Files:**
- Create: `src/core/domain/email-queue.ts`
- Create: `src/app/api/send-email/route.ts`
- Create: `src/components/section-1-core/BulkEmailView.tsx`
- Test: `tests/email-queue.test.ts`

**Interfaces:**
- Consumes: `StudentRoster`, `CertificateTemplate`, and `generator.worker.ts`.
- Produces: `EmailQueueDispatcher` managing client-side throttled sending, `/api/send-email` lightweight proxy for SMTP, and Mail-Merge export builder.

- [ ] **Step 1: Write tests for Email Queue throttling & retry mechanics**
Test job queueing, delay pacing (1.5s interval), failure retry list isolation in `tests/email-queue.test.ts`.
- [ ] **Step 2: Run test to verify failure**
Run tests. Expected: FAIL.
- [ ] **Step 3: Implement `/api/send-email/route.ts` & Client Providers**
Build secure, lightweight Next.js route using Nodemailer for Gmail/University SMTP without CORS, plus direct client adapters for Resend/Brevo/EmailJS.
- [ ] **Step 4: Build `BulkEmailView` UI Component**
1-Click pipeline: Template mapping $\rightarrow$ 1-Click Send Test Email to Organizer $\rightarrow$ Start Bulk Dispatch with live progress bar, pause/resume, audit log, and "Retry Failed Only" button.
- [ ] **Step 5: Verify email tests pass**
Confirm queue rates, failure categorization, and payload formatting.

---

### Task 7: Section 2 — Event Day Operations Suite

**Files:**
- Create: `src/core/domain/event-day.ts`
- Create: `src/components/section-2-operations/MealAndGateScanner.tsx`
- Create: `src/components/section-2-operations/BadgeGenerator.tsx`
- Create: `src/components/section-2-operations/VolunteerRoster.tsx`
- Create: `src/components/section-2-operations/StageClock.tsx`
- Create: `src/components/section-2-operations/JudgingLeaderboard.tsx`
- Create: `src/components/section-2-operations/TeamAndBrackets.tsx`
- Create: `src/components/section-2-operations/WhatsAppBroadcaster.tsx`
- Test: `tests/event-day.test.ts`

**Interfaces:**
- Consumes: `StudentRoster` and `THEME`.
- Produces: Real-time event day tools (Single-use meal scanner, attendance counter, badge maker, duty shift planner, full-screen stage clock, judging leaderboard, tournament brackets, WhatsApp link generator).

- [ ] **Step 1: Write tests for Meal Token Anti-Theft & Judging Rubrics**
Test that single-use QR meal tokens reject duplicate claims, and test Olympic average calculation in `tests/event-day.test.ts`.
- [ ] **Step 2: Run test to verify failure**
Run tests. Expected: FAIL.
- [ ] **Step 3: Implement Domain Models for Event Day Tools**
Build models in `src/core/domain/event-day.ts` for meal claims, shift duty slots, stage cue entries, and judging rubrics.
- [ ] **Step 4: Build Section 2 UI Components**
Implement all 7 event day tools with sleek dark-mode UI, webcam QR scanning, high-contrast presenter countdown clock, and live leaderboard display.
- [ ] **Step 5: Verify event day tests pass**
Confirm validation chimes, duplicate detection, and leaderboard math.

---

### Task 8: Section 3 — Club Administration & Post-Event Suite

**Files:**
- Create: `src/app/my-certificate/page.tsx`
- Create: `src/core/engines/crypto-verifier.ts`
- Create: `src/core/engines/vault-manager.ts`
- Create: `src/components/section-3-admin/SelfServiceKioskView.tsx`
- Create: `src/components/section-3-admin/TypoCorrectorModal.tsx`
- Create: `src/components/section-3-admin/DeanReportGenerator.tsx`
- Create: `src/components/section-3-admin/BudgetReconciler.tsx`
- Create: `src/components/section-3-admin/SponsorAutoTiler.tsx`
- Create: `src/components/section-3-admin/ClubVaultBackup.tsx`
- Test: `tests/admin-tools.test.ts`

**Interfaces:**
- Consumes: `CertificateTemplate`, `StudentRoster`, and `THEME`.
- Produces: Public `/my-certificate` portal, Typo Corrector, Official Dean Report PDF generator, Treasurer Budget ledger, Sponsor Wall tiler, Cryptographic Web Crypto verifier, and `.clubvault` export/import.

- [ ] **Step 1: Write tests for Crypto Signature, Vault Export, and Typo Fixer**
Test HMAC-SHA256 signature verification, `.clubvault` JSON encryption/packaging, and single-record update logic in `tests/admin-tools.test.ts`.
- [ ] **Step 2: Run test to verify failure**
Run tests. Expected: FAIL.
- [ ] **Step 3: Implement Crypto Verifier, Vault Manager, and Budget Ledger**
Write cryptographic verification using Web Crypto API (`crypto.subtle`) and vault bundle manager in `src/core/engines/`.
- [ ] **Step 4: Build Public Kiosk Page & Admin UI Components**
Implement `/my-certificate` route for instant student self-service lookup, Dean Report PDF builder, Treasurer budget ledger, Sponsor wall tiler, and Vault backup/restore.
- [ ] **Step 5: Verify admin tests pass**
Confirm HMAC hash verification, Dean PDF compilation, and vault bundle import/export.

---

### Task 9: Main 3-Section Hub, Navigation & Vercel Verification

**Files:**
- Modify: `src/app/page.tsx`
- Create: `vercel.json`
- Test: `tests/e2e-workflow.test.ts`

**Interfaces:**
- Connects Section 1, Section 2, and Section 3 into a cohesive, lightning-fast dashboard hub with quick navigation, dark/light theme toggle, and 0 ms tab switching.

- [ ] **Step 1: Build Main Unified Dashboard in `src/app/page.tsx`**
Assemble the 3 primary section tabs (1. Core Event Pipeline, 2. Event Day Operations, 3. Club Administration) with sleek glassmorphism cards, search filters, and persistent state.
- [ ] **Step 2: Configure `vercel.json` for Free Tier Optimization**
Configure caching headers, static generation rules, and route definitions for zero-cost Vercel deployment.
- [ ] **Step 3: Run Full Test Suite & Build Check**
Execute `npm run build` and all unit/integration tests to verify 0 errors, 100% type safety, and clean production bundle.
- [ ] **Step 4: Final Verification & Commit**
Verify all workflows operate smoothly with zero UI lag.
