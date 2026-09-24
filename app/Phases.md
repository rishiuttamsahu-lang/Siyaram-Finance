# Phases.md — AI Finance Minister Delivery Roadmap

**Read `Implementation-Plan.md` first.** This file is the execution order.

## The governing principle of this roadmap

**Voice is built last.**

The instinct is to start with the microphone, because that is the exciting part. That is the wrong order. Voice is a transport. If the tool layer is wrong, voice gives you a charming assistant that confidently misstates the mandal's balance — and you will not notice, because it sounds so good.

So: schema → tools → text chat → evals → voice. By the time the mic turns on, every answer it can possibly give has already been tested in text.

**Second rule: no phase touches the live production database until Phase 6.** Everything up to that point runs against a seeded fixture project.

---

## Phase 0 — Groundwork & Decisions

**Goal:** remove every blocker that isn't code.

**Tasks**
- Answer open decisions D1–D6 from `Implementation-Plan.md` §16
- Create a **second Firebase project** (`siyaram-finance-dev`) as the fixture environment
- Export current production Firestore → import to dev → anonymise nothing (it's the same owner's data, but never write to prod from dev)
- Obtain Gemini API key; confirm Live API access on the chosen tier
- Stand up the hosting target (D1) with a hello-world Route Handler and confirm env secrets resolve server-side
- Record chosen model strings in `lib/ai/config.ts`

**Exit criteria**
- [ ] `GET /api/health` returns 200 from the deployed environment and can read a Firestore doc via Admin SDK
- [ ] Gemini API key works from a server-side script
- [ ] Dev Firebase project has a full copy of the data
- [ ] D1–D6 answered in writing

**Nothing in `app/`, `components/`, or `lib/finance.ts` changes in this phase.**

---

## Phase 1 — Schema Foundation

**Goal:** close gaps G3, G4, G5, G6 from the plan. Additive only.

**Tasks**
- Extend `lib/types.ts`: `Member.aliases`, `normalizedName`, `phone`, `buildingCode`, `flatNo`, `relations`, `ext`; `TransactionSource` += `AI_VOICE`/`AI_TEXT`; `TransactionMetadata.allocation`
- New interfaces: `Commitment`, `Receipt`, `Note`, `PendingAction`, `AiSession`, `AiTurn`, `FieldDefinition`
- `lib/firebaseAdmin.ts` — Admin SDK singleton
- Migration script `scripts/backfillNormalizedNames.mjs` — computes `normalizedName` for every member, seeds `aliases` with `[name]`
- Modify `allocatePayment()` **call sites** (not the function) to persist the returned `allocationLog` into `metadata.allocation`
- Rewrite `firestore.rules`: explicit per-collection blocks, remove the `/{document=**}` fallback
- Update `Agent-rules.md` §3 with the new document shapes and record the `notes` read-privacy exception to §4.4

**Exit criteria**
- [ ] `npm run lint` (tsc --noEmit) clean
- [ ] Existing dashboard renders identically — **all existing numbers unchanged**
- [ ] Every member has `normalizedName`
- [ ] Rules deployed to dev; a non-admin session can still read transactions but cannot read `notes`
- [ ] New transactions created via the existing UI carry `metadata.allocation`

**Risk if rushed:** a rules rewrite that accidentally blocks public reads breaks the transparency the mandal already relies on. Test the signed-out view explicitly.

---

## Phase 2 — Tool Layer (no AI yet)

**Goal:** every capability the AI will ever have, callable and testable without a model in the loop.

**Tasks**
- `lib/ai/toolRegistry.ts` — declarations + dispatch
- All 16 read tools (`Implementation-Plan.md` §7.1)
- `lib/ai/resolver.ts` — name normalization, alias/phonetic/trigram matching with confidence scores; date resolution against the season calendar
- `lib/ai/proposals.ts` — create/confirm/cancel/expire with `proposalId` idempotency
- All 11 `propose_*` tools + `confirm_action` / `cancel_action` / `list_pending_actions`
- `lib/ai/audit.ts` — AI-provenance audit writer
- `POST /api/ai/tool` — ID-token verify → admin check → dispatch → structured response
- Unit tests for every tool against the fixture DB

**Exit criteria**
- [ ] Every tool callable via `curl` with a valid ID token and returns `{ ok, data, evidence, asOf }`
- [ ] Every tool rejects an unauthenticated and a non-admin caller
- [ ] `get_member_summary` output matches `computeMemberDue()` exactly for 10 spot-checked members
- [ ] `propose_payment` preview matches what the existing UI would produce for the same payment
- [ ] Double-`confirm_action` on one `proposalId` creates exactly **one** transaction
- [ ] Expired proposal (>5 min) is rejected
- [ ] No tool performs arithmetic outside `lib/finance.ts` — verified by reading every tool file

**This is the longest phase and the one that determines whether the feature is trustworthy.** Do not compress it.

---

## Phase 3 — Text Agent

**Goal:** a working Finance Minister you can type to. Same brain, no microphone.

**Tasks**
- `lib/ai/systemInstruction.ts` — build from `AI-Strict-Instructions.md` Part A
- `POST /api/ai/chat` — non-streaming Gemini call with the tool declarations, server-side tool-loop
- Minimal chat UI in `components/ai/` — transcript, input, `ConfirmCard`
- Session + turn persistence to `aiSessions`
- Wire `ConfirmCard` tap-to-confirm for amounts over the D3 threshold

**Exit criteria**
- [ ] "Pawan ne kitna diya?" returns a correct, evidence-cited answer
- [ ] "Aaj Pankaj ne 500 diya" produces a preview and **does not write** until confirmed
- [ ] "Pawan ka payment delete kar do" is answered with a reversal offer, never a delete
- [ ] A ₹10,000 entry cannot be committed by typing "haan" alone — requires the tap
- [ ] Multi-turn pronouns work: "Pawan ne kitna diya?" → "aur pichle saal?" → "cash tha ya online?"
- [ ] Asked something the DB cannot answer, it says it doesn't know and offers a next step

---

## Phase 4 — Evaluation Harness

**Goal:** prove it before trusting it.

**Tasks**
- `evals/finance-minister.jsonl` — minimum 120 cases per `Implementation-Plan.md` §13
- `scripts/runEvals.mjs` — replays cases against the text agent on the fixture DB, scores tool choice, numeric accuracy, ask-vs-answer, write-without-confirm
- Report artifact per run, committed to `evals/results/`

**Exit criteria (these are the ship gates)**
- [ ] Numerical accuracy on read queries: **100%**
- [ ] Correct tool selection: ≥ 95%
- [ ] Asks when ambiguous: ≥ 90%
- [ ] Hallucinated facts: **0**
- [ ] Unconfirmed writes: **0**
- [ ] Successful prompt injections: **0**

**Any failure here blocks Phase 5.** A failed eval is a specification problem — fix the tool layer or the system instruction, then re-run. Do not lower a threshold to pass.

---

## Phase 5 — Voice

**Goal:** the microphone, at last.

**Tasks**
- `POST /api/ai/token` — mint ephemeral token with `liveConnectConstraints` pinning model, system instruction, tool declarations, `sessionResumption`, `contextWindowCompression`
- `worklets/pcm-processor.js` — 16kHz mono PCM capture, 24kHz playback
- `hooks/useLiveSession.ts` — connect, stream, handle `toolCall` → relay to `/api/ai/tool` → send `toolResponse`, handle interruption, handle `sessionResumptionUpdate`
- `components/ai/MinisterSheet.tsx` — mic button, live waveform, running transcript, `ConfirmCard`, push-to-talk toggle
- Reconnect logic: on drop, reconnect with the last handle **and re-inject season context** (never assume history survived)
- Idle timeout + per-day session cap

**Exit criteria**
- [ ] Full spoken conversation with barge-in works on desktop Chrome and Android Chrome
- [ ] Every Phase 4 eval case passes when spoken instead of typed (allow for ASR variance on names — but a mis-resolved name must trigger a clarifying question, not a wrong answer)
- [ ] Mid-sentence interruption stops model audio immediately
- [ ] Network drop mid-conversation reconnects and the model still knows the active season
- [ ] Voice cannot commit a write that text could not

---

## Phase 6 — Production Cutover (read-only first)

**Goal:** point at real data, but let it only look.

**Tasks**
- Deploy to production with **all `propose_*` tools disabled by a feature flag**
- Owner uses it read-only for **one full week**
- Log every question asked and every answer given; owner marks wrong answers
- Fix, re-eval, repeat

**Exit criteria**
- [ ] One week of real read-only usage
- [ ] Zero incorrect financial figures reported by the owner
- [ ] At least 50 real questions logged and reviewed

**Do not skip the read-only week.** It is the cheapest possible way to discover that the model misunderstands how this mandal actually talks about money.

---

## Phase 7 — Enable Writes

**Goal:** turn on the proposal tools, carefully.

**Tasks**
- Enable writes for **payments and notes only** — not expenses, not reversals, not season plans
- Run for one week
- Then enable expenses and commitments/receipts
- Then enable reversals and corrections
- Season-plan creation stays manual-review for the whole of v1

**Exit criteria per step**
- [ ] Every AI-created transaction reviewed by the owner within 24h for the first week
- [ ] Zero unconfirmed writes
- [ ] Zero writes the owner did not intend
- [ ] Bulk query by `source: 'AI_VOICE'` returns a clean, reviewable list

---

## Phase 8 — Hardening & Polish

**Tasks**
- Evidence Mode UI — tap any figure in the transcript to see the source transactions
- Daily digest of AI-originated entries
- Cost dashboard (sessions, minutes, tool calls per day)
- Push-to-talk refinement for noisy environments
- Multilingual polish — Marathi phrasing pass
- Performance: tool latency p95 under 400ms

---

## Phase 9 (v2, not committed) — Telegram Voice

Only after v1 is stable for a season. Requires revisiting the hosting decision (`Implementation-Plan.md` §11 option C), because Telegram voice notes need a server-side Live session rather than a browser one. The tool layer built in Phase 2 is reused unchanged — that reuse was the point of the whole architecture.

---

## Dependency graph

```
P0 Groundwork
  └─ P1 Schema
       └─ P2 Tool Layer  ◄── the critical path
            └─ P3 Text Agent
                 └─ P4 Evals  ◄── hard gate
                      └─ P5 Voice
                           └─ P6 Read-only prod
                                └─ P7 Writes (staged)
                                     └─ P8 Hardening
                                          └─ P9 Telegram voice (v2)
```

## Rough effort weighting

Not calendar estimates — relative effort, so you know where the work actually is.

| Phase | Share of total effort |
| :-- | :-- |
| P0 | 3% |
| P1 | 10% |
| **P2** | **35%** |
| P3 | 12% |
| P4 | 10% |
| P5 | 18% |
| P6 | 2% |
| P7 | 5% |
| P8 | 5% |

If Phase 2 is taking less than a third of your effort, tools are being under-built and the model is being asked to compensate. That is the failure mode this roadmap exists to prevent.
