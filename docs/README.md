# Documentation — Part 1: System Design

Deliverables for **Scenario D — The Unified Document Viewer**. All documents are in
Markdown and render on GitHub, including the Mermaid diagrams.

| # | Document | What it covers |
|---|---|---|
| 1 | [System Design](01-system-design.md) | Architecture diagram, component roles, data flow, technology justifications, observability strategy, **GenAI usage in the design phase**, limitations |
| 2 | [Sequence Diagrams](02-sequence-diagrams.md) | Startup, happy path, degraded upstream, validation, client disconnect, autocomplete, cache |
| 3 | [Module Complexity Analysis](03-module-complexity-analysis.md) | Time and space complexity for every module, end-to-end cost, complexity-motivated improvements |
| 4 | [API Contract](04-api-contract.md) | REST + NDJSON contract, request/response examples, error model, fault injection |
| 5 | [AI Collaboration Narrative](05-ai-collaboration.md) | Strategy for directing AI, verification process, what it caught, lessons learned |
| 6 | [Setup Guide](06-setup-guide.md) | How to run every process, test scenarios, direct API testing |

## At a glance

```
Browser (React, :5555) ──NDJSON stream──► Aggregation API (:4444)
                                              │  Promise.all (parallel)
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                   Sales mock (:4445, SQLite)     Service mock (:4446, SQLite)
```

- **Requirement 1 — Unified search:** single VIN input with Trie-based autocomplete.
- **Requirement 2 — Data aggregation:** the service calls both upstreams **in parallel**,
  each with its own 3 s timeout, and streams **one frame per source** as it answers.
- **Requirement 3 — Aggregated view:** a consolidated, source-badged table.

Verified against the running system — see the [Setup Guide](06-setup-guide.md) for the
tested scenarios and the [System Design](01-system-design.md#11-known-limitations--next-steps)
for what is not yet done (tests, metrics, structured logging).
