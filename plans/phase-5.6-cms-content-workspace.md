# Phase 5.6 — CMS Content Workspace + Media Management

## Architectural Decisions (confirmed)

| Concern | Decision |
|---|---|
| Persistence | PostgreSQL (existing `docker-compose.yml`) + Drizzle ORM + migrations in `packages/database` |
| Auth | Real JWT/session auth — password hashing (argon2), login endpoint, role middleware, ADMIN/EDITOR enforcement |
| Public site integration | Astro SSG — fetches from API at build time; CMS triggers rebuild; draft preview via separate draft build |
| Media storage | Cloudflare R2 (S3-compatible SDK) |

## System Architecture

```mermaid
flowchart LR
  subgraph Browser
    CMS[CMS React SPA<br/>Vite 5173]
    Public[Public Astro Site<br/>SSG 4321]
  end

  subgraph API[Hono API 8787]
    Routes[REST Routes]
    AuthMW[Auth + Role Middleware]
    R2Client[R2 Media Client]
  end

  subgraph DB[PostgreSQL 5432]
    Tables[Drizzle Schema + Migrations]
  end

  subgraph Cloud[Cloudflare R2]
    Bucket[Media Bucket]
  end

  CMS -->|JWT + JSON| Routes
  Public -->|fetch at build time| Routes
  Routes --> AuthMW
  AuthMW --> Tables
  Routes --> Tables
  Routes -->|upload / fetch / delete| R2Client
  R2Client --> Bucket
  Routes -->|rebuild trigger| Public
```

## Current State (what exists)

- **CMS** (`apps/cms/src/App.tsx`): read-only React mockup. Every page renders seed data from `content.ts` as static tables. No forms, no CRUD, no API calls, no auth, no media upload, no preview, no draft/publish workflow. React Query + React Router installed but unused.
- **API** (`apps/api/src/index.ts`): Hono server with in-memory arrays. GET endpoints + POST `/validate` + lead submission. No PATCH/PUT/DELETE, no auth, no media upload, no audit, no slug-uniqueness.
- **Database** (`packages/database/src/index.ts`): stub — config object + table-name list. No ORM, migrations, or queries.
- **Public site** (`apps/website`): Astro pages fully hardcoded — do not consume API/CMS.
- **Validation** (`packages/validation`): minimal Zod schemas that don't match the richer editor field sets.
- **Types** (`packages/types`): entity interfaces with snake_case fields, partially complete.

## Target State (what we build)

A professional internal CMS application where a non-developer can manage the entire Novaflow website without touching code.

---

## Implementation Plan (27 steps)

### Foundation Layer (steps 1–8)

#### Step 1 — Database layer (`packages/database`)
- Install `drizzle-orm`, `drizzle-kit`, `pg` (node-postgres).
- Define full Drizzle schema in `packages/database/src/schema/`:
  - `users` (id, email, password_hash, role, created_at, updated_at)
  - `roles` (enum: admin, editor) — or role column on users
  - `products` (id, name, slug, category, short_description, description, problem, solution, capabilities[], industries[], logo_media_id, hero_media_id, screenshots[], status, order, seo_id, created_by, updated_by, published_by, created_at, updated_at, published_at)
  - `industries` (id, name, slug, short_description, visual_media_id, mobile_visual_media_id, related_products[], related_capabilities[], order, status, seo_id, audit fields)
  - `capabilities` (id, name, slug, short_description, order, status, audit fields)
  - `case_studies` (id, title, slug, client, industry_id, summary, challenge, solution, result, hero_media_id, gallery[], products[], capabilities[], testimonial, featured, order, status, seo_id, audit fields)
  - `media` (id, filename, title, alt_text, decorative, type, mime_type, width, height, size_bytes, r2_key, r2_url, focal_x, focal_y, created_by, created_at)
  - `navigation_items` (id, label, url, order, visibility, location: main|footer)
  - `site_settings` (singleton row: company_name, logo_media_id, favicon_media_id, contact_email, contact_phone, address, social_links jsonb, default_seo_id)
  - `seo_metadata` (id, entity_type, entity_id, title, description, og_title, og_description, og_image_media_id, canonical_url, twitter_card)
  - `leads` (id, name, email, company, phone, project_type, budget_range, timeline, message, status, created_at)
  - `activity_log` (id, actor_id, action, entity_type, entity_id, metadata jsonb, created_at)
- Write Drizzle migrations (`drizzle-kit generate`).
- Write seed script (`packages/database/src/seed.ts`) — migrate existing seed content from `content.ts` into the DB.
- Expose query helpers + `db` client from `packages/database/src/index.ts`.

#### Step 2 — API persistence (`apps/api`)
- Replace all in-memory arrays with Drizzle queries.
- Add connection pooling via `pg.Pool`.
- Add `/health` readiness check that verifies DB connectivity + migrations applied.
- Add CORS update to allow CMS origin (5173) with credentials.

#### Step 3 — Auth system (`apps/api` + `packages/database`)
- Install `argon2` (password hashing), `jose` or `hono/jwt` (JWT signing).
- `POST /auth/login` — email + password → JWT (httpOnly cookie or Authorization header).
- `POST /auth/logout` — clear session.
- `GET /auth/me` — current user + role.
- Role middleware: `requireAuth`, `requireRole('admin')`, `requireRole('admin'|'editor')`.
- Seed an admin user + editor user in the seed script.
- CMS: login page, session context, token storage, auto-redirect on 401.

#### Step 4 — API CRUD (`apps/api`)
- For each resource (products, industries, capabilities, case_studies, navigation, site_settings, seo_metadata):
  - `GET /:resource` — list with pagination, search, filter, sort params.
  - `GET /:resource/:id` — single.
  - `POST /:resource` — create.
  - `PATCH /:resource/:id` — update.
  - `DELETE /:resource/:id` — delete (with reference check for media).
  - `POST /:resource/:id/publish` — set status=published, run publishing validation.
  - `POST /:resource/:id/unpublish` — set status=draft.
  - `POST /:resource/:id/archive` — set status=archived.
- Slug-uniqueness check on create + update.
- Publishing validation: required fields (hero visual, SEO fields, relationships) with meaningful error messages (e.g. "Hero visual is required.").

#### Step 5 — Audit + activity (`apps/api` + `packages/database`)
- `created_by`, `updated_by`, `published_by` foreign keys on all content tables.
- On every mutation, write to `activity_log` (actor, action, entity type/id, metadata).
- `GET /activity?limit=10` — recent activity for dashboard.
- `GET /activity?entity=products` — filtered activity.

#### Step 6 — Media + R2 (`apps/api`)
- Install `@aws-sdk/client-s3` (R2 is S3-compatible).
- R2 config via env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
- `POST /media/upload` — multipart upload, validate type (image/svg/png/webp/jpeg) + size (e.g. 5MB), stream to R2, create media row.
- `GET /media` — paginated list with search/filter/sort.
- `GET /media/:id` — single with reference count.
- `PATCH /media/:id` — update alt_text, title, decorative, focal_point.
- `POST /media/:id/replace` — replace binary, keep metadata.
- `DELETE /media/:id` — check references across products/industries/case_studies; block with explanation if referenced ("This image is used by 3 products.").
- Generate optimized thumbnails for list views (store a small variant in R2 or use R2 image transforms).

#### Step 7 — Lead management (`apps/api`)
- Expand lead statuses: `new`, `contacted`, `in_progress`, `closed`.
- `GET /leads` — list with status filter (ADMIN only).
- `GET /leads/:id` — full detail.
- `PATCH /leads/:id/status` — change status (ADMIN only).
- Public `POST /contact-enquiries` remains open (no auth) for form submissions.

#### Step 8 — Shared types + validation (`packages/types`, `packages/validation`)
- Expand `packages/types` to match full editor field sets (problem, solution, hero_visual, screenshots, gallery, seo fields, audit fields, focal_point, decorative).
- Expand `packages/validation` Zod schemas to match — used by both API (server) and CMS (client-side preview validation).
- Keep snake_case in types package (DB convention); CMS uses camelCase API responses (transform in API layer).

### CMS Application Layer (steps 9–24)

#### Step 9 — CMS API client (`apps/cms/src/api/`)
- `apiClient.ts` — typed fetch wrapper: base URL, auth token injection, JSON parse, error normalization.
- `queries.ts` — React Query hooks per resource (`useProducts`, `useProduct`, `useCreateProduct`, `useUpdateProduct`, `usePublishProduct`, etc.).
- `mutations.ts` — mutation hooks with cache invalidation + toast notifications.
- Centralized error/loading helpers.

#### Step 10 — CMS shell + auth UI (`apps/cms/src/`)
- Restructure `App.tsx` into routed layout:
  - `Login.tsx` — email/password form.
  - `Layout.tsx` — grouped sidebar (NOVAFLOW / Dashboard, CONTENT / Pages, Products, Industries, Capabilities, Case Studies, Media, SITE / Navigation, Site Settings, SEO, LEADS / Contact Enquiries).
  - `SessionProvider.tsx` — current user, role, login/logout.
  - `RequireAuth.tsx` — route guard; `RequireRole` for admin-only routes.
  - Responsive collapsible sidebar (drawer on mobile).
- Remove the flat `navItems` array; use grouped structure.

#### Step 11 — Dashboard (`apps/cms/src/pages/Dashboard.tsx`)
- Real counts from API: products, industries, case studies, media, drafts, published.
- Recent activity from `GET /activity`.
- New enquiries count.
- No fake analytics. If analytics not connected, don't show analytics.

#### Step 12 — Product list + editor
- `ProductsList.tsx` — table (Product, Category, Status, Updated, Order) with search, filter (status/category), sort, pagination. Row actions: Edit, Preview, Publish/Unpublish.
- `ProductEditor.tsx` — sectioned form:
  - GENERAL: name, slug (auto from name, editable), category, short description, status, order.
  - STORY: problem, solution, description.
  - MEDIA: logo (media picker), hero visual (media picker), screenshots (multi-select media picker).
  - RELATIONSHIPS: capabilities (multi-select), industries (multi-select).
  - SEO: SEO title, SEO description, OG image (media picker).
- Preview button → opens new tab with draft preview URL.
- Action bar: Save Draft, Publish (confirmation), Unpublish, Archive.
- Unsaved-changes guard on navigation.

#### Step 13 — Industry list + editor
- `IndustriesList.tsx` — table (Industry, Status, Products count, Updated, Order).
- `IndustryEditor.tsx` — name, slug, short description, visual (media picker), mobile visual (media picker), related products (multi-select), related capabilities (multi-select), SEO, status, order.

#### Step 14 — Capability list + editor
- `CapabilitiesList.tsx` — simple table (Name, Slug, Status, Order).
- `CapabilityEditor.tsx` — name, slug, short description, order, status. Intentionally simple.

#### Step 15 — Case study list + editor
- `CaseStudiesList.tsx` — table (Title, Client, Industry, Status, Featured, Updated, Order).
- `CaseStudyEditor.tsx` — sectioned:
  - GENERAL: title, slug, client, industry, summary.
  - STORY: challenge, solution, result.
  - MEDIA: hero image (media picker), gallery (multi-select).
  - RELATIONSHIPS: products, capabilities, industry.
  - PRESENTATION: featured, order.
  - SEO: SEO title, SEO description, OG image.
- Preview + publish/feature/reorder/archive.

#### Step 16 — Media library
- `MediaLibrary.tsx` — grid + list toggle views.
- Asset card: thumbnail, filename, type, dimensions, size, alt text, created date.
- Search by filename, filter by type, sort newest/oldest, pagination/infinite scroll.
- Drag-and-drop upload zone + "Select files" button, upload progress bar, type/size validation.
- `MediaEditor.tsx` (modal/drawer): preview, filename, dimensions, file size, alt text, title, decorative toggle, focal-point selector, replace, delete (with reference warning).

#### Step 17 — Navigation management
- `NavigationManager.tsx` — main nav + footer nav sections.
- Add/edit/remove/reorder (drag or up/down arrows)/hide-show toggles.
- Fields: label, url, order, visible. CTA "Let's Build" preserved.
- Frontend consumes CMS navigation (via SSG fetch).

#### Step 18 — Site settings
- `SiteSettings.tsx` — sectioned:
  - GENERAL: company name, logo (media picker), favicon (media picker).
  - CONTACT: email, phone, location/address.
  - SOCIAL: LinkedIn, Instagram, other (dynamic list).
  - SEO: default title, default description, default OG image.
- Empty social links not displayed publicly (enforced in public site fetch).

#### Step 19 — SEO management
- `SeoOverview.tsx` — overview of all SEO entries.
- Manage default SEO, page SEO, product SEO, industry SEO, case-study SEO.
- Character-count guidance (title ~60, description ~160).

#### Step 20 — Contact enquiries workspace
- `ContactEnquiries.tsx` — list (Name, Company, Project, Status, Created). ADMIN only.
- `EnquiryDetail.tsx` — full detail (name, company, email, phone, project type, message, budget, timeline, created, status).
- Status actions: Mark Contacted, Mark In Progress, Close.
- No internal API details exposed in UI.

#### Step 21 — Global CMS search
- `GlobalSearch.tsx` — search bar in header.
- Searches products, industries, capabilities, case studies, media via API.
- Simple results dropdown; click navigates to editor.

#### Step 22 — Drafts + publishing safety
- Draft badges on all content lists.
- Draft visibility enforcement: API only returns published content to public endpoints; draft preview uses authenticated preview token.
- Pre-publish validation endpoint returns field-level errors.

#### Step 23 — UX safety (cross-cutting)
- `useUnsavedChanges` hook — tracks dirty form state, intercepts navigation, shows "You have unsaved changes. Stay / Leave."
- `ConfirmDialog` component — for publish/delete actions with reference explanation.
- `EmptyState` component — "No products yet. Create product →"
- `ToastProvider` — loading/success/error toasts for all mutations.

#### Step 24 — CMS responsive design
- Light mode palette: `#F6F5F1`, `#FFFFFF`, `#101114`, `#1B2A7A`, `#FF6B00`.
- DM Sans font.
- Breakpoints: 375, 390, 430 (mobile — stacked rows, drawers, full-screen editors), 768, 1024, 1280, 1440 (desktop — tables, multi-column).
- No marketing aesthetic in CMS — clean, professional, efficient.

### Integration + QA (steps 25–27)

#### Step 25 — Public site integration (`apps/website`)
- Astro pages fetch from API at build time (SSG) using `fetch` in frontmatter.
- Only published content is fetched (API enforces).
- `POST /site/rebuild` endpoint — CMS triggers Astro rebuild (or documents manual `pnpm build` for now).
- Draft preview: authenticated preview route that returns draft content (preview token).
- Verify: product publish/unpublish, industry publish/unpublish, case study publish/unpublish, navigation changes, site settings, media replacement all reflect on public site.

#### Step 26 — QA
- `pnpm build`, `pnpm lint`, `pnpm typecheck` all pass.
- Test complete workflows:
  - Product: create → save → edit → preview → publish → unpublish → archive.
  - Industry: create → edit → publish → relate product.
  - Capability: create → edit → publish.
  - Case study: create → draft → preview → publish → feature → reorder → archive.
  - Media: upload → search → edit metadata → select → replace → delete safely.
  - Navigation: create → edit → reorder → hide → publish.
  - Settings: edit → save → verify public site.
  - Leads: receive → view → update status.
- Check: browser console, network requests, permissions (admin vs editor), draft visibility, responsive layouts.

#### Step 27 — Final report
Report on: CMS pages, editors, media library, publishing workflow, search/filtering, permissions, public-site synchronization, responsive behavior, error handling, testing results, remaining CMS work.

---

## Key Design Principles

1. **No fake data** — all dashboard numbers, activity, and lists come from the database.
2. **No fake analytics** — if analytics aren't connected, don't show them.
3. **Drafts never public** — API enforces status filtering on public endpoints.
4. **Meaningful errors** — "Hero visual is required." not "Validation failed."
5. **Delete safety** — reference checks before deletion with clear explanations.
6. **Unsaved-changes guard** — no silent data loss.
7. **Server-side authorization** — ADMIN/EDITOR enforced in API middleware, not just UI.
8. **CMS is a tool** — clarity, speed, organization over marketing aesthetics.
9. **Don't touch the public site design** — only wire it to consume CMS data.
10. **Don't add homepage sections/copy/fake content.**

## File Structure (target)

```
packages/database/src/
  schema/
    users.ts
    products.ts
    industries.ts
    capabilities.ts
    case-studies.ts
    media.ts
    navigation.ts
    site-settings.ts
    seo-metadata.ts
    leads.ts
    activity-log.ts
    index.ts          # re-exports
  client.ts           # db client + pool
  seed.ts             # seed script
  index.ts            # public API

apps/api/src/
  index.ts            # Hono app
  db.ts               # drizzle import
  auth/
    middleware.ts     # requireAuth, requireRole
    routes.ts         # login, logout, me
  routes/
    products.ts
    industries.ts
    capabilities.ts
    case-studies.ts
    media.ts
    navigation.ts
    site-settings.ts
    seo.ts
    leads.ts
    activity.ts
    site.ts           # rebuild trigger
  lib/
    r2.ts             # R2 client
    validation.ts     # publishing validation
    slug.ts           # slug uniqueness

apps/cms/src/
  api/
    client.ts
    queries.ts
    mutations.ts
  auth/
    SessionProvider.tsx
    Login.tsx
    RequireAuth.tsx
  components/
    Layout.tsx
    Sidebar.tsx
    DataTable.tsx
    MediaPicker.tsx
    ConfirmDialog.tsx
    EmptyState.tsx
    ToastProvider.tsx
    SearchBar.tsx
    StatusBadge.tsx
    FormSection.tsx
    UnsavedChangesGuard.tsx
  pages/
    Dashboard.tsx
    products/ProductsList.tsx
    products/ProductEditor.tsx
    industries/IndustriesList.tsx
    industries/IndustryEditor.tsx
    capabilities/CapabilitiesList.tsx
    capabilities/CapabilityEditor.tsx
    case-studies/CaseStudiesList.tsx
    case-studies/CaseStudyEditor.tsx
    media/MediaLibrary.tsx
    media/MediaEditor.tsx
    navigation/NavigationManager.tsx
    settings/SiteSettings.tsx
    seo/SeoOverview.tsx
    leads/ContactEnquiries.tsx
    leads/EnquiryDetail.tsx
  App.tsx
  main.tsx
  styles.css
```

## Environment Variables (new)

```
# Database
DATABASE_URL=postgresql://novaflow:novaflow@localhost:5432/novaflow

# Auth
JWT_SECRET=<random-32-bytes>
SESSION_COOKIE_NAME=novaflow_session

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=novaflow-media
R2_PUBLIC_URL=

# API
PORT=8787
CMS_ORIGIN=http://localhost:5173
WEBSITE_ORIGIN=http://localhost:4321
```
