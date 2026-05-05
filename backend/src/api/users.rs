use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::SqlitePool;

use crate::{
    error::{AppError, AppResult},
    models::{new_id, now_utc, CreateUserRequest, UpdateUserRequest, User},
};
use estimation::stride_length_from_height;

pub async fn create_user(
    State(pool): State<SqlitePool>,
    Json(req): Json<CreateUserRequest>,
) -> AppResult<Json<User>> {
    let id = new_id();
    let now = now_utc();
    let height_cm = req.height_cm.unwrap_or(170.0);
    let stride_m = stride_length_from_height(height_cm);

    sqlx::query(
        "INSERT INTO users (id, name, email, height_cm, stride_m, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&req.name)
    .bind(&req.email)
    .bind(height_cm)
    .bind(stride_m)
    .bind(&now)
    .bind(&now)
    .execute(&pool)
    .await?;

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&id)
        .fetch_one(&pool)
        .await?;

    Ok(Json(user))
}

pub async fn get_user(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<User>> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {id} not found")))?;

    Ok(Json(user))
}

pub async fn update_user(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(req): Json<UpdateUserRequest>,
) -> AppResult<Json<User>> {
    let mut user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {id} not found")))?;

    if let Some(name) = req.name {
        user.name = name;
    }
    if let Some(email) = req.email {
        user.email = email;
    }
    if let Some(height_cm) = req.height_cm {
        user.height_cm = height_cm;
        user.stride_m = stride_length_from_height(height_cm);
    }
    user.updated_at = now_utc();

    sqlx::query(
        "UPDATE users SET name=?, email=?, height_cm=?, stride_m=?, updated_at=? WHERE id=?",
    )
    .bind(&user.name)
    .bind(&user.email)
    .bind(user.height_cm)
    .bind(user.stride_m)
    .bind(&user.updated_at)
    .bind(&id)
    .execute(&pool)
    .await?;

    Ok(Json(user))
}
