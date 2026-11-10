# Smart Attendance Calculator (Lumina Glass Attendance)

A production-grade, Apple Liquid Glass-inspired academic attendance intelligence and timetable platform that instantly calculates exact consecutive classes needed to reach 75% attendance, safe absence margins ("bunk buffers"), and schedule-aware projections.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core design and product decisions have been locked in based on your preferences:

- **Visual Theme**: **Liquid Glass Dark with Deep Specular Glow** — Deep obsidian and midnight indigo atmospheric canvas layered with translucent frosted acrylic surfaces (`backdrop-filter: blur(24px)`), crisp 1px specular rim highlights, and semantic status illumination.
- **Timetable Parsing Engine**: **Dual Support for Gemini Vision AI & CSV Import** — Students can upload images/PDFs of their weekly timetable (parsed via a server-side Gemini 3.8 Flash multimodal structured extraction route) or import/export standard CSV schedules, complete with an interactive pre-save verification and editing table.
- **Featured Dashboard Tool**: **Live "What-If" Bunk & Catch-Up Simulation Slider** — An interactive dual-directional simulator directly on the main dashboard and calculator views allowing students to scrub through hypothetical future attended or missed classes and watch overall and subject-level percentages update in real time.

---

## 1. Overview & Core Concept

- **What It Does**: Empowers university and high school students to track subject-wise and aggregate attendance, manage their weekly period schedules, extract timetables from photos or spreadsheets, account for holidays/cancelled classes, and run exact mathematical projections to maintain or recover their target attendance threshold (75% default, customizable from 50% to 95%).
- **Target Audience / Persona**: Students managing multi-subject weekly schedules with strict institutional attendance mandates who need immediate clarity on three questions:
  1. *What is my exact attendance percentage right now?*
  2. *How many consecutive classes must I attend to reach or recover to 75%?*
  3. *How many upcoming classes can I safely miss without dropping below 75%?*
- **Key Value**: Eliminates manual guesswork and spreadsheet errors by coupling exact discrete ceiling mathematics with actual weekly timetable slots and holiday calendars.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Immediate Onboarding & Sample Workspace**: First-time visitors land on a populated, realistic 5-subject engineering/science semester dataset so every chart, calculator, and simulator is immediately interactive. A one-click "Reset / Start Fresh" or "Load Sample Data" action is available in the header and Settings.
2. **Dashboard & Live "What-If" Simulation**:
   - Displays the Hero Overall Attendance Ring, 8 core KPI metrics (Overall %, Total Subjects, Conducted, Attended, Missed, Subjects Below Target, Subjects Safely Above, and Consecutive Classes Required), and status breakdown.
   - Features the **Live What-If Bunk & Catch-Up Simulator**: Students can select "All Subjects" or a specific course and drag two interactive sliders (*"Attend next $N$ classes"* and *"Miss next $M$ classes"*) to see real-time recalculated percentages, status shifts, and exact calendar completion dates based on their weekly timetable.
3. **Timetable Upload & Management (`My Timetable`)**:
   - **Manual Schedule Grid**: Interactive Monday–Saturday weekly matrix where students assign subjects to time slots, specify weekly period frequencies, and add/edit/delete slots.
   - **Gemini Vision AI & CSV Importer**: Drag-and-drop zone accepting timetable images/PDFs (sent to `/api/timetable/extract` using `gemini-3.8-flash` structured JSON extraction) or `.csv` files. Extracted subjects, days, times, and weekly period counts open in an editable **Review & Correct Modal** before merging into the active schedule.
   - **Holiday & Cancelled Class Manager**: Dedicated calendar/date logger where students mark academic holidays or cancelled lectures, automatically adjusting upcoming attendance projections and logging historical exemptions.
4. **Subject-Wise Tracking (`Subjects`)**:
   - High-clarity Liquid Glass cards and tabular view for each subject with one-tap `+ Attended`, `+ Missed`, and `Cancelled` quick-log buttons (with instant undo and history logging), plus full CRUD modals for adding, editing, or deleting subjects with confirmation dialogs.
5. **Deep Attendance Calculator (`Attendance Calculator`)**:
   - Dedicated mathematical breakdown for every course showing exact state classification: **Reaching Target** (exact threshold), **Maintaining Target** (safe bunk margin), or **Recovering Below Target** (consecutive classes needed + estimated recovery date using weekly timetable frequency).
6. **Analytics & Export (`Analytics` & `Settings`)**:
   - Visual attendance distribution charts, subject comparison bars, 4-week schedule-based trajectory projections, chronological attendance history log, custom target percentage slider (default 75%), and 1-click JSON/CSV/Printable Report export.

### Visual Identity & Theme
- **Aesthetic Direction**: **Apple Liquid Glass Dark** — Tactile, spatial computing-inspired dark interface combining deep atmospheric depth with razor-sharp specular borders and zero visual clutter.
- **Color Palette & Mood**:
  - **Canvas (`60%`)**: Deep Obsidian (`#07090E`) to Midnight Slate (`#0B101B`) with subtle, non-distracting radial ambient illumination behind primary focal areas.
  - **Structural Glass Surfaces (`30%`)**: Translucent Dark Acrylic (`rgba(255, 255, 255, 0.04)` to `rgba(255, 255, 255, 0.08)`), `backdrop-blur-2xl`, and 1px inner specular borders (`border-white/10` with top-edge highlight `border-t-white/20`).
  - **Semantic & Accent Budget (`10%`)**:
    - Primary Interactive Accent: Electric Azure (`#38BDF8` / `#0EA5E9`)
    - Safe / Above Target ($\ge \text{Target} + 3\%$): Emerald (`#10B981`) paired with explicit `"Safe Margin"` label.
    - Warning / Close to Target ($\text{Target}$ to $\text{Target} + 2.99\%$): Amber (`#F59E0B`) paired with explicit `"At Threshold"` label.
    - Critical / Below Target ($< \text{Target}$): Coral Rose (`#F43F5E`) paired with explicit `"Recovery Needed"` label.
- **Typography & Hierarchy**:
  - **Display & Navigation**: `Outfit` / `Plus Jakarta Sans` (SemiBold 600 / Bold 700, tight tracking, `text-wrap: balance`).
  - **UI & Body Prose**: `Plus Jakarta Sans` (Regular 400 / Medium 500) for crisp legibility on dark glass surfaces.
  - **Metrics, Percentages & Formulas**: `JetBrains Mono` with mandatory `tabular-nums` (`font-variant-numeric: tabular-nums`) so live slider simulations and counter increments never jitter horizontally.
- **Layout & Navigation Architecture**:
  - **Desktop (1440px baseline)**: Sleek 260px frosted glass sidebar + streamlined 3-zone top bar (Breadcrumb/View Title, Quick Search/Filter, and Primary `+ Quick Log / Export` CTA) + spacious main viewport.
  - **Mobile / Tablet**: Compact translucent header + thumb-friendly frosted bottom navigation bar respecting the $\le 15\%$ sticky viewport height budget.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Exact Discrete Ceiling & Floor Mathematics**
  - *Chosen Approach*: Implement a pure, zero-dependency TypeScript calculation engine (`attendanceMath.ts`) that computes:
    - $\text{Attendance \%} = (\text{Attended} / \text{Conducted}) \times 100$
    - **Required Consecutive Classes** (when below target $T$, where $t = T/100$):
      $$\text{Required} = \max\left(0, \left\lceil \frac{t \times \text{Conducted} - \text{Attended}}{1 - t} \right\rceil\right)$$
      *(For $T = 75\%$, this is $\lceil (0.75 \times \text{Conducted} - \text{Attended}) / 0.25 \rceil$, properly accounting for each attended class incrementing both numerator and denominator).*
    - **Safe Additional Absences** (when at or above target $T$):
      $$\text{Safe Misses} = \max\left(0, \left\lfloor \frac{\text{Attended} - t \times \text{Conducted}}{t} \right\rfloor\right)$$
      *(For $T = 75\%$, this is $\lfloor (\text{Attended} - 0.75 \times \text{Conducted}) / 0.75 \rfloor$).*
  - *Why*: Guarantees 100% mathematical accuracy across both default 75% and custom target percentages while clearly distinguishing **Reaching 75%**, **Maintaining $\ge 75\%$**, and **Recovering from $< 75\%$**.

- **Decision 2: Server-Side Gemini Vision Extraction + Instant Client-Side CSV & Fallback**
  - *Chosen Approach*: Route image and PDF timetable uploads to an Express backend endpoint (`/api/timetable/extract`) powered by `@google/genai` (`gemini-3.8-flash` with a strict `responseSchema` returning subjects, days, start/end times, and weekly period counts). Pair this with a fast client-side CSV parser and an interactive Review & Correct modal.
  - *Why*: Keeps the Gemini API key strictly server-side per security rules while giving students total control to inspect, edit, or manually adjust extracted classes before committing them to state.

- **Decision 3: LocalStorage Persistence with Full Import/Export & History Snapshots**
  - *Chosen Approach*: Persist all subjects, weekly timetable slots, holiday/cancelled class logs, attendance history events, and custom target settings in `localStorage` with instant reactive recalculation and JSON/CSV backup export.
  - *Why*: Delivers zero-latency calculations and instant page loads while ensuring student data persists reliably across browser refreshes.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                   SMART ATTENDANCE CALCULATOR WORKSPACE                    │
│              (Liquid Glass Dark Theme · 1440px Desktop / Mobile)           │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  Reactive App State  │   │  Math & Projection   │   │  Express API Server  │
│   & LocalStorage     │◄──┤       Engine         │   │     (server.ts)      │
│                      │   │                      │   │                      │
│ • Subjects & Counts  │   │ • Exact 75% / Custom │   │ • POST /api/         │
│ • Weekly Timetable   │   │   Ceiling & Floor    │   │   timetable/extract  │
│ • Holidays/Cancelled │   │ • What-If Simulator  │   │ • @google/genai      │
│ • Attendance History │   │ • Schedule Predictor │   │   gemini-3.8-flash   │
└──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         6 CORE NAVIGATION SECTIONS                         │
├──────────────────────┬──────────────────────────┬──────────────────────────┤
│ 1. Dashboard         │ 2. My Timetable          │ 3. Subjects              │
│ • Overall Ring & KPIs│ • Weekly Schedule Matrix │ • Subject Glass Cards    │
│ • Live What-If Bunk  │ • Gemini Vision + CSV    │ • +Attend / +Miss /      │
│   & Catch-up Slider  │   Upload & Review Modal  │   Cancelled Quick Actions│
│ • Status Breakdown   │ • Holiday/Cancel Manager │ • Full Subject CRUD      │
├──────────────────────┼──────────────────────────┼──────────────────────────┤
│ 4. Calculator        │ 5. Analytics             │ 6. Settings              │
│ • Deep Subject Math  │ • Subject Bar Comparisons│ • Custom Target % Slider │
│ • Reach / Maintain / │ • 4-Week Schedule        │ • Export CSV / Report    │
│   Recover Breakdown  │   Trajectory Projections │ • Sample Data & Reset    │
│ • Multi-Class Planner│ • Attendance History Log │   Confirmation Controls  │
└──────────────────────┴──────────────────────────┴──────────────────────────┘
```

### Data Model & State
- **`Subject`**: `id`, `name`, `code`, `conducted`, `attended`, `periodsPerWeek`, `color`, `professor` (optional), `targetOverride` (optional).
- **`TimetableSlot`**: `id`, `subjectId`, `dayOfWeek` (`Monday`–`Saturday`), `startTime`, `endTime`, `room`.
- **`HolidayOrCancelled`**: `id`, `date` (ISO string), `type` (`'holiday' | 'cancelled'`), `subjectId` (optional, if single class cancelled vs. full-day holiday), `reason`.
- **`AttendanceLogEntry`**: `id`, `timestamp`, `date`, `subjectId`, `action` (`'attended' | 'missed' | 'cancelled' | 'manual_edit'`), `previousAttended`, `previousConducted`, `newAttended`, `newConducted`.
- **`AppSettings`**: `targetPercentage` (default `75`), `semesterStartDate`, `semesterEndDate`, `includeSaturday`.

### Interactive Component & State Mapping
- **Dashboard & What-If Simulator**: Adjusting the *"Hypothetical Attended (+0 to +30)"* or *"Hypothetical Missed (+0 to +20)"* sliders computes projected attendance without mutating saved records until the user clicks `"Apply to Subject"` or `"Reset Simulation"`.
- **Timetable AI & CSV Extraction Flow**: Uploading an image/PDF encodes the file as base64 and posts to `/api/timetable/extract`. While awaiting response, a frosted glass skeleton loader displays progress. Extracted slots populate the **Review & Correct Table** where users can edit subject names, change days/times, or remove rows before clicking `"Confirm & Sync Timetable"`, which automatically updates each subject's `periodsPerWeek`.
- **Holiday & Cancelled Class Flow**: Marking a date as a Holiday or Cancelled Class logs the exemption and adjusts the upcoming week's projected conducted classes so students see how a cancelled lecture affects their recovery timeline.
- **Validation & Safety**: All numeric inputs prevent negative counts or `attended > conducted` states with clear inline validation messages, and destructive actions (deleting a subject, clearing history, or resetting workspace data) require explicit confirmation via a Liquid Glass modal.
