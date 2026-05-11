# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Client Wealth Management PWA built with React + Vite frontend and Express API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Auth**: Session-based (cookie-parser, HMAC password hashing)

## Application

**Aura Wealth** — A Client Wealth Management PWA for financial advisors.

### Roles
- **Admin (Advisor)**: Creates client accounts, fills in financial data (assets, liabilities), views dashboard
- **Client**: Read-only view of their financial portfolio, net worth

### Demo Credentials
- Admin: `admin` / `admin123`
- Client: `rajesh` / `client123`

### Key Features
- Admin creates client accounts (step 1) then fills financial details (step 2)
- Asset types: Mutual Fund/Stock, Fixed Deposit, Recurring Deposit, Provident Fund (PPF/EPF), Cash/Bank
- Liabilities: Home loan, car loan, personal loan, education loan, business loan
- Automatic net worth calculation: Total Assets - Total Liabilities
- Asset breakdown pie chart
- Admin dashboard with total AUM, clients, net worth overview

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

- `artifacts/api-server/` — Express API server with routes for auth, clients, assets, liabilities, dashboard
- `artifacts/wealth-mgmt/` — React + Vite frontend PWA
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas for server validation
- `lib/db/src/schema/` — Drizzle ORM schemas (users, clients, assets, liabilities, sessions)

## Auth Flow

Session-based auth using signed cookies (`SESSION_SECRET` env var). Password hashing via HMAC-SHA256. Sessions stored in PostgreSQL (`sessions` table) with a 7-day expiry — they survive server restarts. Cookie sent with all API requests via `credentials: 'include'` in custom fetch.
