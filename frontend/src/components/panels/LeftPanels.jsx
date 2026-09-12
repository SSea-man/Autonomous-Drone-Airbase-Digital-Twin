import { SEVERITY_COLOR, layout, tickToClock, useStore } from "../../state/store";
import { Dot, Icon, Panel, StatRow } from "../ui/primitives";
import { simControl } from "../../simulation/runner";
import { useDroneHangarStore } from "../../state/droneHangarStore";
export function FleetOverviewPanel() {
    const f = useStore((s) => s.twin.kpi.fleet);
    const setModal = useStore((s) => s.setModal);
    const drones = useDroneHangarStore((s) => s.drones);
    const droneList = Object.values(drones);
    const storedCount = droneList.filter((d) => d.status === "STORED").length;
    const patrolCount = droneList.filter((d) => d.status === "AIRBORNE" || d.status === "TAKEOFF" || d.status === "TAXIING" || d.status === "MISSION_PREP").length;
    const rthCount = droneList.filter((d) => d.status === "RETURNING" || d.status === "LANDING" || d.status === "RECOVERY").length;
    const chargingCount = droneList.filter((d) => d.status === "CHARGING").length;
    const readyCount = droneList.filter((d) => d.status === "READY").length;
    return (<Panel title="Autonomous Drone Fleet" action={<button className="link" onClick={() => setModal("fleet")}>Fleet directory →</button>}>
      <StatRow label="Total Fleet UAVs" value={droneList.length + f.total} big color="var(--text)"/>
      <StatRow label="Stored in Racks" value={storedCount} color="var(--muted)"/>
      <StatRow label="Active Operations" value={patrolCount} color="var(--green)"/>
      <StatRow label="Returning (RTH)" value={rthCount} color="var(--orange)"/>
      <StatRow label="Inductive Charging" value={chargingCount} color="var(--yellow)"/>
      <StatRow label="Pre-flight Ready" value={readyCount} color="#60a5fa"/>
      <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }}/>
      <StatRow label="Ground AGVs" value={f.total} color="var(--muted)"/>
    </Panel>);
}
export function TaskOverviewPanel() {
    const o = useStore((s) => s.twin.kpi.operation);
    return (<Panel title="Task Overview">
      <StatRow label="Ongoing Tasks" value={o.ongoing}/>
      <StatRow label="Completed Today" value={o.completed_today}/>
      <StatRow label="Avg. Completion Time" value={`${(o.avg_task_time_s / 60).toFixed(2)} min`}/>
      <StatRow label="On-time Rate" value={`${(o.on_time_rate * 100).toFixed(1)}%`}/>
      <StatRow label="Utilization" value={`${Math.round(o.avg_utilization * 100)}%`}/>
    </Panel>);
}
const SUB_COLOR = { NORMAL: "#22c55e", WARNING: "#eab308", ERROR: "#ef4444" };
export function SystemStatusPanel() {
    const sub = useStore((s) => s.twin.subsystems);
    const rows = [["Warehouse", "WAREHOUSE"], ["Conveyors", "CONVEYORS"], ["Charging", "CHARGING"], ["CCTV", "CCTV"], ["Network", "NETWORK"]];
    return (<Panel title="System Status">
      {rows.map(([label, key]) => {
            const st = sub[key] ?? "NORMAL";
            return (<div className="stat-row" key={key}>
            <span>{label}</span>
            <span className="status-text" style={{ color: SUB_COLOR[st] }}><Dot color={SUB_COLOR[st]}/>{st === "NORMAL" ? "Normal" : st === "WARNING" ? "Warning" : "Error"}</span>
          </div>);
        })}
    </Panel>);
}
export function AlertsPanel() {
    const alerts = useStore((s) => s.twin.alerts);
    const select = useStore((s) => s.select);
    const focus = useStore((s) => s.focus);
    const list = Object.values(alerts).filter((a) => a.resolved_tick === null).sort((a, b) => b.created_tick - a.created_tick);
    const go = (a) => {
        if (a.robot_id)
            select(a.robot_id);
        else if (a.zone_id) {
            const z = layout.zones.find((zz) => zz.id === a.zone_id);
            const xs = z.polygon.map((p) => p[0]), zs = z.polygon.map((p) => p[1]);
            focus([(Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2]);
        }
    };
    return (<Panel title="Alerts" grow>
      {list.map((a) => (<div key={a.id} className={"alert-card " + a.severity + (a.acknowledged ? " acked" : "")} onClick={() => go(a)}>
          <span className="ico" style={{ background: SEVERITY_COLOR[a.severity], color: "#fff" }}>{a.severity === "CRITICAL" ? "!" : a.severity === "HIGH" ? "▲" : "i"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ttl">{a.title}</div>
            <div className="meta">{tickToClock(a.created_tick)}&nbsp;&nbsp;&nbsp;{a.detail}</div>
          </div>
          {!a.acknowledged && <button className="ack" title="Acknowledge" onClick={(e) => { e.stopPropagation(); simControl.ackAlert(a.id); }}>{Icon.check}</button>}
        </div>))}
      {list.length === 0 && <div style={{ color: "var(--muted)" }}>No active alerts</div>}
    </Panel>);
}
