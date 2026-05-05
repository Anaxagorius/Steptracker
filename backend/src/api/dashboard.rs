use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::SqlitePool;

use crate::{
    error::AppResult,
    models::{Achievement, Activity, DashboardResponse},
};

pub async fn get_dashboard(
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> AppResult<Json<DashboardResponse>> {
    let activities = sqlx::query_as::<_, Activity>(
        "SELECT * FROM activities WHERE user_id = ? ORDER BY completed_at ASC",
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await?;

    let total_steps: i64 = activities
        .iter()
        .map(|a| a.steps_actual.unwrap_or(a.steps_estimated))
        .sum();

    let total_distance_m: f64 = activities.iter().map(|a| a.distance_m).sum();
    let total_activities = activities.len() as i64;

    let avg_confidence = if activities.is_empty() {
        0.0
    } else {
        activities.iter().map(|a| a.confidence).sum::<f64>() / activities.len() as f64
    };

    let streak_days = compute_streak(&activities);

    let achievements = sqlx::query_as::<_, Achievement>(
        "SELECT * FROM achievements WHERE user_id = ? ORDER BY earned_at DESC",
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(DashboardResponse {
        user_id: user_id.clone(),
        total_steps,
        total_distance_m,
        total_activities,
        streak_days,
        avg_confidence,
        achievements,
    }))
}

fn compute_streak(activities: &[Activity]) -> i64 {
    use chrono::Utc;
    use std::collections::HashSet;

    let days: HashSet<String> = activities
        .iter()
        .map(|a| a.completed_at[..10].to_string())
        .collect();

    let mut streak = 0i64;
    let mut current = Utc::now().date_naive();
    loop {
        if days.contains(&current.to_string()) {
            streak += 1;
            current = current.pred_opt().unwrap_or(current);
        } else {
            break;
        }
    }
    streak
}
