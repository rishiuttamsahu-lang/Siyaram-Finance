# 🔍 SEO Implementation Plan — Siyaram Finance Portal

> **Project:** `siyaram-portal` (Next.js 16 App Router · React 19 · Tailwind 4 · Firebase Firestore)
> **Purpose of this doc:** Codebase ke actual current state ke hisaab se SEO ka roadmap — kya missing hai, kya karna hai, kis order me, aur kahan trade-off hai wahan options.
> **Audience:** Rishikesh + koi bhi AI coding agent jo is repo pe kaam kare.

---

## 0. Pehle ye samajh lo: is project ke liye "SEO" ka matlab kya hai

Ye ek **finance ledger** hai, blog ya e-commerce site nahi. Isliye generic "keyword stuffing" wala SEO yahan galat hai. Real goals ye hain:

| # | Goal | Kyun zaroori |
| :-- | :-- | :-- |
| 1 | **Brand discoverability** — "Siyaram Mitra Mandal" search karne pe portal mile | Community ke log Google karte hain, link dhundhte hain |
| 2 | **Shareable links jo achhe dikhein** — WhatsApp / Telegram pe link paste ho toh proper preview card aaye | Mandal ke saare log WhatsApp/Telegram pe hain, ye sabse bada real-world SEO win hai |
| 3 | **Fast + accessible** — Core Web Vitals, mobile-first | Field volunteers slow mobile network pe hote hain |
| 4 | **Transparency ka signal** — public read-only ledger ko crawlers samajh sakein | `Product-explanation.md` me "public transparency" stated goal hai |

**Non-goals (jaan-boojhke nahi kar rahe):**
- Har individual donor / member / flat ka page index karna (privacy issue, neeche §9 dekho).
- Admin panel ko index karna.
- Competitive keywords pe rank karne ki koshish.

---

## 1. Current State Audit (Repo me actual kya hai)

Ye sab code padhke nikala gaya hai, assumption nahi.

### ✅ Jo already theek hai
- `app/layout.tsx` me basic `metadata` (title + description) hai.
- `viewport` export hai aur `themeColor` set hai.
- `<html lang="en">` set hai.
- Google Fonts ke liye `preconnect` hai.
- `appleWebApp` config hai (PWA-ish feel).

### ❌ Jo missing hai / problem hai

| # | Issue | Evidence (file) | Severity |
| :-- | :-- | :-- | :-- |
| 1 | **Poora page client-rendered hai.** Crawler ko sirf skeleton milta hai, real content nahi | `app/page.tsx` line 1 = `'use client'`; saare tabs `dynamic(..., { ssr: false })` | 🔴 Critical |
| 2 | **Data sirf Firestore realtime listener se aata hai (browser me).** Server HTML me koi ledger data nahi | `subscribeTo*()` in `lib/firestoreService.ts`, `Home()` ke `useEffect` me | 🔴 Critical |
| 3 | **Tabs ka koi alag indexable URL nahi.** Sab `/?tab=xyz` hai, aur `/[tab]` sirf client-side redirect karta hai | `app/[tab]/page.tsx` (`router.replace`) | 🟠 High |
| 4 | **`robots.txt` nahi hai** | `public/` folder hi exist nahi karta | 🟠 High |
| 5 | **`sitemap.xml` nahi hai** | — | 🟠 High |
| 6 | **Open Graph / Twitter card metadata nahi hai** → WhatsApp preview ugly/blank | `layout.tsx` ke `metadata` me sirf title+description | 🟠 High |
| 7 | **`metadataBase` set nahi hai** → OG image URLs resolve nahi honge | `layout.tsx` | 🟠 High |
| 8 | **Favicon / app icons / `manifest` nahi hain** | `public/` missing, `app/icon.*` missing | 🟡 Medium |
| 9 | **`maximumScale: 1, userScalable: false`** → Lighthouse accessibility fail, pinch-zoom band | `layout.tsx` `viewport` | 🟡 Medium |
| 10 | **Canonical URL nahi hai.** `/?tab=members` aur `/?tab=income` duplicate lag sakte hain | — | 🟡 Medium |
| 11 | **Structured data (JSON-LD) nahi hai** | — | 🟢 Low-Med |
| 12 | **Default `<title>` har tab pe same rehta hai** | `layout.tsx` static metadata | 🟡 Medium |
| 13 | **`next.config.*` nahi hai** → koi headers/redirects/image config nahi | repo root | 🟡 Medium |
| 14 | **Fonts `<link>` se load ho rahe hain, `next/font` se nahi** → CLS/perf hit | `layout.tsx` `<head>` | 🟡 Medium |
| 15 | **Deployment domain repo me kahin defined nahi** | grep me koi prod URL nahi mila | ⚠️ Blocker for canonical/sitemap |

---

## 2. ⚠️ Sabse Bada Decision: Rendering Strategy

Root cause #1 aur #2 ek hi hain: **crawler ko real content kaise dikhaye?**
Yahan genuinely 3 raaste hain, aur sahi choice tumhare priorities pe depend karti hai. Main ek recommend karunga par teeno de raha hoon.

### Option A — "Marketing Shell" (Recommended ✅)

Ek **public static landing/about content** banao jo server-rendered ho (Server Component), aur ledger dashboard client-side hi rahe.

- `/` ya `/about` = server-rendered page: Mandal ka naam, kya hai ye portal, transparency ka pitch, kaise use karein, Telegram bot ke baare me, festival info.
- `/dashboard` (ya current `/?tab=`) = jaisa abhi hai, `noindex` ya indexable-but-thin.
- **Financial numbers server HTML me NAHI aayenge.**

| Pros | Cons |
| :-- | :-- |
| Financial invariants (`Agent-rules.md` §1) bilkul safe — koi naya calc path nahi | Live ₹ numbers Google me nahi dikhenge |
| Minimal risk, chhota change | Ek naya page maintain karna padega |
| Brand search + WhatsApp preview dono solve | |
| Firestore rules / public-read policy pe koi asar nahi | |

### Option B — Server-side snapshot of summary numbers

Server Component me Firestore se **sirf aggregate summary** (Total Balance, Season name) fetch karke initial HTML me daalo, phir client hydrate ho.

| Pros | Cons |
| :-- | :-- |
| Crawler + link-preview dono ko real numbers dikhte hain | Server pe Firestore read chahiye (Admin SDK ya REST) |
| Perceived load speed better (no "0" flash) | **`Agent-rules.md` §1.5 risk:** business logic ek shared module me rehna chahiye. Server-side me `calculateMandalTotals` reuse karna padega, re-implement nahi |
| | Caching/revalidation strategy chahiye warna stale numbers |
| | Financial data pe caching = galat number ka risk |

### Option C — Full SSR/ISR of every tab

Har tab ko server component bana do, Firestore server-side fetch, alag route per tab (`/members`, `/buildings`, `/income`, `/expense`).

| Pros | Cons |
| :-- | :-- |
| Maximum SEO surface | **Sabse bada refactor** — `app/page.tsx` ~900 lines ka client monolith hai |
| Clean URLs per tab | Realtime `onSnapshot` model toot jaata hai / duplicate karna padta hai |
| | Personal donor names public index ho jaate hain → **privacy risk** |
| | Financial-invariant regression ka sabse zyada khatra |

> **Meri recommendation: Option A abhi, Option B baad me (optional).**
> Kyunki is project ka SEO goal "brand + shareable link" hai, "ledger content ranking" nahi. Option C ka cost/risk is goal ke hisaab se justify nahi hota.

**👉 Baaki poora doc Option A maanke likha hai.** Agar tum B ya C chunte ho toh §5 aur §6 badlenge, batana.

---

## 3. Phase-wise Implementation Roadmap

```
Phase 1  Foundations        → domain, metadataBase, robots, sitemap, icons        (1–2 hr)
Phase 2  Metadata & Sharing → OG/Twitter cards, per-tab titles, canonical         (2–3 hr)
Phase 3  Content Shell      → server-rendered /about page + JSON-LD               (3–4 hr)
Phase 4  Performance & A11y → next/font, viewport fix, image/CLS, headers         (2–3 hr)
Phase 5  Monitoring         → Search Console, Lighthouse CI, verification         (1 hr)
```

Order important hai — Phase 1 ke bina baaki ke URLs resolve nahi honge.

---

## 4. Phase 1 — Foundations

### 4.1 Production domain decide karo (⚠️ Blocker)

Repo me koi prod URL nahi mila. Kuch bhi karne se pehle ek env variable set karo:

**`.env.local`** (aur hosting dashboard me bhi):
```bash
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN-HERE
```

Options:
| Option | Example | Note |
| :-- | :-- | :-- |
| Vercel default | `https://siyaram-finance.vercel.app` | Free, turant, par brand-y nahi |
| Custom domain | `https://siyaram-mandal.in` | Best for brand search, paisa lagta hai |
| Firebase Hosting | `https://<project>.web.app` | Agar wahan deploy hai |

> Jo bhi chuno, **ek hi canonical domain** rakho. `www` aur non-`www` dono live hon toh ek ko redirect karo.

### 4.2 Central site config banao

**Naya file: `lib/siteConfig.ts`**
```ts
export const siteConfig = {
  name: 'Siyaram Mandal',
  fullName: 'Siyaram Mitra Mandal — Financial Portal',
  description:
    'Siyaram Mitra Mandal ka real-time, transparent financial ledger — member contributions, building collections, chanda aur expenses, Ganesh Utsav ke liye.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  locale: 'en_IN',
  themeColor: '#f5f8f6',
  keywords: [
    'Siyaram Mitra Mandal',
    'Siyaram Mandal',
    'Ganesh Utsav',
    'Ganpati Mandal',
    'Mandal financial ledger',
    'Bhiwandi',
  ],
} as const;
```

Ye ek jagah rakhne ka fayda: title, OG, sitemap, JSON-LD sab ek source se aayenge (DRY).

### 4.3 `robots.ts` (App Router native)

**Naya file: `app/robots.ts`**
```ts
import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about'],
        // Admin aur redirect-helper routes crawl mat karo
        disallow: ['/?tab=admin', '/admin', '/api/'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
```

> ⚠️ **Important:** `robots.txt` security nahi hai. Ye sirf crawlers ko request hai. Admin ki asli security **Firestore rules + `isAdmin()` check** hai (`firestore.rules`), jaisa `Agent-rules.md` §4.3 me likha hai. `robots.txt` pe security ke liye depend mat karna.

### 4.4 `sitemap.ts`

**Naya file: `app/sitemap.ts`**
```ts
import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteConfig.url}/`,      lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${siteConfig.url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
```

Sirf wahi URLs daalo jo sach me indexable hain. `/?tab=…` variants sitemap me **mat** daalo (duplicate-content noise).

### 4.5 Icons & manifest

Ye files `app/` me drop karo (Next.js auto-detect karta hai):

```
app/
├── favicon.ico            # 48x48 multi-size
├── icon.png               # 512x512 (ya icon.svg)
├── apple-icon.png         # 180x180
├── opengraph-image.png    # 1200x630  ← WhatsApp preview ke liye (Phase 2)
└── manifest.ts            # PWA manifest
```

**`app/manifest.ts`**
```ts
import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.fullName,
    short_name: 'Siyaram Finance',
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: siteConfig.themeColor,
    theme_color: siteConfig.themeColor,
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

> Design tip: `docs/design-references/` me jo UI aesthetic hai (emerald + white glass), icon bhi wahi palette follow kare — `#10b981` / `#059669`. 🕉️ ya Ganpati motif consider karo.

---

## 5. Phase 2 — Metadata & Social Sharing

### 5.1 `layout.tsx` ka metadata upgrade

**Current:**
```ts
export const metadata: Metadata = {
  title: "Siyaram Mandal — Financial Portal",
  description: "Siyaram Mitra Mandal Real-time Financial Ledger & Operations System",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Siyaram Finance" },
};
```

**Replace with:**
```ts
import type { Metadata, Viewport } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.fullName,
    template: `%s | ${siteConfig.name}`,   // child pages: "About | Siyaram Mandal"
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: 'Siyaram Mitra Mandal' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.fullName,
    description: siteConfig.description,
    // opengraph-image.png file convention se auto-attach hota hai
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.fullName,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Siyaram Finance',
  },
  formatDetection: { telephone: false },
};
```

### 5.2 Open Graph image (WhatsApp/Telegram preview) — sabse visible win

Teen options:

| Option | Kaise | Kab chuno |
| :-- | :-- | :-- |
| **A. Static PNG** | `app/opengraph-image.png` (1200×630) drop karo | Simplest, recommended start |
| **B. Dynamic via `ImageResponse`** | `app/opengraph-image.tsx` | Season name/year auto-update chahiye |
| **C. Per-page custom** | Har route ke folder me apna image | Baad me, jab more pages hon |

**Option B ka example** (season year dynamic, financial numbers **nahi**):
```tsx
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const alt = 'Siyaram Mitra Mandal — Financial Portal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg,#f5f8f6 0%,#d1fae5 100%)',
          color: '#0f172a', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 700 }}>Siyaram Mitra Mandal</div>
        <div style={{ fontSize: 40, color: '#059669', marginTop: 16 }}>
          Transparent Financial Ledger · Ganesh Utsav
        </div>
      </div>
    ),
    size,
  );
}
```

> ❗ **OG image me live ₹ balance mat daalo.** Wo stale ho jayega aur WhatsApp cache ise din-hafton tak rakhta hai. Galat financial number share hona is project me worst outcome hai (`Agent-rules.md` ka poora spirit yehi hai).

### 5.3 Per-tab titles (ek problem: tabs client state hain)

Abhi sab tabs ek hi `<title>` dikhate hain. Yahan bhi options hain:

**Option 1 — Client-side `document.title` (sabse chhota change)**

`app/page.tsx` ke andar, `activeTab` change pe:
```tsx
const TAB_TITLES: Record<TabType, string> = {
  members:   'Members & Dues',
  buildings: 'Building Collections',
  income:    'Chanda & Income',
  expense:   'Expenses',
  admin:     'Admin',
};

useEffect(() => {
  document.title = `${TAB_TITLES[activeTab]} | Siyaram Mandal`;
}, [activeTab]);
```
✅ Zero risk, browser tab/history me useful.
⚠️ Google isse reliably nahi padhta (client-side). Ye UX fix hai, SEO fix nahi.

**Option 2 — Real routes per tab** (`/members`, `/buildings`, …)
Ye Option C rendering strategy ka hissa hai. Abhi recommend nahi.

**Option 3 — Query-param based `generateMetadata`**
`searchParams` se server-side title. Par `page.tsx` `'use client'` hai, toh pehle ek thin server wrapper banana padega.

> **Recommendation:** Option 1 abhi. Real SEO value `/about` page se aayegi (Phase 3).

### 5.4 Canonical strategy for `?tab=`

Kyunki `/?tab=members` aur `/?tab=income` same page ke variants hain:
- Root layout me `alternates.canonical = '/'` already sab ko `/` pe point karta hai (§5.1).
- `/?tab=admin` ko `robots` me disallow kiya hai (§4.3).
- Aur **`app/[tab]/page.tsx`** ko `noindex` do:

```tsx
// app/[tab]/page.tsx — top pe add karo
// NOTE: file 'use client' hai, isliye metadata export nahi ho sakta.
// Fix: layout.tsx banao is folder me:
```

**Naya file: `app/[tab]/layout.tsx`**
```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: true },   // redirect-helper route hai, index mat karo
};

export default function TabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

---

## 6. Phase 3 — Server-Rendered Content Shell (`/about`)

Ye Option A ka core hai. Ek **Server Component** page jo crawler ko real text deta hai.

### 6.1 Route

**Naya file: `app/about/page.tsx`** (⚠️ `'use client'` **mat** likhna)

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'About the Portal',
  description:
    'Siyaram Mitra Mandal ka financial portal kya hai, kaise kaam karta hai, aur community ke liye transparency kyun zaroori hai.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Siyaram Mitra Mandal — Financial Portal
        </h1>
        <p className="mt-2 text-slate-600">
          Ganesh Utsav ke chanda, member contributions aur kharche ka real-time,
          public aur transparent hisaab.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">Ye portal kya karta hai</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700">
          <li>Members ke monthly contributions aur pending dues track karta hai.</li>
          <li>Building / wing / flat wise door-to-door collection dikhata hai.</li>
          <li>General chanda aur expenses ka full ledger rakhta hai.</li>
          <li>Har entry ka audit trail hota hai — kuch delete nahi hota, sirf reverse hota hai.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Transparency kyun</h2>
        <p className="mt-2 text-slate-700">
          Ledger sabke dekhne ke liye public read-only hai. Sirf authorised admin
          hi entries add ya edit kar sakta hai.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Field collection: Telegram bot</h2>
        <p className="mt-2 text-slate-700">
          Volunteers Telegram bot se seedha shorthand messages bhejkar entry
          karte hain, jo turant portal me reflect hoti hai.
        </p>
      </section>

      <Link
        href="/"
        className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
      >
        Ledger dekhein →
      </Link>
    </main>
  );
}
```

### 6.2 Content rules (SEO copywriting)
- Page pe **ek hi `<h1>`**. (Note: current dashboard me `<h1>` header ke andar button ke bheetar hai — ye accessible/semantic dono se theek nahi, §8.3 dekho.)
- Content **Hinglish + English dono** me rakho, kyunki community ke log dono me search karte hain (e.g., "Siyaram Mandal chanda", "Ganpati mandal hisab").
- **Personal data mat daalo**: koi member ka naam, flat number, donor naam, amount — kuch nahi.
- Internal link `/` (dashboard) se `/about` aur `/about` se `/` — crawl path banta hai.

### 6.3 Dashboard ko `/about` se connect karo
`IOSHeader` ya footer me ek chhota link add karo (`<Link href="/about">`), taaki `/about` orphan page na rahe.

### 6.4 JSON-LD Structured Data

Kaunsa schema? Yahan **honest** rehna zaroori hai. Ye ek registered NGO/Organization nahi ho sakta, toh `Organization` type use karo, `NonprofitOrganization` tab hi jab legally sahi ho.

**Naya file: `components/JsonLd.tsx`**
```tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
```
> `.replace(/</g, '\\u003c')` XSS-safe escaping hai — JSON-LD me kabhi raw string inject mat karo.

**`app/layout.tsx` ke `<body>` me add karo:**
```tsx
import { JsonLd } from '@/components/JsonLd';
import { siteConfig } from '@/lib/siteConfig';

// body ke andar:
<JsonLd
  data={{
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteConfig.url}/#org`,
        name: 'Siyaram Mitra Mandal',
        url: siteConfig.url,
        areaServed: 'Bhiwandi, Maharashtra, IN',
        description: siteConfig.description,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        inLanguage: 'en-IN',
        publisher: { '@id': `${siteConfig.url}/#org` },
      },
    ],
  }}
/>
```

**Jo schema use NAHI karna:**
- `Product`, `Review`, `AggregateRating`, `FAQPage` (bina real FAQ ke) — fake rich-result markup Google penalize karta hai.
- `Person` schema members ke liye — privacy.

---

## 7. Phase 4 — Performance & Accessibility (SEO ke ranking factors)

### 7.1 `viewport` fix (accessibility + Lighthouse)

**Current (`layout.tsx`):**
```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,       // ❌
  userScalable: false,   // ❌
  viewportFit: "cover",
  themeColor: "#f5f8f6",
};
```

**Problem:** Pinch-zoom band hai. WCAG 1.4.4 fail hota hai, Lighthouse "Viewport zoom disabled" flag karta hai, aur low-vision users (jaise mandal ke bade-buzurg jo dashboard dekhte hain) zoom nahi kar paate.

**Options:**

| Option | Change | Trade-off |
| :-- | :-- | :-- |
| **A. Fully fix (Recommended)** | `maximumScale` aur `userScalable` dono hata do | Accessibility ✅. iOS Safari input-focus pe auto-zoom ho sakta hai agar input font-size <16px |
| **B. Partial** | `maximumScale: 5`, `userScalable: true` | Zoom chalu, par bounded |
| **C. Rehne do** | — | "App-like" feel same, par a11y/Lighthouse penalty |

Agar Option A/B lo aur iOS input-zoom problem aaye, toh fix ye hai: inputs ka `font-size: 16px` rakho (CSS me), viewport lock mat karo.

### 7.2 Fonts: `<link>` → `next/font`

**Current:** `<head>` me manual Google Fonts `<link>` — render-blocking + layout shift.

**Better:**
```tsx
// app/layout.tsx
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-jakarta',
});

// <html lang="en" className={`min-h-full ${jakarta.variable}`}>
// aur <head> se 3 <link> tags hata do
```
`globals.css` me `font-family` me `var(--font-jakarta)` add karo. Fayda: self-hosted, zero external request, no CLS.

### 7.3 Core Web Vitals — is codebase ke specific risks

| Metric | Risk | Fix |
| :-- | :-- | :-- |
| **LCP** | Poora dashboard client-render hota hai → skeleton → real content. Firestore round-trip ke baad hi LCP element aata hai | Skeletons already hain (achha). `/about` ko lightweight rakho — ye fast LCP dega |
| **CLS** | Fonts swap + skeleton→content height mismatch | `next/font` (§7.2) + skeleton heights real content se match karo |
| **INP** | `page.tsx` me 900 lines ka single component — har `setState` poore tree ko re-render karta hai | Long-term: state ko split/`memo` karo (SEO se zyada UX fix) |
| **TBT/JS size** | `firebase` full SDK (`firebase/auth` + `firestore`) bundle me | Sirf `/about` pe Firebase load mat karo — wo already alag route hai, toh free win |

> ✅ **Achhi baat:** `dynamic(..., { ssr: false })` se tab components lazy-load hote hain, toh initial JS chhota hai. Ye perf ke liye theek hai; SEO ke liye alag `/about` shell isliye zaroori hai.

### 7.4 `next.config.ts` banao (abhi exist nahi karta)

**Naya file: `next.config.ts`**
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Common typo/alias URLs ko real query param pe bhejo (server-side, SEO-friendly)
      { source: '/expenses',  destination: '/?tab=expense',   permanent: true },
      { source: '/kharcha',   destination: '/?tab=expense',   permanent: true },
      { source: '/chanda',    destination: '/?tab=income',    permanent: true },
      { source: '/flats',     destination: '/?tab=buildings', permanent: true },
    ];
  },
};

export default nextConfig;
```

> 💡 Ye redirects `app/[tab]/page.tsx` ke client-side `router.replace` ko **server-side 301** se replace karte hain — crawlers 301 samajhte hain, JS-redirect nahi. Baaki aliases (`expence`, `expences`, `panel`…) ke liye `[tab]/page.tsx` ko fallback rehne do.

---

## 8. Semantic HTML & On-Page Fixes (chhote par important)

### 8.1 Heading hierarchy
Abhi `IOSHeader` me `<h1>Siyaram Mandal</h1>` ek clickable `<button>` ke andar hai. Do problems: (a) heading ke andar interactive element, (b) ye har tab pe same h1 hai.

**Fix (minimal):** `<h1>` ko `<button>` ke **bahar** rakho ya button ko `aria-label` do aur heading semantics alag rakho. Auth-open behaviour same rehna chahiye.

### 8.2 Landmarks
- `<main>` already hai (`page.tsx`) ✅.
- `<header>` already hai ✅.
- `BottomNav` ko `<nav aria-label="Primary">` me wrap karo.

### 8.3 Interactive elements ke labels
Icon-only buttons (`lucide-react` icons) ko `aria-label` do. Screen-reader aur Lighthouse dono ke liye.

### 8.4 `lang` attribute
Content Hinglish hai (Roman script me Hindi). `lang="en"` theek hai; `lang="hi"` mat karo kyunki script Latin hai. `en-IN` bhi option hai:
```tsx
<html lang="en-IN">
```

---

## 9. 🔒 Privacy & Indexing Guardrails (project-specific, non-negotiable)

Is repo me `firestore.rules` **public read** hai (`allow read: if true`) aur `Agent-rules.md` §4.4 kehta hai ye **intentional hai, narrow mat karo**. Iska SEO pe seedha asar hai:

| Rule | Kyun |
| :-- | :-- |
| ❌ Member names, flat numbers, donor names, individual amounts ko server-rendered HTML me mat daalo | Public read = Firestore level pe. Par Google index = permanent, searchable, aur cache hota hai. "Public transparency" aur "Google pe naam searchable" alag cheezein hain |
| ❌ `sitemap` me individual transaction/member URLs mat daalo | Same reason |
| ❌ Admin route index mat karo | Even if gated, URL leak/noise |
| ❌ OG image me live balance mat daalo | Stale/wrong number share hone ka risk |
| ✅ Sirf aggregate/brand/informational content index karo | Community ka naam aur purpose findable ho, individuals nahi |
| ✅ Firestore rules **touch mat karo** SEO ke naam pe | `Agent-rules.md` §4.2, §4.4 |

> Agar future me Option B (server-side numbers) lo, toh sirf **season-level aggregate** (total balance, season name) render karo — kabhi bhi per-person data nahi.

---

## 10. Phase 5 — Verification & Monitoring

### 10.1 Google Search Console
1. Property add karo (Domain ya URL-prefix).
2. Verify karo — sabse aasan: `metadata.verification.google` me token:
   ```ts
   verification: { google: 'YOUR_TOKEN' },
   ```
3. `sitemap.xml` submit karo.
4. `/` aur `/about` ke liye "URL Inspection → Request Indexing".

### 10.2 Testing Checklist

```
□ curl -s https://SITE/robots.txt          → allow/disallow + sitemap line dikhe
□ curl -s https://SITE/sitemap.xml         → sirf / aur /about
□ curl -s https://SITE/about | grep "<h1"  → real <h1> text server HTML me
□ View Source (Ctrl+U) on /about           → content JS ke bina dikhe
□ View Source on /                          → (expected) skeleton — ye Option A me theek hai
□ WhatsApp me link paste                   → title + description + image preview
□ Telegram me link paste                   → same
□ https://search.google.com/test/rich-results → JSON-LD valid
□ Lighthouse (mobile) → SEO ≥ 95, Accessibility ≥ 90, Performance ≥ 80
□ Pinch-zoom kaam kare (viewport fix ke baad)
□ /?tab=admin → robots me disallowed
□ /expense → 301 redirect to /?tab=expense
```

### 10.3 Useful commands
```bash
# Local production build pe test
npm run build && npm run start

# Lighthouse CLI
npx lighthouse http://localhost:3000/about --preset=desktop --view
npx lighthouse http://localhost:3000/about --form-factor=mobile --view

# Type-check (project ka "lint" script yehi hai)
npm run lint
```

### 10.4 OG debuggers (WhatsApp cache clear karne ke liye)
- Facebook Sharing Debugger: `https://developers.facebook.com/tools/debug/` (WhatsApp isi ka cache use karta hai)
- Twitter/X Card Validator
- Naya OG image deploy karne ke baad debugger me "Scrape Again" dabao.

---

## 11. Implementation Checklist (copy-paste tracker)

### Phase 1 — Foundations
- [ ] Production domain decide + `NEXT_PUBLIC_SITE_URL` set
- [ ] `lib/siteConfig.ts`
- [ ] `app/robots.ts`
- [ ] `app/sitemap.ts`
- [ ] `app/manifest.ts`
- [ ] `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`

### Phase 2 — Metadata & Sharing
- [ ] `layout.tsx` metadata upgrade (`metadataBase`, OG, Twitter, template)
- [ ] `app/opengraph-image.png` ya `.tsx`
- [ ] Per-tab `document.title` (client-side)
- [ ] `app/[tab]/layout.tsx` → `noindex`

### Phase 3 — Content Shell
- [ ] `app/about/page.tsx` (Server Component)
- [ ] `components/JsonLd.tsx` + Organization/WebSite schema
- [ ] Dashboard se `/about` ka internal link

### Phase 4 — Performance & A11y
- [ ] `viewport` se `maximumScale`/`userScalable` hatao
- [ ] `next/font` migration
- [ ] `next.config.ts` (headers + 301 redirects)
- [ ] `<h1>` / `<nav>` / `aria-label` cleanup

### Phase 5 — Monitoring
- [ ] Search Console verify + sitemap submit
- [ ] Testing checklist (§10.2) pass
- [ ] Lighthouse mobile scores note karo (before/after)

---

## 12. Agent Guardrails (AI coding agents ke liye)

`Agent-rules.md` ke saath ye SEO-specific rules bhi follow karo:

1. **Financial logic ko mat chhuo.** SEO kaam me `lib/finance.ts`, `allocatePayment`, `computeMemberDue`, `calculateMandalTotals` modify nahi hote. Koi server-rendered number chahiye toh **shared module import karo**, reimplement nahi (`Agent-rules.md` §1.5).
2. **`firestore.rules` touch mat karo.** Public-read intentional hai (§4.4). SEO ke naam pe rules narrow ya loosen mat karo.
3. **Koi delete/destructive write nahi** (§1.1) — SEO kaam ka isse koi lena-dena nahi, par sitemap/redirect cleanup me galti se data-layer pe kuch mat karo.
4. **Personal data server HTML me nahi.** Member/donor/flat data kabhi bhi server-rendered ya JSON-LD me mat daalo (§9 above).
5. **Secrets check.** `lib/firebase.ts` me Firebase web config client-side hai — ye normal hai (web API keys secret nahi hote, security rules se protect hoti hain). Par Telegram token / Google service account / Gemini key **kabhi** `NEXT_PUBLIC_*` env me mat daalo (`Agent-rules.md` §4.1).
6. **Mobile-first, design tokens follow karo** (`Agent-rules.md` §5). `/about` page me bhi emerald/slate palette, `₹` Indian grouping (agar kahin amount aaye).
7. **Docs sync rakho.** SEO change ke baad `README.md` ke "Repository Structure" section me naye files (`robots.ts`, `sitemap.ts`, `about/`, `lib/siteConfig.ts`) add karo (`Agent-rules.md` §6.3).

---

## 13. Open Questions (tumse confirm chahiye)

Ye cheezein repo se pata nahi chalti, aur inka jawab plan badal sakta hai:

1. **Production domain kya hai / hoga?** (Vercel default, custom domain, ya Firebase Hosting?) → §4.1 blocked hai iske bina.
2. **Rendering strategy:** Option A (marketing shell), B (server-side aggregate), ya C (full SSR)? → §2. Meri recommendation A.
3. **Kya ledger publicly Google pe indexable hona chahiye, ya sirf link-share (WhatsApp) hi goal hai?** Agar sirf link-share, toh dashboard `noindex` kar sakte hain aur `/about` ko hi index rakhen.
4. **Viewport zoom:** Full fix (A) ya partial (B)? → §7.1.
5. **Logo / icon assets** — koi existing Mandal logo hai jo favicon/OG me use ho sake?
6. **Legal status:** Mandal registered hai (trust/society)? Agar haan toh `NonprofitOrganization` schema use kar sakte hain; warna `Organization`.

---

## 14. Quick Reference — Files to Add / Modify

| Action | Path | Phase |
| :-- | :-- | :-- |
| ➕ Add | `lib/siteConfig.ts` | 1 |
| ➕ Add | `app/robots.ts` | 1 |
| ➕ Add | `app/sitemap.ts` | 1 |
| ➕ Add | `app/manifest.ts` | 1 |
| ➕ Add | `app/favicon.ico`, `icon.png`, `apple-icon.png` | 1 |
| ✏️ Modify | `app/layout.tsx` (metadata, viewport, font, JSON-LD) | 2, 4 |
| ➕ Add | `app/opengraph-image.png` / `.tsx` | 2 |
| ➕ Add | `app/[tab]/layout.tsx` | 2 |
| ✏️ Modify | `app/page.tsx` (`document.title` effect) | 2 |
| ➕ Add | `app/about/page.tsx` | 3 |
| ➕ Add | `components/JsonLd.tsx` | 3 |
| ✏️ Modify | `components/iOSHeader.tsx` (h1 semantics, `/about` link) | 3, 4 |
| ✏️ Modify | `components/BottomNav.tsx` (`<nav>`, aria-labels) | 4 |
| ➕ Add | `next.config.ts` | 4 |
| ✏️ Modify | `README.md` (structure section) | 5 |

---

*Document Version: 1.0.0 · Basis: static analysis of `Siyaram-Finance-main` repo · Rendering strategy assumed: Option A (Marketing Shell)*
