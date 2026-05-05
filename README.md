# StrideQuest

**Route-based step tracking application** — Phase 1 MVP

---

## Overview

StrideQuest lets users define walking/running routes, log activities, and track their progress through an intelligent step estimation engine. When a pedometer isn't available, steps are estimated from route distance and the user's personal stride length (derived from their height). Confidence scores reflect data quality.

---

## Tech Stack

| Layer      | Technology |
|------------|-----------|
| Backend    | Rust · Axum 0.7 · SQLx 0.7 (SQLite) |
| Step Engine | Rust library crate (`estimation`) |
| Frontend   | React 18 · Vite · TypeScript · Tailwind CSS · React Router 6 |
| Database   | SQLite (embedded, zero-config) |

---

## Running Locally

### Prerequisites
- Rust 1.75+ with `cargo`
- Node.js 18+ with `npm`

### Backend

```bash
cd backend
cargo run
# Server starts on http://localhost:3000
```

The SQLite database file `stridequest.db` is created automatically in the working directory.

### Frontend

```bash
cd frontend
npm install
npm run dev
# Dev server at http://localhost:5173 — proxies /api to localhost:3000
```

### Production build

```bash
cd frontend && npm run build
# Output: frontend/dist/ — served by the Axum backend at /
cd ..
cargo run --bin backend
```

---

## Environment Variables

| Variable       | Default                    | Description |
|----------------|----------------------------|-------------|
| `DATABASE_URL` | `sqlite://stridequest.db`  | SQLite path |
| `BIND_ADDR`    | `0.0.0.0:3000`             | Bind address |

---

## API Reference

### Users

| Method | Path              | Description |
|--------|-------------------|-------------|
| POST   | `/api/users`      | Create user (auto-derives stride from height) |
| GET    | `/api/users/:id`  | Get user by ID |
| PUT    | `/api/users/:id`  | Update user profile |

### Routes

| Method | Path              | Description |
|--------|-------------------|-------------|
| POST   | `/api/routes`     | Create route |
| GET    | `/api/routes`     | List routes (`?user_id=`) |
| GET    | `/api/routes/:id` | Get route |

### Activities

| Method | Path                  | Description |
|--------|-----------------------|-------------|
| POST   | `/api/activities`     | Log activity (auto-estimates steps) |
| GET    | `/api/activities`     | List activities (`?user_id=&limit=`) |
| GET    | `/api/activities/:id` | Get activity |

### Dashboard

| Method | Path                       | Description |
|--------|----------------------------|-------------|
| GET    | `/api/dashboard/:user_id`  | Totals, streak, achievements |

### Achievements

| Method | Path                         | Description |
|--------|------------------------------|-------------|
| GET    | `/api/achievements/:user_id` | List earned achievements |

---

## Achievements

| Kind         | Trigger |
|--------------|---------|
| `first_steps` | First completed activity |
| `century`     | ≥ 10,000 steps in a single day |
| `marathon`    | ≥ 42,195 m lifetime distance |
| `streak_7`    | 7 consecutive days with activity |

---

## Phase Roadmap

| Phase | Scope |
|-------|-------|
| **1 – MVP** ✅ | Core CRUD, step estimation, SQLite, React SPA |
| 2 – Mobile | iOS/Android via sensor APIs, live GPS tracks |
| 3 – Social | Friends, leaderboards, challenge routes |
| 4 – AI Coach | Adaptive training plans, pace recommendations |
| 5 – Wearables | Smartwatch sync (Garmin, Apple Watch) |
