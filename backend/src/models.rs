use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Database row structs ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub height_cm: f64,
    pub stride_m: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Route {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub distance_m: f64,
    pub waypoints: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Activity {
    pub id: String,
    pub user_id: String,
    pub route_id: Option<String>,
    pub steps_actual: Option<i64>,
    pub steps_estimated: i64,
    pub distance_m: f64,
    pub duration_secs: i64,
    pub confidence: f64,
    pub is_estimated: i64,
    pub has_gps: i64,
    pub has_sensor: i64,
    pub started_at: String,
    pub completed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Achievement {
    pub id: String,
    pub user_id: String,
    pub kind: String,
    pub label: String,
    pub earned_at: String,
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
    pub height_cm: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub height_cm: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRouteRequest {
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub distance_m: f64,
    pub waypoints: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ListRoutesQuery {
    pub user_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateActivityRequest {
    pub user_id: String,
    pub route_id: Option<String>,
    pub steps_actual: Option<u64>,
    pub distance_m: f64,
    pub duration_secs: i64,
    pub has_gps: Option<bool>,
    pub has_sensor: Option<bool>,
    pub started_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListActivitiesQuery {
    pub user_id: Option<String>,
    pub limit: Option<i64>,
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub user_id: String,
    pub total_steps: i64,
    pub total_distance_m: f64,
    pub total_activities: i64,
    pub streak_days: i64,
    pub avg_confidence: f64,
    pub achievements: Vec<Achievement>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

pub fn new_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn now_utc() -> String {
    Utc::now().to_rfc3339()
}
