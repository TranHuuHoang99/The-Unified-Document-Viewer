# AI Collaboration Narrative

This document describes the strategy used to direct AI assistance on the Unified
Document Viewer, the process for verifying its output, and how the delivered quality
was ensured. It is the companion to **§10 of the System Design**, which covers the
design phase specifically; this one covers the whole build.

---

## 1. Guiding principle

> **Treat the AI as a fast, confident, occasionally-wrong peer engineer — and own every
> line that ships.**

Three commitments followed from that:

1. **Context before questions.** Every non-trivial prompt includes the scenario brief,
   the relevant files (or the exact contract), and the constraint (layer, language,
   dependency budget). Requests are scoped ("review `_fetchSource` for failure modes"),
   not open-ended ("build me a backend").
2. **The AI proposes; the repository decides.** Any suggestion is accepted only after
   it is checked against the code that already exists — imports, types, runtime
   versions, and how the rest of the module behaves.
3. **Decisions are mine.** Architecture (streaming per-source NDJSON, fan-out with
   per-source timeout, source adapters) was chosen from the brief; the AI was used to
   stress-test it and to accelerate execution, not to hand it to me.

---

## 2. Where AI was used, and how the output was verified

### 2.1 Architecture & design (full detail in System Design §10)

| Area | Use | Verification |
|---|---|---|
| Aggregation strategy | Compare wait-all vs stream-per-source; list failure modes | Traced each mode through `_fetchSource` → frame → controller → hook |
| Contract design | `IUnifiedDocument` + `details` bag | Both adapters + both raw interfaces checked against the fixtures |
| Autocomplete data structure | Trie vs binary search vs linear scan | Complexity checked by hand (see complexity doc §3) |
| DB seeding | Infer schema from JSON instead of hand-written columns | Ran `npm run db:generate`, inspected the generated schema |

### 2.2 Implementation

AI-assisted work concentrated on **structure and boilerplate**: the layered
folder structure, client singletons, adapter functions, the NDJSON stream reader,
the `VinTrie`, and the per-source state hook. Business rules — VIN validation,
per-source error isolation, the cache semantics, sort order — were specified by hand
and reviewed line by line.

### 2.3 Documentation

The Markdown in `docs/` and the Mermaid diagrams were drafted with AI and then
**verified component by component** against the source. Anything the diagrams claimed
that the code does not do was corrected or moved to a "limitations" section — see
the findings in §4.

---

## 3. Verification process

### 3.1 Grounding checklist (applied to every AI-generated chunk)

- [ ] **Does it compile?** (`tsc` / `vite build`) — TypeScript strict, `noUncheckedIndexedAccess`,
      `exactOptionalPropertyTypes` are on in the backend, so sloppy generated types show up quickly.
- [ ] **Does it cross a layer boundary?** E.g. does a controller map a raw upstream field?
      If yes, it belongs in an adapter.
- [ ] **Does it leak source-specific knowledge outside `document.adapters.ts`?**
- [ ] **Does one source's failure fail the whole request?** It must not.
- [ ] **Is there an `any`?** (one remains in `suggestion.service.ts` for the `/vin`
      envelope — flagged for typing.)
- [ ] **Does it match the actual runtime?** e.g. `AbortSignal.timeout` needs Node ≥ 17.3;
      native `fetch` needs Node ≥ 18. Checked the target environment before accepting.

### 3.2 Behavioural verification, not inspection

Design claims were verified by running the system:

- **Happy path:** both mocks up, search a shared VIN (`gen_data.py` ensures 80 % of VINs
  exist in both systems) → two tables.
- **Source-specific VINs:** sales-only and service-only VINs → one table + one "No documents" section.
- **Degraded path:** `SERVICE_LATENCY_MS=5000` (> 3 s timeout) → Service error frame,
  Sales table unaffected. Verified by timing the `curl` request: it completed at
  ~3.09 s. This is also how the wrong error label (§4 item 6) was found — inspection
  alone would have missed it.
- **Invalid input:** `curl` with a 16-char VIN, a VIN containing `O`, and no VIN at all → 400 each.
- **Wrong Accept header:** → 406.
- **Autocomplete:** type a prefix, confirm the dropdown, click through.### 3.3 Manual tracing of all async paths

Because the AI reproduces the *shape* of an async solution very fluently, every async
path was read line by line: the `Promise.all` around `_fetchSource`, the one
`AbortController` per search in the hook, the read loop in `api.ts`, the debounce timer
in `SearchSuggestionComp`.

---

## 4. What verification actually caught

These were found by reviewing AI-generated code against the requirements — they are the
strongest evidence that the verification loop was real, not ceremonial:

| # | Issue | How it was caught | Fix / decision |
|---|---|---|---|
| 1 | **`Promise.all` would fail the whole request when one upstream fails** — the "obvious" implementation makes a partial outage a total outage | Reading the brief's "make parallel requests to two mocked APIs" against the failure requirement | `_fetchSource` catches every upstream error and **resolves** with an `error` frame |
| 2 | **Waiting for both sources before responding** hid the fast source behind the slow one | Tracing the UX during a simulated 5 s Service latency | NDJSON streaming: one frame per source, written on completion |
| 3 | **Schema drift** in the fixture→SQLite conversion (`customer_name` / `event_date` mismatches) | Generated column list disagreed with the fixtures | `inferColumns` — derive columns from the rows themselves |
| 4 | **`/vin` endpoints return `{vin}` objects, not strings** — the initial suggestion code treated them as strings | Checked the mock server code, not the AI's summary | `SuggestionService` reads `item.vin` |
| 5 | **Stale frames can overwrite fresh results** when a user changes VIN quickly | Reading the hook's effect lifetime | Abort the previous `AbortController` on VIN change; effects ignore frames when aborted |
| 6 | **Abort semantics** — the intended distinction of "timed out" vs "unreachable" does not work on Node ≥ 18 | Live test with `SERVICE_LATENCY_MS=5000`: response completed at **3.09 s** (deadline enforced ✔) but the frame read `SERVICE system is unreachable` | **Partial:** the timeout bound works, the label does not. `fetch` rejects with `TypeError('fetch failed')` wrapping an `AbortError`; the code checks `error.name` on the wrapper. Recorded as limitation #8; fix is to inspect `error.cause` / `signal.aborted`. |
| 7 | **TTL cache could hide an outage** if consulted before the fetch | Reviewing the cache placement | Cache is checked **after** a successful fetch (documented trade-off, with the latency win listed as a follow-up) |
| 8 | **Client disconnect** left the server writing to a closed response | Reviewing the controller's async body | `res.on('close')`, `writableEnded` guards, `res.off` in `finally` |

Items 1–5 are architectural or integration-level defects — the kind AI generates most
often and the kind tests and reading catch best.

---

## 5. Guardrails that kept the codebase coherent

1. **One contract per side.** `backend/src/interfaces/document.interface.ts` and
   `frontend/src/types/document.types.ts` mirror each other; the VIN regex is identical
   in the middleware and the frontend. AI suggestions that introduced a new shape were
   rejected or reconciled with the contract.
2. **Layering is enforced by imports.** The adapter is the only module importing both raw
   shapes; the controller only sees the service. Any generated code that imports a raw
   type into a controller was moved or deleted.
3. **Config is centralised.** No generated code may read `process.env` outside
   `env.config.ts`.
4. **No new dependencies without justification.** The plan mentioned Axios and Kafka;
   both were dropped because native `fetch` and the streaming requirement cover the
   needs. The final `package.json` has three runtime dependencies.
5. **The "why" lives next to the code.** Sparse, purposeful comments mark *non-obvious
   decisions* (why NDJSON, why cache-after-fetch, why one signal per source) — the
   places where a future reader (or a future AI session) is most likely to "simplify"
   the design back into a bug.

---

## 6. Honest assessment of AI strengths and weaknesses on this task

**Where it added real value**
- Enumerating failure modes and edge cases far more completely than a first pass would.
- Boilerplate speed: client wrappers, stream reader, Trie, layout scaffolding.
- Turning decisions into clear prose and diagrams once the decisions were made.

**Where it needed the most correction**
- Defaulting to the "textbook" fan-out (wait for all) that contradicts the UX
  requirement.
- Over-claiming during documentation — describing the intended behaviour rather than
  the implemented one (the cache ordering is the clearest example).
- Ignoring runtime reality (payload shapes of the upstream `/vin` endpoints,
  `AbortError` wrapping in Node's `fetch`).

**Current gaps in verification**
- There is no automated test suite yet. Behaviour is verified manually per §3.2.
  The `npm test` script is wired (`tsx --test`), and unit + integration tests are the
  top item in the "next steps" (§11 of the System Design).

---

## 7. What I learned

1. **Specify the failure behaviour, then ask for the happy path.** Prompts that name
   the failure requirement ("one upstream must not be able to break the other") produce
   fundamentally different designs.
2. **AI-written docs must be read against the code.** A generated diagram that looks
   plausible is the easiest artifact to accept without checking — and it will be
   the most visible error in the submission.
3. **Use the AI to invert assumptions.** The most useful question was not "how do I
   build this?" but "what is wrong with this plan?".
4. **Keep the design small enough to explain.** Every added concept (event bus, cache
   layer, DI container) has to be defensible in a 10-minute walkthrough; rejecting
   complexity early is easier than removing it later.
