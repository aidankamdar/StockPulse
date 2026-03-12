# StockPulse

## Project Overview

StockPulse is a personal stock portfolio tracker and showcase app. It connects directly to your Robinhood account to display live portfolio data, provides AI-powered stock research and analysis via Claude, and offers a public showcase page so friends can follow your investing progress.

**This is a personal tool, not a multi-user SaaS.** Keep things simple.

## Architecture Decisions

- **Framework**: Next.js 14+ with App Router. Server Components by default; Client Components only where interactivity is required (charts, forms, real-time updates).
- **Styling**: Tailwind CSS + shadcn/ui components. Dark/light mode via CSS variables and next-themes.
- **Database**: PostgreSQL via Supabase with Prisma ORM. All monetary values use Decimal type (never float).
- **Authentication**: Supabase Auth with @supabase/ssr. Simple login - primarily for you as the owner.
- **Robinhood Data**: robin-stocks (Python) called from Next.js API routes via subprocess. Primary source of portfolio data.
- **Stock Data**: Finnhub API for supplemental data (historical charts, ticker search, company profiles). 60 req/min free tier.
- **AI**: Anthropic Claude API via @anthropic-ai/sdk. All AI calls routed through Next.js API routes (never client-side).
- **Data Fetching**: TanStack Query v5 for client-side caching. Default staleTime: 60000ms.
- **Charts**: Recharts for portfolio visualizations.
- **Animations**: Framer Motion for page transitions and micro-interactions. Keep under 300ms.
- **Deployment**: Vercel (frontend + API) + Supabase (database + auth). Vercel Cron for scheduled syncs.

## Coding Standards

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig.json)
- No `any` types. Use `unknown` and narrow with type guards.
- Prefer interfaces for object shapes, types for unions/intersections.
- All API inputs validated with Zod schemas at route boundaries.

### React / Next.js
- Server Components by default. Add `'use client'` only when needed.
- Component names: PascalCase. File names: kebab-case. Example: `PortfolioSummary` in `portfolio-summary.tsx`.
- One component per file. Max 200 lines; extract sub-components if longer.
- Use named exports (except `page.tsx`, `layout.tsx` which need default exports).
- Props interfaces named `{ComponentName}Props`.
- No `useEffect` for data fetching; use React Query or server-side fetching.

### API Routes
- All routes in `src/app/api/` following RESTful conventions.
- Use route handlers (`route.ts`), not page-based API routes.
- Validate all inputs with Zod.
- Return consistent JSON: `{ data, error, meta }`.
- HTTP status codes: 200 (ok), 201 (created), 400 (bad input), 401 (unauthorized), 404 (not found), 500 (server error).

### Naming Conventions
- Variables/functions: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns: `snake_case` (Prisma maps to camelCase)
- API routes: kebab-case (`/api/portfolio-summary`)
- Test files: `{filename}.test.ts` or `{filename}.test.tsx`
- Hook files: `use-{name}.ts`

### Error Handling
- API routes: try/catch with consistent error response format.
- Client: React Error Boundaries at route group level.
- Never expose stack traces or internal details to the client.

### Imports
- Use path aliases (`@/` maps to `src/`).
- Order: 1) React/Next.js 2) External packages 3) Internal modules 4) Types 5) Styles. Separated by blank lines.

## Project Structure

```
src/
├── app/
│   ├── (auth)/                   # Auth route group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx            # Minimal auth layout
│   ├── (dashboard)/              # Protected route group
│   │   ├── dashboard/page.tsx    # Portfolio overview / home
│   │   ├── portfolio/
│   │   │   ├── page.tsx          # All positions
│   │   │   └── [symbol]/page.tsx # Stock detail
│   │   ├── transactions/page.tsx # Trade history
│   │   ├── analytics/page.tsx    # Charts and metrics
│   │   ├── ai/page.tsx           # AI chat and insights
│   │   ├── watchlist/page.tsx    # Watchlisted stocks
│   │   ├── alerts/page.tsx       # Price alerts
│   │   ├── settings/page.tsx     # User + Robinhood settings
│   │   └── layout.tsx            # Dashboard layout (sidebar + header)
│   ├── portfolio/
│   │   └── [username]/page.tsx   # Public showcase page
│   ├── api/
│   │   ├── auth/callback/route.ts
│   │   ├── portfolio/route.ts
│   │   ├── positions/route.ts
│   │   ├── transactions/route.ts
│   │   ├── stocks/[symbol]/route.ts
│   │   ├── stocks/search/route.ts
│   │   ├── robinhood/
│   │   │   ├── sync/route.ts     # Trigger Robinhood sync
│   │   │   └── status/route.ts   # Connection status
│   │   ├── ai/
│   │   │   ├── analyze/route.ts  # Portfolio analysis
│   │   │   ├── chat/route.ts     # Stock Q&A
│   │   │   └── research/route.ts # Stock research
│   │   ├── alerts/route.ts
│   │   └── cron/
│   │       ├── sync-prices/route.ts    # Robinhood + Finnhub refresh
│   │       └── daily-snapshot/route.ts # Portfolio snapshot
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing / redirect
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui (auto-generated)
│   ├── layout/                   # Sidebar, header, mobile nav
│   ├── portfolio/                # Position cards, tables, summary
│   ├── charts/                   # Line chart, pie chart, sparklines
│   ├── ai/                       # Chat panel, analysis cards
│   └── shared/                   # Ticker badge, price indicator, skeletons
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # Server-side client
│   │   └── client.ts             # Browser-side client
│   ├── prisma/
│   │   └── client.ts             # Prisma singleton
│   ├── api/
│   │   ├── finnhub.ts            # Finnhub typed client
│   │   └── anthropic.ts          # Claude API wrapper
│   ├── robinhood/
│   │   ├── sync.ts               # Orchestrates sync logic
│   │   └── parser.ts             # Parses robin-stocks JSON output
│   ├── calculations/
│   │   └── portfolio.ts          # P&L, cost basis, returns
│   ├── validators/               # Zod schemas
│   └── utils/
│       ├── format.ts             # Currency, percentage, date formatting
│       └── cn.ts                 # Tailwind classname merge
├── hooks/                        # Custom React hooks
├── providers/                    # Query, theme, auth providers
├── types/                        # TypeScript type definitions
├── config/                       # Site metadata, nav config
└── middleware.ts                  # Auth middleware
scripts/
└── robinhood/
    ├── fetch_portfolio.py        # robin-stocks: get positions + account
    ├── fetch_orders.py           # robin-stocks: get order history
    └── requirements.txt          # Python dependencies (robin-stocks)
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
tests/
├── unit/                         # Unit tests (mirrors src/)
├── integration/                  # API route tests
├── e2e/                          # Playwright E2E tests
└── fixtures/                     # Test data
```

## Robinhood Integration

### How It Works
1. Python scripts in `scripts/robinhood/` use `robin-stocks` to authenticate and fetch data.
2. Next.js API routes call these scripts via `child_process.execFile()`.
3. Scripts output JSON to stdout; API routes parse and store in database.
4. Frontend reads from database (fast) and can trigger a fresh sync on demand.
5. Vercel Cron auto-syncs every 15 minutes during market hours (9:30 AM - 4:00 PM ET).

### Authentication
- Robinhood credentials in environment variables: `ROBINHOOD_USERNAME`, `ROBINHOOD_PASSWORD`.
- MFA via TOTP. Store TOTP secret in `ROBINHOOD_TOTP_SECRET` env var for auto-generation.
- Session tokens cached in `/tmp/robinhood_session.pickle` (server-side only).
- **Never** expose Robinhood credentials to the frontend.

### Data Pulled from Robinhood
- Current positions (symbol, quantity, average buy price, equity, percent change)
- Account summary (total equity, cash, buying power)
- Order history (buy/sell with prices, dates, quantities)
- Dividends (amount, date, symbol)

### Sync Strategy
- **On demand**: User clicks "Sync" button → API route → Python script → database update
- **Automatic**: Vercel Cron every 15 min during market hours
- **Deduplication**: Transactions matched by `robinhood_order_id` to prevent duplicates
- **Fallback**: If Robinhood sync fails, display last known data with "Last synced: X minutes ago"

## Testing

### Coverage Targets
- `src/lib/calculations/`: 90% minimum (financial math must be precise)
- `src/lib/validators/`: 100% (all Zod schemas tested)
- `src/components/`: 70% minimum
- Overall: 70% minimum

### Test Types
1. **Unit Tests** (Jest + React Testing Library): calculation functions, validators, hooks, components
2. **API Route Tests** (Jest): success cases, validation errors, auth failures. Mock external APIs.
3. **E2E Tests** (Playwright): auth flow, add transaction, view portfolio, AI chat, public showcase page

### Running Tests
- `npm run test` — all unit + integration tests
- `npm run test:watch` — watch mode
- `npm run test:coverage` — coverage report
- `npm run test:e2e` — Playwright E2E
- `npm run test:ci` — full suite (unit + integration + e2e)

### Test Naming
- Unit: `{source-file}.test.ts(x)`
- E2E: `{feature}.spec.ts` in `tests/e2e/`
- Fixtures: `{domain}.ts` in `tests/fixtures/`

## Git Workflow

### Branch Strategy
- `main`: production-ready, protected
- `develop`: integration branch
- `feature/{description}`: new features
- `fix/{description}`: bug fixes

### Commit Conventions (Conventional Commits)
Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Scopes: `auth`, `portfolio`, `transactions`, `analytics`, `ai`, `robinhood`, `ui`, `db`, `api`

Examples:
- `feat(robinhood): add automatic portfolio sync`
- `fix(calculations): handle zero-quantity positions in P&L`
- `test(portfolio): add unit tests for cost basis calculation`

Rules:
- Max 72 characters in subject line
- Imperative mood ("add" not "added")
- One logical change per commit

## API Design

### Response Format
```json
// Success
{ "data": { ... }, "meta": { "synced_at": "..." } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### Caching (React Query staleTime)
- Stock quotes: 15 seconds
- Portfolio data: 60 seconds (invalidate on sync/mutation)
- Historical data: 5 minutes
- AI responses: 5 minutes

### Pagination
- Cursor-based for transaction lists: `?cursor={id}&limit={number}`
- Default limit: 20, max: 100

## Database Schema

All monetary values use `Decimal(12,4)`. All tables have `id` (UUID), `created_at`, `updated_at`.

### User
```prisma
model User {
  id                  String   @id @default(uuid())
  email               String   @unique
  display_name        String?
  username            String?  @unique  // for public URL: /portfolio/[username]
  avatar_url          String?
  bio                 String?
  is_portfolio_public Boolean  @default(false)
  robinhood_connected Boolean  @default(false)
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  portfolios      Portfolio[]
  watchlist_items  Watchlist[]
  alerts          Alert[]
  ai_conversations AiConversation[]
}
```

### Portfolio
```prisma
model Portfolio {
  id                   String   @id @default(uuid())
  user_id              String
  name                 String
  description          String?
  is_public            Boolean  @default(false)
  visibility_settings  Json     @default("{\"show_positions\":true,\"show_pnl\":true,\"show_trades\":false,\"show_value\":false}")
  source               PortfolioSource @default(MANUAL)
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt

  user         User          @relation(fields: [user_id], references: [id], onDelete: Cascade)
  positions    Position[]
  transactions Transaction[]
  snapshots    PortfolioSnapshot[]

  @@unique([user_id, name])
  @@index([user_id])
}

enum PortfolioSource {
  ROBINHOOD
  MANUAL
}
```

### Position
```prisma
model Position {
  id                    String   @id @default(uuid())
  portfolio_id          String
  symbol                String
  quantity              Decimal  @db.Decimal(16, 8)  // fractional shares
  average_cost_basis    Decimal  @db.Decimal(12, 4)
  total_cost_basis      Decimal  @db.Decimal(14, 4)
  current_price         Decimal  @db.Decimal(12, 4)
  current_value         Decimal  @db.Decimal(14, 4)
  unrealized_pnl        Decimal  @db.Decimal(14, 4)
  unrealized_pnl_percent Decimal @db.Decimal(8, 4)
  sector                String?
  last_synced_at        DateTime?
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  portfolio Portfolio @relation(fields: [portfolio_id], references: [id], onDelete: Cascade)

  @@unique([portfolio_id, symbol])
  @@index([portfolio_id])
}
```

### Transaction
```prisma
model Transaction {
  id                 String           @id @default(uuid())
  portfolio_id       String
  symbol             String
  type               TransactionType
  quantity           Decimal          @db.Decimal(16, 8)
  price_per_unit     Decimal          @db.Decimal(12, 4)
  total_amount       Decimal          @db.Decimal(14, 4)
  fees               Decimal          @db.Decimal(10, 4) @default(0)
  executed_at        DateTime
  notes              String?          // your trade rationale
  source             TransactionSource @default(MANUAL)
  robinhood_order_id String?          @unique  // for deduplication
  created_at         DateTime         @default(now())
  updated_at         DateTime         @updatedAt

  portfolio Portfolio @relation(fields: [portfolio_id], references: [id], onDelete: Cascade)

  @@index([portfolio_id, executed_at])
  @@index([portfolio_id, symbol])
}

enum TransactionType {
  BUY
  SELL
  DIVIDEND
}

enum TransactionSource {
  ROBINHOOD_SYNC
  MANUAL
  CSV_IMPORT
}
```

### PortfolioSnapshot
```prisma
model PortfolioSnapshot {
  id                String   @id @default(uuid())
  portfolio_id      String
  date              DateTime @db.Date
  total_value       Decimal  @db.Decimal(14, 4)
  total_cost_basis  Decimal  @db.Decimal(14, 4)
  total_pnl         Decimal  @db.Decimal(14, 4)
  total_pnl_percent Decimal  @db.Decimal(8, 4)
  num_positions     Int
  created_at        DateTime @default(now())

  portfolio Portfolio @relation(fields: [portfolio_id], references: [id], onDelete: Cascade)

  @@unique([portfolio_id, date])
  @@index([portfolio_id])
}
```

### Watchlist
```prisma
model Watchlist {
  id               String   @id @default(uuid())
  user_id          String
  symbol           String
  target_buy_price Decimal? @db.Decimal(12, 4)
  notes            String?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, symbol])
  @@index([user_id])
}
```

### Alert
```prisma
model Alert {
  id              String    @id @default(uuid())
  user_id         String
  symbol          String
  type            AlertType
  threshold_value Decimal   @db.Decimal(14, 4)
  is_active       Boolean   @default(true)
  is_triggered    Boolean   @default(false)
  triggered_at    DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, is_active])
}

enum AlertType {
  PRICE_ABOVE
  PRICE_BELOW
}
```

### AiConversation + AiMessage
```prisma
model AiConversation {
  id         String   @id @default(uuid())
  user_id    String
  title      String?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  user     User        @relation(fields: [user_id], references: [id], onDelete: Cascade)
  messages AiMessage[]

  @@index([user_id])
}

model AiMessage {
  id              String      @id @default(uuid())
  conversation_id String
  role            MessageRole
  content         String
  created_at      DateTime    @default(now())

  conversation AiConversation @relation(fields: [conversation_id], references: [id], onDelete: Cascade)

  @@index([conversation_id])
}

enum MessageRole {
  USER
  ASSISTANT
}
```

## Security

- Supabase RLS on all tables. Users can only access their own data.
- Robinhood credentials in env vars only, never in database or logs.
- Zod validation on every API route input.
- Parameterized queries via Prisma (SQL injection prevention).
- CORS configured for app domain only.
- Cron job endpoints protected by `CRON_SECRET` header.
- All secrets in `.env.local` (in `.gitignore`). Template in `.env.example`.
- AI responses always include "not financial advice" disclaimer.

## Performance Targets

- LCP: < 2.5 seconds
- FID: < 100 milliseconds
- CLS: < 0.1
- Portfolio summary API: < 200ms
- Stock quote API: < 500ms
- AI analysis: < 10 seconds (streaming)
- Bundle size: < 200KB initial JS (gzipped)

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=

# Robinhood (robin-stocks)
ROBINHOOD_USERNAME=
ROBINHOOD_PASSWORD=
ROBINHOOD_TOTP_SECRET=

# Stock Data
FINNHUB_API_KEY=

# AI
ANTHROPIC_API_KEY=

# Cron
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development Roadmap

### Phase 1 — Foundation & Robinhood Sync (Weeks 1–3) ✅ COMPLETE
- [x] Next.js 14 project setup (TypeScript, Tailwind, shadcn/ui, Prisma, Supabase)
- [x] Supabase Auth (login/register)
- [x] Database schema: all models above (8 models, Prisma 7 with pg adapter)
- [x] Dashboard layout (sidebar, header, dark/light mode)
- [] Robinhood integration: connect, pull positions + account value (robin-stocks Python scripts)
- [x] Auto-sync transaction history from Robinhood (dedup by robinhood_order_id)
- [] Portfolio view: positions with live prices, total value, daily change
- [] P&L calculations: cost basis, unrealized gains/losses (25 unit tests, 100% coverage)
- [x] Manual trade entry (fallback for non-Robinhood trades)
- [x] Vercel deployment + Supabase production database
- [x] User provisioning (bridge Supabase Auth → Prisma User table)
- **Quality gate**: ✅ 46 unit tests passing (25 calculations, 13 transaction validators, 7 portfolio validators + 1 edge case). P&L math 100% tested. Build succeeds. App runs locally. Deployed to Vercel with live Supabase DB. Auth end-to-end working.

### Phase 2 — Analytics & Visualization (Weeks 4–6)
- [ ] Portfolio performance chart (value over time)
- [ ] Position detail page with stock price chart
- [ ] Sector allocation pie chart
- [ ] Weekly/monthly gains and losses
- [ ] Top gainers/losers
- [ ] Transaction history (filterable, sortable, paginated)
- [ ] Watchlist
- [ ] Vercel Cron: daily snapshot + periodic re-sync
- **Quality gate**: Charts render at all breakpoints, historical data accurate

### Phase 3 — AI Integration (Weeks 7–9)
- [ ] Claude API with streaming responses
- [ ] Portfolio analysis (AI reviews your full portfolio)
- [ ] Stock research (ask about any stock)
- [ ] Position explainer (AI explains why you hold a stock)
- [ ] Trade ideas (suggestions based on your strategy)
- [ ] Earnings & news summaries for holdings
- [ ] Chat interface for free-form Q&A
- **Quality gate**: Streaming works, "not financial advice" disclaimers present

### Phase 4 — Showcase & Polish (Weeks 10–12)
- [ ] Public portfolio page (`/portfolio/[username]`)
- [ ] Privacy controls (choose what visitors see)
- [ ] Trade notes (explain your reasoning on each trade)
- [ ] Price alerts
- [ ] Mobile responsiveness polish
- [ ] Loading/error/empty states everywhere
- [ ] Dark/light mode polish
- **Quality gate**: Public page works, privacy enforced, mobile looks great
