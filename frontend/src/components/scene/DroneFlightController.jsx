import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { PATROL_CORRIDORS, useDroneHangarStore, } from "../../state/droneHangarStore";
const STATE_COLORS = {
    STORED: { label: "STORED", color: "#64748b", bg: "rgba(100, 116, 139, 0.2)" },
    CHARGING: { label: "CHARGING", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.2)" },
    READY: { label: "READY", color: "#00f0ff", bg: "rgba(0, 240, 255, 0.2)" },
    MISSION_PREP: { label: "MISSION PREP", color: "#facc15", bg: "rgba(250, 204, 21, 0.25)" },
    TAXIING: { label: "TAXIING", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.25)" },
    TAKEOFF: { label: "TAKEOFF", color: "#22c55e", bg: "rgba(34, 197, 94, 0.25)" },
    AIRBORNE: { label: "AIRBORNE", color: "#10b981", bg: "rgba(16, 185, 129, 0.25)" },
    RETURNING: { label: "RETURNING", color: "#f97316", bg: "rgba(249, 115, 22, 0.25)" },
    LANDING: { label: "LANDING", color: "#eab308", bg: "rgba(234, 179, 8, 0.25)" },
    RECOVERY: { label: "RECOVERY", color: "#a855f7", bg: "rgba(168, 85, 247, 0.25)" },
    MAINTENANCE: { label: "MAINTENANCE", color: "#ec4899", bg: "rgba(236, 72, 153, 0.25)" },
    MANUFACTURING: { label: "MANUFACTURING", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.25)" },
    FAULT: { label: "FAULT", color: "#ef4444", bg: "rgba(239, 68, 68, 0.25)" },
    OFFLINE: { label: "OFFLINE", color: "#475569", bg: "rgba(71, 85, 105, 0.2)" },
};
/** Individual airborne drone entity with 3D flight kinematics */
function AirbornePatrolDroneMesh({ drone }) {
    const selectDrone = useDroneHangarStore((s) => s.selectDrone);
    const selectedDroneId = useDroneHangarStore((s) => s.selectedDroneId);
    const isSelected = selectedDroneId === drone.id;
    const rotorRefs = [
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
    ];
    const strobeRef = useRef(null);
    const armLen = 0.46;
    const armAngle = Math.PI / 4;
    const motorPositions = useMemo(() => [
        [Math.cos(armAngle) * armLen, 0.03, Math.sin(armAngle) * armLen],
        [-Math.cos(armAngle) * armLen, 0.03, Math.sin(armAngle) * armLen],
        [-Math.cos(armAngle) * armLen, 0.03, -Math.sin(armAngle) * armLen],
        [Math.cos(armAngle) * armLen, 0.03, -Math.sin(armAngle) * armLen],
    ], []);
    useFrame(({ clock }, dt) => {
        // Dynamic rotor RPM based on flight state
        const rpm = drone.status === "AIRBORNE" ? 70 : drone.status === "TAKEOFF" || drone.status === "LANDING" ? 85 : drone.speed > 0.1 ? 25 : 5;
        const spinStep = rpm * dt;
        rotorRefs.forEach((ref, idx) => {
            if (ref.current) {
                const dir = idx % 2 === 0 ? 1 : -1;
                ref.current.rotation.y += spinStep * dir;
            }
        });
        if (strobeRef.current) {
            strobeRef.current.intensity = Math.sin(clock.elapsedTime * 10) > 0.6 ? 3.5 : 0.1;
        }
    });
    const [px, py, pz] = drone.currentPosition;
    const altitude = Math.max(0.08, py);
    const stateMeta = STATE_COLORS[drone.status] || STATE_COLORS.AIRBORNE;
    // 3D flight corridor waypoints
    const corridorPoints = useMemo(() => {
        const corridor = PATROL_CORRIDORS[drone.corridorId];
        if (!corridor)
            return [];
        return corridor.waypoints.map((w) => w.position);
    }, [drone.corridorId]);
    return (<group position={[px, py, pz]}>
      {/* Ground Projection Ring and Heading Arrow */}
      <group position={[0, -altitude + 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.75, 0.88, 32]}/>
        <meshBasicMaterial color={isSelected ? "#00f0ff" : stateMeta.color} transparent opacity={0.6}/>
        {/* Forward heading navigation arrow */}
        <mesh position={[0, 0.95, 0]} rotation-z={-drone.heading + Math.PI / 2}>
          <coneGeometry args={[0.18, 0.35, 3]}/>
          <meshBasicMaterial color="#00f0ff"/>
        </mesh>
      </group>

      {/* 3D flight attitude dynamics (pitch/roll/yaw) */}
      <group scale={[1.6, 1.6, 1.6]} rotation-y={drone.heading} rotation-x={drone.pitch} rotation-z={drone.roll} onClick={(e) => {
            e.stopPropagation();
            selectDrone(drone.id);
        }}>
        {/* 1. Airframe central fuselage */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.16, 0.58]}/>
          <meshStandardMaterial color={isSelected ? "#00f0ff" : "#f1f5f9"} metalness={0.6} roughness={0.25} emissive={isSelected ? "#00f0ff" : "#0284c7"} emissiveIntensity={isSelected ? 0.4 : 0.1}/>
        </mesh>

        {/* 2. Aerodynamic avionics canopy */}
        <mesh position={[0, 0.11, -0.04]} castShadow>
          <sphereGeometry args={[0.17, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]}/>
          <meshStandardMaterial color="#0284c7" metalness={0.85} roughness={0.15}/>
        </mesh>

        {/* 3. Mission payload instrumentation */}
        {drone.payload === "CARGO_CONTAINER" ? (<group position={[0, -0.22, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.34, 0.22, 0.48]}/>
              <meshStandardMaterial color="#f97316" metalness={0.3} roughness={0.4}/>
            </mesh>
            <mesh position={[0, 0, 0.245]}>
              <boxGeometry args={[0.26, 0.04, 0.01]}/>
              <meshBasicMaterial color="#ffffff"/>
            </mesh>
          </group>) : drone.payload === "EO_CAMERA" ? (<group position={[0, -0.14, 0.16]}>
            <mesh castShadow>
              <sphereGeometry args={[0.11, 16, 16]}/>
              <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1}/>
            </mesh>
            <mesh position={[0, 0, 0.09]}>
              <cylinderGeometry args={[0.045, 0.045, 0.04, 16]}/>
              <meshBasicMaterial color="#00f0ff"/>
            </mesh>
          </group>) : (<group position={[0, -0.15, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.1, 16]}/>
              <meshStandardMaterial color="#c084fc" metalness={0.8}/>
            </mesh>
          </group>)}

        {/* 4. Carbon fiber landing skids */}
        <group position={[0, -0.16, 0]}>
          {[-0.24, 0.24].map((sx, si) => (<group key={si} position={[sx, 0, 0]}>
              <mesh position={[0, 0.08, -0.18]} rotation-z={sx > 0 ? 0.18 : -0.18}>
                <cylinderGeometry args={[0.014, 0.016, 0.18, 8]}/>
                <meshStandardMaterial color="#0f172a" metalness={0.9}/>
              </mesh>
              <mesh position={[0, 0.08, 0.18]} rotation-z={sx > 0 ? 0.18 : -0.18}>
                <cylinderGeometry args={[0.014, 0.016, 0.18, 8]}/>
                <meshStandardMaterial color="#0f172a" metalness={0.9}/>
              </mesh>
              <mesh position={[0, -0.01, 0]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.018, 0.018, 0.65, 12]}/>
                <meshStandardMaterial color="#0284c7" metalness={0.8}/>
              </mesh>
            </group>))}
        </group>

        {/* 5. Carbon fiber 4-rotor arms and propeller assembly */}
        {motorPositions.map(([mx, my, mz], idx) => {
            const armRotY = Math.atan2(mx, mz);
            return (<group key={idx}>
              <mesh position={[mx / 2, 0, mz / 2]} rotation-y={armRotY} castShadow>
                <boxGeometry args={[0.045, 0.032, armLen]}/>
                <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.9}/>
              </mesh>
              <mesh position={[mx, my, mz]} castShadow>
                <cylinderGeometry args={[0.062, 0.062, 0.075, 16]}/>
                <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.2}/>
              </mesh>
              <group ref={rotorRefs[idx]} position={[mx, my + 0.05, mz]}>
                <mesh position={[0, 0, 0]}>
                  <cylinderGeometry args={[0.018, 0.018, 0.024, 12]}/>
                  <meshStandardMaterial color="#94a3b8" metalness={0.9}/>
                </mesh>
                <mesh position={[0, 0.006, 0]}>
                  <boxGeometry args={[0.55, 0.008, 0.042]}/>
                  <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2}/>
                </mesh>
                <mesh position={[0, 0.007, 0]}>
                  <cylinderGeometry args={[0.28, 0.28, 0.003, 24]}/>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.3}/>
                </mesh>
              </group>
            </group>);
        })}

        {/* Dual forward headlights */}
        <mesh position={[-0.12, 0, 0.3]}>
          <sphereGeometry args={[0.035, 8, 8]}/>
          <meshBasicMaterial color="#ffffff"/>
        </mesh>
        <mesh position={[0.12, 0, 0.3]}>
          <sphereGeometry args={[0.035, 8, 8]}/>
          <meshBasicMaterial color="#ffffff"/>
        </mesh>

        {/* Navigation strobe beacons */}
        <pointLight ref={strobeRef} position={[0, 0.14, -0.24]} color={drone.status === "AIRBORNE" ? "#22c55e" : "#f59e0b"} distance={12} decay={2}/>

        {/* Down-looking altimeter laser beam */}
        {altitude > 0.4 && (<group position={[0, -0.1, 0]}>
            <mesh position={[0, -altitude / 2, 0]}>
              <cylinderGeometry args={[0.008, 0.04, altitude, 8]}/>
              <meshBasicMaterial color="#00f0ff" transparent opacity={0.4}/>
            </mesh>
            <mesh position={[0, -altitude + 0.02, 0]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.25, 0.4, 16]}/>
              <meshBasicMaterial color="#00f0ff" transparent opacity={0.7}/>
            </mesh>
          </group>)}
      </group>

      {/* Active flight corridor trajectory ribbon */}
      {(isSelected || drone.status === "AIRBORNE" || drone.status === "RETURNING") && corridorPoints.length > 0 && (<Line points={[...corridorPoints, corridorPoints[0]]} color={isSelected ? "#00f0ff" : "rgba(0, 240, 255, 0.45)"} lineWidth={isSelected ? 2.5 : 1.2} dashed dashSize={0.6} gapSize={0.3} transparent opacity={isSelected ? 0.9 : 0.4}/>)}

      {/* Ground taxi guideway centerline */}
      {(isSelected || drone.status === "TAXIING") && drone.currentRoute && drone.currentRoute.length > 0 && (<Line points={drone.currentRoute} color="#facc15" lineWidth={3.0} transparent opacity={isSelected ? 0.95 : 0.7}/>)}
    </group>);
}
/** Real-time autonomous drone fleet controller */
export function DroneFlightController() {
    const drones = useDroneHangarStore((s) => s.drones);
    const tickHangar = useDroneHangarStore((s) => s.tickHangar);
    useFrame((_, dt) => {
        tickHangar(dt);
    });
    // Filter for all active drones deployed from storage cradles
    const activeDrones = useMemo(() => {
        return Object.values(drones).filter((d) => d.status === "MISSION_PREP" ||
            d.status === "TAXIING" ||
            d.status === "TAKEOFF" ||
            d.status === "AIRBORNE" ||
            d.status === "RETURNING" ||
            d.status === "LANDING" ||
            d.status === "RECOVERY" ||
            d.status === "MAINTENANCE");
    }, [drones]);
    return (<group>
      {activeDrones.map((drone) => (<AirbornePatrolDroneMesh key={drone.id} drone={drone}/>))}
    </group>);
}
