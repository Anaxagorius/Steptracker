mod api;
mod db;
mod error;
mod models;
mod utils;

use axum::{
    routing::{get, post},
    Router,
};
use std::env;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "backend=debug,tower_http=debug".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url =
        env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://stridequest.db".to_string());

    let pool = db::create_pool(&database_url).await?;

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Users
        .route("/api/users", post(api::users::create_user))
        .route(
            "/api/users/:id",
            get(api::users::get_user).put(api::users::update_user),
        )
        // Routes
        .route(
            "/api/routes",
            post(api::routes::create_route).get(api::routes::list_routes),
        )
        .route("/api/routes/:id", get(api::routes::get_route))
        // Activities
        .route(
            "/api/activities",
            post(api::activities::create_activity).get(api::activities::list_activities),
        )
        .route("/api/activities/:id", get(api::activities::get_activity))
        // Dashboard
        .route(
            "/api/dashboard/:user_id",
            get(api::dashboard::get_dashboard),
        )
        // Achievements
        .route(
            "/api/achievements/:user_id",
            get(api::achievements::list_achievements),
        )
        // Static frontend
        .fallback_service(ServeDir::new("../frontend/dist"))
        .with_state(pool)
        .layer(cors);

    let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".to_string());
    tracing::info!("Listening on {}", bind_addr);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
