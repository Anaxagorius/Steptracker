use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::SqlitePool;

use crate::{error::AppResult, models::Achievement};

pub async fn list_achievements(
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> AppResult<Json<Vec<Achievement>>> {
    let achievements = sqlx::query_as::<_, Achievement>(
        "SELECT * FROM achievements WHERE user_id = ? ORDER BY earned_at DESC",
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(achievements))
}
