# FocusLock — Design System Specification

This document defines the visual design system, token definitions, typography rules, and UI component standards extracted directly from the Figma source of truth and reference designs in `Pages Designs/`.

---

## 1. Color System

| Token Name | Hex Code | Purpose | Preview Reference |
| :--- | :--- | :--- | :--- |
| `CanvasBackground` | `#FAF3EC` | Main application background (warm cream) | All screens |
| `SurfaceWhite` | `#FFFFFF` | Primary cards, app rows, dialogs | Card backgrounds |
| `SurfaceDark` | `#141A21` | Bottom navigation bar, dark header surfaces | Bottom Bar |
| `PrimaryAccent` | `#FF6B2C` | Primary buttons, active tabs, floating action button, highlights | CTA Buttons, + Button |
| `AccentLight` | `#FFF3EB` | Pill badges, progress track background, icon containers | "ACTIVE FOCUS" badge |
| `InfoSurface` | `#EBF3FE` | Information callout boxes | Start a Lock notice card |
| `InfoIcon` | `#3366FF` | Information notice icons | Info icon |
| `SuccessBadgeBg` | `#E8F7EE` | "Active" status indicator background | Active status pills |
| `SuccessBadgeText` | `#2D9C5E` | "Active" status indicator text | Active status pills |
| `TextPrimary` | `#12161A` | Main headings, titles, active numbers | Headlines, body titles |
| `TextSecondary` | `#6B778C` | Subtitles, helper text, timestamps | Captions, durations |
| `BorderSubtle` | `#EAE1D8` | Card outlines, dividers, card strokes | All card borders |
| `BorderSelected` | `#FF6B2C` | Selected card outline stroke | Selected apps & durations |

---

## 2. Typography Hierarchy

| Style Role | Font Family | Weight | Size (sp) | Tracking / Usage |
| :--- | :--- | :--- | :--- | :--- |
| `Display / Hero` | Outfit | ExtraBold (800) | 32sp | Main screen titles ("Focus", "Lock in. Stay focused.") |
| `Title Large` | Outfit | Bold (700) | 22sp - 24sp | Section headers ("Select Apps", "Set Restrictions") |
| `Title Medium` | Outfit | SemiBold (600) | 18sp - 20sp | Card titles ("Social Media Design") |
| `Timer Numeric` | Outfit | Bold (700) | 48sp | Countdown timer ("45:20") |
| `Body Large` | Geist | Medium (500) | 16sp | App list titles, action titles |
| `Body Regular` | Geist | Regular (400) | 14sp | Helper text, description captions |
| `Caption / Label`| Geist | SemiBold (600) | 12sp | Step counters ("STEP 1 OF 5"), Badges |

---

## 3. Component Specifications

### 3.1 Top App Bar & Headers
- **Back Navigation:** Clean black arrow icon on left for wizard screens.
- **Title Alignment:** Centered title for wizard screens ("Create New Focus", "Start a Lock", "Active Lock").
- **Header Actions:** Notification bell icon wrapped in rounded white square card.
- **Music Bar:** Rounded card with musical note icon ("Groove Tunes — Focus beats playlist playing") and pause/play indicators.

### 3.2 Circular Timer Widget
- **Size:** ~190dp diameter.
- **Track Color:** `#2B303A` / `#FAF3EC` with orange progress arc (`#FF6B2C`).
- **Inner Content:**
  - Timer value in 48sp Outfit Bold ("45:20").
  - Subtitle "Remaining" in 14sp Geist Regular.
- **Bottom Anchor:** Circular shield badge overlapping the bottom of the circle.

### 3.3 Cards & Containers
- **Corner Radius:** `20.dp` for major cards, `14.dp` for list items and duration cards.
- **Elevation:** Low elevation (`0.dp` to `2.dp`) with `1.dp` solid stroke (`#EAE1D8`).
- **Pill Badges:** Fully rounded `50%` radius (`#FFF3EB` background with `#FF6B2C` text or `#E8F7EE` with `#2D9C5E` text).

### 3.4 Buttons & Interactive Elements
- **Primary CTA Button:** Full-width rounded button (`50%` radius), solid `#FF6B2C`, white text, Outfit SemiBold 16sp, right arrow icon.
- **Secondary / Back Button:** Rounded pill (`50%` radius), white background, `#12161A` border, bold text.
- **Checkboxes / Radios:** Custom circular indicators with `#FF6B2C` checked state and white checkmark icon.

### 3.5 Bottom Navigation Bar
- **Height:** `72.dp`
- **Background:** Solid dark `#141A21` with top edge radius.
- **Items:**
  1. Home (Home icon + label)
  2. History (Calendar icon + label)
  3. Create (+) (Prominent elevated center orange button `#FF6B2C`)
  4. Insights (Trending graph icon + label)
  5. Settings (Gear icon + label)
- **Active Item State:** `#FF6B2C` icon and text color.
- **Inactive Item State:** `#6B778C` icon and text color.

---

## 4. Screen Layout Breakdown

1. **`Home.png` (Dashboard):**
   - Top Header with Notification Bell.
   - Groove Tunes Playlist bar.
   - Active Focus hero card with circular countdown, protection badge, and protected app count pill.
   - 2-column Stat Cards: "Time Protected Today" & "Sessions Completed This Week".
   - Protected Apps list with active badges and "View All" link.
   - Dark Bottom Bar.

2. **`Select Apps.png` (Step 1/5):**
   - Top step progress bar (Step 1 active).
   - "STEP 1 OF 5" label + "Select Apps" heading.
   - Search input box with search icon.
   - "Recommended" app section (Instagram, Chrome, YouTube, Twitter, WhatsApp).
   - "All Apps" section (Facebook, Reddit, Telegram, etc.) with `+` action button.
   - Sticky bottom bar: "X apps selected" + orange "Next →" button.

3. **`Set Restriction.png` (Step 2/5):**
   - Step progress bar (Step 2 active).
   - "Set Restrictions" heading + subtitle.
   - Expandable app cards with chevron and selected status.
   - Multi-option restriction selectors (e.g. Block Account Switching, Block Opening the App, Block Selected Actions).
   - Information callout card ("How restrictions work?").
   - Dual bottom CTA: "Back" & "Next →".

4. **`start a lock.png` (Step 3/5):**
   - Hero header: "Lock in. Stay focused." with Shield badge.
   - Duration selector pills (3, 5, 7, 10, 15 Days).
   - Session Preview card (Start Time, End Time, Total Duration).
   - Non-cancellable warning banner.
   - Primary CTA: "Start X Day Lock".

5. **`active lock.png` (Active Lock Detail):**
   - Circular live countdown.
   - Protected Apps & Restrictions status breakdown.
   - Session progress bar with percentage and elapsed time.
   - Motivational card ("You're doing great!").
   - Immutable lock lockup notice ("This lock cannot be cancelled or modified...").
