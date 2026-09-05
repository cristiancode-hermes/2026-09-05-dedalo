# QA Report — 2026-09-05 Dédalo

**Project:** Taquilla B2C de un laberinto de espejos: carrera cronometrada, cobro atómico y QR de dorsal.
**Stack:** Angular 22 (zoneless) + NestJS 11 + TypeORM + better-sqlite3 · pnpm workspaces
**Author:** Hermes Daily Builder
**Slug / port:** `dedalo` · `3085`

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc --incremental false` | ✅ | `apps/api/dist/main.js` |
| Web `ng build` production | ✅ | `apps/web/dist/web/browser/index.html` · `baseHref=/` |
| pnpm workspace | ✅ | `pnpm-lock.yaml` + shamefully-hoist |

## ✅ 2. Test Results

15/15 Jest (API) — ALL PASSED

| Suite | Cases |
|-------|--------|
| `dedalo.spec.ts` | checkout atómico, 409 MAZE_FULL, 409 ALREADY_RUNNING, sweeper dnf, fromPriceCents=min, QR URL en SVG, puntos derivados, auth identifier |

New tests: existing coverage adequate (15 ≥ 15).

## ✅ 3. Binary / Runtime Verification

| Mode | Output | Status |
|------|--------|--------|
| `GET /api/health` | `{ ok: true }` | ✅ |
| Seed demo/staff/admin | `demo1234` | ✅ |
| Endpoint smoke | **20/20** | ✅ |
| Browser (Puppeteer) | **14/14** | ✅ |

Smoke highlights: login 201 `accessToken`, checkout `DDO-GH01` QR URL in SVG, 409 `ALREADY_RUNNING` copy humano, public `GET /runs/by-code/:code` 200, lista↔detalle total 1400, fromPrice list==detail==min 1400, staff 403 for client, swagger 200.

Browser: home + catálogo, detalle `/laberintos/espejo-mayor`, captions 390px sin crop, login minimalista + demo/staff passwords, mis-carreras, timeline+QR, tracking público sin pagar, checkout `#pay-action`, staff chart 14 barras + ejes + tooltips, clasificación, consola limpia.

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Capa de valor | PASS | partida-crono, cobro atómico, sin hold 15 min |
| QR real | PASS | `qrcode` SVG contiene `https://dedalo.proyectos.cristiancode.dev/carrera/:code` |
| Timeline + tracking | PASS | ficha + `/carrera/:code` público |
| fromPriceCents | PASS | `min(priceCents)`, cero literales EUR en cards |
| Contraste-hover | PASS | light 7.21/9.29; dark default 6.46; hover dark **#32947F** 5.08:1 (QA fix vs 3.90) |
| Figcaption SVG | PASS | captions HTML, texto completo a 390px |
| Auth ANTES de `**` | PASS | `/login` `/entrar` `/registro` |
| Login layout 2 | PASS | `.auth-minimal`, creds debajo, inputs vacíos |
| Header zoneless | PASS | `isAuthenticated` via signals |
| TOKEN_KEY | `dedalo.accessToken` | registrado en prod-capture |
| isFinalDesign | DESIGN_FREE | proyecto nuevo |
| Gráfico staff | PASS | ejes, fechas cada 3 días, tooltips `<title>` |

### Minor Issues

| Issue | Severity | Suggestion |
|-------|----------|------------|
| Capture `POST /register` 400 (demo ya existe) | info | Login 409/login fallback OK |
| leftover chrome-gambito-qa :9222 | ops | no bloquea QA |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| JWT secret via ConfigService | ✅ |
| `.env` gitignored | ✅ |
| ValidationPipe whitelist + forbidNonWhitelisted | ✅ |
| No `APP_GUARD` global | ✅ |
| Password bcrypt `passwordHash` | ✅ |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | ✅ | `dedalo.proyectos.cristiancode.dev` → dist + `/api*` :3085 |
| API | ✅ | `localhost:3085` + `manage-apis.sh` aligned (70/70, idx 69) |
| GitHub | ✅ | https://github.com/cristiancode-hermes/2026-09-05-dedalo |
| Landing | ✅ | `proyectos-cristiancode-dev` commit `f42ffdc` |
| Portfolio | ✅ | locales es/en/pt heading **267** · capture config |
| Excel | ✅ | row 102 |
| Screenshots | ✅ | `dedalo.png` 104KB · `dedalo-m.png` 43KB (logged-in home) |

Links:

- href https://dedalo.proyectos.cristiancode.dev → **200**
- `/api/health` → **200**
- `/carrera/DDO-CNF1` SPA → **200**
- link2 README → **200**
- link3 repo → **200**

## Summary

**OVERALL: PASS ✅**

QA fixes applied:
1. Staff chart Y ticks 25/50/75/100% + X labels every 3rd day
2. Dark `--color-primary-hover` `#2A7F6E` → `#32947F` (AA 5.08:1)
