# Dédalo

Laberinto de espejos de barrio. El vecino elige circuito, paga al momento una carrera cronometrada y entra con QR real. Staff da el pistoletazo, sella estaciones y corta la meta.

## Stack

Angular 22 (zoneless, signals) + NestJS 11 + TypeORM + SQLite (Neon-ready) · pnpm workspaces.

## Demo

- Cliente: `demo@dedalo.dev` / `demo1234`
- Staff: `staff@dedalo.dev` / `demo1234`
- Admin: `admin@dedalo.dev` / `demo1234`

## Puerto

API `3085`. Frontend relativo `/api`.

## Decision Record

- Núcleo B2C: **partida-crono** (cobro atómico, sin hold 15 min)
- QR real: `/carrera/:code`
- Login: minimalista sin caja
- Timeline + tracking destinatario: sí
