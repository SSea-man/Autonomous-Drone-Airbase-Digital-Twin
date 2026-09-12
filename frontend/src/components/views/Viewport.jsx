import { useStore } from "../../state/store";
import { Icon } from "../ui/primitives";
import { Scene3D } from "../scene/Scene3D";
import { MapView2D } from "./MapView2D";
const TABS = [["3D", "3D VIEW"], ["MAP", "MAP VIEW"], ["TRAFFIC", "TRAFFIC VIEW"], ["HEATMAP", "HEATMAP"]];
export function Viewport() {
    const tab = useStore((s) => s.viewTab);
    const setTab = useStore((s) => s.setViewTab);
    const tool = useStore((s) => s.tool);
    const setTool = useStore((s) => s.setTool);
    const showPaths = useStore((s) => s.showPaths);
    const showLabels = useStore((s) => s.showLabels);
    const togglePaths = useStore((s) => s.togglePaths);
    const toggleLabels = useStore((s) => s.toggleLabels);
    const focus = useStore((s) => s.focus);
    const activeFloor = useStore((s) => s.activeFloor);
    const setActiveFloor = useStore((s) => s.setActiveFloor);
    const toolBtn = (t, icon, title, on = tool === t, onClick = () => setTool(t)) => (<button className={on ? "on" : ""} title={title} onClick={onClick}>{icon}</button>);
    return (<div className="viewport">
      <div className="view-tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      <div className="cam-presets">
        <button title="Campus Master View" onClick={() => focus([50, 0, 35], [50, 75, 140])}>
          Master View
        </button>
        <button title="Runway 09 Threshold View" onClick={() => focus([110, 0, 160], [110, 18, 205])}>
          Runway 09
        </button>
        <button title="Hangar 02 160-Bay Fleet Racks" onClick={() => focus([50, 0, 35], [50, 24, 70])}>
          Dock Racks
        </button>
        <button title="Hangar 01 Robotic MRO Assembly" onClick={() => focus([-55, 0, 30], [-55, 22, 65])}>
          MRO Workcells
        </button>
      </div>

      {tab === "3D" ? <Scene3D /> : <MapView2D mode={tab}/>}

      {tab === "3D" && (
        <div className="scene-toolbar">
          {toolBtn("select", Icon.cursor, "Select / Orbit Mode")}
          {toolBtn("pan", Icon.hand, "Pan Camera")}
          {toolBtn("paths", Icon.path, "Toggle Flight Corridors & Taxiways", showPaths, togglePaths)}
          {toolBtn("labels", Icon.tag, "Toggle Station & Dock Labels", showLabels, toggleLabels)}
          <span style={{ fontSize: 10, color: "var(--muted)", padding: "0 8px", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--mono)" }}>
            ORBIT: RMB / PAN: MMB / ZOOM: WHEEL
          </span>
        </div>
      )}

      <div className="vp-telemetry">
        <span>CAMPUS: 300m × 200m</span>
        <span>·</span>
        <span>GRID: 0.5m RESOLUTION</span>
        <span>·</span>
        <span>FPS: 60</span>
      </div>
    </div>);
}
