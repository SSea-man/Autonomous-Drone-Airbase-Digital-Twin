import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { STATUS_COLOR, useStore } from "../../state/store";
import { FLOOR_ELEV } from "./Mezzanine";
/**
 * Autonomous Fleet Quadcopter Drone
 *  - Dynamic rotor rotation and aerodynamic banking kinematics
 *  - Flight-Altitude Hovering at 1.6m with sinusoidal bob
 *  - Dynamic Pitch & Roll Banking Angles
 *  - Down-Looking Altimeter Laser Beam & Ground Reticles
 *  - Nav Lights: Port Red / Starboard Green / Tail Strobe
 */
export function RobotMesh({ r, selected, onSelect, showLabel, lite, smooth = true, }) {
    const color = STATUS_COLOR[r.status];
    const ringRef = useRef(null);
    const lampRef = useRef(null);
    const groupRef = useRef(null);
    const tiltRef = useRef(null);
    const strobeRef = useRef(null);
    const groundGizmoRef = useRef(null);
    const rotorRefs = [
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
    ];
    // 4-rotor arm geometry (front-right, front-left, rear-left, rear-right)
    const armLen = 0.46;
    const armAngle = Math.PI / 4;
    const motorPositions = useMemo(() => [
        [Math.cos(armAngle) * armLen, 0.03, Math.sin(armAngle) * armLen], // 0: Starboard front
        [-Math.cos(armAngle) * armLen, 0.03, Math.sin(armAngle) * armLen], // 1: Port front
        [-Math.cos(armAngle) * armLen, 0.03, -Math.sin(armAngle) * armLen], // 2: Port rear
        [Math.cos(armAngle) * armLen, 0.03, -Math.sin(armAngle) * armLen], // 3: Starboard rear
    ], []);
    const init = useRef(null);
    if (!init.current) {
        const L0 = r.lift_id ? useStore.getState().twin.lifts[r.lift_id] : null;
        const isLanded = r.status === "CHARGING" || !!r.lift_id;
        const baseElev = L0 ? L0.y : FLOOR_ELEV[r.floor] ?? 0;
        const initAlt = isLanded ? (r.lift_id ? 0.22 : 0.08) : 1.6;
        init.current = {
            p: [r.position[0], baseElev + initAlt, r.position[2]],
            h: -r.heading,
        };
    }
    // Interpolate telemetry to 60 FPS: hover elevation, banking, rotor rotation
    useFrame(({ clock }, dt) => {
        const g = groupRef.current;
        if (!g)
            return;
        const k = smooth ? 1 - Math.pow(0.0005, dt) : 1;
        g.position.x += (r.position[0] - g.position.x) * k;
        g.position.z += (r.position[2] - g.position.z) * k;
        const st = useStore.getState();
        const lift = r.lift_id ? st.twin.lifts[r.lift_id] : null;
        const explode = !lite && st.activeFloor === "exploded" && r.floor === 2 && !r.lift_id ? 5 : 0;
        // Altitude: 0.08m docked/charging, 0.22m elevator platform, 1.6m cruise
        const isLanded = r.status === "CHARGING" || !!r.lift_id;
        const cruiseAlt = isLanded ? (r.lift_id ? 0.22 : 0.08) : 1.6;
        const hoverBob = !isLanded
            ? Math.sin(clock.elapsedTime * 2.8 + (r.id.charCodeAt(1) || 0) * 1.5) * 0.045
            : 0;
        const currentAgl = cruiseAlt + hoverBob;
        const ty = (lift ? lift.y : FLOOR_ELEV[r.floor] ?? 0) + explode + currentAgl;
        const ky = lift ? 1 - Math.pow(0.02, dt) : smooth ? 1 - Math.pow(0.15, dt) : 1;
        g.position.y += (ty - g.position.y) * ky;
        // Smooth heading interpolation
        let dh = -r.heading - g.rotation.y;
        while (dh > Math.PI)
            dh -= 2 * Math.PI;
        while (dh < -Math.PI)
            dh += 2 * Math.PI;
        g.rotation.y += dh * k;
        // Dynamic attitude banking (pitch and roll)
        if (tiltRef.current) {
            const targetPitch = isLanded ? 0 : Math.min(0.24, Math.max(-0.08, r.velocity * 0.14));
            const targetRoll = isLanded ? 0 : Math.max(-0.16, Math.min(0.16, -dh * 0.22));
            tiltRef.current.rotation.x += (targetPitch - tiltRef.current.rotation.x) * (1 - Math.pow(0.01, dt));
            tiltRef.current.rotation.z += (targetRoll - tiltRef.current.rotation.z) * (1 - Math.pow(0.01, dt));
        }
        // High-speed rotor rotation (CW / CCW pair configuration)
        const isCharging = r.status === "CHARGING";
        const isStopped = r.status === "ERROR";
        const rpmMultiplier = isCharging ? 0 : isStopped ? 0.15 : r.velocity > 0.05 ? 1.5 : 1.0;
        const spinStep = rpmMultiplier * 45 * dt;
        rotorRefs.forEach((ref, idx) => {
            if (ref.current) {
                const dir = idx % 2 === 0 ? 1 : -1;
                ref.current.rotation.y += spinStep * dir;
            }
        });
        // Ground shadow and sensor reticle projected at floor level
        if (groundGizmoRef.current) {
            groundGizmoRef.current.position.y = -currentAgl;
        }
        // Tail anti-collision strobe beacon
        if (strobeRef.current) {
            strobeRef.current.intensity = Math.sin(clock.elapsedTime * 8) > 0.65 ? 3.0 : 0.05;
        }
        // Selection indicator pulse
        if (ringRef.current) {
            const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.08;
            ringRef.current.scale.set(s, s, s);
        }
        // Warning / fault alert blinker
        if (lampRef.current && (r.status === "ERROR" || r.status === "WARNING")) {
            lampRef.current.opacity = 0.5 + Math.sin(clock.elapsedTime * 8) * 0.5;
        }
    });
    const loaded = r.load.current > 0;
    const isLanded = r.status === "CHARGING" || !!r.lift_id;
    const approxAgl = isLanded ? (r.lift_id ? 0.22 : 0.08) : 1.6;
    return (<group ref={groupRef} position={init.current.p} rotation-y={init.current.h}>
      {/* Dynamic Pitch & Roll Group */}
      <group ref={tiltRef}>
        <group onClick={(e) => {
            e.stopPropagation();
            onSelect();
        }} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
          {/* Central Carbon Fuselage */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <boxGeometry args={[0.34, 0.12, 0.48]}/>
            <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.8}/>
          </mesh>

          {/* Aerodynamic Canopy */}
          <mesh position={[0, 0.11, 0.02]} castShadow>
            <boxGeometry args={[0.24, 0.07, 0.32]}/>
            <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.9}/>
          </mesh>

          {/* GPS Mast Navigation Antenna */}
          <mesh position={[0, 0.16, -0.06]}>
            <cylinderGeometry args={[0.03, 0.04, 0.04, 16]}/>
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4}/>
          </mesh>

          {/* Status Beacon Light */}
          <mesh position={[0, 0.19, -0.06]}>
            <sphereGeometry args={[0.038, 12, 12]}/>
            <meshBasicMaterial ref={lampRef} color={color} transparent/>
          </mesh>

          {/* 4-Arm Carbon Rotor Assembly */}
          {motorPositions.map((pos, i) => {
            const isPort = pos[0] < 0; // Port: Red, Starboard: Green
            return (<group key={i}>
                {/* Carbon Arm Tube */}
                <mesh position={[pos[0] / 2, pos[1] / 2, pos[2] / 2]} rotation={[0, Math.atan2(pos[0], pos[2]) + Math.PI / 2, 0]}>
                  <cylinderGeometry args={[0.018, 0.018, armLen, 8]}/>
                  <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.15}/>
                </mesh>

                {/* Brushless Motor Mount */}
                <mesh position={pos} castShadow>
                  <cylinderGeometry args={[0.05, 0.05, 0.065, 16]}/>
                  <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.25}/>
                </mesh>

                {/* Navigation Lights (Port Red / Starboard Green) */}
                <mesh position={[pos[0] * 1.08, pos[1] - 0.01, pos[2] * 1.08]}>
                  <sphereGeometry args={[0.018, 8, 8]}/>
                  <meshBasicMaterial color={isPort ? "#ef4444" : "#10b981"}/>
                </mesh>

                {/* Dual-Blade Props and High-RPM Blur Disk */}
                <group ref={rotorRefs[i]} position={[pos[0], pos[1] + 0.042, pos[2]]}>
                  {/* Prop Hub Center */}
                  <mesh>
                    <cylinderGeometry args={[0.016, 0.016, 0.02, 10]}/>
                    <meshStandardMaterial color="#0f172a"/>
                  </mesh>
                  {/* Carbon Composite Propeller */}
                  <mesh>
                    <boxGeometry args={[0.36, 0.005, 0.028]}/>
                    <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7}/>
                  </mesh>
                  {/* Dynamic Prop Blur Disk */}
                  <mesh position={[0, 0.002, 0]}>
                    <cylinderGeometry args={[0.18, 0.18, 0.002, 20]}/>
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.28} side={THREE.DoubleSide}/>
                  </mesh>
                </group>
              </group>);
        })}

          {/* Forward Gimbal Camera */}
          <group position={[0, -0.05, 0.22]}>
            <mesh castShadow>
              <sphereGeometry args={[0.055, 14, 14]}/>
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1}/>
            </mesh>
            {/* Forward Optical Sensor */}
            <mesh position={[0, -0.015, 0.035]} rotation={[0.35, 0, 0]}>
              <cylinderGeometry args={[0.026, 0.026, 0.018, 14]}/>
              <meshBasicMaterial color="#00f0ff"/>
            </mesh>
          </group>

          {/* Landing Skids */}
          <group position={[0, -0.07, 0]}>
            <mesh position={[-0.14, -0.06, 0]}>
              <boxGeometry args={[0.018, 0.12, 0.38]}/>
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3}/>
            </mesh>
            <mesh position={[0.14, -0.06, 0]}>
              <boxGeometry args={[0.018, 0.12, 0.38]}/>
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3}/>
            </mesh>
          </group>

          {/* Anti-collision Strobe Beacon */}
          <pointLight ref={strobeRef} position={[0, 0.08, -0.26]} color="#ffffff" distance={12}/>

          {/* Down-Looking Altimeter Laser Beam */}
          {!isLanded && (<Line points={[
                [0, -0.08, 0],
                [0, -approxAgl, 0],
            ]} color="#00f0ff" lineWidth={1.3} dashed dashSize={0.25} gapSize={0.15} transparent opacity={0.65}/>)}

          {/* Underslung Cargo Pod */}
          {loaded && (<mesh position={[0, -0.18, 0]} castShadow>
              <boxGeometry args={[0.34, 0.24, 0.34]}/>
              <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.4}/>
            </mesh>)}
        </group>
      </group>

      {/* Ground Projection and Sensor Reticle Group */}
      <group ref={groundGizmoRef} position={[0, -approxAgl, 0]}>
        {/* Virtual LiDAR Field Visualization */}
        {!lite && selected && <PerceptionGizmo r={r}/>}
        {!lite && !selected && r.perception?.state === "STOPPED" && (<mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.95, 1.12, 24, 1, -Math.PI / 6, Math.PI / 3]}/>
            <meshBasicMaterial color="#ef4444" transparent opacity={0.9} side={THREE.DoubleSide}/>
          </mesh>)}

        {/* Ground Shadow Reticle */}
        <mesh ref={ringRef} position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.42, 0.56, 36]}/>
          <meshBasicMaterial color={selected ? "#60a5fa" : color} transparent opacity={selected ? 0.9 : 0.45} side={THREE.DoubleSide}/>
        </mesh>
        {selected && (<mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.95, 36]}/>
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.16}/>
          </mesh>)}
      </group>

      {!lite && r.status === "ERROR" && (<pointLight position={[0, 0.8, 0]} color="#ef4444" intensity={4} distance={5}/>)}

      {showLabel && (<Html position={[0, 0.45, 0]} zIndexRange={[10, 0]}>
          <div className={"lbl" +
                (selected
                    ? " sel"
                    : r.status === "ERROR"
                        ? " err"
                        : r.status === "CHARGING"
                            ? " chg"
                            : "")} onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}>
            {r.status === "ERROR" ? "⚠ " : ""}{r.id}
          </div>
        </Html>)}
    </group>);
}
const PERC_COLOR = { CLEAR: "#22d3ee", SLOWING: "#f59e0b", STOPPED: "#ef4444", OFF: "#475569" };
/** Sensor field visualization: 270 deg / 4m arc, forward clearance line, obstacle rays */
function PerceptionGizmo({ r }) {
    const P = r.perception;
    if (!P)
        return null;
    const col = PERC_COLOR[P.state];
    const range = 4;
    return (<group>
      <mesh position={[0, 0.025, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.7, range, 48, 1, -Math.PI * 0.75, Math.PI * 1.5]}/>
        <meshBasicMaterial color={col} transparent opacity={P.state === "STOPPED" ? 0.16 : 0.09} side={THREE.DoubleSide} depthWrite={false}/>
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[range - 0.05, range, 48, 1, -Math.PI * 0.75, Math.PI * 1.5]}/>
        <meshBasicMaterial color={col} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false}/>
      </mesh>
      <Line points={[[0.7, 0.08, 0], [Math.max(0.7, P.ahead_m), 0.08, 0]]} color={col} lineWidth={2} transparent opacity={0.9}/>
      {P.obstacles.map((o, i) => {
            const b = (-o.bearing_deg * Math.PI) / 180;
            const x = o.distance_m * Math.cos(b), z = o.distance_m * Math.sin(b);
            const blocking = o.kind !== "RACK" && P.state !== "CLEAR" && o.distance_m <= P.ahead_m + 0.05;
            const c = o.kind === "RACK" ? "#94a3b8" : blocking ? "#ef4444" : o.kind === "HUMAN" ? "#f97316" : "#fbbf24";
            return (<group key={i}>
            <Line points={[[0, 0.1, 0], [x, 0.1, z]]} color={c} lineWidth={blocking ? 2 : 1} dashed={o.kind === "RACK"} dashSize={0.3} gapSize={0.2} transparent opacity={0.85}/>
            {o.kind !== "RACK" && <mesh position={[x, 0.1, z]}><sphereGeometry args={[0.12, 8, 8]}/><meshBasicMaterial color={c}/></mesh>}
          </group>);
        })}
    </group>);
}
/** Active A* navigation trajectory with destination reticle */
function RobotPath({ r, selected }) {
    const pts = useMemo(() => {
        if (r.path.length === 0 || r.path_index >= r.path.length)
            return null;
        const y = (FLOOR_ELEV[r.floor] ?? 0) + (useStore.getState().activeFloor === "exploded" && r.floor === 2 ? 5 : 0) + 0.06;
        const out = [[r.position[0], y, r.position[2]]];
        for (let i = r.path_index; i < r.path.length; i++)
            out.push([r.path[i][0] + 0.5, y, r.path[i][1] + 0.5]);
        return out;
    }, [r.path, r.path_index, r.position, r.floor]);
    if (!pts)
        return null;
    const end = pts[pts.length - 1];
    const col = r.fsm === "GOING_TO_CHARGE" ? "#60a5fa" : r.load.current > 0 ? "#f59e0b" : "#22d3ee";
    return (<group>
      <Line points={pts} color={selected ? "#ffffff" : col} lineWidth={selected ? 2.4 : 1.1} dashed dashSize={0.7} gapSize={0.4} transparent opacity={selected ? 1 : 0.5}/>
      <mesh position={[end[0], end[1] - 0.01, end[2]]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.45, 0.65, 24]}/><meshBasicMaterial color={col} transparent opacity={0.85}/></mesh>
    </group>);
}
export function Robots({ lite = false }) {
    const robots = useStore((s) => s.twin.robots);
    const selected = useStore((s) => s.selectedRobot);
    const select = useStore((s) => s.select);
    const showLabels = useStore((s) => s.showLabels);
    const showPaths = useStore((s) => s.showPaths);
    const af = useStore((s) => s.activeFloor);
    const activeFloor = lite || af === "exploded" ? "all" : af;
    const visible = (r) => activeFloor === "all" || r.floor === activeFloor || !!r.lift_id;
    return (<group>
      {Object.values(robots).filter(visible).map((r) => (<group key={r.id}>
          <RobotMesh r={r} selected={r.id === selected} onSelect={() => select(r.id)} showLabel={showLabels && !lite} lite={lite}/>
          {showPaths && !lite && <RobotPath r={r} selected={r.id === selected}/>}
        </group>))}
    </group>);
}
