# Financial Family — Product Progress Report

**Project:** Client Wealth Management Platform
**Status:** Active development — core MVP features complete and functional
**Last updated:** April 30, 2026

---

## 1. Overview

**Financial Family** is a private client advisory wealth management platform that enables financial advisors (admins) to manage their clients' complete portfolios — assets and liabilities — with real-time market valuations. Clients log in to view their own up-to-date portfolio summary including current market values, gains/losses, and net worth.

**Core value proposition:**
- A single source of truth for an advisor's entire client book
- Real-time portfolio valuation across market and non-market instruments
- Clients see their wealth picture with the same data the advisor sees

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI Library | shadcn/ui + Tailwind CSS + Recharts |
| Routing | Wouter |
| State / Data Fetching | TanStack Query (React Query) |
| Backend API | Node.js + Express + TypeScript |
| Database | Supabase PostgreSQL |
| ORM | drizzle-orm + drizzle-kit |
| API Contract | OpenAPI spec → Zod schemas + React Query hooks (auto-generated) |
| Authentication | Cookie-based sessions (HMAC-SHA256, 30-day sliding expiry) |

---

## 3. User Roles

### 3.1 Admin (Financial Advisor)
- Manages all clients in the firm
- Creates client accounts and login credentials
- Records and updates each client's assets and liabilities
- Views net-worth, asset breakdown, and portfolio detail per client

### 3.2 Client
- Logs in to view **only their own** portfolio
- Sees live valuations and breakdowns
- Read-only — cannot modify their own holdings (advisor-managed)

---

## 4. Authentication & Session Management

| Feature | Implementation |
|---|---|
| Login | Username + password (HMAC-SHA256 hashed) |
| Session storage | Database-backed (`sessions` table) with cryptographically random tokens |
| Cookie | `httpOnly`, `sameSite=lax`, secure in production |
| Session duration | 30 days, sliding renewal when <7 days remain |
| Identity refresh | Auto-refetched on tab focus + 30-second stale time to catch role changes |
| Logout | Server-side session deletion + cookie clear |
| Default seed user | `admin / admin123` (auto-seeded on first server startup) |

---

## 5. Asset Types Supported

The platform supports six asset categories. Each has a custom data form, valuation logic, and on-card breakdown display.

| Asset Type | Inputs Captured | Valuation Method |
|---|---|---|
| **Mutual Fund** | Fund name (autocomplete from 9,393 schemes), units, buy price, transaction date, type (Buy/Sell) | **Live NAV** via MFAPI (`api.mfapi.in`) — current value = units × latest NAV |
| **Stock (NSE)** | Stock name (autocomplete from 2,258 NSE listings), units, buy price, transaction date, type (Buy/Sell) | **Live price** via Yahoo Finance (proxied through API server) — current value = units × current price |
| **Fixed Deposit (FD)** | Institution, principal, interest rate, start date, maturity date, payout type | **Simple Interest:** `Value = P + (P × R × T)` — time capped at maturity |
| **Recurring Deposit (RD)** | Institution, monthly investment, interest rate, start date, tenure (months) | **Standard RD formula:** `Total + (M × n × (n+1) × R / 2400)` |
| **Provident Fund (PPF/EPF)** | Account type, start year, total contribution, interest rate | **Compound Interest:** `Value = P × (1 + R)^T` |
| **Cash / Bank Balance** | Bank name, account, current balance | Direct balance |

### Real-time displays
For each asset, the card shows:
- **Mutual funds:** Live NAV, current market value, total gain/loss with %
- **Stocks:** Live price + today's % change, market value, gain/loss with %
- **FD/RD/PPF:** Principal, accrued interest (with formula breakdown), current/maturity value

---

## 6. Liabilities Supported

Six loan categories: Home, Car, Personal, Education, Business, Other.

**Captured per liability:** lender name, total loan amount, outstanding amount, interest rate, EMI, start date, end date.

---

## 7. Dashboards

### 7.1 Admin — Client List
- Searchable list of all clients
- Quick view of each client's net worth
- Click-through to client detail

### 7.2 Admin — Client Detail
- Top KPI cards: Total Assets / Total Liabilities / Net Worth
- Asset Breakdown pie chart (by category)
- Tabbed view: Assets and Liabilities
- Inline add / edit / delete with type-specific forms
- Per-asset live valuation cards

### 7.3 Client — My Portfolio
- Same KPI cards (Total Assets, Liabilities, Net Worth)
- Asset Allocation pie chart
- Two-column read-only listing of assets and liabilities with live values

---

## 8. Real-Time Market Data Integrations

| Source | Coverage | Method |
|---|---|---|
| **MFAPI** (`api.mfapi.in`) | 9,393 Indian mutual fund schemes | Direct browser fetch using scheme code lookup by exact fund name |
| **Yahoo Finance** | 2,258 NSE-listed stocks (`.NS` suffix) | Proxied through `/api/stocks/price/:symbol` endpoint to avoid CORS |
| Static reference data | NSE stocks, MF schemes | Bundled JSON files for autocomplete |

---

## 9. Database Schema

| Table | Purpose |
|---|---|
| `users` | Admin and client login accounts (role, password hash) |
| `clients` | Client profile (name, email, phone, linked user) |
| `assets` | One row per holding: type, JSON data payload, computed value |
| `liabilities` | One row per loan: type, lender, amount, EMI, dates |
| `sessions` | Active sessions (token, user, role, clientId, expiry) |

Schema is managed via drizzle migrations. The API server runs `push + seed` automatically on every startup, so the schema is always current.

---

## 10. Architecture Highlights

- **Contract-first API:** OpenAPI spec drives both server validation (Zod) and client hooks (React Query) — no drift between frontend and backend types
- **Monorepo:** pnpm workspaces with shared `@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react` libraries
- **Computed asset values:** Stored at write-time and recalculated on every update — used in totals and pie charts
- **Live values:** Fetched on-demand in the UI for instruments with real-time data sources
- **Role-based authorization:** Enforced both on the frontend (route guards) and backend (`requireAuth` / `requireAdmin` middleware) — clients can only access their own data

---

## 11. Completed Milestones

- [x] Project scaffold (React + Vite + Express + Supabase)
- [x] Authentication: login, logout, session persistence, role-based routing
- [x] Admin: client CRUD (create with auto-generated login credentials)
- [x] Asset CRUD across all six categories with type-specific forms
- [x] Liability CRUD across six loan categories
- [x] Net-worth and asset-breakdown computations
- [x] Recharts-powered allocation pie charts (admin & client views)
- [x] Mutual fund autocomplete + live NAV display
- [x] Stock autocomplete + live NSE price display via Yahoo Finance proxy
- [x] FD / RD / PPF interest calculations + on-card breakdown
- [x] Persistent 30-day sliding sessions
- [x] Auto-migration and seeding on server startup
- [x] Migrated database from Replit-managed PG to Supabase

---

## 12. Known Constraints & Open Items

| Item | Notes |
|---|---|
| Stock universe | NSE-only currently (2,258 symbols) — BSE not yet supported |
| Mutual fund matching | Requires exact name match against MFAPI scheme list |
| Currency | INR only (no multi-currency support) |
| RD interest formula | Standard approximation — does not account for irregular installments or partial months |
| Audit trail | No history of asset value changes over time (current value only) |
| Notifications / Alerts | None yet (e.g. FD maturity, large price moves) |
| Mobile app | Web-responsive only; no native iOS/Android client |
| Multi-advisor | Single firm / single admin pool currently |

---

## 13. Suggested Next Steps

1. **Historical valuation tracking** — snapshot daily NAV/prices to chart portfolio growth over time
2. **FD maturity alerts** — surface upcoming maturities on the admin dashboard
3. **Document attachments** — let advisors attach FD certificates, MF statements per asset
4. **Bulk import** — CSV upload for migrating existing client portfolios
5. **PDF export** — downloadable portfolio statements for clients
6. **Multi-advisor support** — team accounts with per-advisor client books
7. **BSE stocks + international funds** — broader market coverage

---

*This report reflects the platform as of April 30, 2026.*
