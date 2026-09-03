# Novaflow Monorepo

This repository contains the foundation for the Novaflow Limited public website, CMS, API, and shared platform packages.

## Stack

- Apps
  - `apps/website` — Astro + TypeScript
  - `apps/cms` — React + Vite + TypeScript
  - `apps/api` — Hono + TypeScript
- Packages
  - `packages/ui` — shared UI tokens and primitives
  - `packages/database` — PostgreSQL schema and migration support
  - `packages/types` — shared domain types
  - `packages/validation` — Zod validation schemas
  - `packages/config` — shared app configuration
- Infrastructure
  - `infrastructure/docker` — local PostgreSQL via Docker Compose

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop or Docker Engine

### Install dependencies

```bash
pnpm install
```

### Start PostgreSQL

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### Run all apps together

```bash
pnpm dev
```

### Run apps individually

```bash
pnpm --dir apps/website dev
pnpm --dir apps/cms dev
pnpm --dir apps/api dev
```

### Production builds

```bash
pnpm build
```

### Lint and typecheck

```bash
pnpm lint
pnpm typecheck
```

## Project structure

```text
Novaflow
├── apps/
│   ├── website
│   ├── cms
│   └── api
├── packages/
│   ├── ui
│   ├── database
│   ├── types
│   ├── validation
│   └── config
├── infrastructure/
│   └── docker/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

## Environment variables

Create a `.env` file in the project root for local configuration and optionally app-level env files for each app. Example values:

```env
DATABASE_URL=postgresql://novaflow:novaflow@localhost:5435/novaflow
API_URL=http://localhost:8787
PUBLIC_API_URL=http://localhost:8787
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_CMS_URL=http://localhost:5173
CMS_URL=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-chars
CORS_ORIGINS=http://localhost:4321,http://localhost:5173
VITE_API_URL=http://localhost:8787
VITE_WEBSITE_URL=http://localhost:4321
```

For production website/API builds, set absolute HTTPS origins (no trailing slash) and never ship localhost:

```env
NODE_ENV=production
PUBLIC_SITE_URL=https://novaflow.co
PUBLIC_API_URL=https://api.novaflow.co
CORS_ORIGINS=https://novaflow.co,https://cms.novaflow.co
JWT_SECRET=<long-random-secret>
DATABASE_URL=<production-postgres-url>
```

See `docs/PRODUCTION.md` for the full security and deployment runbook.

## Database

The database package is scaffolded for PostgreSQL and includes a migration-ready schema structure for:

- users
- roles
- permissions
- pages
- page_blocks
- navigation_items
- solutions
- products
- industries
- case_studies
- case_study_metrics
- blog_posts
- blog_categories
- blog_tags
- team_members
- testimonials
- media
- media_folders
- leads
- lead_activities
- forms
- form_submissions
- seo_metadata
- site_settings
- redirects

The schema is not yet fully migrated in code, but the package structure is prepared for that next step.

## Phase 1 deliverable status

This foundation includes:

- monorepo with pnpm workspaces
- shared TypeScript configuration
- public website shell and routes
- CMS shell and navigation
- API shell with health and basic routes
- shared types and validation
- design tokens and config package
- Docker-based PostgreSQL setup
- project documentation

## Remaining Phase 1 issues

- The database schema still needs final migration files and SQL definitions.
- The shared packages are scaffolded but not yet fully wired into every app.
- The public website is intentionally a route shell, not a full homepage experience.
- CMS content models are still shell-level and are not yet backed by persistent data.
- The API routes are stubbed and need resource-specific modules before full content operations.

## Exact next recommended phase

Phase 2 should focus on the actual Novaflow brand experience and homepage implementation, starting with the serious visual system and then building the homepage around it. That next phase should convert the foundation into a distinctive premium editorial interface without relying on generic SaaS patterns.
