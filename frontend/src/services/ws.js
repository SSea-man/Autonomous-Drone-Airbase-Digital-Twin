import { THRESHOLDS } from "../schema/twin_state";
import { useStore } from "../state/store";
const WS_URL = import.meta.env?.VITE_WS_URL ?? `ws://${location.hostname}:8000/ws`;
/** REST API base derived from WS_URL */
export const API_URL = WS_URL.replace(/^ws/, "http").replace(/\/ws$/, "");
const COLLECTIONS = ["tasks", "lifts", "zones", "conveyors", "cameras", "sensors", "people", "alerts"];
let socket = null;
let reconnectTimer = 0;
let stopped = false;
let localTick = -1;
let onStateChange = null;
const copilotListeners = new Set();
/** Subscribe to copilot replies; returns unsubscribe function */
export function onCopilotReply(fn) { copilotListeners.add(fn); return () => copilotListeners.delete(fn); }
const whatifListeners = new Set();
export function onWhatIfResult(fn) { whatifListeners.add(fn); return () => whatifListeners.delete(fn); }
const whatifErrorListeners = new Set();
/** Notify error handlers to reset simulation states on rejection */
export function onWhatIfError(fn) { whatifErrorListeners.add(fn); return () => whatifErrorListeners.delete(fn); }
/** Pending what-if request tracking ID */
let whatifPending = null;
export function markWhatIfPending(id) { whatifPending = id; }
export function wsSend(msg) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
        return true;
    }
    return false;
}
// Tab visibility change: request full snapshot when returning from background throttle
const onVisible = () => { if (document.visibilityState === "visible") {
    localTick = -1;
    wsSend({ type: "RESYNC" });
} };
export function wsConnect(onChange) {
    wsDisconnect(); // Cleanup previous connection on strict mode re-mount
    stopped = false;
    onStateChange = onChange;
    open();
    document.addEventListener("visibilitychange", onVisible);
}
export function wsDisconnect() {
    stopped = true;
    clearTimeout(reconnectTimer);
    document.removeEventListener("visibilitychange", onVisible);
    if (socket) {
        const s = socket;
        socket = null;
        s.onclose = null;
        s.onmessage = null;
        s.close();
    }
    onStateChange = null;
    localTick = -1;
}
function open() {
    if (stopped)
        return;
    onStateChange?.("connecting");
    let ws;
    try {
        // Handle mixed content security error gracefully
        ws = new WebSocket(WS_URL);
    }
    catch (e) {
        console.warn("[ws] cannot open", WS_URL, e, "— falling back to local engine");
        onStateChange?.("offline");
        return;
    }
    socket = ws;
    const timeout = window.setTimeout(() => { if (ws.readyState !== WebSocket.OPEN)
        ws.close(); }, 2500);
    ws.onopen = () => { clearTimeout(timeout); onStateChange?.("online"); };
    ws.onmessage = (ev) => handle(JSON.parse(ev.data));
    ws.onerror = () => { };
    ws.onclose = () => {
        clearTimeout(timeout);
        if (socket === ws)
            socket = null;
        if (whatifPending) {
            const id = whatifPending;
            whatifPending = null;
            whatifErrorListeners.forEach((fn) => fn("connection lost — please run again", id));
        }
        onStateChange?.("offline");
        if (!stopped)
            reconnectTimer = window.setTimeout(open, 3000);
    };
}
function handle(msg) {
    const st = useStore.getState();
    switch (msg.type) {
        case "FULL": {
            localTick = msg.state.sim.tick;
            st.setTwin(msg.state);
            syncControls(msg.state);
            break;
        }
        case "PATCH": {
            if (localTick >= 0 && msg.base_tick !== localTick && msg.base_tick !== msg.tick) {
                // Request full snapshot if ticks were missed during background sleep
                localTick = -1;
                wsSend({ type: "RESYNC" });
                return;
            }
            localTick = msg.tick;
            const next = applyPatch(st.twin, msg);
            st.setTwin(next);
            if (msg.patch.sim)
                syncControls(next);
            break;
        }
        case "HEATMAP":
            st.setHeat(msg.layer);
            break;
        case "COPILOT_REPLY":
            copilotListeners.forEach((fn) => fn(msg));
            break;
        case "WHATIF_RESULT":
            if (!msg.request_id || msg.request_id === whatifPending)
                whatifPending = null;
            whatifListeners.forEach((fn) => fn(msg.result));
            break;
        case "ERROR": {
            console.warn("[ws] server error", msg.code, msg.message);
            if (msg.code === "RATE_LIMITED" || msg.code === "TOO_LARGE" || msg.code === "BAD_TASK" || msg.code === "BAD_MESSAGE") {
                st.setNotice(`${msg.code === "RATE_LIMITED" ? "Rate limit" : msg.code === "TOO_LARGE" ? "Request too large" : msg.code === "BAD_TASK" ? "Task rejected" : "Rejected"}: ${msg.message}`);
                // Clear pending copilot state
                const rid = msg.request_id;
                if (rid)
                    copilotListeners.forEach((fn) => fn({ request_id: rid, text: `⏳ ${msg.message}`, citations: [] }));
                // Filter error by active what-if request ID
                if (whatifPending && rid === whatifPending) {
                    const id = whatifPending;
                    whatifPending = null;
                    whatifErrorListeners.forEach((fn) => fn(msg.message, id));
                }
            }
            break;
        }
        default: break;
    }
}
/** Server is authoritative for play/pause/speed state */
function syncControls(t) {
    const st = useStore.getState();
    if (st.speed !== t.sim.speed)
        st.setSpeed(t.sim.speed);
    const paused = t.sim.mode === "PAUSED";
    if (st.paused !== paused)
        st.setPaused(paused);
}
function applyPatch(prev, msg) {
    const p = msg.patch;
    const next = { ...prev };
    if (p.sim)
        next.sim = { ...prev.sim, ...p.sim };
    if (p.kpi)
        next.kpi = p.kpi;
    if (p.subsystems)
        next.subsystems = p.subsystems;
    if (p.recent_decisions)
        next.recent_decisions = p.recent_decisions;
    if (p.robots) {
        const robots = { ...prev.robots };
        for (const [id, d] of Object.entries(p.robots))
            robots[id] = { ...robots[id], ...d };
        next.robots = robots;
    }
    for (const key of COLLECTIONS) {
        const d = p[key];
        if (!d)
            continue;
        const col = { ...prev[key] };
        for (const [id, v] of Object.entries(d)) {
            if (v === null)
                delete col[id];
            else
                col[id] = v;
        }
        next[key] = col;
    }
    if (msg.events.length)
        next.recent_events = [...msg.events.slice().reverse(), ...prev.recent_events].slice(0, THRESHOLDS.EVENT_RING_SIZE);
    return next;
}
