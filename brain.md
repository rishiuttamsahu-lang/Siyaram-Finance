# FocusLock — Master Project Brain (`brain.md`)

> **Single Source of Context & Project Memory**
> This file acts as the primary snapshot for AI models to understand the entire architecture, current implementation progress, design tokens, and execution rules without re-scanning the entire codebase.

---

## 📌 1. Project Overview
- **App Name:** FocusLock
- **Platform:** Android (Min SDK 26, Target SDK 35)
- **Language / Framework:** Kotlin, Jetpack Compose, Material3 customized with design tokens
- **Architecture:** Clean Architecture + MVVM / MVI + Coroutines & StateFlow (Unidirectional Data Flow)
- **Source of Truth:** Figma UI Designs in `Pages Designs/`, `prd.md`, `design.md`, `architecture.md`

---

## 🎨 2. Design System & Visual Tokens

### Color Palette
- **Canvas / Background:** `#FAF3EC` (Warm Sand)
- **Primary Accent:** `#FF6B2C` (Vibrant Orange)
- **Dark Surface:** `#141A21` (Slate Navy)
- **Card Background:** `#FFFFFF` (Pure White)
- **Borders & Dividers:** `#EAE1D8`
- **Text Primary:** `#12161A`
- **Text Secondary / Muted:** `#6B778C`

### Typography
- **Headings, Timers & Key Stats:** Outfit / Bold Sans
- **Body, Captions & Labels:** Geist / Inter

### Key UI Components
- **Top Bar:** Warm canvas with notifications & active focus status widget.
- **Active Focus Card:** Prominent countdown circular timer (`#FF6B2C`), "Protection is Active" badge, and protected app chips.
- **Bottom Navigation Bar:** Floating dark slate (`#141A21`) bar with 5 destinations (Home, History, **+** Create Focus, Insights, Settings).

---

## 🏗️ 3. Architecture & File Structure

```
com.focuslock.app/
├── core/
│   ├── common/             # Result, Resource wrappers, AppDispatchers
│   └── database/           # Room Database, TypeConverters, Entities, DAOs
├── data/
│   ├── repository/         # Repository implementations
│   └── source/             # Local and system data sources (UsageStats, PackageMgr)
├── domain/
│   ├── model/              # Domain models (AppInfo, AppRestriction, FocusSession)
│   ├── repository/         # Domain repository interfaces
│   └── usecase/            # Pure Kotlin business use cases
├── engine/                 # Core enforcement, Strict Mode, PIN/Biometric guard
├── service/
│   ├── Accessibility/      # Window tracking & block overlay trigger
│   ├── Foreground/         # Persistent notification & active countdown service
│   └── Receiver/           # Boot receiver, Alarm receiver for session schedule
└── ui/
    ├── designsystem/       # Tokens, Type, Color, Custom Components (Timer, Card, Button)
    ├── navigation/         # NavHost, Screen routes, BottomBarNavigation
    └── feature/
        ├── home/           # Dashboard, Quick Stats, Active Lock Card
        ├── history/        # Past lock logs & session summaries
        ├── wizard/         # 5-step restriction creation flow
        ├── insights/       # Screen time & saved distraction charts
        └── settings/       # Strict mode, PIN, Emergency Unlock, Theme
```

---

## 🚦 4. 15-Phase Roadmap Status

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | Project Foundation & Core Scaffolding | ✅ **COMPLETE** |
| **Phase 2** | Design System & Theme Foundation | ✅ **COMPLETE** |
| **Phase 3** | Navigation Skeleton & Routing | ✅ **COMPLETE** |
| **Phase 4** | Home Dashboard Implementation | ✅ **COMPLETE** |
| **Phase 5** | Installed Apps Scanner & Category Engine | ✅ **COMPLETE** |
| **Phase 6** | Lock Setup Wizard (5 Steps) | ✅ **COMPLETE** |
| **Phase 7** | Enforcement Engine: Accessibility & Overlay | ✅ **COMPLETE** |
| **Phase 8** | Foreground Service & Resilient Timers | ✅ **COMPLETE** |
| **Phase 9** | Block Screen Implementation | ✅ **COMPLETE** |
| **Phase 10**| Lock Duration & Commitment Configuration | ✅ **COMPLETE** |
| **Phase 11**| Lock Engine & Room Persistence | ✅ **COMPLETE** |
| **Phase 12**| Active Lock Detail Screen | ✅ **COMPLETE** |
| **Phase 13**| History, Insights & Statistics | ✅ **COMPLETE** |
| **Phase 14**| Permissions, Reliability & Error Recovery | ✅ **COMPLETE** |
| **Phase 15**| Final QA, Figma Pixel Match & Release Build | ✅ **COMPLETE** |

---

## 🛡️ 5. Golden Rules for AI Implementation
1. **Figma is Ground Truth:** Never alter spacing, radii, typography, or palettes from the Figma designs.
2. **Sequential Progression:** Implement one phase at a time; never skip ahead or create stub code for future phases.
3. **Real Android APIs:** Always use genuine Android services (`AccessibilityService`, `UsageStatsManager`, `ForegroundService`). Never write fake mock implementations.
4. **Timestamp Resilient Timers:** Calculate timer durations via `endsAt - System.currentTimeMillis()`. Never use fragile in-memory `delay()` loops that reset on app kill.
5. **Clean MVVM/MVI State:** All UI state must flow through Compose `StateFlow` and immutable data classes.
