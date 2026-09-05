# API — Dédalo

Prefijo `/api`. Swagger `/api/docs`.

## Auth

- `POST /auth/register` `{ username, email, password }`
- `POST /auth/login` `{ identifier, password }`
- `GET /auth/profile` JWT
- `POST /auth/logout` JWT 204

## Mazes

- `GET /mazes` — `fromPriceCents` = min(prices)
- `GET /mazes/:slug`

## Runs

- `POST /runs/checkout` `{ mazeId, teamSize }` → 201 o 409 `MAZE_FULL` / `ALREADY_RUNNING`
- `GET /runs/mine`
- `GET /runs/by-code/:code` público
- `POST /runs/:code/cancel`
- `POST /runs/:code/checkpoints` staff
- `POST /runs/:code/finish` staff

## Staff

- `POST /staff/scan` `{ codeOrUrl }`
- `POST /staff/start` `{ code }`
- `GET /leaderboard`
- `GET /stats/daily`
- `GET /loyalty/me`
