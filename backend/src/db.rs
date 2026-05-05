use anyhow::Result;
use sqlx::{sqlite::{SqliteConnectOptions, SqlitePoolOptions}, SqlitePool};
use std::str::FromStr;

pub async fn create_pool(database_url: &str) -> Result<SqlitePool> {
    let connect_options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_options)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}
