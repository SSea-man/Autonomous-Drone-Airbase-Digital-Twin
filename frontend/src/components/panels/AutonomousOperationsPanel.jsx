import { useMemo } from "react";
import { useDroneHangarStore, PAD_IDS, } from "../../state/droneHangarStore";
import { Panel } from "../ui/primitives";
const LIFECYCLE_STAGES = [
    { key: "DOCK_STORED", label: "Hangar 02 Dock", sub: "Cradle Locked" },
    { key: "INDUCTIVE_CHARGING", label: "Inductive Charging", sub: "12.5 kW Wireless" },
    { key: "READY_STANDBY", label: "Ready / Standby", sub: "100% Battery" },
    { key: "MISSION_PREP", label: "Mission Preparation", sub: "6-Point Checklist" },
    { key: "FLIGHT_CLEARANCE", label: "Flight Clearance", sub: "Airspace Approved" },
    { key: "TAXIING_OUTBOUND", label: "Taxiing Outbound", sub: "Taxiway Alpha" },
    { key: "APRON_TRANSIT", label: "Apron Transit", sub: "Ground Route" },
    { key: "PAD_HOLD", label: "Assigned VTOL Pad", sub: "PAD 01-04 Hold" },
    { key: "TAKEOFF_CLIMB", label: "Takeoff & Climb", sub: "Vertical Ascent" },
    { key: "AIRBORNE_MISSION", label: "Airborne Mission", sub: "Active Corridors" },
    { key: "RETURNING_PAD", label: "Inbound Return", sub: "Pattern Glideslope" },
    { key: "PRECISION_LANDING", label: "Precision Landing", sub: "Touchdown" },
    { key: "PAD_RECOVERY", label: "Pad Recovery", sub: "Telemetry Offload" },
    { key: "TAXIING_INBOUND", label: "Inbound Taxi", sub: "Return to H2" },
    { key: "DOCKING", label: "Docking & Fast Charge", sub: "Cradle Lock" },
];
export function AutonomousOperationsPanel() {
    const selectedDroneId = useDroneHangarStore((s) => s.selectedDroneId);
    const drones = useDroneHangarStore((s) => s.drones);
    const docks = useDroneHangarStore((s) => s.docks);
    const padReservations = useDroneHangarStore((s) => s.padReservations);
    const eventFeed = useDroneHangarStore((s) => s.eventFeed);
    const inspectorOpen = useDroneHangarStore((s) => s.inspectorOpen);
    const toggleInspector = useDroneHangarStore((s) => s.toggleInspector);
    const startAutonomousDemo = useDroneHangarStore((s) => s.startAutonomousDemo);
    const dispatchRunwayFlightTest = useDroneHangarStore((s) => s.dispatchRunwayFlightTest);
    const droneList = useMemo(() => Object.values(drones), [drones]);
    const activeDrone = selectedDroneId ? drones[selectedDroneId] : droneList.find((d) => d.status === "TAXIING" || d.status === "AIRBORNE" || d.status === "TAKEOFF" || d.status === "MISSION_PREP") || droneList[0];
    // Summary of 160 dock allocations
    const dockList = useMemo(() => Object.values(docks), [docks]);
    const totalDocks = dockList.length;
    const storedCount = droneList.filter((d) => d.status === "STORED").length;
    const chargingCount = droneList.filter((d) => d.status === "CHARGING").length;
    const readyCount = droneList.filter((d) => d.status === "READY").length;
    const prepCount = droneList.filter((d) => d.status === "MISSION_PREP").length;
    const mroCount = droneList.filter((d) => d.status === "MAINTENANCE").length;
    const faultCount = droneList.filter((d) => d.status === "FAULT").length;
    const currentPhaseIndex = useMemo(() => {
        if (!activeDrone)
            return 0;
        const p = activeDrone.phase;
        const idx = LIFECYCLE_STAGES.findIndex((s) => s.key === p);
        if (idx >= 0)
            return idx;
        if (activeDrone.status === "CHARGING")
            return 1;
        if (activeDrone.status === "READY")
            return 2;
        if (activeDrone.status === "MISSION_PREP")
            return 3;
        if (activeDrone.status === "TAXIING")
            return 5;
        if (activeDrone.status === "TAKEOFF")
            return 8;
        if (activeDrone.status === "AIRBORNE")
            return 9;
        if (activeDrone.status === "RETURNING")
            return 10;
        if (activeDrone.status === "LANDING")
            return 11;
        if (activeDrone.status === "RECOVERY")
            return 12;
        return 0;
    }, [activeDrone]);
    return (<Panel title="Autonomous Operations" action={<button className={"chip" + (inspectorOpen ? " on" : "")} style={{ fontSize: "10px", padding: "2px 8px", cursor: "pointer" }} onClick={toggleInspector} title="Toggle live state inspector overlay">
          {inspectorOpen ? "🔍 INSPECTOR ON" : "🔍 INSPECTOR"}
        </button>}>
      {/* Full lifecycle autonomous demo trigger */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        <button onClick={startAutonomousDemo} style={{
            flex: 1,
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(16, 185, 129, 0.4))",
            color: "#4ade80",
            border: "1px solid rgba(34, 197, 94, 0.6)",
            borderRadius: "6px",
            padding: "8px 10px",
            fontWeight: "bold",
            fontSize: "11px",
            fontFamily: "var(--mono)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 0 12px rgba(34, 197, 94, 0.2)",
        }}>
          <span>▶</span> START AUTONOMOUS DEMO
        </button>

        <button onClick={() => {
            const readyDrone = droneList.find((d) => d.status === "READY" || d.status === "STORED");
            if (readyDrone) {
                dispatchRunwayFlightTest(readyDrone.id);
            }
        }} style={{
            background: "rgba(56, 189, 248, 0.15)",
            color: "#38bdf8",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: "6px",
            padding: "8px 10px",
            fontSize: "10.5px",
            fontFamily: "var(--mono)",
            cursor: "pointer",
        }} title="Dispatch manufactured drone on runway 09/27 maiden test">
          🛫 RWY 09/27 Test
        </button>
      </div>

      {/* Active Drone Dossier */}
      {activeDrone && (<div style={{
                background: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "6px",
                padding: "10px",
                marginBottom: "10px",
                fontFamily: "var(--mono)",
            }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold", color: "#00f0ff" }}>{activeDrone.id}</span>
              <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>{activeDrone.model}</span>
            </div>
            <span style={{
                fontSize: "10px",
                fontWeight: "bold",
                padding: "2px 6px",
                borderRadius: "3px",
                background: "rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.4)",
            }}>
              {activeDrone.phase.replace(/_/g, " ")}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px", fontSize: "10px", marginBottom: "8px", background: "rgba(0,0,0,0.25)", padding: "6px", borderRadius: "4px" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "9px" }}>BATTERY</div>
              <div style={{ color: activeDrone.battery > 30 ? "#4ade80" : "#f59e0b", fontWeight: "bold" }}>
                {activeDrone.battery}%
              </div>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "9px" }}>ALTITUDE</div>
              <div style={{ color: "#38bdf8", fontWeight: "bold" }}>{activeDrone.altitude}m</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "9px" }}>SPEED</div>
              <div style={{ color: "#e2e8f0", fontWeight: "bold" }}>{activeDrone.speed.toFixed(1)} m/s</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "9px" }}>PAD / DOCK</div>
              <div style={{ color: "#facc15", fontWeight: "bold" }}>{activeDrone.currentPadId || activeDrone.assignedSlot.bayLabel}</div>
            </div>
          </div>

          {/* Guidance & Navigation Decision */}
          <div style={{ fontSize: "10.5px", lineHeight: "1.4" }}>
            <div style={{ color: "var(--muted)", fontSize: "9.5px" }}>CURRENT LOCATION</div>
            <div style={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}>{activeDrone.currentLocation}</div>

            <div style={{ color: "var(--muted)", fontSize: "9.5px" }}>NEXT ACTION</div>
            <div style={{ color: "#38bdf8", marginBottom: "4px" }}>➔ {activeDrone.nextAction}</div>

            <div style={{ color: "var(--muted)", fontSize: "9.5px" }}>AUTONOMOUS DECISION REASON</div>
            <div style={{ color: "#a7f3d0", fontStyle: "italic", fontSize: "10px" }}>⚡ {activeDrone.decisionReason}</div>
          </div>
        </div>)}

      {/* Operational Lifecycle Stepper */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: "bold", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Operational Lifecycle Stage
        </div>
        <div style={{
            maxHeight: "180px",
            overflowY: "auto",
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "6px",
            padding: "6px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontFamily: "var(--mono)",
            fontSize: "10px",
        }}>
          {LIFECYCLE_STAGES.map((step, idx) => {
            const isCurrent = idx === currentPhaseIndex;
            const isPassed = idx < currentPhaseIndex;
            return (<div key={step.key} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background: isCurrent ? "rgba(56, 189, 248, 0.25)" : "transparent",
                    border: isCurrent ? "1px solid rgba(56, 189, 248, 0.6)" : "1px solid transparent",
                    marginBottom: "2px",
                }}>
                <span style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "9px",
                    fontWeight: "bold",
                    background: isCurrent ? "#38bdf8" : isPassed ? "#22c55e" : "rgba(255, 255, 255, 0.1)",
                    color: isCurrent ? "#0f172a" : isPassed ? "#0f172a" : "var(--muted)",
                }}>
                  {isPassed ? "✓" : idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: isCurrent ? "#00f0ff" : isPassed ? "#e2e8f0" : "var(--muted)", fontWeight: isCurrent ? "bold" : "normal" }}>
                    {step.label}
                  </span>
                  <span style={{ color: "rgba(255, 255, 255, 0.35)", fontSize: "9px", marginLeft: "6px" }}>
                    ({step.sub})
                  </span>
                </div>
                {isCurrent && (<span style={{ color: "#38bdf8", fontSize: "9px", fontWeight: "bold" }}>● ACTIVE</span>)}
              </div>);
        })}
        </div>
      </div>

      {/* Mission Preparation Checklist */}
      {activeDrone && (activeDrone.status === "MISSION_PREP" || activeDrone.status === "TAXIING") && (<div style={{
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "6px",
                padding: "8px",
                marginBottom: "12px",
                fontFamily: "var(--mono)",
                fontSize: "10.5px",
            }}>
          <div style={{ color: "#facc15", fontWeight: "bold", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
            <span>MISSION PREPARATION GATE</span>
            <span>{activeDrone.id}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {[
                { label: "Structural Inspection", ok: activeDrone.prepChecklist.structural },
                { label: "Battery Verification", ok: activeDrone.prepChecklist.battery },
                { label: "Payload & Sensor Latch", ok: activeDrone.prepChecklist.payload },
                { label: "PX4 Telemetry Lock", ok: activeDrone.prepChecklist.telemetry },
                { label: "Corridor Upload", ok: activeDrone.prepChecklist.missionUpload },
                { label: "Flight Clearance", ok: activeDrone.prepChecklist.clearance },
            ].map((chk, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: chk.ok ? "#22c55e" : "#f59e0b", fontWeight: "bold" }}>
                  {chk.ok ? "✓" : "➔"}
                </span>
                <span style={{ color: chk.ok ? "#e2e8f0" : "var(--muted)", fontSize: "9.5px" }}>{chk.label}</span>
              </div>))}
          </div>
        </div>)}

      {/* 4 VTOL Landing Pads (PAD 01 - PAD 04) */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: "bold", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: "6px", textTransform: "uppercase" }}>
          VTOL Launch Pads Status (PAD 01–04)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontFamily: "var(--mono)", fontSize: "10px" }}>
          {PAD_IDS.map((padId) => {
            const res = padReservations[padId];
            const isOcc = res.status === "OCCUPIED";
            const isRes = res.status === "RESERVED";
            return (<div key={padId} style={{
                    background: isOcc ? "rgba(34, 197, 94, 0.15)" : isRes ? "rgba(245, 158, 11, 0.15)" : "rgba(15, 23, 42, 0.6)",
                    border: `1px solid ${isOcc ? "rgba(34, 197, 94, 0.5)" : isRes ? "rgba(245, 158, 11, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
                    borderRadius: "4px",
                    padding: "6px",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                  <span style={{ fontWeight: "bold", color: isOcc ? "#4ade80" : isRes ? "#facc15" : "#94a3b8" }}>{padId}</span>
                  <span style={{ fontSize: "8.5px", padding: "1px 4px", borderRadius: "2px", background: "rgba(0,0,0,0.3)" }}>
                    {res.status}
                  </span>
                </div>
                <div style={{ fontSize: "9px", color: res.droneId ? "#00f0ff" : "var(--muted)" }}>
                  {res.droneId ? `Drone: ${res.droneId}` : "Surface Clear"}
                </div>
              </div>);
        })}
        </div>
      </div>

      {/* Hangar 02 Operational Summary (160 Docks) */}
      <div style={{ marginBottom: "12px", background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "6px", padding: "8px", fontFamily: "var(--mono)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: "bold", color: "var(--muted)", marginBottom: "6px" }}>
          <span>HANGAR 02 FLEET DOCKS</span>
          <span style={{ color: "#38bdf8" }}>{totalDocks} TOTAL</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: "4px", textAlign: "center", fontSize: "9.5px" }}>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "8.5px" }}>STORED</div>
            <div style={{ color: "#94a3b8", fontWeight: "bold" }}>{storedCount}</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "8.5px" }}>CHARGING</div>
            <div style={{ color: "#f59e0b", fontWeight: "bold" }}>{chargingCount}</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "8.5px" }}>READY</div>
            <div style={{ color: "#00f0ff", fontWeight: "bold" }}>{readyCount}</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "8.5px" }}>PREP</div>
            <div style={{ color: "#facc15", fontWeight: "bold" }}>{prepCount}</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "8.5px" }}>MRO</div>
            <div style={{ color: "#ec4899", fontWeight: "bold" }}>{mroCount}</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "8.5px" }}>FAULT</div>
            <div style={{ color: "#ef4444", fontWeight: "bold" }}>{faultCount}</div>
          </div>
        </div>
      </div>

      {/* Live Telemetry and Event Feed */}
      <div>
        <div style={{ fontSize: "10px", fontWeight: "bold", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: "6px", textTransform: "uppercase" }}>
          Live Operations Event Feed
        </div>
        <div style={{
            maxHeight: "150px",
            overflowY: "auto",
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "6px",
            padding: "6px",
            fontFamily: "var(--mono)",
            fontSize: "9.5px",
        }}>
          {eventFeed.map((evt) => (<div key={evt.id} style={{ display: "flex", gap: "6px", marginBottom: "3px", lineHeight: "1.3" }}>
              <span style={{ color: "var(--muted)", flexShrink: 0 }}>{evt.timestamp}</span>
              <span style={{ color: "#00f0ff", fontWeight: "bold", flexShrink: 0 }}>{evt.droneId}</span>
              <span style={{ color: evt.severity === "SUCCESS" ? "#4ade80" : evt.severity === "WARNING" ? "#facc15" : "#cbd5e1" }}>
                {evt.text}
              </span>
            </div>))}
        </div>
      </div>
    </Panel>);
}
