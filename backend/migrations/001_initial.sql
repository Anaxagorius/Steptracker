CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    height_cm   REAL NOT NULL DEFAULT 170.0,
    stride_m    REAL NOT NULL DEFAULT 0.70,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    description TEXT,
    distance_m  REAL NOT NULL,
    waypoints   TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    route_id        TEXT REFERENCES routes(id),
    steps_actual    INTEGER,
    steps_estimated INTEGER NOT NULL,
    distance_m      REAL NOT NULL,
    duration_secs   INTEGER NOT NULL,
    confidence      REAL NOT NULL,
    is_estimated    INTEGER NOT NULL DEFAULT 1,
    has_gps         INTEGER NOT NULL DEFAULT 0,
    has_sensor      INTEGER NOT NULL DEFAULT 0,
    started_at      TEXT NOT NULL,
    completed_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS achievements (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    kind        TEXT NOT NULL,
    label       TEXT NOT NULL,
    earned_at   TEXT NOT NULL
);
