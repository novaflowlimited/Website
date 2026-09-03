# Novaflow production operations

This document describes the **actual** architecture in this repository and the security/deployment procedures for Phase 5.16.

It does **not** invent a cloud provider. Adapt host-specific steps (DNS, TLS termination, managed Postgres backups) to your chosen platform.

## Architecture

| Component | Path | Role |
|-----------|------|------|
| Public website | `apps/website` (Astro static) | Marketing site; reads published content from API at build time |
| API | `apps/api` (Hono) | Auth, CMS mutations, public content, leads, media, rebuild trigger |
| CMS | `apps/cms` (Vite/React) | Authenticated editorial UI; cookie session against API |
| Database | `packages/database` (Drizzle + Postgres) | Schema, migrations, seed |
| Local Postgres | `infrastructure/docker/docker-compose.yml` | Development database only |

**Auth model:** Argon2 password hashes; HS256 JWT in `novaflow_session` httpOnly cookie; roles `admin` | `editor` re-checked from the database on protected requests.

**Media:** Optional Cloudflare R2 (`R2_*`). SVG uploads are rejected.

## Environment variables

| Variable | Class | Notes |
|----------|-------|-------|
| `PUBLIC_SITE_URL` | Public | Website origin (HTTPS in production) |
| `PUBLIC_API_URL` | Public | Browser/build API origin |
| `PUBLIC_CMS_URL` / `CMS_URL` | Public | CMS origin for links/notifications |
| `VITE_API_URL` / `VITE_WEBSITE_URL` | Public | CMS Vite env |
| `CORS_ORIGINS` | Server | Comma-separated allowed origins; **required in production** |
| `PORT` / `NODE_ENV` | Server | API listen / runtime mode |
| `COOKIE_SECURE` | Server | Optional override for session cookie Secure flag |
| `DATABASE_URL` | **Secret** | Required in production; must not use local defaults |
| `JWT_SECRET` | **Secret** | Required in production; ≥32 chars; no known defaults |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | **Secret** | Object storage |
| `R2_PUBLIC_URL` | Public | CDN/media base |
| `REBUILD_WEBHOOK_URL` / `REBUILD_WEBHOOK_SECRET` | **Secret** | Site rebuild trigger |
| `ENQUIRY_NOTIFY_WEBHOOK` / `ENQUIRY_NOTIFY_WEBHOOK_SECRET` / `ENQUIRY_NOTIFY_EMAIL` | **Secret** / sensitive | Enquiry notifications |
| `SEED_*` / `ALLOW_PRODUCTION_SEED` | **Secret** | Seed bootstrap only |

Copy `.env.example` → `.env`. Never commit real secrets.

## Security controls implemented

- Production fails closed without `JWT_SECRET`, `DATABASE_URL`, and `CORS_ORIGINS`
- Session cookie: HttpOnly, SameSite=Lax, Secure in production
- Session TTL: 8 hours; role loaded from DB on each protected request
- Login rate limiting + constant-time-ish password verification path
- Admin-only: navigation writes, site settings, leads, rebuild
- Content create/PATCH cannot set `status=published` (publish endpoints only)
- Article `previewToken` stripped from public responses; timing-safe preview compare
- Lead endpoint: validation, honeypot, rate limit, sanitization
- Media: MIME allowlist without SVG; 5MB cap
- Security headers via Hono `secureHeaders` (HSTS in production)
- Safe API error responses in production (no stack traces)
- Seed blocked in production unless explicitly allowed
- Demo passwords removed from CMS login UI
- `.gitignore` excludes env files and build artifacts

## Deployment procedure (provider-agnostic)

1. **Secrets:** Provision production env vars from the table above (HTTPS origins).
2. **Database:** Provision Postgres; do **not** expose it publicly.
3. **Migrate:** From a trusted runner with `DATABASE_URL` set:
   ```bash
   pnpm --filter @novaflow/database exec drizzle-kit migrate
   ```
   Prefer migrations over `drizzle-kit push`. Never run `drizzle-kit push --force` against production without reviewing the SQL.
4. **Build:**
   ```bash
   pnpm install --frozen-lockfile
   PUBLIC_SITE_URL=https://YOUR_DOMAIN \
   PUBLIC_API_URL=https://api.YOUR_DOMAIN \
   pnpm build
   ```
5. **Deploy API** (`apps/api/dist`) with production env; health check `GET /health` and `GET /ready`.
6. **Deploy CMS** static assets; point `VITE_API_URL` at the API origin used at build time.
7. **Deploy website** static output from `apps/website/dist` behind HTTPS.
8. **DNS / TLS:** Apex + www policy; API/CMS subdomains; HTTP→HTTPS redirect at the edge.
9. **Smoke test:** website routes, CMS login, publish, contact form, leads list (admin).

## Database backups

Backups are **not** implemented inside this application. Configure them on the Postgres host:

- Automated daily (or better) snapshots
- Encrypted at rest
- Retention ≥ 7–30 days
- Documented restore drill quarterly

Local Docker Compose volume copies are **not** a production backup strategy.

## Monitoring & alerts

| Check | Endpoint / signal |
|-------|-------------------|
| API liveness | `GET /health` |
| API readiness | `GET /ready` |
| Website | HTTP 200 on `/` |
| CMS | HTTP 200 on login page |
| Auth anomalies | Spike of `401`/`429` on `/auth/login` |
| Publish/rebuild | Failures on `/site/rebuild` and CMS activity log |

Use your host’s uptime checks. Keep alerts actionable (down, error rate, DB disconnect).

## Rollback

| Failure | Application rollback | Database |
|---------|----------------------|----------|
| Bad website build | Redeploy previous `apps/website/dist` artifact | Usually none |
| Bad CMS/API build | Redeploy previous API/CMS artifact | Usually none |
| Bad migration | Restore DB from backup **before** replaying app | Restore point + re-run known-good migrations |
| Bad content publish | Unpublish/revert in CMS | Optional point-in-time restore only if destructive |

Application and database rollbacks are separate. Prefer content unpublish over DB restore when possible.

## Seed / production content

- Do not run the development seed against production.
- If bootstrap is required: `ALLOW_PRODUCTION_SEED=true` plus strong `SEED_ADMIN_PASSWORD` / `SEED_EDITOR_PASSWORD`, then rotate credentials immediately.
- Verify only intended products, industries, case studies, and insights are published before launch.

## Security checklist

- [ ] HTTPS everywhere
- [ ] Secure cookies
- [ ] Secrets only in server env (no `PUBLIC_*` secrets)
- [ ] `.env` not in Git
- [ ] Auth + authorization verified
- [ ] Preview tokens not public
- [ ] Rebuild/webhooks authenticated
- [ ] Rate limits on login + contact
- [ ] Uploads restricted
- [ ] CORS allowlist set
- [ ] Safe errors
- [ ] Backups configured on Postgres host
- [ ] Health checks wired
- [ ] Rollback artifacts retained
