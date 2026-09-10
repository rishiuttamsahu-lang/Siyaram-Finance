# FocusLock — Software Architecture Document

This document outlines the technical architecture, component hierarchy, data models, state machines, and system services for **FocusLock**.

---

## 1. High-Level Architecture

FocusLock follows **Clean Architecture** principles and **Unidirectional Data Flow (UDF)** with **Jetpack Compose**:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI / Presentation Layer                  │
│   • Jetpack Compose Screens (Home, SelectApps, Restrictions)│
│   • ViewModels (StateFlow, UI State, UI Events)             │
│   • Navigation Graph (Compose Navigation)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                        Domain Layer                         │
│   • Use Cases (StartLockUseCase, EvaluateRestrictionUseCase)│
│   • Domain Models (LockSession, AppRestriction, AppInfo)    │
│   • State Machine (LockStateMachine)                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                         Data Layer                          │
│   • Repositories (LockRepository, AppDiscoveryRepository)   │
│   • Room Database (LockDatabase, SessionDao, HistoryDao)    │
│   • Proto DataStore (Preferences, SetupState)               │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                 System Services & Protection Layer          │
│   • FocusForegroundService (Persistent notification & loop) │
│   • FocusAccessibilityService (Window & node detection)     │
│   • OverlayManager (System alert blocking overlay)          │
│   • BootReceiver (Reboot recovery & alarm rescheduling)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Modules & Package Structure

```text
com.focuslock.app
├── core
│   ├── common          // Dispatchers, Result wrapper, Extensions
│   ├── designsystem    // Compose Theme, ColorTokens, Typography, Components
│   └── database        // Room Database, TypeConverters, Entities, DAOs
├── data
│   ├── model           // Network/Local DB models
│   ├── repository      // Repository implementations
│   └── datastore       // User preferences
├── domain
│   ├── model           // Pure Kotlin domain models
│   ├── repository      // Repository interfaces
│   └── usecase         // Business logic operations
├── engine
│   ├── statemachine    // Lock engine state transitions
│   ├── timer           // Timestamp-based countdown engine
│   └── evaluator       // Restriction rule evaluator
├── service
│   ├── accessibility   // FocusAccessibilityService
│   ├── foreground      // FocusForegroundService
│   ├── overlay         // Blocking Overlay Activity/View
│   └── receiver        // BootReceiver, PackageChangeReceiver
└── feature
    ├── home            // Home Dashboard screen & ViewModel
    ├── wizard          // Create Focus multi-step flow
    │   ├── selectapps
    │   ├── restrictions
    │   └── startlock
    ├── activelock      // Active Lock Detail screen
    ├── history         // Session history
    ├── insights        // Statistics & metrics
    └── settings        // App configuration & permissions
```

---

## 3. Data Models & Database Schema

### 3.1 Lock Session Entity (`lock_sessions`)

```kotlin
@Entity(tableName = "lock_sessions")
data class LockSessionEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val title: String,
    val createdAt: Long = System.currentTimeMillis(),
    val startedAt: Long,
    val endsAt: Long,
    val totalDurationMillis: Long,
    val status: LockStatus, // DRAFT, READY, ACTIVE, COMPLETED
    val completedAt: Long? = null,
    val isStrict: Boolean = true
)
```

### 3.2 App Restriction Entity (`app_restrictions`)

```kotlin
@Entity(
    tableName = "app_restrictions",
    foreignKeys = [
        ForeignKey(
            entity = LockSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class AppRestrictionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val packageName: String,
    val appName: String,
    val restrictionType: RestrictionType, // BLOCK_APP, BLOCK_ACCOUNT_SWITCH, BLOCK_INCOGNITO, CUSTOM_ACTION
    val isEnabled: Boolean = true
)
```

---

## 4. Lock Engine State Machine

```
                   ┌──────────┐
                   │  DRAFT   │
                   └────┬─────┘
                        │ Configure apps & restrictions
                   ┌────▼─────┐
                   │  READY   │
                   └────┬─────┘
                        │ Confirm duration & Start
                   ┌────▼─────┐
          ┌────────┤  ACTIVE  ├────────┐
          │        └────┬─────┘        │
          │             │              │
    (Device Reboot)     │ (endsAt <=   │ (Force Kill)
          │             │  currentTime)│
          │             │              │
    Re-evaluate &       │         Re-evaluate &
    Resume Service      │         Resume Service
                        ▼
                 ┌─────────────┐
                 │  COMPLETED  │
                 └─────────────┘
```

### Absolute Timestamp Guarantees:
- `remainingTime = max(0, endsAt - System.currentTimeMillis())`
- When `remainingTime == 0`, transition state to `COMPLETED` and trigger completion event.
- No dependence on memory counters; state is fully deterministic and resilient.

---

## 5. Android Protection & Enforcement Layer

1. **Accessibility Service (`FocusAccessibilityService`):**
   - Intercepts `TYPE_WINDOW_STATE_CHANGED` and `TYPE_WINDOW_CONTENT_CHANGED`.
   - Detects active foreground package name.
   - Evaluates whether the foreground package matches an active restriction.
   - For granular restrictions (Instagram account switch or Chrome Incognito), inspects node hierarchies and triggers interception if targeted UI nodes appear.

2. **Blocking Experience (`BlockingOverlayActivity`):**
   - Fullscreen modal launched with flags `FLAG_ACTIVITY_NEW_TASK` and `FLAG_ACTIVITY_CLEAR_TOP`.
   - Brings user back to FocusLock shield screen.
   - Dispatches `ACTION_MAIN` / `CATEGORY_HOME` intent to prevent user access to the restricted app.

3. **Foreground Service (`FocusForegroundService`):**
   - Holds ongoing system notification displaying remaining focus duration.
   - Maintains watchdog execution context to prevent Android OS process killing.

4. **Boot Receiver (`BootReceiver`):**
   - Listens for `ACTION_BOOT_COMPLETED`.
   - Reads active session from Room database.
   - Restarts `FocusForegroundService` and schedules completion alarm if time remains.
