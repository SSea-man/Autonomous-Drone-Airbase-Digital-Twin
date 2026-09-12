/**
 * Dual-source simulation coordinator
 *  - Connects to backend WebSocket when online; state driven by FULL/PATCH events.
 *  - Seamless fallback to local in-browser simulation engine when offline.
 *  Dispatches simulation controls (play, pause, speed, inject) to active engine.
 */
import { useEffect } from "react";
import { SimEngine, SIM } from "./engine";
import { layout, useStore } from "../state/store";
import { wsConnect, wsDisconnect, wsSend } from "../services/ws";
let engine = null;
export function getEngine() {
    if (!engine)
        engine = new SimEngine(layout, { seed: useStore.getState().seed });
    return engine;
}
export function resetEngine(seed) {
    engine = new SimEngine(layout, { seed: seed ?? useStore.getState().seed });
    useStore.getState().setTwin(engine.snapshot());
    return engine;
}
/** Unified control interface routing to WebSocket or local engine */
export const simControl = {
    play(speed) {
        const st = useStore.getState();
        st.setPaused(false);
        if (speed)
            st.setSpeed(speed);
        else if (st.speed === 0)
            st.setSpeed(1);
        if (st.source === "online")
            wsSend({ type: "SIM_CONTROL", action: "PLAY", speed: speed ?? (st.speed === 0 ? 1 : st.speed) });
    },
    pause() {
        useStore.getState().setPaused(true);
        if (useStore.getState().source === "online")
            wsSend({ type: "SIM_CONTROL", action: "PAUSE" });
    },
    reset() {
        const st = useStore.getState();
        if (st.source === "online")
            wsSend({ type: "SIM_CONTROL", action: "RESET" });
        else
            resetEngine();
    },
    inject(injection) {
        const st = useStore.getState();
        if (st.source === "online")
            wsSend({ type: "INJECT", injection });
        else
            getEngine().inject(injection);
    },
    createTask(task) {
        const st = useStore.getState();
        if (st.source === "online") {
            wsSend({ type: "CREATE_TASK", task: { load_units: 1, ...task } });
            return;
        }
        try {
            getEngine().createTask(task);
        }
        catch (e) {
            st.setNotice(`Task rejected: ${e.message}`);
        }
    },
    clearInjection(kind, target_id) {
        const st = useStore.getState();
        if (st.source === "online")
            wsSend({ type: "CLEAR_INJECTION", kind, target_id });
        else
            getEngine().clearInjection(kind, target_id);
    },
    ackAlert(alert_id) {
        const st = useStore.getState();
        if (st.source === "online")
            wsSend({ type: "ACK_ALERT", alert_id });
        else
            getEngine().ackAlert(alert_id);
    },
};
export function useSimulationRunner() {
    useEffect(() => {
        const st = useStore.getState();
        let raf = 0, last = performance.now(), acc = 0;
        const MAX_TICKS_PER_FRAME = 40;
        // Local simulation loop; advances only when disconnected
        const loop = (now) => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.25, (now - last) / 1000);
            last = now;
            const s = useStore.getState();
            if (s.source === "online") {
                acc = 0;
                return;
            }
            if (s.paused || s.speed === 0)
                return;
            const eng = getEngine();
            acc += dt * s.speed;
            let n = 0;
            while (acc >= SIM.TICK_S && n < MAX_TICKS_PER_FRAME) {
                eng.step();
                acc -= SIM.TICK_S;
                n++;
            }
            if (n > 0) {
                eng.state.sim.speed = s.speed;
                eng.state.sim.mode = "LIVE";
                s.setTwin(eng.snapshot());
            }
        };
        // Initialize local engine snapshot to prevent blank frame on mount
        st.setTwin(getEngine().snapshot());
        raf = requestAnimationFrame(loop);
        wsConnect((conn) => {
            const s = useStore.getState();
            if (conn === "online") {
                s.setSource("online");
                s.setHeat(null);
            }
            else if (conn === "offline") {
                // Handover state to local engine upon disconnection to preserve continuity
                if (s.source === "online") {
                    engine = new SimEngine(layout, { seed: s.seed, initialState: s.twin });
                    s.setHeat(null);
                }
                s.setSource("local");
            }
            else {
                if (s.source !== "online")
                    s.setSource("connecting");
            }
        });
        // Clean up WebSocket and listeners on unmount
        return () => { cancelAnimationFrame(raf); wsDisconnect(); };
    }, []);
}
