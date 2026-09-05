# Architecture — Dédalo

Monorepo `apps/api` (NestJS) + `apps/web` (Angular 22).

## Núcleo

`POST /api/runs/checkout` crea la carrera y cobra en la misma transacción (`withLock` + transaction). Sin entidad hold ni `expiresAt` de 15 min.

Estados: `confirmed → running → finished | dnf | cancelled`.

Sweeper 30s: `running` con `startedAt + durationMin + 8min` → `dnf`.

## QR

`qrcode` SVG. Payload = `WEB_ORIGIN + /carrera/:code`.

## Auth

JWT `registerAsync` + ConfigService. Login `identifier` username o email. Token namespaced `dedalo.accessToken`.
