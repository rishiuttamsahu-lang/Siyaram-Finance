# FocusLock — Security, Privacy & Review Guide

This document defines the security architecture, user privacy policies, permission guidelines, and code review criteria for **FocusLock**.

---

## 1. Core Privacy Principles

1. **Zero Data Exfiltration (Local-First):**
   - All session data, app lists, restriction configurations, and analytics stay 100% on the local device inside SQLite / Room.
   - No external analytics, telemetry, or server sync for user browsing or app usage.

2. **No Credential Access or Storage:**
   - FocusLock never intercepts, requests, logs, or stores account passwords, PINs, or credentials.

3. **No Message or Content Inspection:**
   - AccessibilityService event processing is restricted strictly to package name and window state verification.
   - Textual node content inspection is strictly limited to identifier nodes necessary for feature detection (e.g. account switcher headers), and is never logged or cached.

---

## 2. Android Permission Safety & Compliance

| Permission / Service | Purpose | Security & Safety Safeguards |
| :--- | :--- | :--- |
| `BIND_ACCESSIBILITY_SERVICE` | Real-time foreground app and restricted action detection | Filter events by specific target package names only; no keystroke logging (`canRetrieveWindowContent` guarded). |
| `PACKAGE_USAGE_STATS` | App usage tracking and backup foreground detection | User is guided to system settings; fails gracefully if revoked. |
| `SYSTEM_ALERT_WINDOW` | Display non-intrusive blocking overlay when restricted action is accessed | Displayed strictly when active lock matches target app; automatically dismissed upon navigating away. |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_SPECIAL_USE` | Persistent timer countdown and watchdog execution | Displays active ongoing notification with live remaining time so the user is always informed. |
| `POST_NOTIFICATIONS` | Notification for lock completion and status updates | Android 13+ compliant runtime permission check. |
| `RECEIVE_BOOT_COMPLETED` | Restore ongoing lock sessions after device reboot | Checks Room DB and reschedules alarms if session time remains. |

---

## 3. Lock Integrity & Anti-Bypass Guardrails

1. **Non-Cancellable Active State:**
   - Once a lock session enters `ACTIVE` status, the UI intentionally omits "Cancel", "Pause", or "Bypass" buttons.
   - The lock naturally and automatically transitions to `COMPLETED` when `endsAt <= currentTime`.

2. **Tamper Resilience:**
   - Timers are calculated strictly from absolute system epoch timestamps (`endsAt`), not tick counters.
   - Device clock changes or restarts are verified against system uptime where available.

3. **Graceful Degradation:**
   - If a required permission is disabled mid-session, the app displays a clear system alert asking the user to restore permissions, without crashing or corrupting database records.

---

## 4. Phase Review Checkpoints & Quality Gates

Before any phase is marked `COMPLETE`, it must pass this review checklist:

- [ ] **Figma Compliance:** Layout, typography, colors, and margins match `Pages Designs/` and `design.md`.
- [ ] **No Memory Leaks:** Compose states properly remembered; Coroutine scopes bound to ViewModels/Lifecycle.
- [ ] **Zero Crash Policy:** Nullable types handled; all Intent and Service calls wrapped with safety checks.
- [ ] **Persistence Integrity:** Database transactions used for multi-row mutations; data survives app process termination.
- [ ] **Clean Code Standards:** Separation of concerns between UI, ViewModel, Domain, and Data layers.
