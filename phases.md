# FocusLock — 15-Phase Execution Plan

This document defines the strict, sequential 15-phase implementation roadmap for **FocusLock**.

---

## Strict Execution Protocol
> **Rule:** Phases must be executed strictly from Phase 1 to Phase 15. No phase may be skipped, combined, or started until the preceding phase is verified, tested, and marked **COMPLETE**.

---

## Phase Breakdown

### Phase 1: Project Foundation & Core Scaffolding
- **Objective:** Initialize clean Android project architecture using Kotlin & Jetpack Compose.
- **Deliverables:**
  - Gradle build scripts with version catalog (`libs.versions.toml`).
  - Target SDK 35, Min SDK 26.
  - Package structure: `core`, `designsystem`, `feature`, `data`, `engine`, `service`.
  - Application class & Dependency Injection setup (Hilt or Koin).
- **Verification:** Compiles cleanly to an empty launching application.
- **Status:** COMPLETE

---

### Phase 2: Design System & Theme Foundation
- **Objective:** Recreate the exact visual language from the Figma source of truth.
- **Deliverables:**
  - Color Tokens: Primary Accent (`#FF6B2C`), Dark Surface (`#141A21`), Canvas (`#FAF3EC`), Text Primary (`#12161A`), Secondary (`#6B778C`), Border (`#EAE1D8`).
  - Typography: Outfit (Headings, Stats) & Geist (Body, UI labels).
  - Components: Custom Rounded Cards, Buttons, Status Badges, Circular Progress Timer, Custom Bottom Bar.
- **Verification:** Compose preview gallery showing exact Figma match across light/dark surfaces.
- **Status:** COMPLETE

---

### Phase 3: Navigation Skeleton & Routing
- **Objective:** Implement complete app navigation graph including bottom bar and wizard flow.
- **Deliverables:**
  - Bottom Bar Destinations: Home, History, Create Focus (+), Insights, Settings.
  - Wizard Sub-flow: Select Apps (Step 1/5) → Set Restrictions (Step 2/5) → Start Lock (Step 3/5).
  - Navigation transitions and persistent state passing between steps.
- **Verification:** Smooth navigation across all 5 main tabs and step wizard without state loss.
- **Status:** COMPLETE

---

### Phase 4: Home Dashboard Implementation
- **Objective:** Pixel-perfect implementation of `Home.png`.
- **Deliverables:**
  - Header with Focus title, Notification icon, and Groove Tunes focus bar.
  - Active Focus Card with remaining time circle (e.g. "45:20 Remaining"), "Protection is Active" badge, and protected count button.
  - Quick Stats Grid: "1h 30m Time Protected Today", "6 Sessions Completed This Week".
  - Protected Apps list with live status indicators.
  - Dynamic empty state when no lock is active.
- **Verification:** Visual comparison against `Pages Designs/Home.png`.
- **Status:** COMPLETE

---

### Phase 5: Installed App Discovery Engine
- **Objective:** Query and categorize installed applications on the device.
- **Deliverables:**
  - `AppDiscoveryRepository` to query `PackageManager`.
  - Icon extraction, app name resolution, package name mapping.
  - Categorization into Recommended (Instagram, Chrome, YouTube, Twitter, WhatsApp) and All Apps.
  - Search filtering by app name.
- **Verification:** Real device apps rendered with valid icons and metadata.
- **Status:** COMPLETE

---

### Phase 6: Select Apps Wizard Flow
- **Objective:** Pixel-perfect interactive implementation of `Select Apps.png`.
- **Deliverables:**
  - Checkbox selection logic with responsive UI feedback.
  - Live bottom counter: `X apps selected`.
  - Guarded "Next" button (enabled only when at least 1 app is selected).
  - Selection stored in wizard state.
- **Verification:** Visual and functional match with `Pages Designs/Select Apps.png`.
- **Status:** COMPLETE

---

### Phase 7: App Restriction Configuration Engine
- **Objective:** Pixel-perfect interactive implementation of `Set Restriction.png`.
- **Deliverables:**
  - Expandable app restriction accordions for selected apps.
  - Instagram restrictions: Block Account Switching, Block Opening the App, Block Selected Actions.
  - Chrome restrictions: Incognito Mode Restriction/Detection.
  - Dynamic configuration builder for downstream protection engine.
- **Verification:** Visual match with `Pages Designs/Set Restriction.png` and verified output schema.
- **Status:** COMPLETE

---

### Phase 8: Android Protection & Monitoring Layer
- **Objective:** Build background services for foreground detection and restriction evaluation.
- **Deliverables:**
  - `FocusAccessibilityService` for UI event detection (account switcher/incognito UI hooks).
  - Optional `FocusVpnService` for network-level block hooks where applicable.
  - Foreground Service with persistent system notification.
  - Real-time restriction evaluation engine.
- **Verification:** Active monitoring detects foreground app changes and target actions.
- **Status:** COMPLETE

---

### Phase 9: Blocking Overlay & Interception Experience
- **Objective:** Instant interception and non-bypassable blocking UI.
- **Deliverables:**
  - System Alert Window / Overlay Activity displayed when restricted action is detected.
  - Shows remaining lock time, restricted app name, shield emblem, and no bypass button.
  - Immediate redirection to Home or launcher when restricted app is opened.
- **Verification:** Attempting to open a blocked app or trigger restricted UI immediately surfaces the overlay.
- **Status:** COMPLETE

---

### Phase 10: Lock Duration & Commitment Configuration
- **Objective:** Pixel-perfect implementation of `start a lock.png`.
- **Deliverables:**
  - Duration selector (3, 5, 7, 10, 15 Days) with expandable custom duration support.
  - Session Preview: Start Time, End Time, Total Duration.
  - Warning callout: "Important to know — You won't be able to turn off protections or unlock early."
  - "Start X Day Lock" CTA triggering session initialization.
- **Verification:** Visual comparison against `Pages Designs/start a lock.png`.
- **Status:** COMPLETE

---

### Phase 11: Lock Engine & Room Persistence
- **Objective:** Durable state machine and SQLite persistence for lock sessions.
- **Deliverables:**
  - Room Entities: `LockSessionEntity`, `AppRestrictionEntity`, `SessionHistoryEntity`.
  - State Machine: `DRAFT` → `READY` → `ACTIVE` → `COMPLETED`.
  - Timestamp-based duration calculation (`endsAt - currentTime`) ensuring persistence across device reboots and app kills.
  - `BootReceiver` for system boot recovery.
- **Verification:** Lock state, countdown, and active protections survive force close and device reboot.
- **Status:** COMPLETE

---

### Phase 12: Active Lock Detail Screen
- **Objective:** Pixel-perfect implementation of `active lock.png`.
- **Deliverables:**
  - Active lock header with shield status.
  - Circular countdown timer with real-time second updates.
  - Protected Apps & Restrictions list with "Active" badges.
  - Session Progress bar with percentage and time protected.
  - Motivational card and non-cancellable commitment banner.
  - Automatic transition to Completed state when countdown reaches 0.
- **Verification:** Visual comparison against `Pages Designs/active lock.png`.
- **Status:** COMPLETE

---

### Phase 13: History, Insights & Statistics
- **Objective:** Analytics and session log screens.
- **Deliverables:**
  - History screen listing past completed and active locks.
  - Insights screen showing total protected hours, streak count, weekly breakdown, and most protected apps.
  - Room queries calculating genuine, un-faked statistics.
- **Verification:** Accurate aggregation of completed sessions into History and Insights dashboards.
- **Status:** COMPLETE

---

### Phase 14: Permissions, Reliability & Error Recovery
- **Objective:** Robust permission onboarding, battery optimization bypass, and safe failover.
- **Deliverables:**
  - Permission manager for Accessibility, Usage Stats, Overlay, and Notifications.
  - Battery optimization exclusion guidance.
  - Graceful degraded mode handling when permissions are revoked by the user.
  - Clean error logging and zero crash guarantees.
- **Verification:** Stress testing across app kill, permission toggle, and low-memory scenarios.
- **Status:** COMPLETE

---

### Phase 15: Final QA, Figma Pixel Match & Release Build
- **Objective:** Full visual and functional audit, release optimization, and APK/AAB generation.
- **Deliverables:**
  - 1:1 pixel comparison with all 5 Figma screens in `Pages Designs/`.
  - ProGuard/R8 rules optimization.
  - Removal of all debug logs.
  - Signed release build artifact.
- **Verification:** Zero UI discrepancies, 100% test pass rate, clean release build.
- **Status:** COMPLETE
