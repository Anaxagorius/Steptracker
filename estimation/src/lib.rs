/// Initialise stride length (metres) from height (cm).
/// Uses 0.414 × height (average of male 0.415 and female 0.413).
pub fn stride_length_from_height(height_cm: f64) -> f64 {
    height_cm * 0.414 / 100.0
}

/// Convert a route distance (metres) to estimated step count.
pub fn distance_to_steps(distance_m: f64, stride_length_m: f64) -> u64 {
    if stride_length_m <= 0.0 {
        return 0;
    }
    (distance_m / stride_length_m).round() as u64
}

/// Confidence score 0.0–1.0 based on data quality flags.
pub fn confidence_score(has_gps: bool, has_sensor: bool) -> f64 {
    match (has_gps, has_sensor) {
        (true, true) => 0.95,
        (true, false) => 0.75,
        (false, true) => 0.80,
        (false, false) => 0.50,
    }
}

/// Refine stride length: 80% new observation, 20% prior.
pub fn refine_stride_length(prior_m: f64, actual_steps: u64, distance_m: f64) -> f64 {
    if actual_steps == 0 {
        return prior_m;
    }
    let observed = distance_m / actual_steps as f64;
    0.8 * observed + 0.2 * prior_m
}

/// Bundles an estimation result.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StepEstimate {
    pub steps: u64,
    pub stride_length_m: f64,
    pub confidence: f64,
    pub is_estimated: bool,
}

/// Estimate steps for a route.
/// If `actual_steps` is Some, it is used as the verified count;
/// otherwise steps are estimated from distance.
pub fn estimate_steps(
    distance_m: f64,
    stride_length_m: f64,
    actual_steps: Option<u64>,
    has_gps: bool,
    has_sensor: bool,
) -> StepEstimate {
    let confidence = confidence_score(has_gps, has_sensor);
    match actual_steps {
        Some(steps) => StepEstimate {
            steps,
            stride_length_m,
            confidence,
            is_estimated: false,
        },
        None => StepEstimate {
            steps: distance_to_steps(distance_m, stride_length_m),
            stride_length_m,
            confidence,
            is_estimated: true,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stride_length_reasonable() {
        let s = stride_length_from_height(170.0);
        assert!((s - 0.7038).abs() < 0.001);
    }

    #[test]
    fn distance_to_steps_basic() {
        assert_eq!(distance_to_steps(1000.0, 0.70), 1429);
    }

    #[test]
    fn confidence_both() {
        assert_eq!(confidence_score(true, true), 0.95);
    }

    #[test]
    fn refine_blends() {
        let r = refine_stride_length(0.70, 1000, 750.0);
        assert!((r - 0.74).abs() < 0.001);
    }
}
