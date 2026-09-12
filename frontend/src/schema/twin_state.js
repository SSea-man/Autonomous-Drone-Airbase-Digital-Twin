/**
 * WareTwin Digital Twin State Specification
 *
 * Architecture Rules:
 *  1. Single source of truth mirrored in twin_state.py.
 *  2. Pure serializable state structures compatible with JSON snapshotting.
 *     Enables zero-overhead deep cloning for what-if simulations.
 *  3. Right-handed Cartesian coordinates in meters: X (length), Z (width), Y (height).
 *     Consistent with warehouse_layout.json.
 *  4. Simulation step: 1 tick = 100 ms fixed delta time.
 *     Wall clock time used strictly for UI rendering.
 *  5. Enumerations use uppercase string constants.
 */
// ─────────────────────────────────────────────────────────────
// Threshold constants shared between frontend and backend
// ─────────────────────────────────────────────────────────────
export const THRESHOLDS = {
    BATTERY_WARNING: 20,
    BATTERY_CRITICAL: 10,
    BATTERY_CHARGE_TO: 95,
    CONGESTION_WARNING: 0.6,
    CONGESTION_BLOCK: 0.85,
    TICK_MS: 100,
    EVENT_RING_SIZE: 500,
    THROUGHPUT_SERIES_SIZE: 120,
};
