import { create } from "zustand";
import layoutJson from "../layout/warehouse_layout.json";
export const layout = layoutJson;
/** Initial empty TwinState structure */
const EMPTY = {
    schema_version: "1.0", layout_id: layout.id,
    sim: { tick: 0, tick_ms: 100, speed: 1, mode: "PAUSED", seed: 42, baseline_snapshot_id: null },
    robots: {}, tasks: {}, lifts: {}, zones: {}, conveyors: {}, cameras: {}, sensors: {}, people: {}, alerts: {}, recent_events: [], recent_decisions: [],
    kpi: { tick: 0, fleet: { total: 0, active: 0, charging: 0, idle: 0, warning: 0, error: 0, offline: 0 }, operation: { throughput_per_min: 0, completed_today: 0, completed_target: 150, pending: 0, ongoing: 0, avg_task_time_s: 0, on_time_rate: 1, avg_utilization: 0 }, efficiency: { avg_travel_distance_m: 0, avg_wait_time_s: 0, congestion_index: 0, energy_kwh: 0 }, throughput_series: [], lifts: { trips: 0, utilization: 0, avg_wait_s: 0, faults: 0 } },
    subsystems: { WAREHOUSE: "NORMAL", CONVEYORS: "NORMAL", CHARGING: "NORMAL", CCTV: "NORMAL", NETWORK: "NORMAL" },
};
export const useStore = create((set) => ({
    twin: EMPTY,
    speed: 1, paused: false, seed: 42,
    source: "connecting",
    setSource: (source) => set({ source }),
    modal: null,
    setModal: (modal) => set({ modal }),
    notice: null,
    setNotice: (text, kind = "warn") => set({ notice: text ? { text, kind, until: Date.now() + 4000 } : null }),
    activeFloor: "all",
    setActiveFloor: (activeFloor) => set({ activeFloor }),
    selectedLift: null,
    selectLift: (selectedLift) => set(selectedLift ? { selectedLift, selectedRobot: null } : { selectedLift }),
    whatif: null,
    setWhatIf: (whatif) => set({ whatif }),
    drawer: null,
    setDrawer: (drawer) => set((st) => ({ drawer: st.drawer === drawer ? null : drawer })),
    heat: null,
    setHeat: (l) => set((st) => (l === null ? { heat: null } : { heat: { ...(st.heat ?? {}), [`${l.kind}:${l.floor ?? 1}`]: l } })),
    setSpeed: (speed) => set({ speed, paused: speed === 0 }),
    setPaused: (paused) => set({ paused }),
    locations: Object.fromEntries(layout.locations.map((l) => [l.id, l])),
    selectedRobot: null,
    viewTab: "3D",
    quality: "medium",
    showPaths: true,
    showLabels: true,
    tool: "select",
    focusTarget: null,
    focusCameraPos: null,
    activeCamera: "CAM-B01",
    select: (id) => set(id ? { selectedRobot: id, selectedLift: null } : { selectedRobot: id }),
    setViewTab: (viewTab) => set({ viewTab }),
    setQuality: (quality) => set({ quality }),
    setTool: (tool) => set({ tool }),
    togglePaths: () => set((s) => ({ showPaths: !s.showPaths })),
    toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
    focus: (focusTarget, focusCameraPos = null) => set({ focusTarget, focusCameraPos }),
    setActiveCamera: (activeCamera) => set({ activeCamera }),
    setTwin: (twin) => set({ twin }),
}));
/** Status code to theme color mapping */
export const STATUS_COLOR = {
    ACTIVE: "#22c55e", CHARGING: "#3b82f6", IDLE: "#eab308", WARNING: "#f97316", ERROR: "#ef4444", OFFLINE: "#6b7280",
};
export const SEVERITY_COLOR = {
    INFO: "#3b82f6", LOW: "#3b82f6", MEDIUM: "#3b82f6", HIGH: "#eab308", CRITICAL: "#ef4444",
};
export const ZONE_COLOR = Object.fromEntries(layout.zones.map((z) => [z.id, z.color]));
/** Simulation clock starting at 08:00:00 */
export const SIM_START_S = 8 * 3600;
export function tickToClock(tick, tickMs = 100, withSeconds = false) {
    const s = Math.max(0, Math.floor(SIM_START_S + (tick * tickMs) / 1000));
    const hh = Math.floor(s / 3600) % 24, mm = Math.floor((s % 3600) / 60), ss = s % 60;
    const p = (n) => String(n).padStart(2, "0");
    return withSeconds ? `${p(hh)}:${p(mm)}:${p(ss)}` : `${p(hh)}:${p(mm)}`;
}
