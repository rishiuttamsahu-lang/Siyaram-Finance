# Siyaram Mitra Mandal — Website + Bot Full Audit
### (Hinglish, non-coder ke liye simple language me)

Maine dono zip (website ka Next.js code, aur bot ka Cloudflare Worker code) line-by-line padha hai — seasonService, buildingService, memberService, expenseService, contributionService (website side) aur poora index.js (bot side). Neeche 3 sections hain:

1. **Sabse bada root cause** — mismatch kyu ho raha hai
2. **Confirmed Bugs** — jo maine khud code me dekhe
3. **Full Feature List** — jo cheeze already ban chuki hain

---

## 1️⃣ ROOT CAUSE — Mismatch kyu hota hai

Tumhara shak sahi hai. Do wajah hai:

### A) Website aur Bot **do alag jagah se total nikalte hain**

- **Website ka Dashboard** → seedha Firestore se live totals calculate karta hai (members ka payment + flats ka payment + other contributions − expenses)
- **Bot ka Dashboard/Summary command** → **Google Sheet** se total nikalta hai, code me literally comment hai:
  ```
  // NOTE: Single source of truth = Google Sheet.
  ```

Matlab agar kabhi Sheet aur Firestore ka write thoda bhi out-of-sync ho jaye (network fail, ya kisi ne Sheet manually edit kar diya), toh dono jagah ka number alag dikhega — aur website/bot ko pata bhi nahi chalega.

### B) Ek hi data **4 alag jagah save hota hai** (buildings/flats ke liye)

Jab koi flat payment bot se aata hai, wo yeh sab jagah likhta hai:
1. `chanda_seasons/{season}/buildings/.../flats` (naya, season-wise — website yahi padhta hai)
2. `buildings/...` (purana/legacy path)
3. `building_chanda/{flatId}` (aur bhi purana path)
4. Google Sheet row

Agar in 4 me se koi ek write beech me fail ho jaye (bot me sab try/catch me chhupa diya gaya hai, error sirf console me log hota hai, user ko pata nahi chalta), toh 4 jagah ka data alag-alag ho jaata hai. **Yehi tumhara "Firestore vs website vs bot mismatch" ka sabse bada source hai.**

### C) "Archive/Delete" do jagah do tarike se hota hai

- **Website** — expense/contribution "delete" karne pe sirf `isCancelled: true` flag lagata hai (soft-delete), record delete nahi hota. Website ka total calculate karte waqt cancelled cheezein **nahi ginta**.
- **Bot** — jab bot se `undo` karte ho, wo record **hard-delete** kar deta hai Firestore se, aur ek `trash_bin` collection me daal deta hai.
- **Bot ka Sync Check (`9` command)** cancelled/active kuch bhi check nahi karta — jo bhi `expenses_log` me pada hai sab gin leta hai.

**Result:** Agar tumne website se koi expense "delete" (archive) kiya, bot ka sync-check usko abhi bhi count karega → mismatch dikhega, jabki actually data sahi hai, bas checker adhoora hai.

---

## 2️⃣ CONFIRMED BUGS (code me khud dekhe)

### 🔴 Bug 1 — Bot ka Sync-Check bahut adhoora hai
Bot me command `9` (Data Sync Check) sirf **expense ka total** check karta hai — wo bhi sirf Sheet vs Firestore expense count. Ye **income/chanda, member payments, building/flat data, member overrides** — kuch bhi check nahi karta. Isliye tumhe asli mismatch kabhi dikhta hi nahi is check se.

### 🔴 Bug 2 — Building/Flat data 3 jagah duplicate, silently out-of-sync ho sakta hai
`syncFlatToBuildingsHierarchy` function season-scoped path + legacy `buildings` + `building_chanda` — teeno jagah likhta hai, alag-alag try/catch me. Ek fail ho aur baaki safal ho jaaye, toh koi warning nahi milegi.

### 🔴 Bug 3 — Naya season banao toh bhi legacy member data corrupt ho sakta hai
Website ka `memberService.ts` (`addMemberToSeason`, `updateMemberInSeason`) **hamesha** legacy `mandal_members` collection ko bhi update karta hai — chahe season 2026-27 (naya) ho ya 2025-26 (purana). Bot me iske liye check hai (`isLegacy` flag — sirf purane season ke liye legacy sync karta hai), lekin **website me ye check missing hai**. Isse naye season ka data purane season ke member record me leak/overwrite ho sakta hai.

### 🔴 Bug 4 — Expense "Undo" galat entry delete kar sakta hai
Bot ka undo function (`rollbackFirebaseSide`) expense dhoondhta hai sirf **naam + amount** match karke — date/time ka strict check nahi. Agar tumne "Tape 100" do baar alag din likha hai, undo kabhi bhi in dono me se pehla match wala delete kar sakta hai, jo galat entry bhi ho sakti hai.

### 🟡 Bug 5 — GEMINI_API_KEY set hai, lekin bot use hi nahi karta
`secrets_list.json` aur `wrangler.toml` me Gemini AI key configured hai, lekin `index.js` me kahi bhi Gemini API call nahi hai. Parsing pura regex-based hai (jo mostly achha kaam kar raha hai, lekin agar tumne socha tha ki AI Hinglish samajh raha hai — actually wo simple pattern-matching hai).

### 🟡 Bug 6 — Flat-payment aur Member-payment alag formula use karte hain
Jab payment "member" (naam se match) hota hai, uska due/waterfall calculation season ke `monthly_dues`, `member_overrides`, `locked` months sab consider karta hai. Lekin jab payment "flat" (wing+room se) match hota hai, wo seedha `paidChanda += amount` kar deta hai — **koi due-calculation, override, ya lock-check nahi hota** flats ke liye. Matlab flats ka "expected ₹500" hardcoded hai aur kabhi Admin Panel se update nahi hota flat-level payments me.

### 🟡 Bug 7 — Flat ka expected amount hardcoded ₹500
`buildingService.ts` aur bot dono me `expectedChanda = 500` fix hai. Agar tum kal flat ka target ₹500 se ₹700 karna chaho Admin Panel se, wo change kahi bhi reflect nahi hoga — hardcode hai.

### 🟢 Achi baat — kuch cheezein already fix ho chuki hain
Purane audit.txt (jo tumhare hi project me mila) me likha tha ki bot monthly target **hardcoded ₹100/₹200** use karta tha. **Ye ab fix ho chuka hai** — bot ab Firestore ke `monthly_dues` se target padhta hai, sirf schedule na milne par ₹100/₹200 fallback use karta hai. Season lock, member override, blocked-months — sab bhi ab bot me implement ho chuke hain (pehle nahi the).

---

## 3️⃣ MISMATCH-CHECKER BUTTON — Plan

Tumne jo button manga hai (site pe click karo, pata chale kaha mismatch hai) — uske liye maine architecture samajh liya hai. Ye button banega as ek **naya Admin Panel section**, jo:

1. Website ke live Firestore data se totals nikalega (jo already Dashboard use karta hai)
2. Google Sheet ka data bhi fetch karega (bot ke Sheet se, ek chhota API call se)
3. `building_chanda` (legacy) vs `chanda_seasons/.../buildings` (naya) — dono flats compare karega
4. `mandal_members` (legacy) vs `chanda_seasons/.../members` (naya) — dono compare karega
5. Ek clear list dikhayega: "Yaha-yaha ye farak hai" — flat number, member naam, expected amount vs actual

Isko banane ke liye mujhe pehle confirm karna hoga ki:
- Google Sheet ko website se seedha read karne ki permission/API set up hai ya nahi (abhi sirf bot ke paas hai)
- Ya phir hum simpler version banaye: sirf Firestore ke andar ke 2 collections compare kare (legacy vs season), jisme koi extra API access nahi chahiye

**Agla step:** Bolo konsa version chahiye — (a) sirf Firestore-internal mismatch checker (jaldi bana sakta hu, koi naya secret/API nahi chahiye), ya (b) full Sheet+Firestore checker (thoda zyada setup chahiye, Sheet API access website ko dena padega).

---

## 4️⃣ FULL FEATURE LIST (Hinglish, jo already bana hua hai)

### 🌐 Website (Next.js + Firebase)

**Login/Auth**
- Google Sign-In (redirect based)
- Banned user ke liye alag "Banned" page
- Viewer role vs Admin role — alag dashboard

**Public/Viewer Side**
- Welcome/intro screen
- Viewer Home — general festival info
- Viewer Dashboard — simplified public view
- Gallery — photos/videos slideshow, swipe/keyboard navigation, share button
- Upload Section — apni photo/video upload karna
- User Profile — apna profile edit, apni uploaded media manage (bulk delete/lock)

**Admin Panel (sabse bada module)**
- **Season Manager**
  - Naya season create karna (start/end date, naam, receipt prefix)
  - Season activate/close/archive
  - Season delete (poore subcollections ke saath)
  - Season clone (purana season copy karke naya banana — overrides/buildings/residents copy karne ka option)
  - Duplicate season auto-cleanup
- **Monthly Dues (Chanda target) management**
  - Har month ka target amount set/edit karna
  - Bulk update (ek saath sab months update)
  - Custom month add karna (extra collection month)
  - Month lock/unlock (locked month me payment nahi liya jaata)
  - Bulk lock/unlock
- **Global Month Blocking** — pura mandal ke liye kisi month ko block karna
- **Member Overrides** — kisi specific member/flat ke liye alag amount ya exemption set karna
- **Member Management**
  - Add/update member
  - Member archive (soft-remove) aur restore
  - Exempt months per member
  - Honorary member flag
- **Building Manager**
  - Building/Wing/Flat create-edit-delete (cascade delete)
  - Bulk-generate flats (standard 48-flat structure: A/B/B2 wings)
  - Clone buildings from previous season
  - Migrate legacy `buildings` data into season-scoped structure
  - Import legacy `building_chanda` records into season structure
  - Wing-wise collection metrics (kitna collect hua, kitna pending)
- **Audit Log** — season se related har action (create/edit/lock/override) ka log
- **Backup System** — Firestore ka manual backup lena, restore karna (scripts folder me bhi CLI scripts hain)
- **Contribute/Chanda entry** (admin side se bhi direct entry)
  - Donor list, amount edit, donor delete/group-delete
- **Data Sync Check button** — abhi missing hai, tum yehi maang rahe ho ✅

**Dashboard (Main)**
- Live collection totals (members + flats + other contributions − expenses)
- Wing-wise, floor-wise flat breakdown
- Month-wise payment tracking per member (kaun sa month paid/pending/locked/exempt)
- Pending dues list
- Expected vs Collected vs Deficit vs Advance calculation

### 🤖 Bot (Cloudflare Worker — Telegram + WhatsApp)

**Data Entry (natural language, regex-based parsing)**
- Member cash entry: `Rishi 100`
- Member online entry: `Rishi 100 O`
- Flat cash/online entry: `Rohit A 101 100`
- Expense entry: `Tape -100` ya `Tape 100 kharcha`
- Online wallet direct add/minus: `100 O` / `-100 O`
- Multi-line entry (ek message me multiple transactions)

**Commands**
1. Full Summary Dashboard (Sheet-based)
2. Expenses list (paginated)
3. Income/Chanda list (paginated)
4. Undo last entry
5. Excel/Sheet link
6. Redo deleted entry
7. Online wallet total
8. Pending dues list
9. Data Sync Check (abhi sirf expense count check karta hai)

**Backend logic**
- Google Sheets read/write/append/delete (via Service Account JWT auth)
- Firestore read/write (custom REST-based client, Firebase SDK use nahi karta)
- Season-aware due calculation (monthly_dues, overrides, locked months, blocked months)
- Waterfall payment allocation (jo paisa aata hai wo automatically sabse purane unpaid month me chala jaata hai)
- Transaction ledger (audit trail, REVERTED/ACTIVE status)
- Trash bin (undo/redo ke liye)
- Telegram + WhatsApp dono se same logic handle
- Study Hub gateway (ek alag unrelated integration — FYCS Study Hub ke liye upload-notification webhook, isi bot me chala gaya hai)

---

## Next Steps (tumhare decision ke liye)

1. **Mismatch-checker button** — Firestore-only version chahiye ya Sheet+Firestore dono wala? (Firestore-only jaldi ban jayega)
2. **Building/Member dual-storage fix** — chahte ho main legacy paths hata kar sirf season-scoped path use karu? (Bada change hai, testing chahiye hoga)
3. Priority order batao — pehle konsa bug fix karna hai: sync-checker button, ya building data-duplication, ya expense-undo ka precision fix?
