use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::SqlitePool;

use crate::{
    error::{AppError, AppResult},
    models::{new_id, now_utc, CreateRouteRequest, ListRoutesQuery, Route},
};

pub async fn create_route(
    State(pool): State<SqlitePool>,
    Json(req): Json<CreateRouteRequest>,
) -> AppResult<Json<Route>> {
    let id = new_id();
    let now = now_utc();
    let waypoints = req
        .waypoints
        .map(|v| v.to_string())
        .unwrap_or_else(|| "[]".to_string());

    sqlx::query(
        "INSERT INTO routes (id, user_id, name, description, distance_m, waypoints, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&req.user_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.distance_m)
    .bind(&waypoints)
    .bind(&now)
    .execute(&pool)
    .await?;

    let route = sqlx::query_as::<_, Route>("SELECT * FROM routes WHERE id = ?")
        .bind(&id)
        .fetch_one(&pool)
        .await?;

    Ok(Json(route))
}

pub async fn list_routes(
    State(pool): State<SqlitePool>,
    Query(query): Query<ListRoutesQuery>,
) -> AppResult<Json<Vec<Route>>> {
    let routes = if let Some(user_id) = query.user_id {
        sqlx::query_as::<_, Route>(
            "SELECT * FROM routes WHERE user_id = ? ORDER BY created_at DESC",
        )
        .bind(&user_id)
        .fetch_all(&pool)
        .await?
    } else {
        sqlx::query_as::<_, Route>("SELECT * FROM routes ORDER BY created_at DESC")
            .fetch_all(&pool)
            .await?
    };

    Ok(Json(routes))
}

pub async fn get_route(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<Route>> {
    let route = sqlx::query_as::<_, Route>("SELECT * FROM routes WHERE id = ?")
        .bind(&id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Route {id} not found")))?;

    Ok(Json(route))
}
