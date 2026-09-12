import { useStore, tickToClock } from "../../state/store";
import { simControl } from "../../simulation/runner";
import { Icon } from "../ui/primitives";
import { useDroneHangarStore } from "../../state/droneHangarStore";
export function TopBar() {
    const mode = useStore((s) => s.twin.sim.mode);
    const tick = useStore((s) => s.twin.sim.tick);
    const speed = useStore((s) => s.speed);
    const paused = useStore((s) => s.paused);
    const source = useStore((s) => s.source);
    const drawer = useStore((s) => s.drawer);
    const setDrawer = useStore((s) => s.setDrawer);
    const setModal = useStore((s) => s.setModal);
    const alerts = useStore((s) => s.twin.alerts);
    const quality = useStore((s) => s.quality);
    const setQuality = useStore((s) => s.setQuality);
    const unack = Object.values(alerts).filter((a) => !a.acknowledged).length;
    const simDate = "2026/05/20";
    const drones = useDroneHangarStore((s) => s.drones);
    const droneValues = Object.values(drones);
    const totalDrones = droneValues.length;
    const storedCount = droneValues.filter((d) => d.status === "STORED" || d.status === "READY").length;
    const activeCount = droneValues.filter((d) => d.status === "AIRBORNE" || d.status === "TAKEOFF" || d.status === "TAXIING" || d.status === "MISSION_PREP").length;
    const returningCount = droneValues.filter((d) => d.status === "RETURNING" || d.status === "LANDING" || d.status === "RECOVERY").length;
    const chargingCount = droneValues.filter((d) => d.status === "CHARGING").length;
    const testDrone = droneValues.find((d) => d.corridorId === "RUNWAY_FLIGHT_TEST" &&
        (d.status === "TAXIING" || d.status === "TAKEOFF" || d.status === "AIRBORNE"));
    const startAutonomousDemo = useDroneHangarStore((s) => s.startAutonomousDemo);
    const inspectorOpen = useDroneHangarStore((s) => s.inspectorOpen);
    const toggleInspector = useDroneHangarStore((s) => s.toggleInspector);
    return (<header className="topbar">
      <div className="brand">
        <span className="ai">WareTwin</span>
        <span className="brand-sub">Campus 01 · Airbase Ops</span>
      </div>

      <span className={"badge-live " + (paused ? "paused" : mode === "WHATIF" ? "whatif" : "live")}>
        <span className="dot" style={{ background: "currentColor" }}/>
        {paused ? "SIM PAUSED" : mode === "WHATIF" ? "WHAT-IF BRANCH" : "AIRBASE ACTIVE"}
      </span>

      <span className={"badge-src " + source} title={source === "online" ? "Connected to backend (FastAPI WebSocket)" : source === "local" ? "Running local simulation engine" : "Connecting to backend…"}>
        <span className="dot" style={{ background: "currentColor" }}/>
        {source === "online" ? "TELEMETRY 60Hz" : source === "local" ? "LOCAL SIM" : "CONNECTING"}
      </span>

      {/* Airbase flight telemetry and fleet metrics */}
      <div className="atc-strip">
        <span style={{ color: testDrone ? "var(--accent)" : "var(--green)", fontWeight: 600 }}>
          {testDrone ? `RWY 09: SORTIE (${testDrone.id})` : "RWY 09/27: NOMINAL"}
        </span>
        <span className="sep">/</span>
        <span>METAR 080/04KT QNH 1013</span>
        <span className="sep">/</span>
        <span>FLEET <b>{totalDrones}</b></span>
        <span className="sep">/</span>
        <span style={{ color: activeCount > 0 ? "var(--green)" : undefined }}>AIRBORNE <b>{activeCount}</b></span>
        <span className="sep">/</span>
        <span>CHG <b>{chargingCount}</b></span>
        <span className="sep">/</span>
        <span>STBY <b>{storedCount}</b></span>
      </div>

      <div className="topbar-right">
        <button
          className="btn primary"
          onClick={startAutonomousDemo}
          title="Dispatch autonomous flight sortie: Hangar -> Runway -> Pattern -> Recovery"
        >
          ▶ Run Flight Demo
        </button>

        <button
          className={"tb-btn" + (inspectorOpen ? " on" : "")}
          onClick={toggleInspector}
          title="Toggle telemetry inspector overlay"
        >
          State Inspector
        </button>

        <div className="vsep"/>

        <div className="sim-controls" title="Simulation controls">
          <button className={!paused ? "on" : ""} title="Play" onClick={() => simControl.play()}>{Icon.play}</button>
          <button className={paused ? "on" : ""} title="Pause" onClick={() => simControl.pause()}>{Icon.pause}</button>
          <button title="Reset" onClick={() => simControl.reset()}>{Icon.reset}</button>
          {[1, 2, 5, 10].map((x) => (
            <button key={x} className={speed === x ? "on" : ""} onClick={() => simControl.play(x)}>{x}×</button>
          ))}
        </div>

        <div className="clock" title="Simulation time">
          <div className="t">{tickToClock(tick, 100, true)}</div>
          <div className="d">{simDate} · T{tick}</div>
        </div>

        <div className="vsep"/>

        <button className={"tb-btn" + (drawer === "scenarios" ? " on" : "")} onClick={() => setDrawer("scenarios")} title="Failure injection">
          {Icon.bolt}<span>Scenarios</span>
        </button>
        <button className={"tb-btn" + (drawer === "ops" ? " on" : "")} onClick={() => setDrawer("ops")} title="AI Operations">
          {Icon.brain}<span>AI Ops</span>
        </button>
        <button className={"tb-btn" + (drawer === "whatif" ? " on" : "")} onClick={() => setDrawer("whatif")} title="What-if simulation">
          {Icon.fork}<span>What-If</span>
        </button>

        <div className="vsep"/>

        <button className="icon-btn" title="Audit log" onClick={() => setModal("audit")}>
          {Icon.bell}
          {unack > 0 && <span className="dot">{unack}</span>}
        </button>
        <button className="icon-btn" title={`Quality: ${quality}`} onClick={() => setQuality(quality === "low" ? "medium" : quality === "medium" ? "high" : "low")}>
          {Icon.gear}
        </button>
      </div>
    </header>);
}
