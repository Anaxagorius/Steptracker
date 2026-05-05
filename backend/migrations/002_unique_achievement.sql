-- Enforce that each user can only earn each achievement kind once.
-- Deduplicate any existing rows (keep the earliest earned_at per user+kind),
-- then create a unique index.
DELETE FROM achievements
WHERE rowid NOT IN (
    SELECT MIN(rowid)
    FROM achievements
    GROUP BY user_id, kind
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_achievements_user_kind
    ON achievements (user_id, kind);
