# Visual Agency Hub — Core Visual Identity & Design System

> **Permanent Visual Identity Guideline**: The visual elements, micro-animations, interactive graphs, pocket dropdown cards, and high-contrast dark aesthetic codified in this document represent the **core visual identity** of the Visual Agency Hub. All future features, views, and refactors MUST preserve and build upon these established visual standards.

---

## 1. Color Palette & High-Contrast Dark Theme
Our UI is engineered for crystal-clear readability at 100% zoom. We avoid muddy low-contrast grays (`bg-slate-900/40`) in favor of solid, crisp containers.

### Core Surface & Border Tokens
- **Primary App Canvas**: `bg-slate-950` (`#030712`)
- **Card & Component Surface**: `bg-[#111827]` (`bg-gray-900`) and `bg-slate-900`
- **Component Dividers & Borders**: Crisp `border-slate-700` (`#334155`) with hover transitions (`hover:border-slate-600`)
- **Interactive Headers & Banners**: Deep gradient accents such as `bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-indigo-500/40`

### Semantic Accent Colors (Vibrant Jewel & Neon Highlights)
- **Status • ON TRACK / Optimal**: `bg-emerald-500/20 text-emerald-300 border-emerald-500/40`
- **Status • INITIAL STAGE / Tech**: `bg-cyan-500/20 text-cyan-200 border-cyan-500/40`
- **Status • REVALUATION / Warning**: `bg-amber-500/20 text-amber-200 border-amber-500/40`
- **Status • CRITICAL / High Risk**: `bg-rose-500/20 text-rose-300 border-rose-500/50`
- **AI & Copilot Highlights**: `bg-indigo-500/20 text-indigo-300 border-indigo-500/40` & `text-purple-300`

---

## 2. Typography & Hierarchy Standards
- **Primary Section Headings**: Uppercase, tracked out, bold headers paired with glowing indicator dots:
  ```tsx
  <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-500/50" />
    Section 3: Active Client Projects & Squad Allocation Roster
  </h3>
  ```
- **Primary Card Titles**: `text-base font-bold text-white hover:text-cyan-300 transition-colors`
- **Data Callouts & Gauges**: High-visibility numbers using `font-extrabold` and `font-black` (`text-2xl font-bold text-white tracking-tight`).

---

## 3. Interactive Visual Charts & Graphs
Visual analytics are central to our tool's identity. The **Universal Filter & View Studio** permanently houses live visual charts that update dynamically when data or filters change:

1. **Chart 1: Retainer vs. Milestone Split Gauge**
   - Displays real-time ratio between monthly retainers and milestone deliveries using smooth horizontal split bars (`bg-cyan-400` vs `bg-purple-400`).
2. **Chart 2: Project Health & Revaluation Overview**
   - Color-coded progress bars breaking down On-Track (`emerald`), Revaluation (`amber`), and Completed (`purple`) percentages.
3. **Chart 3: Deliverable Specialist Hours Allocation Graph**
   - Horizontal bar graphs illustrating weekly workload across `Technical & Dev Lead`, `On-Page SEO Strategy`, and `Off-Page SEO & Guest Posts`.

---

## 4. Micro-Animations & Dynamic Feedback
To ensure an interface that feels responsive, alive, and polished:
- **Gleaming & Pulse Indicators**: Real-time radar tags and status dots utilize smooth micro-animations (`animate-pulse`, `animate-ping`, `animate-spin` with custom 6s duration for AI stars).
- **Smooth Transitions**: All interactive elements (cards, buttons, inputs) include `transition-all duration-200` or `duration-500` for progress bars.
- **Fade-In Expansion**: Opening banners or expanding pocket details trigger smooth `animate-fade-in`.

---

## 5. Pocket Cards & Executive Layout Modes
We support two complementary visual layouts:

### A. Grid Cards with "Pocket" Expansion (`viewMode === 'grid'`)
- **Always Visible Snapshot (Top of Card)**: Status pill, Client label, Price badge, Project name, AI Health Capsule, and assigned Squad/Lead avatars.
- **Pocket Dropdown Detail (Collapsed by Default)**: Clicking `View 360° Detailed Brief` or `[+] Expand Scope & Ledger` opens a drawer revealing:
  - Granular Task Breakdown (Technical SEO vs. On-Page vs. Off-Page hours)
  - Full scope brief (`taskContent`), ClickUp folder link, communication channels
  - Financial ledger history & invoice status

### B. High-Density Executive Compact Table (`viewMode === 'compact'`)
- Engineered for rapid scanning across 50+ retainers while retaining color-coded status pills, AI micro-badges, and one-click 360° modal triggers.

---

## 6. Smart AI Copilot & Diagnostic Elements
- **✨ Smart AI Toggle (`⚡ Smart AI: ON/OFF`)**: Controls the visibility of the real-time AI Executive Radar Banner and card-level diagnostic capsules.
- **One-Click Natural Language Queries**: Action chips allowing executives to filter by risk (`ai_high_risk`), top margin (`ai_top_margin`), capacity ceiling (`ai_nearing_cap`), or overdue cashflow (`ai_overdue_cashflow`).
- **Card Capsules**: Color-coded diagnostic pills attached to cards and table rows explaining project health metrics automatically.

---

## 7. Section 1.5 Interactive Visual Dashboards & Spectrum Graphs
To enrich every major view with high-density visual insights right below the executive banners, every primary tab features a dedicated **Section 1.5 Visual Studio**:

1. **Active Projects Tab (`Section 1.5: Live Squad Workload & Allocation Heatmap`)**
   - Features a full-width **Total Agency Bandwidth Utilization Bar** showing cumulative allocated versus capacity hours (`bg-gradient-to-r from-cyan-400 to-indigo-500` or warning gradient when saturated).
   - Interactive **Specialist Capacity Cards** (`Agam`, `Vinay`, `Manpreet`, `Gayatri`, `Shivam`) with color-coded saturation bars (`Optimal`, `Peak Load`, `Bottleneck Alert`) and one-click roster filtering (`filterLeadId`).

2. **Hours Tracker Tab (`Section 1.5: Interactive Agency Workload Stack & Bandwidth Spectrum Graph`)**
   - Full-width horizontal stacked multi-color bar graph per specialist.
   - Visually segments total hours into **Tech/Dev (`cyan-400`)**, **On-Page/AEO (`purple-400`)**, **Off-Page/Guest (`amber-400`)**, and **Free Capacity (`emerald-500/40`)**.

3. **DSR Tracker Tab (`Section 1.5: 5-Week Daily Logging Intensity Grid & Velocity Pulse`)**
   - Features a **5-Week Mini Heatmap Pulse Block** (`W1` to `W5`) for every team member with visual intensity indicators.
   - Proportional **Log vs Int vs Plan** stacked dual-bar comparing approved client delivery hours against internal allocations.

4. **Skills Matrix Tab (`Section 1.5: Interactive Agency Competency Spectrum & Domain Mastery Bars`)**
   - Displays visual progress bars across 4 agency core disciplines (`Technical SEO & Architecture`, `On-Page & AEO/GEO Content Strategy`, `Off-Page & High-Authority Building`, and `Client Leadership & Retainer Growth`).
   - Highlights average squad mastery percentages and top domain specialists (`[Agam 98%]`, `[Vinay 95%]`).

5. **Job Delivery Bot Tab (`Section 1.5: Animated Delivery Pipeline & Verification Stages`)**
   - 4-Stage visual flow diagram (`[01. Technical Audit Check ⚡]` ➔ `[02. On-Page Package 🚀]` ➔ `[03. Off-Page Check 💎]` ➔ `[04. Package Dispatch ✨]`) with stage badges and glowing status indicators.

6. **Visual Finances Tab (`Section 1.5: Visual Revenue Composition & Profitability Margin Spectrum Chart`)**
   - Interactive stacked revenue bar splitting total contracted cashflow into **Collected (`emerald-500 to teal-400`)**, **Pending (`cyan-400 to blue-500`)**, and **Overdue (`amber-500 to rose-500 animate-pulse`)**.
   - Executive Profitability Cards displaying Average Retainer Margin (`+72.4% Net Margin`), Top Client Contribution (`Medanta`), and Estimated Monthly Labor Cost split.

