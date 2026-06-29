# StockPulse — YC Framework & Architecture

> An autonomous AI analyst team for your whole portfolio that finds the money your brokers can't see.
> Status: pre-build research / architecture. Owner: Aidan Kamdar. Last updated: 2026-06-27.

This document is grounded in two multi-agent research sweeps (feasibility/market/regulation/architecture + agentic-development/agentic-application). Every non-obvious claim below was verified against primary sources (Plaid/SnapTrade docs, SEC/FINRA, YC RFS, Vercel docs, Anthropic engineering). Citations live in the research transcripts.

---

## 0. TL;DR — the recommendation

**Build StockPulse as a genuinely agentic, read-only "AI analyst team" whose monetizable wedge is cross-broker tax & wash-sale intelligence, fronted by a free viral "Portfolio X-Ray" card, with a gated, licensed path to actually *acting* (tax-loss harvesting / rebalancing) as the venture-scale expansion.**

Three decisions, made:

| Decision | Call | Why |
|---|---|---|
| **Read-only vs. trade** | **Read-only v1.** Execution is a gated, post-validation tier. | Robinhood execution is impossible for anyone (no API). Read-only keeps you outside RIA registration. Execution = RIA + legal + SnapTrade review — a later milestone, not the wedge. |
| **Target user** | **Active, multi-broker "prosumer" retail investors** (3+ accounts, frequent trades). | They have a *real, quantified* tax/wash-sale problem and proven willingness-to-pay. Avoids the commoditized passive-consumer space. |
| **The "AI insights" framing** | **Agents that *do the work*, not a chatbot/dashboard.** | YC's 2025–26 thesis is explicitly "AI-native, sell the service." A multi-agent runtime with audit trails maps directly to Garry Tan's *AI-Native Hedge Funds* RFS. |

**Why this beats the naive "connect Robinhood, get AI insights" idea:** a tool that just narrates your trades is, per our adversarial review, "a feature with an LLM copywriter bolted on" — weak willingness-to-pay, no moat, and the AI isn't really doing anything. Anchoring on **tax** (a category people already pay for), making the **AI agents genuinely do the analytical work**, and keeping a **clear licensed path to acting** turns a feature into a company.

---

## 1. Feasibility verdict (the linchpin you asked about)

**Can a user "sign in with Robinhood" via Plaid and have you analyze it? Yes — read-only, and free to build.**

- **Plaid Investments reads Robinhood** over OAuth: holdings, positions, cost basis, **24 months of transactions**, dividends, options, securities metadata. **Read-only — Plaid has zero trade execution anywhere.**
- **Free to build & demo:** Plaid **Sandbox** (unlimited fake data) + the free **Trial plan** (10 *real* connected accounts, Investments included, auto-approved for most devs since Apr 2026). Enough for a full demo + early pilot with no payment and no sales call.
- **Use SnapTrade as the primary connector:** instant self-serve free key, reads Robinhood over OAuth, SOC 2 Type II, official SDKs + an MCP server, first 5 connected users free (~$2/user/mo after). Cleaner DX than Plaid for a solo/agentic build.
- **Three-tier connection fallback (so the demo never dies):** SnapTrade → Plaid → **manual CSV import** of the user's own Robinhood export.

**The hard limit to internalize:** **nobody can place equity trades on Robinhood programmatically** — Robinhood exposes no third-party trading API (only its own crypto API). SnapTrade *can* execute trades, but on **other** brokers (Schwab, Fidelity, E\*TRADE, Webull, Wealthsimple, Tradier, Alpaca…). So:
- Read-only analysis of Robinhood → ✅ feasible, free, low regulatory burden.
- Automated trading on Robinhood → ❌ impossible via any vendor.
- Trade execution → possible on *other* brokers via SnapTrade (RIA + compliance review required), or by using **Alpaca** as the broker.

> Aggregators evaluated: SnapTrade (best for solo dev; only one with self-serve trading), Plaid (best free read tier), and Yodlee / MX / Finicity / Akoya (enterprise sales, no public pricing — skip for now).

---

## 2. The product

### 2.1 The wedge (free, viral): "Portfolio X-Ray"
Connect your accounts (read-only). In under 2 minutes, an AI agent team produces two things no single broker can:
1. **Tax & wash-sale exposure** — your true cross-broker realized short- vs. long-term gains, plus the loss dollars *silently disallowed by wash sales across accounts* that your siloed 1099s structurally cannot catch.
2. **Behavior gap** — how much your buying/selling helped or hurt you vs. buy-and-hold, decomposed into named, evidence-backed patterns (sold winners early, overtrading drag, panic-sell/FOMO timing), each tied to the exact trades.

Output is a **shareable card** (the zero-CAC acquisition loop) **and** the entry point into the product.

### 2.2 The paid product (retention): your standing AI analyst team
The same agents keep working *continuously*, not as a one-shot report:
- **Year-round tax meter** — live realized-gain + wash-sale tracking so February's 1099 is never a surprise (the proven-WTP anchor).
- **Autonomous monitoring** — agents watch positions/prices and surface only material changes.
- **Risk & concentration digests**, **per-holding research digests**, and a **behavioral coach** that nudges at the moment of a panic move.

### 2.3 The vision (venture-scale, gated): the conflict-free AI wealth manager
Once trust + data + a license are in place, StockPulse **acts**: cross-broker tax-loss harvesting, asset-location optimization, and rebalancing executed via SnapTrade — the optimization walled-garden brokerages (PFOF conflict, single-account visibility) and $3–10k/yr human RIAs structurally can't deliver to the mass-affluent. This is the "AI does the work" endgame and the multi-trillion-dollar TAM story.

---

## 3. Why this is fundable (YC mapping)

- **AI-native, sells the service.** YC's central 2025–26 thesis: "AI has stopped being a feature and started being the foundation… skip the human and do the work." StockPulse's runtime *is* a team of agents doing analysis, not a copilot.
- **On an explicit YC RFS.** Garry Tan's Spring-2026 *AI-Native Hedge Funds* RFS demands exactly our architecture: agent research swarms, **explainability (evidence chain + contributing signals + confidence), audit logs, human override.** Dalton Caldwell's Fintech 2.0 + the AI-Native *Services* RFS name **tax/accounting/audit** directly.
- **Proven willingness-to-pay + quantified ROI.** Tax is a paid category; poor multi-account tax handling costs up to ~2%/yr. Comp: **Astor** (YC S25, AI investment advisor) ~4,000 paying users at $15/mo, $5M seed.
- **A real why-now.** Retail is ~25% of US volume but 56%+ lack confidence; multi-broker is now normal; aggregation (SnapTrade/Plaid) only recently became solo-dev-affordable; LLMs can now reliably normalize messy broker ledgers — the ugly middleware that made this uneconomical before.
- **A crisp <2-min magic moment** (connect → X-Ray) and a **zero-CAC viral loop** the paid-advisor comps lack.

---

## 4. Competitive white space & moat

**Commoditized (do NOT build a business on these):** AI digests/chatbots over holdings, no-code strategy builders, copy-trading, net-worth aggregation, health/diversification scores, direct-indexing+TLH-within-one-product, zero commissions. These are free/sub-$15 features inside Robinhood Cortex, Public, Magnifi, SoFi/Composer.

**The durable white space we target:** a **conflict-free, cross-account, tax-aware optimizer that can eventually ACT** — because:
- brokerages have a revenue conflict (PFOF + in-house products) and only see their own walls;
- aggregators (Kubera) are read-only and unlicensed;
- RIAs (Range, $2,950–9,950/yr) need humans and can't scale to the mass-affluent.

**Moat (built over time, not on day 1):**
1. **The broker-by-broker transaction-normalization + corporate-actions + cross-account lot-matching engine** — notoriously messy, accuracy-critical, compounding with every connection/edge case.
2. A **longitudinal cross-institution household financial graph** (every lot, basis, account type) no single broker can replicate.
3. **Execution rails + an RIA license to act** (the thing competitors lack) plus a **regulator-ready audit/explainability layer** that can become the trust standard.

> Honest caveat from the pre-mortem: v1's behavioral detectors and the data rails are *not* themselves a moat — they're replicable in a weekend. The moat is in the tax-engine accuracy, the acting tier, the data graph, and brand/trust. Treat v1 as a wedge, not the defensibility.

---

## 5. Regulatory framework (the design constraint)

The line that governs the entire product, per the Investment Advisers Act of 1940:

- **SAFE (no RIA registration):** *impersonal, generally-available, retrospective/descriptive* analysis of the user's **own past trades and tax facts**. Letting a user link a portfolio to *filter generally-available content* is protected (publisher's exclusion — *Lowe v. SEC*; the 2024 *Seeking Alpha* dismissal). Descriptive tax/wash-sale **reporting** is bookkeeping, not securities advice.
- **TRIGGERS RIA registration:** (a) advice tailored to the individual's goals/risk; (b) **personalized forward buy/sell/rebalance recommendations**; (c) **discretion or automated execution**. → Form ADV, fiduciary duty, compliance program, designated CCO. Register state-level first (low/no AUM) or via the SEC Internet Adviser Exemption.
- **Disclaimers do NOT cure unregistered-adviser status** — substance over form. They support framing; they are not a shield.
- **AI-washing is independently enforced** (SEC 2024: Delphia $225k, Global Predictions $175k). Make only honest AI claims: "AI narrates a deterministic analysis," never "AI predicts winners."
- **Data security (GLBA):** pulling brokerage data makes you a GLBA financial institution under the FTC Safeguards Rule. Use SOC 2 Type II aggregators over OAuth (never touch credentials, read-only scopes), publish a privacy notice + one-click deletion, encrypt at rest/in transit (field-level for the ledger + tokens), pursue your own SOC 2 as you scale.

**Practical posture:** v1 stays strictly descriptive/retrospective (no RIA needed). **Get a written registration-status legal opinion BEFORE adding any forward-looking advice or the acting tier.** That sequencing is the whole game.

---

## 6. The agentic APPLICATION architecture (the product runtime)

**Shape: a tiered, mostly-single-agent-per-task system with a thin multi-agent orchestration layer — deliberately NOT a swarm.** (Anthropic's data: orchestrator-worker multi-agent beats single-agent ~90% on breadth-first research but burns ~15× tokens and *hurts* on shared-state work — which most portfolio reasoning is. Fan out only for genuinely parallel work, e.g. one research subagent per holding.)

**Built on the Vercel agent stack:** AI SDK 6 `ToolLoopAgent` per agent role · **AI Gateway** as the single model endpoint (tiered routing, provider fallback, per-tier budget caps → HTTP 402) · **Workflow DevKit** (`use workflow`/`use step`, `sleep`, `createWebhook`/`waitForEvent`, `DurableAgent`) for durable/pausable/approval-gated agents · **Vercel Cron** for scheduled autonomy · **MCP + deterministic code-execution** for grounding.

### The agents

| Agent | Role | Trigger | Autonomy | Model |
|---|---|---|---|---|
| **Orchestrator / Planner** | Decomposes goal, dispatches sub-agents with strict contracts, synthesizes | on-demand + event | suggest | **Opus 4.8** (high) |
| **Tax-Optimization** | TLH, lot selection, wash-sale checks — proposals only | weekly Cron + on-demand | suggest | **Opus 4.8** (max — correctness-critical) |
| **Risk / Concentration** | Concentration, drawdown, factor/sector exposure (math in code) | nightly + event | suggest | **Opus 4.8** (high) |
| **Portfolio Analyst / Monitor** | Performance/allocation/P&L narration; watches for material change | nightly Cron + Plaid webhook | read-only | **Sonnet 4.6** (medium) |
| **Research** | RAG over filings/news; cited per-holding summaries (fan-out candidate) | on-demand + pre-market | read-only | **Sonnet 4.6** (low for fan-out) |
| **Behavioral Coach** | Nudges vs. panic-sell/chasing; informational, non-advice | event + on-demand | read-only | **Haiku 4.5 / Sonnet 4.6** |
| **Monitoring / Triage** | Cheap high-volume event classification + routing | webhooks + polls | read-only | **Haiku 4.5** (low) |
| **Trading** *(later, gated)* | Drafts orders; never auto-executes | on-demand + event | **act-with-approval** | **Opus 4.8** (max) |
| **Evaluator / Critic** | Scores user-actionable output vs. rubric + machine gates before it surfaces | before any actionable output | read-only (can block) | **Sonnet 4.6**, Opus for trade/tax |
| **Compliance / Guardrail** | Numeric cross-check, unlicensed-advice classifier, disclaimers, audit log | every outbound response | autonomous (block/redact only) | **Haiku 4.5** + deterministic rules |

### The safety spine (non-negotiable for fintech)
1. **The LLM NEVER computes or invents a number.** A pure, LLM-free deterministic module produces every figure (performance, P&L, cost basis, wash-sale windows, tax lots, risk metrics). The model only narrates.
2. **Numeric cross-check** on every response: re-extract each number from the narrative, assert byte-equality against the deterministic source; mismatch → block + page.
3. **Grounding via MCP** (Plaid, SnapTrade, market-data, SEC filings) — every number pulled through tools, validated against a structured-output schema (schema failure = retry/escalate, doubles as the AI Gateway quality gate).
4. **Reflection/evaluator pass** before any user-actionable output; **hard human-approval gate** (Workflow `createWebhook`) in front of every state-changing action; **trading agent is propose-only by default.**
5. **Immutable, versioned audit log** (prompt, model+version, retrieved facts, output, blocks/redactions) — this *is* the YC-RFS explainability signal and the compliance backbone.
6. Read-only agents hold **zero** write/transactional tools; SnapTrade execution is the only privileged path and it's gated.

---

## 7. Tech stack → GitHub Student Pack mapping (runs at ~$0)

| Layer | Choice | Pack offer |
|---|---|---|
| Framework + hosting | Next.js (App Router) on **Vercel**, Fluid Compute for long analysis | Vercel |
| Auth + billing | **Clerk** (free Pro: auth, MFA, billing) | Clerk |
| Payments | Stripe (via Clerk Billing) — only at paid-tier launch | Stripe (fees waived on first $1k) |
| Primary DB + audit log | **Neon Postgres** or **MongoDB Atlas** (+ field-level encryption) | Neon (Vercel) / MongoDB Atlas ($50 + free tier) |
| Cache / queue / rate-limit | **Upstash Redis** (price cache, job locks, SnapTrade rate limits) | Upstash (Vercel Marketplace) |
| Brokerage data (primary) | **SnapTrade** (read-only) | external — free first 5 users |
| Brokerage data (fallback) | **Plaid Investments** Trial (10 items) + CSV import | external — Sandbox + Trial free |
| Historical prices | Tiingo / Stooq free tier, cached Upstash→DB | external free |
| Shareable card | `@vercel/og` dynamic PNG with ref code | Vercel |
| AI | **Claude via Vercel AI Gateway** — Haiku 4.5 (triage/normalize) · Sonnet 4.6 (workers) · Opus 4.8 (orchestrator, tax, risk, trade) | AI Gateway + Anthropic |
| Secrets | **Doppler** (keys out of agent context) | Doppler (free Team) |
| Errors + agent traces | **Sentry** (AI traces at 100% on money flows, replay) | Sentry |
| APM + LLM cost/latency | **Datadog Pro** + **New Relic** | Datadog (2yr) / New Relic |
| Product analytics | **SimpleAnalytics** (connect→card→share funnel) | SimpleAnalytics (1yr) |
| E2E (self-healing) | **Playwright 1.56 Test Agents** (Planner/Generator/Healer) | OSS |
| Cross-browser/device E2E | **BrowserStack** + **LambdaTest** | both in pack |
| Email/OTP test automation | **Testmail** (capture verification + 2FA codes) | Testmail |
| Evals + CI gate | DeepEval / Promptfoo (OSS) or Braintrust free tier | OSS / free tier |
| Money-math tests | **fast-check** property-based + 100% branch coverage | OSS |
| Domain | Name.com / **.TECH** free TLD | pack |

---

## 8. The agentic DEVELOPMENT pipeline (build it with agents, to high quality)

Methodology: **"spec is the source of truth, tests are ground truth,"** driven by Claude Code.

- **Phase 0 — Foundation (human sign-off):** author `PRD.md` (use `/prd`), `ARCHITECTURE.md` (fix the non-negotiables above), and `CLAUDE.md` as the loop's constitution — *"the LLM never computes a number," "every money-touching action is propose-only behind a human gate," "a task is DONE only when its CI tests pass."*
- **Phase 1 — Backlog:** convert the PRD into a Ralph-consumable `prd.json` (use `/ralph`) — a dependency-ordered list of *small* tasks, each with **acceptance criteria written as tests** (Tool Correctness, schema validation, numeric cross-check, Playwright E2E). Order it so the **deterministic money-math module + audit log come first, agents last.**
- **Phase 2 — Self-building loop (Ralph):** a stateless runner starts Claude Code fresh each iteration with *only* `CLAUDE.md` + the next un-done task → writes tests first → implements → runs the local gate (`tsc`, eslint, vitest, fast-check, cheap deterministic evals) → commits + opens a PR **only on green**, in an isolated git **worktree**. Success signal is **CI, never the model's self-assessment.** Model tiering via AI Gateway (Opus driver, Sonnet bulk, Haiku mechanical) with per-tier budget caps.
- **Phase 3 — Deterministic core first:** force the LLM-free money-math/ledger module (P&L, cost basis, wash-sale windows, tax-lot selection, risk) with **100% branch + property-based tests** before any agent that narrates numbers.
- **Phase 4 — Agent layer:** build each in-product agent as a `ToolLoopAgent` with a strict contract, gated by its own eval set before wiring into the orchestrator.
- **Human checkpoints (mandatory):** PRD/architecture sign-off; PR review on every merge; a **"money-flow gate"** — any task touching SnapTrade execution, Plaid tokens, or the audit log requires human review *regardless of green tests* (tag `requires-human`; the loop pauses via PushNotification rather than self-merging); weekly backlog re-grooming where every production/eval failure is injected back as a new task.

### Self-testing strategy — six-layer, deterministic-first
1. **Deterministic core** — pure money-math, 100% branch + property tests, golden fixtures; post-generation numeric cross-check blocks any narrated number not in the source.
2. **Agent evals + CI gate** — versioned golden dataset; deterministic metrics (tool correctness, schema, numeric) + calibrated LLM-as-judge (Cohen's kappa vs. ~200 human-labeled traces, versioned rubrics, swap-tests) only for fuzzy dimensions; cheap evals block every PR, full sweep nightly.
3. **Trace/trajectory evals** — score each span so a failure maps to the exact step.
4. **Self-healing E2E** — Playwright 1.56 agents author/repair tests; run on BrowserStack + LambdaTest; **Testmail** captures OTP/verification so auth + money flows are fully automated. Money-flow assertions stay **human-curated** (agent-generated test *volume* alone doesn't improve quality).
5. **Production observability** — Sentry (AI traces 100% on money flows) + Datadog/New Relic (token/cost/latency, anomaly alerts); page on any failed numeric cross-check or guardrail block.
6. **Compliance + audit guardrail gateway** — one centralized layer: numeric cross-check, unlicensed-advice classifier (block/rewrite + unskippable disclaimers), restrict to official data, immutable audit log.

**Close the loop:** every confirmed production failure becomes a new golden-dataset case *and* a new `prd.json` task — observability hardens the backlog monotonically.

---

## 9. Roadmap

- **Weeks 1–2 — Prove the math + connect.** Next.js + Clerk + DB on Vercel; synthetic Robinhood ledger generator; the deterministic core (position reconstruction, buy-and-hold counterfactual, **cross-account wash-sale + tax-lot engine**); SnapTrade/Plaid Sandbox + OAuth connect; price enrichment + cache. Goal: one credible tax + behavior number, end to end.
- **Week 3 — The agent team + magic moment.** Orchestrator + Tax + Behavioral + Monitor agents (AI SDK 6, grounded, schema-validated); the **Portfolio X-Ray** result; `@vercel/og` shareable card with ref code; live SnapTrade Robinhood connection; numeric cross-check + guardrail gateway + audit log; Sentry + SimpleAnalytics with share→signup attribution; disclaimers + privacy notice + deletion.
- **Week 4 — Loop, retention, polish.** Year-round tax meter; risk/research digests via Cron; CSV fallback; reconnect flow; prompt caching; AI Gateway budget caps; premium waitlist; harden the demo account.
- **Pre-application validation (do this before writing the YC app):** ship the thin card NOW and **measure the real share→signup K-factor**; put a paid tax-meter offer in front of users to find **genuine willingness-to-pay.** Two compounding metrics = a company; a static demo = a hobby project.
- **Post-30-day (venture path):** written legal opinion → state RIA / SEC Internet Adviser Exemption → SnapTrade trading review → the **acting tier** (gated TLH / asset-location / rebalancing on non-Robinhood brokers).

---

## 10. Risks & mitigations

- **WTP/virality unproven (company-killer).** Mitigate: validate K-factor + paid tax offer *before* building the full engine; anchor revenue on tax (proven), not retrospection (novelty).
- **Robinhood-via-aggregator breakage.** Mitigate: SnapTrade→Plaid→CSV fallback; sandbox/synthetic demo account; handle re-auth webhooks; respect rate limits.
- **Hallucinated numbers = compliance violations.** Mitigate: deterministic-first + numeric cross-check + audit log (the entire architecture exists for this).
- **Regulatory drift across the IAA line.** Mitigate: strictly descriptive substance enforced in code + prompts; legal opinion before any forward advice or acting tier.
- **Options under-served.** The active traders you target churn options; v1 math is equities-first. Mitigate: be explicit about v1 scope; prioritize options modeling (a genuine ugly-data moat) on the roadmap.
- **Cost blow-up at scale.** Multi-agent fan-out is ~15× tokens; per-user Cron runs add up. Mitigate: single-agent by default, fan-out surgically, Haiku for triage, Batch API for scheduled refresh, AI Gateway budget caps.
- **Free-tier ceilings.** Datadog 10 hosts, BrowserStack 1 parallel, ~1yr offers — keep the deterministic-math/guardrail/audit layers vendor-independent.

---

## 11. Open questions to resolve next

1. Exact Plaid **Investments** per-item pricing past 10 items (undisclosed — apply/contact sales) and SnapTrade production-approval turnaround.
2. Whether to register as an RIA at all, and *when* — drives which agents may "advise" vs. "inform." (Legal opinion.)
3. Which market/brokerage data providers expose MCP servers vs. need custom wrappers (drives the grounding layer + real-time feasibility).
4. Options behavioral/tax modeling feasibility over messy multi-broker data (the hardest, most defensible piece).
5. Naming: keep **StockPulse** as the brand, or lead the wedge with a tax-forward name? (Concept names surfaced: BasisGuard, Reckon, Hindsight, Atlas.)

---

### Appendix — alternative direction considered
**"Provenance" — a developer platform (the "Stripe/Plaid for agentic investing"):** a drop-in SDK that lets *any* AI investing app execute trades via SnapTrade wrapped in a regulator-ready evidence chain, consent/trade-preview, and tamper-evident audit log. Picks-and-shovels for the exact category YC is funding hardest, with a cleaner regulatory position (you sell rails to builders; you're not the adviser). Higher ceiling, but harder cold-start (needs other builders as customers) and less demo-able solo. Kept as a pivot option if the consumer wedge's K-factor/WTP don't compound.
