use chrono::Utc;
use std::collections::HashSet;

use crate::models::Activity;

/// Count the current consecutive-day activity streak ending today.
pub fn compute_streak(activities: &[Activity]) -> i64 {
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
