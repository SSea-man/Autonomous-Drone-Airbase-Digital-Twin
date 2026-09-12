import { useDroneHangarStore } from "../../state/droneHangarStore";
import { useStore } from "../../state/store";
export function LiveStateInspector() {
    const inspectorOpen = useDroneHangarStore((s) => s.inspectorOpen);
    const toggleInspector = useDroneHangarStore((s) => s.toggleInspector);
    const selectedDroneId = useDroneHangarStore((s) => s.selectedDroneId);
    const drones = useDroneHangarStore((s) => s.drones);
    const tick = useStore((s) => s.twin.sim.tick);
    if (!inspectorOpen)
        return null;
    const drone = selectedDroneId ? drones[selectedDroneId] : Object.values(drones)[0];
    if (!drone)
        return null;
    return (<div style={{
            position: "absolute",
            top: "70px",
            left: "320px",
            width: "360px",
            background: "rgba(10, 15, 29, 0.92)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(0, 240, 255, 0.4)",
            borderRadius: "8px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 240, 255, 0.2)",
            padding: "12px",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            color: "#e2e8f0",
            zIndex: 50,
            pointerEvents: "auto",
        }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0, 240, 255, 0.2)", paddingBottom: "6px", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00f0ff", boxShadow: "0 0 8px #00f0ff" }}/>
          <span style={{ fontWeight: "bold", color: "#00f0ff", fontSize: "12px" }}>OPERATOR LIVE STATE INSPECTOR</span>
        </div>
        <button onClick={toggleInspector} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "14px", padding: "0 4px" }}>
          ✕
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
        <div>
          <div style={{ color: "var(--muted)", fontSize: "9px" }}>TARGET DRONE ID</div>
          <div style={{ color: "#ffffff", fontWeight: "bold", fontSize: "13px" }}>{drone.id}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted)", fontSize: "9px" }}>FIRMWARE / AP</div>
          <div style={{ color: "#38bdf8" }}>{drone.firmware}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted)", fontSize: "9px" }}>PRIMARY STATUS</div>
          <div style={{ color: "#4ade80", fontWeight: "bold" }}>{drone.status}</div>
        </div>
        <div>
          <div style={{ color: "var(--muted)", fontSize: "9px" }}>OPERATIONAL PHASE</div>
          <div style={{ color: "#00f0ff", fontWeight: "bold" }}>{drone.phase}</div>
        </div>
      </div>

      <div style={{ background: "rgba(0, 0, 0, 0.4)", borderRadius: "4px", padding: "6px", marginBottom: "8px", fontSize: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "var(--muted)" }}>Current Facility:</span>
          <span style={{ color: "#facc15" }}>{drone.currentFacility}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "var(--muted)" }}>Assigned Dock / Pad:</span>
          <span style={{ color: "#38bdf8" }}>{drone.currentPadId || drone.assignedSlot.bayLabel}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "var(--muted)" }}>Coordinates:</span>
          <span style={{ color: "#e2e8f0" }}>X:{drone.currentPosition[0].toFixed(1)} Y:{drone.currentPosition[1].toFixed(1)} Z:{drone.currentPosition[2].toFixed(1)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>Sim Engine Tick:</span>
          <span style={{ color: "#a855f7" }}>T+{tick} (Deterministic)</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", textAlign: "center", marginBottom: "8px", background: "rgba(0, 0, 0, 0.3)", padding: "4px", borderRadius: "4px" }}>
        <div>
          <div style={{ color: "var(--muted)", fontSize: "9px" }}>BATTERY</div>
          <div style={{ color: drone.battery > 30 ? "#4ade80" : "#f59e0b", fontWeight: "bold" }}>{drone.battery}%</div>
        </div>
        <div>
          <div style={{ color: "var(--muted)", fontSize: "9px" }}>ALTITUDE</div>
          <div style={{ color: "#38bdf8", fontWeight: "bold" }}>{drone.altitude}m</div>
        </div>
        <div>
          <div style={{ color: "var(--muted)", fontSize: "9px" }}>SPEED</div>
          <div style={{ color: "#ffffff", fontWeight: "bold" }}>{drone.speed.toFixed(1)} m/s</div>
        </div>
      </div>

      <div style={{ fontSize: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "6px" }}>
        <div style={{ color: "var(--muted)", fontSize: "9px" }}>NEXT ACTION</div>
        <div style={{ color: "#38bdf8", marginBottom: "4px" }}>➔ {drone.nextAction}</div>

        <div style={{ color: "var(--muted)", fontSize: "9px" }}>AUTONOMOUS DECISION LOGIC</div>
        <div style={{ color: "#a7f3d0", fontStyle: "italic" }}>⚡ {drone.decisionReason}</div>
      </div>
    </div>);
}
