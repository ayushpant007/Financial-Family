# Financial Family

A client wealth-management platform for financial advisors and their clients.

## Product overview

Financial Family gives advisors a single place to manage client assets and liabilities while giving each client a private view of their own portfolio, current values, gains/losses, and net worth.

## Core workflows

- Advisor administration of client accounts and credentials
- Asset and liability records across multiple instrument types
- Portfolio valuation and breakdowns for advisors
- Client-only read access to personal wealth information
- Market-linked valuations for mutual funds and listed stocks
- Calculated valuations for fixed deposits, recurring deposits, and provident-fund accounts
- Charts and summaries for net worth, allocation, and performance

## Architecture

- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- API: Node.js, Express, TypeScript
- Data: Supabase PostgreSQL with Drizzle ORM
- Contracts: OpenAPI-generated Zod schemas and React Query hooks
- Sessions: database-backed cookie sessions with secure production settings

## Run locally

Requirements: Node.js, pnpm, and a PostgreSQL/Supabase database.

    pnpm install
    pnpm dev

The repository contains additional product and setup notes. Configure secrets through environment variables and never commit credentials or real client financial data.

## Status

Active development. The core MVP workflows are implemented, with ongoing refinement of valuation coverage, reporting, and advisor/client experiences.
