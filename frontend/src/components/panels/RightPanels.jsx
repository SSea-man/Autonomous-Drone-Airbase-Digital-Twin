import { useEffect, useMemo, useRef, useState } from "react";
import { AutonomousOperationsPanel } from "./AutonomousOperationsPanel";
import { DroneHangarPanel } from "./DroneHangarPanel";
import { API_URL } from "../../services/ws";
import { Canvas } from "@react-three/fiber";
import { STATUS_COLOR, SEVERITY_COLOR, layout, tickToClock, useStore } from "../../state/store";
import { Dot, Panel } from "../ui/primitives";
import { RobotMesh } from "../scene/Robots";
import { SceneContent } from "../scene/Scene3D";
function RobotThumb({ status }) {
    const r = useMemo(() => ({ id: "", model: "UAV-Cargo-X4", floor: 1, lift_id: null, lift_stage: null, position: [0, 0, 0], heading: 0.6, velocity: 0, max_speed: 1.5, battery: 100, status: status, fsm: "IDLE", health: 100, current_task_id: null, destination: null, path: [], path_index: 0, load: { current: 0, capacity: 4 }, zone: null, eta_s: null, fsm_since_tick: 0, stats: { distance_m: 0, tasks_completed: 0, energy_wh: 0, busy_ticks: 0, wait_ticks: 0 }, perception: { state: "CLEAR", ahead_m: 4, nearest_m: null, obstacles: [] } }), [status]);
    return (<Canvas resize={{ offsetSize: true }} dpr={1} camera={{ position: [1.8, 1.4, 1.8], fov: 32 }} gl={{ alpha: true, antialias: true }} style={{ background: "transparent" }}>
      <ambientLight intensity={0.9}/><directionalLight position={[3, 5, 2]} intensity={2.5}/><pointLight position={[-2, 1, -2]} color="#60a5fa" intensity={4}/>
      <group position={[0, -0.2, 0]}><RobotMesh r={r} selected={false} onSelect={() => { }} showLabel={false} lite smooth={false}/></group>
    </Canvas>);
}
/** Elevator status telemetry inspector panel */
function LiftPanel({ id }) {
    const L = useStore((s) => s.twin.lifts[id]);
    const selectLift = useStore((s) => s.selectLift);
    const select = useStore((s) => s.select);
    const focus = useStore((s) => s.focus);
    const lay = layout.lifts.find((l) => l.id === id);
    const tick = useStore((s) => s.twin.sim.tick);
    if (!L || !lay)
        return null;
    const q1 = L.queue["1"] ?? [], q2 = L.queue["2"] ?? [];
    const moving = L.state === "MOVING_UP" || L.state === "MOVING_DOWN";
    const eta = moving ? Math.max(0, (L.until_tick - tick) / 10).toFixed(1) : null;
    const util = tick ? Math.round((L.busy_ticks / tick) * 100) : 0;
    const avgWait = L.wait_n ? ((L.wait_total_ticks / L.wait_n) / 10).toFixed(1) : "—";
    const cite = (rid) => <button key={rid} className="cite" onClick={() => select(rid)}>{rid}</button>;
    return (<Panel title={id} sub="Freight lift" action={<button className="link" onClick={() => selectLift(null)}>✕</button>}>
      <div className="kv"><span className="k">State</span><span className="v" style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: L.fault ? "#ef4444" : undefined }}>{L.fault ? "FAULT" : L.state.replace(/_/g, " ")}{eta ? ` · ETA ${eta}s` : ""}</span></div>
      <div className="kv"><span className="k">Floor</span><span className="v">{L.floor === null ? `${L.state === "MOVING_UP" ? "F1 → F2" : "F2 → F1"}` : `F${L.floor}`}</span></div>
      <div className="kv"><span className="k">Occupied by</span><span className="v">{L.occupant ? cite(L.occupant) : "—"}</span></div>
      <div className="kv"><span className="k">Reserved by</span><span className="v">{L.reserved_by ? cite(L.reserved_by) : "—"}</span></div>
      <div className="kv"><span className="k">F1 queue</span><span className="v">{q1.length ? q1.map(cite) : "—"}</span></div>
      <div className="kv"><span className="k">F2 queue</span><span className="v">{q2.length ? q2.map(cite) : "—"}</span></div>
      <div className="kv"><span className="k">Trips</span><span className="v">{L.trips}</span></div>
      <div className="kv"><span className="k">Avg wait</span><span className="v">{avgWait}{L.wait_n ? " s" : ""}</span></div>
      <div className="kv"><span className="k">Utilization</span><span className="v">{util}%</span></div>
      {L.fault && <div className="hint" style={{ color: "#fca5a5" }}>Fault active — robots re-routing to another lift</div>}
      <button className="btn-outline" onClick={() => focus([lay.cell[0] + 0.5, 4, lay.cell[1] + 0.5])}>Focus camera</button>
    </Panel>);
}
export function SelectedRobotPanel() {
    const [activeTab, setActiveTab] = useState("AUTONOMOUS_OPS");
    const id = useStore((s) => s.selectedRobot);
    const liftId = useStore((s) => s.selectedLift);
    if (liftId && !id)
        return <LiftPanel id={liftId}/>;
    if (id)
        return <RobotPanel id={id}/>;
    return (<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{
            display: "flex",
            gap: "3px",
            background: "var(--panel-2)",
            padding: "2px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
        }}>
        <button
          className={"chip" + (activeTab === "AUTONOMOUS_OPS" ? " on" : "")}
          style={{ flex: 1, padding: "4px 6px", fontSize: "10.5px", fontWeight: 600, textAlign: "center" }}
          onClick={() => setActiveTab("AUTONOMOUS_OPS")}
        >
          Autonomous Ops
        </button>
        <button
          className={"chip" + (activeTab === "HANGAR" ? " on" : "")}
          style={{ flex: 1, padding: "4px 6px", fontSize: "10.5px", fontWeight: 600, textAlign: "center" }}
          onClick={() => setActiveTab("HANGAR")}
        >
          160 Dock Racks
        </button>
      </div>

      {activeTab === "AUTONOMOUS_OPS" ? (<AutonomousOperationsPanel />) : (<DroneHangarPanel />)}
    </div>);
}
export function RobotPanel({ id }) {
    const r = useStore((s) => s.twin.robots[id]);
    const task = useStore((s) => (r?.current_task_id ? s.twin.tasks[r.current_task_id] : null));
    const setModal = useStore((s) => s.setModal);
    const locs = useStore((s) => s.locations);
    const pretty = (loc) => {
        if (!loc)
            return "—";
        const l = locs[loc];
        if (!l)
            return loc;
        if (l.kind === "SHELF")
            return `Shelf ${loc.replace("SHELF-", "")}`;
        if (l.kind === "PACKING")
            return "Packing Station";
        return loc.replace(/-/g, " ");
    };
    if (!r)
        return <Panel title="Selected Drone"><div style={{ color: "var(--muted)", padding: "12px 0" }}>Click a warehouse drone in the 3D view</div></Panel>;
    const col = STATUS_COLOR[r.status];
    const estH = (r.battery / 100) * 3.1;
    const batteryStr = r.battery.toFixed(r.battery < 10 ? 1 : 0);
    return (<Panel title={r.id} sub={r.model} action={<div style={{ display: "flex", alignItems: "center", gap: 6 }}><Dot color={col}/><span style={{ fontFamily: "var(--mono)", fontSize: 11, color: col }}>{r.status}</span></div>}>
      <div style={{ height: 110, margin: "-4px 0 8px" }}><RobotThumb status={r.status}/></div>
      <div className="kv"><span className="k">Battery</span><span className="v" style={{ color: r.battery < 20 ? "#ef4444" : undefined }}>{batteryStr}% · ~{estH.toFixed(1)}h left</span></div>
      <div className="kv"><span className="k">Floor</span><span className="v">F{r.floor}{r.lift_id ? ` (in lift ${r.lift_id})` : ""}</span></div>
      <div className="kv"><span className="k">Health</span><span className="v">{r.health}%</span></div>
      <div className="kv"><span className="k">Speed</span><span className="v">{r.velocity.toFixed(2)} m/s (max {r.max_speed})</span></div>
      <div className="kv"><span className="k">Current task</span><span className="v">{task ? <button className="cite" onClick={() => setModal("tasks")}>{task.id}</button> : "None"}</span></div>
      <div className="kv"><span className="k">Destination</span><span className="v">{pretty(r.destination)}</span></div>
      <div className="kv"><span className="k">Zone</span><span className="v">{r.zone ?? "—"}</span></div>
      <div className="kv"><span className="k">Perception</span><span className="v" style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: PERC_COLOR[r.perception?.state ?? "OFF"] }} title="Virtual LiDAR 270° / 4 m">{percText(r)}</span></div>
      <button className="btn-outline" onClick={() => setModal("robot")}>View Details</button>
    </Panel>);
}
export const PERC_COLOR = { CLEAR: "#22d3ee", SLOWING: "#f59e0b", STOPPED: "#ef4444", OFF: "#64748b" };
export function percText(r) {
    const P = r.perception;
    if (!P || P.state === "OFF")
        return "OFF";
    const dyn = P.obstacles.find((o) => o.kind !== "RACK");
    const who = dyn ? ` · ${dyn.id} ${dyn.distance_m.toFixed(1)} m` : "";
    return `${P.state} · ahead ${P.ahead_m.toFixed(1)} m${who}`;
}
export function LiveCameraPanel() {
    const active = useStore((s) => s.activeCamera);
    const setActive = useStore((s) => s.setActiveCamera);
    const camStatus = useStore((s) => s.twin.cameras);
    const cam = layout.cameras.find((c) => c.id === active) ?? layout.cameras[0];
    const isDock = cam.id.startsWith("CAM-DOCK");
    const groups = [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"], ["M", "F2"], ["DOCK", "Dock"]];
    const camsOf = (g) => layout.cameras.filter((c) => (g === "DOCK" ? c.id.startsWith("CAM-DOCK") : !c.id.startsWith("CAM-DOCK") && c.zone === g));
    const curGroup = isDock ? "DOCK" : cam.zone;
    const zoneCams = camsOf(curGroup);
    const offline = camStatus[cam.id]?.status === "OFFLINE";
    const source = useStore((s) => s.source);
    const obs = camStatus[cam.id]?.last_observation ?? null;
    const glRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const [auto, setAuto] = useState(false);
    const [err, setErr] = useState(null);
    const analyze = async () => {
        if (busyRef.current || offline)
            return;
        busyRef.current = true;
        setBusy(true);
        setErr(null);
        try {
            let image_b64;
            const gl = glRef.current;
            if (gl) {
                const src = gl.domElement;
                const c = document.createElement("canvas");
                c.width = 512;
                c.height = Math.round(512 * src.height / src.width);
                c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
                image_b64 = c.toDataURL("image/jpeg", 0.7);
            }
            if (source !== "online")
                throw new Error("backend offline");
            const r = await fetch(`${API_URL}/api/vlm/observe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ camera_id: cam.id, image_b64 }) });
            if (!r.ok)
                throw new Error(await r.text());
        }
        catch (e) {
            setErr(e.message.slice(0, 80));
        }
        finally {
            busyRef.current = false;
            setBusy(false);
        }
    };
    useEffect(() => {
        if (!auto)
            return;
        const t = setInterval(analyze, 5000);
        return () => clearInterval(t); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auto, cam.id, source]);
    return (<Panel title={isDock ? "Camera · Dock" : `Camera · Zone ${cam.zone}`} action={<span className="cam-tabs">{groups.map(([g, l]) => <button key={g} className={curGroup === g ? "on" : ""} onClick={() => setActive(camsOf(g)[0].id)}>{l}</button>)}</span>}>
      <div className="cam-view">
        <Canvas resize={{ offsetSize: true }} dpr={1} camera={{ position: cam.position, fov: cam.fov_deg, near: 0.3, far: 120 }} gl={{ antialias: false, powerPreference: "low-power", preserveDrawingBuffer: true }} onCreated={({ camera, gl }) => { camera.lookAt(...cam.look_at); glRef.current = gl; }} key={cam.id} frameloop="always">
          <SceneContent quality="low" lite/>
        </Canvas>
        {offline ? <div className="cam-offline">NO SIGNAL<br /><small>{cam.id} offline</small></div> : <span className="live">LIVE</span>}
        <span className="tag">{cam.id}</span>
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,.12) 3px 4px)", pointerEvents: "none" }}/>
        {obs && obs.bbox && obs.event !== "none" && (<div className="vlm-box" style={{ left: `${obs.bbox[0] * 100}%`, top: `${obs.bbox[1] * 100}%`, width: `${obs.bbox[2] * 100}%`, height: `${obs.bbox[3] * 100}%` }}><span>{obs.event.replace("_", " ")} {Math.round(obs.confidence * 100)}%</span></div>)}
        {busy && <div className="vlm-scan"/>}
      </div>
      <div className="vlm-bar">
        <button className={"btn" + (busy ? " busy" : "")} onClick={analyze} disabled={busy || offline} title="Send this frame to the VLM">{busy ? "Analysing…" : "Analyze"}</button>
        <label className="auto"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)}/> auto 5s</label>
        <span className={"vlm-result " + (obs ? (obs.event === "none" ? "ok" : "alert") : "")}>
          {err ? <span className="err">{err}</span> : obs ? `${obs.event === "none" ? "clear" : obs.event.replace("_", " ")} · ${Math.round(obs.confidence * 100)}%${obs.raw?.startsWith("simulated") ? " · sim" : ""}` : "no observation yet"}
        </span>
      </div>
      <div className="cam-dots">
        {zoneCams.map((c) => <button key={c.id} className={c.id === cam.id ? "on" : ""} onClick={() => setActive(c.id)} title={c.id}/>)}
      </div>
    </Panel>);
}
export function EventLogPanel() {
    const events = useStore((s) => s.twin.recent_events);
    const select = useStore((s) => s.select);
    const setModal = useStore((s) => s.setModal);
    return (<Panel title="Event Log" grow action={<button className="link" onClick={() => setModal("audit")}>View All</button>}>
      {events.filter((e) => e.severity !== "LOW").slice(0, 8).map((e) => {
            const col = e.severity === "INFO" || e.severity === "LOW" ? undefined : SEVERITY_COLOR[e.severity];
            return (<div key={e.id} className="ev-row" onClick={() => e.robot_id && select(e.robot_id)}>
            <span className="t" style={{ color: col }}>{tickToClock(e.tick, 100, true).slice(0, 8)}</span>
            <span style={{ color: col }}>{e.message}</span>
          </div>);
        })}
    </Panel>);
}
