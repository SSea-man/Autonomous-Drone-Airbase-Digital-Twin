import { useEffect, useState } from "react";
import { useStore } from "./state/store";
import { TopBar } from "./components/shell/TopBar";
import { useSimulationRunner } from "./simulation/runner";
import { Viewport } from "./components/views/Viewport";
import { AlertsPanel, FleetOverviewPanel, SystemStatusPanel, TaskOverviewPanel } from "./components/panels/LeftPanels";
import { EventLogPanel, LiveCameraPanel, SelectedRobotPanel } from "./components/panels/RightPanels";
import { RobotStatusPanel, TaskQueuePanel, ThroughputPanel } from "./components/panels/BottomPanels";
import { ScenariosDrawer } from "./components/ops/ScenariosDrawer";
import { OpsDrawer } from "./components/ops/OpsDrawer";
import { Modals } from "./components/ops/Modals";
import { WhatIfDrawer } from "./components/ops/WhatIfDrawer";
import { LiveStateInspector } from "./components/panels/LiveStateInspector";
/**
 * Layout calibrated for 1536x860 viewport; scaled proportionally on smaller displays
 * Uses CSS transform instead of zoom to maintain Three.js canvas coordinate fidelity.
 */
const DESIGN_W = 1536, DESIGN_H = 860;
function useFitScale() {
    useEffect(() => {
        const root = document.documentElement;
        const apply = () => {
            const z = Math.min(1, window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
            root.style.setProperty("--ui-scale", z < 0.995 ? z.toFixed(4) : "1");
        };
        apply();
        window.addEventListener("resize", apply);
        return () => window.removeEventListener("resize", apply);
    }, []);
}
/** Toast notification for rate limits and server status messages */
function Notice() {
    const notice = useStore((s) => s.notice);
    const setNotice = useStore((s) => s.setNotice);
    useEffect(() => { if (!notice)
        return; const t = setTimeout(() => setNotice(null), Math.max(0, notice.until - Date.now())); return () => clearTimeout(t); }, [notice, setNotice]);
    if (!notice)
        return null;
    return <div className={"notice " + notice.kind} onClick={() => setNotice(null)}>{notice.text}</div>;
}
/** Responsive breakpoint warning for small mobile screens.
 *  Recommends desktop or tablet landscape view for complete telemetry suite. */
const GATE_W = 1024;
function NarrowScreenGate({ children }) {
    const [dismissed, setDismissed] = useState(false);
    const [narrow, setNarrow] = useState(() => window.innerWidth < GATE_W);
    useEffect(() => { const f = () => setNarrow(window.innerWidth < GATE_W); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
    if (narrow && !dismissed) {
        return (<div className="narrow-gate">
        <div className="brand"><span className="ai">Ware</span><span>Twin</span></div>
        <h2>Designed for desktop</h2>
        <p>WareTwin is a 3D operations console that works best on screens ≥ 1280 px wide (it still runs, scaled down, from 1024 px). On a phone the interface would shrink to about a quarter of its size and become unreadable.</p>
        <p>Open <b>ware-twin.vercel.app</b> on a laptop or desktop browser for the full experience.</p>
        <button className="btn" onClick={() => setDismissed(true)}>Continue anyway</button>
      </div>);
    }
    return <>{children}</>;
}
/** Mount simulation runner conditionally to optimize CPU usage on mobile notice */
function Console() {
    useFitScale();
    useSimulationRunner();
    return (<div className="shell">
      <TopBar />
      <div className="shell-body">
        <aside className="col-left">
          <FleetOverviewPanel />
          <TaskOverviewPanel />
          <SystemStatusPanel />
          <AlertsPanel />
        </aside>
        <main className="center"><Viewport /><LiveStateInspector /></main>
        <aside className="col-right">
          <SelectedRobotPanel />
          <LiveCameraPanel />
          <EventLogPanel />
        </aside>
        <footer className="bottom">
          <TaskQueuePanel />
          <ThroughputPanel />
          <RobotStatusPanel />
        </footer>
      </div>
      <ScenariosDrawer />
      <OpsDrawer />
      <WhatIfDrawer />
      <Modals />
      <Notice />
    </div>);
}
export default function App() {
    return <NarrowScreenGate><Console /></NarrowScreenGate>;
}
