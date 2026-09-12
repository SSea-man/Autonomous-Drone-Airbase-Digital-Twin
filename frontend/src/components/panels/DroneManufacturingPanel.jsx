import { useDroneManufacturingStore } from "../../state/droneManufacturingStore";
import { Panel } from "../ui/primitives";
const STAGE_LABELS = {
    COMPONENTS_RESERVED: { label: "1. Components Reserved", color: "#94a3b8" },
    FRAME_ASSEMBLY: { label: "2. Carbon Frame Assembly", color: "#38bdf8" },
    MOTOR_INSTALLATION: { label: "3. Motor & ESC Wiring", color: "#0284c7" },
    AVIONICS_INSTALLATION: { label: "4. Avionics Installation", color: "#10b981" },
    SENSOR_INSTALLATION: { label: "5. Gimbal & LiDAR Sensor", color: "#a855f7" },
    BATTERY_INSTALLATION: { label: "6. Battery Clamping", color: "#f59e0b" },
    FINAL_ASSEMBLY: { label: "7. Final Fastening", color: "#e2e8f0" },
    AI_QUALITY_CHECK: { label: "8. AI Optical QA Check", color: "#38bdf8" },
    CALIBRATION: { label: "9. Sensor Calibration", color: "#c084fc" },
    FLIGHT_TEST: { label: "10. Maiden Flight Test", color: "#facc15" },
    COMPLETED: { label: "11. Hangar Bay Deployed", color: "#22c55e" },
};
const ALL_STAGES = [
    "COMPONENTS_RESERVED",
    "FRAME_ASSEMBLY",
    "MOTOR_INSTALLATION",
    "AVIONICS_INSTALLATION",
    "SENSOR_INSTALLATION",
    "BATTERY_INSTALLATION",
    "FINAL_ASSEMBLY",
    "AI_QUALITY_CHECK",
    "CALIBRATION",
    "FLIGHT_TEST",
    "COMPLETED",
];
export function DroneManufacturingPanel() {
    const isLineRunning = useDroneManufacturingStore((s) => s.isLineRunning);
    const toggleAssemblyLine = useDroneManufacturingStore((s) => s.toggleAssemblyLine);
    const activeBuild = useDroneManufacturingStore((s) => s.activeBuild);
    const startNewBuild = useDroneManufacturingStore((s) => s.startNewBuild);
    const advanceStageManually = useDroneManufacturingStore((s) => s.advanceStageManually);
    const dailyCompletedCount = useDroneManufacturingStore((s) => s.dailyCompletedCount);
    const aiQaPassRate = useDroneManufacturingStore((s) => s.aiQaPassRate);
    const avgCycleTimeMinutes = useDroneManufacturingStore((s) => s.avgCycleTimeMinutes);
    return (<Panel title="Robotic Drone Manufacturing" action={<button className={"chip" + (isLineRunning ? " on" : "")} style={{ fontSize: "10px", padding: "2px 7px" }} onClick={toggleAssemblyLine}>
          Line: {isLineRunning ? "RUNNING" : "PAUSED"}
        </button>}>
      {/* Production KPI Grid */}
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
          <div style={{ fontSize: "9px", color: "var(--muted)" }}>BUILT TODAY</div>
          <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginTop: "2px" }}>
            {dailyCompletedCount} UAVs
          </div>
        </div>
        <div>
          <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>AI QA PASS</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#22c55e", marginTop: "2px" }}>
            {aiQaPassRate}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>CYCLE TIME</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#facc15", marginTop: "2px" }}>
            {avgCycleTimeMinutes}m
          </div>
        </div>
      </div>

      {/* Active Drone Build */}
      {activeBuild ? (<div style={{
                padding: "9px",
                background: "rgba(2, 6, 23, 0.7)",
                borderRadius: "5px",
                border: "1px solid rgba(0, 240, 255, 0.3)",
                marginBottom: "10px",
            }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: "bold", color: "#00f0ff", fontFamily: "var(--mono)" }}>
                {activeBuild.buildId}
              </span>
              <span style={{ marginLeft: "8px", fontSize: "11.5px", color: "#94a3b8" }}>
                {activeBuild.model}
              </span>
            </div>
            <span style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: STAGE_LABELS[activeBuild.stage]?.color || "#00f0ff",
                fontFamily: "var(--mono)",
            }}>
              QA: {activeBuild.qaScore}%
            </span>
          </div>

          <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "4px", fontFamily: "var(--mono)" }}>
            📍 {activeBuild.currentWorkcell}
          </div>

          {/* 11-Stage Total Assembly Progress */}
          <div style={{ marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", marginBottom: "3px" }}>
              <span style={{ color: "var(--muted)" }}>Manufacturing Progress</span>
              <span style={{ fontFamily: "var(--mono)", color: "#00f0ff", fontWeight: "bold" }}>
                {(activeBuild.progress * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ width: "100%", height: "5px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                width: `${activeBuild.progress * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #0284c7, #00f0ff)",
                transition: "width 0.3s ease",
            }}/>
            </div>
          </div>

          {/* Assembly phase sequence stepper */}
          <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                marginTop: "8px",
                maxHeight: "130px",
                overflowY: "auto",
                paddingRight: "4px",
            }}>
            {ALL_STAGES.map((stg, i) => {
                const currentIdx = ALL_STAGES.indexOf(activeBuild.stage);
                const isPast = i < currentIdx;
                const isCurrent = i === currentIdx;
                const meta = STAGE_LABELS[stg];
                return (<div key={stg} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "10px",
                        fontFamily: "var(--mono)",
                        color: isCurrent ? meta.color : isPast ? "#10b981" : "#475569",
                        fontWeight: isCurrent ? "bold" : "normal",
                        padding: "2px 4px",
                        borderRadius: "3px",
                        background: isCurrent ? "rgba(0, 240, 255, 0.1)" : "transparent",
                    }}>
                  <span>{isPast ? "✓" : isCurrent ? "▶" : "○"}</span>
                  <span>{meta.label}</span>
                </div>);
            })}
          </div>

          {/* Assigned storage bay */}
          {activeBuild.assignedDroneId && (<div style={{
                    marginTop: "8px",
                    padding: "6px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid #10b981",
                    borderRadius: "4px",
                    fontSize: "10.5px",
                    fontFamily: "var(--mono)",
                    color: "#10b981",
                }}>
              🎉 Completed &amp; Registered: <b>{activeBuild.assignedDroneId}</b> &rarr; {activeBuild.assignedBayLabel}
            </div>)}
        </div>) : (<div style={{ padding: "12px", textAlign: "center", color: "var(--muted)", fontSize: "11.5px" }}>
          Production line standing by.
        </div>)}

      {/* Assembly control buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <button className="btn" style={{ background: "#0284c7", color: "#ffffff", fontSize: "11px" }} onClick={() => startNewBuild()}>
          ⚡ Start Build Run
        </button>
        <button className="btn-outline" style={{ fontSize: "11px" }} onClick={advanceStageManually}>
          ⏩ Next Stage
        </button>
      </div>
    </Panel>);
}
