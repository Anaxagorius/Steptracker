use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Utc;
use sqlx::SqlitePool;

use crate::{
    error::{AppError, AppResult},
    models::{new_id, now_utc, Activity, CreateActivityRequest, ListActivitiesQuery, User},
    utils::compute_streak,
};
use estimation::{estimate_steps, refine_stride_length};

pub async fn create_activity(
    State(pool): State<SqlitePool>,
    Json(req): Json<CreateActivityRequest>,
) -> AppResult<Json<Activity>> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&req.user_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", req.user_id)))?;

    let has_gps = req.has_gps.unwrap_or(false);
    let has_sensor = req.has_sensor.unwrap_or(false);

    let estimate = estimate_steps(
        req.distance_m,
        user.stride_m,
        req.steps_actual,
        has_gps,
        has_sensor,
    );

    let id = new_id();
    let now = now_utc();
    let completed_at = now.clone();
    let started_at = req.started_at.unwrap_or_else(|| now.clone());

    let steps_estimated = estimate.steps as i64;
    let is_estimated = if estimate.is_estimated { 1i64 } else { 0i64 };
    let has_gps_i = if has_gps { 1i64 } else { 0i64 };
    let has_sensor_i = if has_sensor { 1i64 } else { 0i64 };
    let steps_actual_i = req.steps_actual.map(|s| s as i64);

    sqlx::query(
        "INSERT INTO activities
         (id, user_id, route_id, steps_actual, steps_estimated, distance_m,
          duration_secs, confidence, is_estimated, has_gps, has_sensor, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&req.user_id)
    .bind(&req.route_id)
    .bind(steps_actual_i)
    .bind(steps_estimated)
    .bind(req.distance_m)
    .bind(req.duration_secs)
    .bind(estimate.confidence)
    .bind(is_estimated)
    .bind(has_gps_i)
    .bind(has_sensor_i)
    .bind(&started_at)
    .bind(&completed_at)
    .execute(&pool)
    .await?;

    // Refine stride length if actual steps provided
    if let Some(actual) = req.steps_actual {
        let new_stride = refine_stride_length(user.stride_m, actual, req.distance_m);
        let updated_at = now_utc();
        sqlx::query("UPDATE users SET stride_m=?, updated_at=? WHERE id=?")
            .bind(new_stride)
            .bind(&updated_at)
            .bind(&req.user_id)
            .execute(&pool)
            .await?;
    }

    let activity = sqlx::query_as::<_, Activity>("SELECT * FROM activities WHERE id = ?")
        .bind(&id)
        .fetch_one(&pool)
        .await?;

    award_achievements(&pool, &req.user_id).await?;

    Ok(Json(activity))
}

pub async fn list_activities(
    State(pool): State<SqlitePool>,
    Query(query): Query<ListActivitiesQuery>,
) -> AppResult<Json<Vec<Activity>>> {
    let limit = query.limit.unwrap_or(50);

    let activities = if let Some(user_id) = query.user_id {
        sqlx::query_as::<_, Activity>(
            "SELECT * FROM activities WHERE user_id = ? ORDER BY completed_at DESC LIMIT ?",
        )
        .bind(&user_id)
        .bind(limit)
        .fetch_all(&pool)
        .await?
    } else {
        sqlx::query_as::<_, Activity>(
            "SELECT * FROM activities ORDER BY completed_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(&pool)
        .await?
    };

    Ok(Json(activities))
}

pub async fn get_activity(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<Activity>> {
    let activity = sqlx::query_as::<_, Activity>("SELECT * FROM activities WHERE id = ?")
        .bind(&id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Activity {id} not found")))?;

    Ok(Json(activity))
}

async fn award_achievements(pool: &SqlitePool, user_id: &str) -> AppResult<()> {
    let activities = sqlx::query_as::<_, Activity>(
        "SELECT * FROM activities WHERE user_id = ? ORDER BY completed_at ASC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let existing: Vec<String> =
        sqlx::query_scalar("SELECT kind FROM achievements WHERE user_id = ?")
            .bind(user_id)
            .fetch_all(pool)
            .await?;

    let mut to_award: Vec<(&str, &str)> = Vec::new();

    // first_steps
    if !existing.contains(&"first_steps".to_string()) && !activities.is_empty() {
        to_award.push(("first_steps", "First Steps – completed your first activity"));
    }

    // century: ≥10,000 steps in any single day
    if !existing.contains(&"century".to_string()) {
        let today = Utc::now().date_naive().to_string();
        let today_steps: i64 = activities
            .iter()
            .filter(|a| a.completed_at.starts_with(&today))
            .map(|a| a.steps_actual.unwrap_or(a.steps_estimated))
            .sum();
        if today_steps >= 10_000 {
            to_award.push(("century", "Century – 10,000 steps in a day"));
        }
    }

    // marathon: lifetime distance ≥ 42,195 m
    if !existing.contains(&"marathon".to_string()) {
        let total_dist: f64 = activities.iter().map(|a| a.distance_m).sum();
        if total_dist >= 42_195.0 {
            to_award.push(("marathon", "Marathon – 42 km lifetime distance"));
        }
    }

    // streak_7: 7 consecutive days with at least one activity
    if !existing.contains(&"streak_7".to_string()) {
        let streak = compute_streak(&activities);
        if streak >= 7 {
            to_award.push(("streak_7", "On a Roll – 7-day activity streak"));
        }
    }

    for (kind, label) in to_award {
        let id = new_id();
        let now = now_utc();
        sqlx::query(
            "INSERT OR IGNORE INTO achievements (id, user_id, kind, label, earned_at)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(user_id)
        .bind(kind)
        .bind(label)
        .bind(&now)
        .execute(pool)
        .await?;
    }

    Ok(())
}
