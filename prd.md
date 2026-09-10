

# PRD — FocusLock

**Product Type:** Android Digital Self-Control / Focus Lock App
**Primary Platform:** Android
**Recommended Stack:** Kotlin + Jetpack Compose
**Design Source:** Figma — provided design file
**Build Method:** 15 strictly sequential phases
**UI Rule:** Figma UI is the source of truth. UI/layout/pages ko redesign nahi karna hai.

---

## 1. Product Vision

**FocusLock** ek Android self-control application hai jo user ko predetermined period ke liye distracting apps aur selected behaviors se distance maintain karne mein help karta hai.

Main concept:

> **User restrictions select kare → duration choose kare → Lock start kare → timer expire hone tak selected protections active rahen.**

App ka primary purpose **digital discipline aur distraction control** hai, na ki social-media content ko modify karna.

### Core protections

* Selected apps ko restrict karna.
* Instagram ke selected account-related behaviors ko restrict karna.
* Chrome ke selected browsing behaviors, including Incognito-related behavior, ko restrict/detect karne ki koshish karna.
* Active lock ke dauran restrictions ko automatically enforce karna.
* Timer expire hone par lock automatically complete karna.
* User ko progress aur completed sessions dikhana.

**Important implementation principle:** Android third-party apps ke internal login/account state ya Chrome ke internal UI ko arbitrary system-level API se permanently control karna guaranteed nahi hai. Isliye implementation ko **supported Android capabilities + best-effort detection** par design karna hai; fake “100% unbreakable” behavior claim nahi karna.

---

# 2. Target User Problem

User ko pata hai ki kuch applications uska focus todti hain, lekin manually unhe avoid karna difficult hota hai.

Current problem:

* App uninstall/reinstall karne ka temptation.
* Instagram account switching ka temptation.
* Browser ke private browsing behavior ka temptation.
* Lock start karne ke baad manually restrictions disable kar dena.
* Time-bound commitment maintain karna difficult hona.

FocusLock ka solution:

**“Decision ek baar lo, protection ko timer ke through automatically enforce hone do.”**

---

# 3. Product Goals

### Primary Goals

1. Fast focus session creation.
2. Selected apps ko protection list mein add karna.
3. Per-app restrictions configure karna.
4. Fixed duration lock create karna.
5. Active lock ka persistent countdown maintain karna.
6. Protected actions detect hone par blocking UI dikhana.
7. Lock completion ko automatically record karna.
8. History/Insights ke through progress show karna.

### Non-Goals

* Instagram/YouTube ke server ko modify karna.
* User credentials store karna.
* User ke passwords read karna.
* Third-party account ko actually delete/disable karna.
* Guaranteed access-control claims karna jinke liye Android permission/API available nahi hai.

---

# 4. Figma UI — Source of Truth

**STRICT RULE:**

> Figma mein jo screens, spacing, colors, typography, cards, icons, navigation aur visual hierarchy hai, implementation mein wahi maintain karni hai.

Developer/AI ko:

* New screens invent nahi karne.
* Existing layout redesign nahi karna.
* Colors change nahi karne.
* Cards ko unnecessarily simplify nahi karna.
* Bottom navigation replace nahi karna.
* Figma ke component hierarchy ko respect karna hai.

### Design system

**Background:** `#FAF3EC`
**Primary Accent:** `#FF6B2C`
**Dark Surface:** `#141A21`
**Primary Text:** `#12161A`
**Secondary Text:** `#6B778C`
**Border:** `#EAE1D8`

### Typography

* **Outfit** — headings / prominent numbers
* **Geist** — body/UI labels

### Visual language

* Rounded cards
* Soft borders
* White content surfaces
* Orange action states
* Dark bottom navigation
* Orange active navigation state
* Shield/lock visual identity

---

# 5. Main Screens

## Screen 1 — Home

Figma screen: `home-dashboard`

Purpose:

User ko current protection ka quick overview dena.

### Contains

* Focus header
* Notification button
* Music/focus bar
* Active Focus card
* Countdown timer
* Protection status
* Number of protected apps
* Today's protected time
* Weekly completed sessions
* Protected Apps list
* Create New Focus CTA
* Bottom navigation

### Main states

**No active lock**

* No active session state
* CTA prominently visible

**Active lock**

* Countdown visible
* Protection status = Active
* Protected apps visible
* Timer continuously updates

---

# 6. Screen 2 — Select Apps

Figma screen: `select-apps`

Purpose:

User decide karega ki kaunse apps focus session mein protected rahenge.

### Step indicator

`Step 1 of 5`

### Recommended Apps

Figma currently shows:

* Instagram
* Chrome
* YouTube
* Twitter
* WhatsApp

### All Apps

Examples:

* Facebook
* Reddit
* Telegram

### Functional requirements

* Search apps.
* Installed applications detect karo.
* App icon/name/category display karo.
* Checkbox selection.
* Selected count live update.
* Next button selected apps ke bina disabled/guarded rahe.
* Selected apps persistent wizard state mein store hon.

---

# 7. Screen 3 — Set Restrictions

Figma screen: `set-restrictions`

Purpose:

Selected apps ke liye actual restrictions choose karna.

### Instagram

Options:

**Block Account Switching**

* Selected Instagram account se doosre account par switch karne ke behavior ko detect/restrict karna.

**Block Opening the App**

* Active lock ke dauran Instagram access restrict karna.

**Block Selected Actions**

* Supported specific behaviors ko restrict karna.

### Chrome

Chrome section expandable/collapsible hai.

Ismein Chrome-specific restrictions configure hongi.

Primary intended restriction:

**Incognito Mode restriction/detection**

### Important

Android APIs third-party apps ke internal UI ko officially control nahi karte. Accessibility-based detection ko only supported/use-appropriate scenarios mein use karna hai, aur implementation ko robust fallback behavior rakhna hai. Android AccessibilityService system UI events aur active-window content ke callbacks/querying provide kar sakta hai, but Android documentation ke according accessibility services ka intended purpose accessibility assistance hai. ([Android Developers][1])

---

# 8. Screen 4 — Start a Lock

Figma screen: `start-a-lock`

Purpose:

Final commitment se pehle user ko lock configuration ka clear preview dena.

### Hero

**Lock in. Stay focused.**

Features:

* Distraction Protection
* No Manual Unlock

### Duration

Figma options:

* 3 Days
* 5 Days
* 7 Days
* 10 Days
* 15 Days

Architecture should support arbitrary duration internally, so future UI mein hours/minutes/custom durations add kiye ja saken.

### Session Preview

Show:

* Start Time
* End Time
* Total Duration

### Important warning

User ko clearly batana:

> Lock start hone ke baad configured protection timer expire hone tak active rahegi.

### CTA

`Start X Day Lock`

---

# 9. Screen 5 — Active Lock Detail

Figma screen: `active-lock-detail`

Purpose:

Running lock ka complete status.

### Contains

* Active Lock header
* Countdown
* Session title
* End date/time
* Protection Active badge
* Protected Apps & Restrictions
* Instagram status
* Chrome status
* Session Progress
* Protected time
* Percentage
* Encouragement card
* Non-cancellable warning

### Critical behavior

Countdown:

```text
remaining = endTimestamp - currentTimestamp
```

App close hone ke baad bhi timer correct rehna chahiye.

Timer ko simple in-memory counter se implement **nahi** karna.

Use:

**absolute end timestamp + current system time**

---

# 10. Lock Engine

Ye application ka core backend/logic layer hai.

### Lock object

Conceptually:

```text
LockSession
 ├── id
 ├── title
 ├── createdAt
 ├── startedAt
 ├── endsAt
 ├── duration
 ├── selectedApps[]
 ├── restrictions[]
 ├── status
 ├── completedAt
 └── progress
```

### States

```text
DRAFT
↓
READY
↓
ACTIVE
↓
COMPLETED
```

Optional failure state:

```text
ERROR
```

### Important rule

`ACTIVE` lock ko app restart ke baad bhi recover hona chahiye.

---

# 11. Protection Architecture

Recommended architecture:

```text
UI Layer
   ↓
ViewModel
   ↓
FocusLock Repository
   ↓
Lock Engine
   ↓
Protection Manager
   ├── App Detection
   ├── Restriction Engine
   ├── Blocking Overlay
   └── Network Filtering (where applicable)
```

Android `VpnService` virtual network interface create kar sakta hai aur per-application allow/disallow configuration support karta hai, so network-level restrictions ke liye ye useful building block ho sakta hai. ([Android Developers][2])

---

# 12. Blocking Behavior

Jab active lock ke dauran protected behavior detect ho:

```text
Protected action detected
        ↓
Check active LockSession
        ↓
Restriction matches?
        ↓
YES
        ↓
Block / redirect
        ↓
Show FocusLock blocking screen
```

Blocking screen ka visual design later Figma mein add kiya ja sakta hai, but existing design language maintain honi chahiye.

Example message:

**Focus Lock Active**

> This action is currently restricted. Your focus session is still running.

Show:

* Remaining time
* Protected app/action
* Shield icon

**Do not provide a bypass button.**

---

# 13. Timer Requirements

Timer must:

* Continue when app is backgrounded.
* Continue after app restart.
* Recover after device reboot where Android lifecycle allows.
* Update Home screen.
* Update Active Lock screen.
* Automatically transition to `COMPLETED`.
* Record completed session.

Use:

```text
startedAt
endsAt
currentTime
```

instead of relying on a continuously running timer process.

---

# 14. Persistence

Recommended local storage:

**Room** for structured session/history data.

Store:

* Lock sessions
* Selected apps
* Restrictions
* Completion state
* Statistics

Preferences/DataStore:

* UI preferences
* Small configuration values
* Permission/setup state

No passwords or third-party credentials should be stored.

---

# 15. Permissions & Android Capabilities

App ko minimum required permissions hi request karni hain.

Potential components:

### AccessibilityService

For supported UI-state/action detection.

Android AccessibilityService receives accessibility events and can optionally query active-window content. ([Android Developers][1])

### VpnService

Network-level filtering/restriction use cases ke liye.

VPN connection ke liye Android user authorization required hota hai, aur Android ek time par ek active VPN connection maintain karta hai. ([Android Developers][2])

### Foreground Service

Long-running protection operations ke liye Android ke current foreground-service requirements follow karo. Foreground services visible notification ke saath run karte hain. ([Android Developers][3])

### Device Owner / LockTask

**Default consumer installation mein assume mat karo.**

Android DevicePolicyManager/LockTask powerful device-management capabilities provide karta hai, but ye normal unrestricted consumer-app capability nahi hai; permitted packages/device-policy conditions apply karte hain. ([Android Developers][4])

---

# 16. Data Privacy

FocusLock ko:

* Instagram password nahi chahiye.
* Google password nahi chahiye.
* User messages read/store nahi karne.
* Private content collect nahi karna.
* Browsing history server par upload nahi karni.
* Analytics minimal rakhni hai.

Protection-related data preferably **local-first** rahe.

---

# 17. Bottom Navigation

Figma mein 5 destinations:

1. **Home**
2. **History**
3. **Create / +**
4. **Insights**
5. **Settings**

Central orange `+` primary action hai.

---

# 18. History

Figma current metadata mein History navigation defined hai.

Purpose:

Completed locks show karna.

Each history item:

* Lock title
* Start date/time
* End date/time
* Duration
* Protected apps
* Completion status

---

# 19. Insights

Purpose:

User ko progress dikhana.

Possible metrics:

* Total protected time
* Completed locks
* Current streak
* Weekly sessions
* Most protected apps
* Average lock duration

**Metrics factual hon; fake achievements generate nahi karne.**

---

# 20. Settings

Settings mein future-compatible structure:

* Protection permissions
* Accessibility setup
* VPN setup
* Notification preferences
* App behavior
* Privacy
* About

Critical protection settings active lock ke during editable nahi honi chahiye where technically enforceable.

---

# 21. 15-Phase Build Plan

## PHASE 1 — Project Foundation

* Android project initialize.
* Kotlin.
* Jetpack Compose.
* Package architecture.
* Gradle configuration.
* Minimum/target SDK decide.
* Navigation foundation.
* Theme foundation.

**Output:** Compiling empty application.

---

## PHASE 2 — Figma Design System

Implement:

* Colors
* Typography
* Spacing
* Rounded corners
* Cards
* Buttons
* Badges
* Bottom navigation
* Icons/assets

**Output:** Reusable design system matching Figma.

---

## PHASE 3 — App Navigation

Implement navigation:

```text
Home
History
Create Focus
Insights
Settings
```

Create Focus wizard:

```text
Select Apps
→ Set Restrictions
→ Start Lock
```

**Output:** Complete navigation skeleton.

---

## PHASE 4 — Home Screen

Implement exact Figma Home UI.

Functional:

* Active state
* Empty state
* Protected apps
* Stats
* CTA
* Countdown placeholder

**Output:** Fully functional Home UI.

---

## PHASE 5 — App Discovery

Implement:

* Installed app detection
* App labels
* Package names
* App icons
* Search
* Recommended apps
* All apps
* Selection state

**Output:** Real device apps appear in Select Apps.

---

## PHASE 6 — Select Apps Logic

Implement:

* Checkbox selection
* Selected count
* State persistence
* Next validation
* Back navigation
* Wizard state

**Output:** Step 1 works completely.

---

## PHASE 7 — Restriction Engine

Implement restriction data model:

```text
AppRestriction
 ├── appPackage
 ├── restrictionType
 └── enabled
```

Implement:

* Instagram restrictions
* Chrome restrictions
* Expand/collapse
* Selection state

**Output:** Step 2 generates real restriction configuration.

---

## PHASE 8 — Android Protection Layer

Implement protection manager.

Possible components:

* AccessibilityService where appropriate
* VpnService where applicable
* Foreground service where required
* App-state monitoring
* Restriction evaluation

**Output:** Selected protection rules can be evaluated against real device state.

---

## PHASE 9 — Blocking Experience

Implement:

```text
Protected action
→ Detection
→ Restriction check
→ Block
→ FocusLock overlay/screen
```

Include:

* Protected app name
* Restriction name
* Remaining time
* Shield visual

**Output:** Real blocking flow.

---

## PHASE 10 — Lock Creation

Implement Start a Lock screen:

* Duration selection
* Start time
* End time
* Session preview
* Validation
* Lock confirmation

**Output:** User can create a valid lock session.

---

## PHASE 11 — Lock Engine + Persistence

Implement Room database.

Implement:

* Lock creation
* ACTIVE state
* COMPLETED state
* Recovery after restart
* Absolute timestamp calculations

**Output:** Lock survives app restart.

---

## PHASE 12 — Active Lock

Implement exact Figma Active Lock screen.

Functional:

* Real countdown
* Protected apps
* Progress
* Percentage
* Remaining duration
* Completion detection

**Output:** Complete active-lock experience.

---

## PHASE 13 — History + Insights + Statistics

Implement:

### History

Completed sessions.

### Insights

* Protected time
* Completed sessions
* Streak
* Weekly stats

**Output:** User progress becomes persistent and measurable.

---

## PHASE 14 — Permissions, Reliability & Security

Test:

* Accessibility permission
* VPN permission
* Background behavior
* App restart
* Device reboot
* Lock persistence
* Notification behavior
* Permission removal
* Battery optimization scenarios
* Failure recovery

Also make sure restrictions fail safely rather than silently claiming protection when the required Android capability is unavailable.

**Output:** Production-quality protection layer.

---

## PHASE 15 — Final QA + Figma Pixel Match + Release Build

Final checklist:

### UI

* Every screen compared with Figma.
* Typography.
* Spacing.
* Colors.
* Icons.
* Card dimensions.
* Navigation.
* Scroll behavior.

### Functional

* Create lock.
* Select apps.
* Configure restrictions.
* Start lock.
* Countdown.
* Blocking.
* Restart recovery.
* Lock completion.
* History.
* Insights.

### Final

* Remove debug logs.
* Handle crashes.
* Handle missing permissions.
* Test multiple Android versions.
* Generate signed release build.

**Output: Production-ready Android APK/AAB.**

---

# 22. Absolute Build Rule for Anti Gravity IDE

Is project ko **parallel mein phases develop nahi karna hai.**

Strict sequence:

```text
PHASE 1
  ↓
PHASE 2
  ↓
PHASE 3
  ↓
PHASE 4
  ↓
...
  ↓
PHASE 15
```

**Phase N complete + tested hone ke baad hi Phase N+1 start hoga.**

Har phase ke end par IDE ko report karna hoga:

```text
PHASE: X
STATUS: COMPLETE / BLOCKED
IMPLEMENTED:
TESTED:
KNOWN LIMITATIONS:
NEXT PHASE:
```

Agar phase fail ho:

> **STOP. Do not continue to the next phase until the current phase is fixed.**

---

# 23. Most Important Technical Constraint

Anti Gravity ko **fake implementation nahi karni hai**.

Particularly:

* “Instagram account permanently blocked” ko fake UI se simulate nahi karna.
* “Chrome Incognito 100% impossible” claim nahi karna.
* Android restrictions ko bypass karne ke liye unsupported/private APIs use nahi karne.
* Accessibility/VPN/device-management capabilities ko actual Android permission model ke according implement karna.

Android ka `VpnService` network traffic ko virtual interface ke through process kar sakta hai, while device-policy/LockTask capabilities have specific device-owner/admin constraints. ([Android Developers][2])

**Goal:** jo protection technically enforce ho sakti hai, usko genuinely enforce karo; jo Android limitation ki wajah se guaranteed nahi ho sakti, usko clearly handle karo.

---

## 24. Definition of Done

Project tab complete maana jayega jab:

**UI**

> Figma design accurately reproduced.

**Core**

> User apps select kar sakta hai → restrictions configure kar sakta hai → duration choose kar sakta hai → lock start kar sakta hai.

**Protection**

> Active lock ke dauran supported restrictions genuinely enforce hoti hain.

**Persistence**

> App restart ke baad active lock recover hota hai.

**Timer**

> Absolute end timestamp ke basis par accurate countdown.

**Completion**

> Timer expire hone par lock automatically complete hota hai.

**Analytics**

> Completed sessions aur protected time correctly record hote hain.

**Reliability**

> Missing permissions/failures ko gracefully handle kiya jata hai.

**No fake security**

> App sirf wahi protection claim karta hai jo Android device par actually enforce kar sakta hai.

---

### Anti Gravity ke liye one-line master instruction

> **“Build FocusLock exactly according to the supplied Figma UI and this PRD, using Kotlin + Jetpack Compose, and execute Phase 1 through Phase 15 strictly sequentially; never skip, merge, or start a later phase until the current phase is implemented, tested, verified, and marked COMPLETE.”**

[1]: https://developer.android.com/reference/android/accessibilityservice/package-summary.html?utm_source=chatgpt.com "android.accessibilityservice  |  API reference  |  Android Developers"
[2]: https://developer.android.com/reference/android/net/VpnService?utm_source=chatgpt.com "VpnService  |  API reference  |  Android Developers"
[3]: https://developer.android.com/develop/background-work/services/fgs?utm_source=chatgpt.com "Foreground services overview  |  Background work  |  Android Developers"
[4]: https://developer.android.com/reference/android/app/admin/DevicePolicyManager?utm_source=chatgpt.com "DevicePolicyManager  |  API reference  |  Android Developers"
