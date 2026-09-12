import { Canvas } from "@react-three/fiber";
import { useDroneHangarStore, PAD_IDS, } from "../../state/droneHangarStore";
import { Panel } from "../ui/primitives";
import { useStore } from "../../state/store";
const STATUS_BADGE = {
    STORED: { label: "STORED · DOCKED", color: "#64748b", bg: "rgba(100, 116, 139, 0.15)" },
    CHARGING: { label: "INDUCTIVE CHARGING", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
    READY: { label: "READY · STANDBY", color: "#00f0ff", bg: "rgba(0, 240, 255, 0.15)" },
    MISSION_PREP: { label: "MISSION PREP", color: "#facc15", bg: "rgba(250, 204, 21, 0.2)" },
    TAXIING: { label: "TAXIING CORRIDOR", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.2)" },
    TAKEOFF: { label: "TAKEOFF ASCENT", color: "#22c55e", bg: "rgba(34, 197, 94, 0.2)" },
    AIRBORNE: { label: "AIRBORNE MISSION", color: "#10b981", bg: "rgba(16, 185, 129, 0.2)" },
    RETURNING: { label: "INBOUND (RTH)", color: "#f97316", bg: "rgba(249, 115, 22, 0.2)" },
    LANDING: { label: "PRECISION LANDING", color: "#eab308", bg: "rgba(234, 179, 8, 0.2)" },
    RECOVERY: { label: "PAD RECOVERY", color: "#a855f7", bg: "rgba(168, 85, 247, 0.2)" },
    MAINTENANCE: { label: "MRO OVERHAUL", color: "#ec4899", bg: "rgba(236, 72, 153, 0.2)" },
    MANUFACTURING: { label: "ASSEMBLY LINE", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.2)" },
    FAULT: { label: "FAULT LOCKOUT", color: "#ef4444", bg: "rgba(239, 68, 68, 0.2)" },
    OFFLINE: { label: "OFFLINE COLD", color: "#475569", bg: "rgba(71, 85, 105, 0.2)" },
};
/** 3D rotating drone model preview */
function Drone3DPreview({ model }) {
    return (<Canvas resize={{ offsetSize: true }} dpr={1} camera={{ position: [1.6, 1.2, 1.6], fov: 34 }} gl={{ alpha: true, antialias: true }} style={{ width: "100%", height: "125px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "6px" }}>
      <ambientLight intensity={0.9}/>
      <directionalLight position={[3, 5, 2]} intensity={2.5}/>
      <pointLight position={[-2, 1, -2]} color="#00f0ff" intensity={3}/>
      <group position={[0, -0.05, 0]} rotation-y={0.6}>
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.14, 0.54]}/>
          <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.85}/>
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.26, 0.08, 0.36]}/>
          <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.9}/>
        </mesh>
        {[
            [0.32, 0.32],
            [-0.32, 0.32],
            [-0.32, -0.32],
            [0.32, -0.32],
        ].map(([mx, mz], i) => (<group key={i} position={[mx, 0.03, mz]}>
            <mesh>
              <cylinderGeometry args={[0.05, 0.05, 0.065, 12]}/>
              <meshStandardMaterial color="#0284c7" metalness={0.8}/>
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <boxGeometry args={[0.36, 0.006, 0.03]}/>
              <meshStandardMaterial color="#090d16"/>
            </mesh>
          </group>))}
        <mesh position={[0, -0.06, 0.24]}>
          <sphereGeometry args={[0.06, 12, 12]}/>
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.6}/>
        </mesh>
      </group>
    </Canvas>);
}
export function DroneHangarPanel() {
    const selectedDroneId = useDroneHangarStore((s) => s.selectedDroneId);
    const selectDrone = useDroneHangarStore((s) => s.selectDrone);
    const drones = useDroneHangarStore((s) => s.drones);
    const dispatchMission = useDroneHangarStore((s) => s.dispatchMission);
    const dispatchRunwayFlightTest = useDroneHangarStore((s) => s.dispatchRunwayFlightTest);
    const returnToHome = useDroneHangarStore((s) => s.returnToHome);
    const fastCharge = useDroneHangarStore((s) => s.fastCharge);
    const sendToMaintenance = useDroneHangarStore((s) => s.sendToMaintenance);
    const autoPatrolScheduler = useDroneHangarStore((s) => s.autoPatrolScheduler);
    const toggleAutoPatrolScheduler = useDroneHangarStore((s) => s.toggleAutoPatrolScheduler);
    const focus = useStore((s) => s.focus);
    const drone = selectedDroneId ? drones[selectedDroneId] : null;
    if (!drone) {
        const droneList = Object.values(drones);
        const activeList = droneList.filter((d) => d.status === "AIRBORNE" ||
            d.status === "TAKEOFF" ||
            d.status === "RETURNING" ||
            d.status === "TAXIING" ||
            d.status === "MISSION_PREP" ||
            d.status === "LANDING");
        const readyCount = droneList.filter((d) => d.status === "READY").length;
        const chargingCount = droneList.filter((d) => d.status === "CHARGING").length;
        const storedCount = droneList.filter((d) => d.status === "STORED").length;
        const mroCount = droneList.filter((d) => d.status === "MAINTENANCE").length;
        return (<Panel title="Autonomous Fleet Command Center" action={<button className={"chip" + (autoPatrolScheduler ? " on" : "")} style={{ fontSize: "10.5px", padding: "2px 8px" }} onClick={toggleAutoPatrolScheduler}>
            Auto Dispatch: {autoPatrolScheduler ? "ON" : "OFF"}
          </button>}>
        {/* Fleet operational status matrix */}
        <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "4px",
                marginBottom: "8px",
                background: "var(--panel-2)",
                padding: "8px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                fontFamily: "var(--mono)",
                textAlign: "center",
            }}>
          <div>
            <div style={{ fontSize: "9px", color: "var(--muted)" }}>TOTAL FLEET</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{droneList.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--muted)" }}>AIRBORNE</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--green)" }}>{activeList.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--muted)" }}>CHARGING</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--yellow)" }}>{chargingCount}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--muted)" }}>READY</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#60a5fa" }}>{readyCount}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--muted)" }}>STORED</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--muted)" }}>{storedCount}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--muted)" }}>MRO REPAIR</div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--orange)" }}>{mroCount}</div>
          </div>
        </div>

        {/* 4 VTOL pads operational allocation status */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10.5px", color: "var(--muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
            VTOL Operational Pads (30m Safety Spacing):
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {PAD_IDS.map((padId) => {
                const occupyingDrone = droneList.find((d) => d.currentPadId === padId);
                return (<div key={padId} style={{
                        padding: "4px 8px",
                        background: "var(--panel-2)",
                        border: `1px solid ${occupyingDrone ? "var(--green-border)" : "var(--border)"}`,
                        borderRadius: "4px",
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                    }}>
                  <span style={{ color: "var(--yellow)", fontWeight: 600 }}>{padId}</span>
                  <span style={{ color: occupyingDrone ? "var(--green)" : "var(--muted)" }}>
                    {occupyingDrone ? occupyingDrone.id : "CLEAR"}
                  </span>
                </div>);
            })}
          </div>
        </div>

        {/* Runway 09/27 flight test dispatch */}
        <div style={{ marginBottom: "10px" }}>
          <button className="btn primary" style={{
                width: "100%",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "11px",
            }} onClick={() => {
                const readyDrone = droneList.find((d) => d.status === "STORED" || d.status === "READY");
                if (readyDrone) {
                    dispatchRunwayFlightTest(readyDrone.id);
                }
            }}>
            <span>🛫</span>
            <span>Dispatch Runway 09/27 Flight Sortie</span>
          </button>
        </div>

        <div style={{ fontSize: "11.5px", color: "var(--muted)", marginBottom: "8px" }}>
          Active Operations ({activeList.length} in transit/flight):
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto" }}>
          {(activeList.length > 0 ? activeList : droneList.slice(0, 6)).map((d) => {
                const badge = STATUS_BADGE[d.status] || STATUS_BADGE.STORED;
                return (<div key={d.id} onClick={() => selectDrone(d.id)} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        background: "rgba(15, 23, 42, 0.6)",
                        border: `1px solid ${badge.color}33`,
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "11px",
                    }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: badge.color, flexShrink: 0 }}/>
                  <div>
                    <div style={{ color: "#00f0ff", fontWeight: "bold" }}>{d.id}</div>
                    <div style={{ color: "var(--muted)", fontSize: "9.5px" }}>{d.model} · {d.currentFacility}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: d.battery <= 20 ? "#ef4444" : "#22c55e" }}>
                    {d.battery.toFixed(0)}%
                  </span>
                  <span style={{
                        color: badge.color,
                        background: badge.bg,
                        padding: "1px 5px",
                        borderRadius: "3px",
                        fontSize: "9.5px",
                        fontWeight: "bold",
                    }}>
                    {d.status}
                  </span>
                </div>
              </div>);
            })}
        </div>
      </Panel>);
    }
    const badge = STATUS_BADGE[drone.status] || STATUS_BADGE.STORED;
    const isAirborne = drone.status === "TAKEOFF" ||
        drone.status === "AIRBORNE" ||
        drone.status === "RETURNING" ||
        drone.status === "LANDING";
    const headingDeg = Math.round((drone.heading * 180) / Math.PI + 360) % 360;
    return (<Panel title="Drone Telemetry Dossier" action={<button className="link" onClick={() => selectDrone(null)}>
          ✕
        </button>}>
      {/* Header title and status badge */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "15px", fontWeight: "bold", color: "#00f0ff", fontFamily: "var(--mono)" }}>
            {drone.id}
          </span>
          <span style={{
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "10.5px",
            fontWeight: "bold",
            color: badge.color,
            background: badge.bg,
            border: `1px solid ${badge.color}`,
            fontFamily: "var(--mono)",
        }}>
            {badge.label}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text)", marginTop: "2px" }}>{drone.name} · {drone.model}</div>
      </div>

      {/* 3D rotating drone preview */}
      <Drone3DPreview model={drone.model}/>

      {/* Telemetry tri-metric grid (Altitude, Speed, Heading) */}
      <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "6px",
            margin: "10px 0",
            background: "rgba(15, 23, 42, 0.7)",
            padding: "8px",
            borderRadius: "5px",
            border: "1px solid rgba(56, 189, 248, 0.15)",
            fontFamily: "var(--mono)",
            textAlign: "center",
        }}>
        <div>
          <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>ALTITUDE</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#38bdf8", marginTop: "2px" }}>
            {drone.altitude.toFixed(1)} m
          </div>
        </div>
        <div>
          <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>SPEED</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#22c55e", marginTop: "2px" }}>
            {drone.speed.toFixed(1)} m/s
          </div>
        </div>
        <div>
          <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>HEADING</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#facc15", marginTop: "2px" }}>
            {headingDeg}°
          </div>
        </div>
      </div>

      {/* Battery gauge */}
      <div style={{ margin: "10px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "3px" }}>
          <span style={{ color: "var(--muted)" }}>Battery Capacity</span>
          <span style={{
            color: drone.battery <= 20 ? "#ef4444" : drone.battery <= 50 ? "#f59e0b" : "#22c55e",
            fontWeight: "bold",
            fontFamily: "var(--mono)",
        }}>
            {drone.battery.toFixed(0)}%
          </span>
        </div>
        <div style={{ width: "100%", height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            width: `${drone.battery}%`,
            height: "100%",
            background: drone.battery <= 20 ? "#ef4444" : drone.battery <= 50 ? "#f59e0b" : "#22c55e",
            transition: "width 0.3s ease",
        }}/>
        </div>
      </div>

      {/* Technical specifications */}
      <div className="kv">
        <span className="k">Current Facility</span>
        <span className="v" style={{ color: "#38bdf8", fontWeight: "bold" }}>
          {drone.currentFacility}
        </span>
      </div>
      <div className="kv">
        <span className="k">Assigned Dock / Rack</span>
        <span className="v" style={{ fontFamily: "var(--mono)", color: "#00f0ff" }}>
          {drone.assignedSlot.bayLabel} (F{drone.assignedSlot.floor})
        </span>
      </div>
      <div className="kv">
        <span className="k">Payload Sensor</span>
        <span className="v" style={{ color: "#facc15", fontWeight: "bold" }}>
          {drone.payload}
        </span>
      </div>
      <div className="kv">
        <span className="k">Airframe Health</span>
        <span className="v" style={{ color: "#22c55e" }}>
          {drone.health}%
        </span>
      </div>
      <div className="kv">
        <span className="k">Flight Hours &amp; Cycles</span>
        <span className="v" style={{ fontFamily: "var(--mono)" }}>
          {drone.flightHours.toFixed(1)} hrs · {drone.cycles} cyc
        </span>
      </div>

      {/* Current mission progress */}
      <div style={{
            margin: "10px 0",
            padding: "8px",
            background: "rgba(2, 6, 23, 0.6)",
            borderRadius: "4px",
            borderLeft: `3px solid ${badge.color}`,
        }}>
        <div style={{ fontSize: "10.5px", color: "var(--muted)", textTransform: "uppercase" }}>
          Active Mission &amp; Flight Plan
        </div>
        <div style={{ fontSize: "11.5px", color: "#f1f5f9", marginTop: "2px", fontWeight: "bold" }}>
          {drone.mission ? drone.mission.missionType : drone.missionName}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#38bdf8", marginTop: "3px", fontFamily: "var(--mono)" }}>
          <span>Route: {drone.status === "TAXIING" ? "Ground Taxiway" : `WP #${drone.waypointIndex + 1}`}</span>
          {drone.currentPadId && <span style={{ color: "#facc15" }}>Target: {drone.currentPadId}</span>}
        </div>
      </div>

      {/* Autonomous mission action controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "10px" }}>
        <button className="btn" style={{
            background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "bold",
            gridColumn: "span 2",
            border: "1px solid #34d399",
            boxShadow: "0 0 10px rgba(16, 185, 129, 0.3)",
        }} onClick={() => dispatchRunwayFlightTest(drone.id)} disabled={drone.status === "TAXIING" || isAirborne}>
          🛫 Conduct Runway 09/27 Flight Test Run
        </button>

        {!isAirborne ? (<button className="btn" style={{ background: "#0284c7", color: "#ffffff", fontSize: "11px" }} onClick={() => dispatchMission(drone.id, "PERIMETER_SURVEY")}>
            🚀 Dispatch Mission
          </button>) : (<button className="btn" style={{ background: "#f97316", color: "#ffffff", fontSize: "11px" }} onClick={() => returnToHome(drone.id)}>
            🏠 Return to Base (RTH)
          </button>)}

        <button className="btn-outline" style={{ fontSize: "11px" }} onClick={() => fastCharge(drone.id)} disabled={drone.battery >= 98}>
          ⚡ Fast Charge
        </button>

        <button className="btn-outline" style={{ fontSize: "11px" }} onClick={() => sendToMaintenance(drone.id)}>
          🛠️ Send to MRO
        </button>

        <button className="btn-outline" style={{ fontSize: "11px" }} onClick={() => {
            focus([drone.currentPosition[0], drone.currentPosition[1], drone.currentPosition[2]]);
        }}>
          🎯 Track Camera
        </button>
      </div>
    </Panel>);
}
