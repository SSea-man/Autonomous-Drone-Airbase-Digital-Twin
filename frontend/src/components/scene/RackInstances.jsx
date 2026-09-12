import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { layout } from "../../state/store";
import { mulberry32 } from "../../simulation/engine";
import { useDroneHangarStore } from "../../state/droneHangarStore";
const dummy = new THREE.Object3D();
const color = new THREE.Color();
// Cradle status indicators:
// Cyan: Ready, Amber: Fast Charge, Purple: Diagnostic, Dark: Empty/Deployed
const STATUS_COLORS = {
    READY: "#00f0ff",
    CHARGING: "#f59e0b",
    DIAGNOSTIC: "#a855f7",
    EMPTY: "#1e293b",
};
/**
 * Autonomous UAV Docking and Inductive Charging Racks
 *  - Multi-tier inductive charging cradles housing autonomous drone fleet.
 *  - Rendered via high-performance InstancedMesh for 60 FPS performance.
 */
export function RackInstances({ castShadow = true, floor = 1, yOffset = 0, }) {
    const postRef = useRef(null);
    const beamRef = useRef(null);
    const cradleRef = useRef(null);
    const cradleLedRef = useRef(null);
    const droneBodyRef = useRef(null);
    const droneRotorRef = useRef(null);
    const droneBeaconRef = useRef(null);
    const selectDrone = useDroneHangarStore((s) => s.selectDrone);
    const data = useMemo(() => {
        const rnd = mulberry32(1234);
        const posts = [], beams = [], cradles = [], cradleLeds = [], droneBodies = [], droneRotors = [], droneBeacons = [];
        const armAngle = Math.PI / 4;
        const armLen = 0.38;
        const motorOffsets = [
            [Math.cos(armAngle) * armLen, Math.sin(armAngle) * armLen],
            [-Math.cos(armAngle) * armLen, Math.sin(armAngle) * armLen],
            [-Math.cos(armAngle) * armLen, -Math.sin(armAngle) * armLen],
            [Math.cos(armAngle) * armLen, -Math.sin(armAngle) * armLen],
        ];
        let droneIdx = 1;
        for (const r of layout.racks) {
            if ((r.floor ?? 1) !== floor)
                continue;
            const [x, , z] = r.position;
            const [w, h, d] = r.size;
            const levelH = h / r.levels;
            // 4 upright structural steel columns
            for (const [dx, dz] of [
                [0, 0],
                [w, 0],
                [0, d],
                [w, d],
            ]) {
                dummy.position.set(x + dx, h / 2, z + dz);
                dummy.scale.set(0.08, h, 0.08);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                posts.push(dummy.matrix.clone());
            }
            for (let l = 0; l < r.levels; l++) {
                const y = l * levelH + 0.05;
                // Front and rear load beams
                for (const dz of [0.02, d - 0.02]) {
                    dummy.position.set(x + w / 2, y, z + dz);
                    dummy.scale.set(w, 0.08, 0.06);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();
                    beams.push(dummy.matrix.clone());
                }
                // Shelf decking plates
                dummy.position.set(x + w / 2, y - 0.02, z + d / 2);
                dummy.scale.set(w, 0.03, d);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                beams.push(dummy.matrix.clone());
                // 2 smart inductive docking bays per shelf level
                for (let s = 0; s < 2; s++) {
                    const bayX = x + 0.75 + s * 1.5;
                    const bayZ = z + d / 2;
                    const bayY = y + 0.03;
                    // 1. Inductive charging cradle base
                    dummy.position.set(bayX, bayY + 0.015, bayZ);
                    dummy.scale.set(1.15, 0.03, d - 0.15);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();
                    cradles.push(dummy.matrix.clone());
                    const droneId = `DRN-${String(droneIdx++).padStart(3, "0")}`;
                    const liveDrone = useDroneHangarStore.getState().drones[droneId];
                    // Check if cradle currently houses an airframe:
                    // If drone is deployed, taxiing, or airborne, the cradle is rendered vacant
                    const isAwayFromDock = liveDrone &&
                        (liveDrone.status === "AIRBORNE" ||
                            liveDrone.status === "MISSION_PREP" ||
                            liveDrone.status === "TAXIING" ||
                            liveDrone.status === "TAKEOFF" ||
                            liveDrone.status === "RETURNING" ||
                            liveDrone.status === "LANDING" ||
                            liveDrone.status === "RECOVERY" ||
                            liveDrone.status === "MAINTENANCE");
                    const isDockedHere = liveDrone ? !isAwayFromDock : rnd() > 0.22;
                    const isCharging = liveDrone ? liveDrone.status === "CHARGING" : rnd() > 0.65;
                    const ledCol = !isDockedHere
                        ? STATUS_COLORS.EMPTY
                        : isCharging
                            ? STATUS_COLORS.CHARGING
                            : STATUS_COLORS.READY;
                    // 2. Cradle status indicator light bar
                    dummy.position.set(bayX, bayY + 0.025, bayZ + (d / 2 - 0.05));
                    dummy.scale.set(0.9, 0.02, 0.02);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();
                    cradleLeds.push({ m: dummy.matrix.clone(), c: ledCol });
                    // 3. Stored drone airframe in cradle
                    if (isDockedHere) {
                        const droneY = bayY + 0.12;
                        // Airframe fuselage
                        dummy.position.set(bayX, droneY, bayZ);
                        dummy.scale.set(0.32, 0.1, 0.44);
                        dummy.rotation.set(0, 0, 0);
                        dummy.updateMatrix();
                        droneBodies.push({ m: dummy.matrix.clone(), id: droneId });
                        // Status beacon LED
                        dummy.position.set(bayX, droneY + 0.08, bayZ - 0.04);
                        dummy.scale.set(0.04, 0.04, 0.04);
                        dummy.rotation.set(0, 0, 0);
                        dummy.updateMatrix();
                        droneBeacons.push({ m: dummy.matrix.clone(), c: ledCol });
                        // 4-arm rotor assembly
                        for (const [ox, oz] of motorOffsets) {
                            dummy.position.set(bayX + ox, droneY + 0.03, bayZ + oz);
                            dummy.scale.set(0.32, 0.015, 0.025);
                            dummy.rotation.set(0, (rnd() * Math.PI) / 2, 0);
                            dummy.updateMatrix();
                            droneRotors.push(dummy.matrix.clone());
                        }
                    }
                }
            }
        }
        return {
            posts,
            beams,
            cradles,
            cradleLeds,
            droneBodies,
            droneRotors,
            droneBeacons,
        };
    }, [floor]);
    useLayoutEffect(() => {
        data.posts.forEach((m, i) => postRef.current.setMatrixAt(i, m));
        data.beams.forEach((m, i) => beamRef.current.setMatrixAt(i, m));
        data.cradles.forEach((m, i) => cradleRef.current.setMatrixAt(i, m));
        data.cradleLeds.forEach((led, i) => {
            cradleLedRef.current.setMatrixAt(i, led.m);
            cradleLedRef.current.setColorAt(i, color.set(led.c));
        });
        data.droneBodies.forEach((d, i) => droneBodyRef.current.setMatrixAt(i, d.m));
        data.droneRotors.forEach((m, i) => droneRotorRef.current.setMatrixAt(i, m));
        data.droneBeacons.forEach((b, i) => {
            droneBeaconRef.current.setMatrixAt(i, b.m);
            droneBeaconRef.current.setColorAt(i, color.set(b.c));
        });
        postRef.current.instanceMatrix.needsUpdate = true;
        beamRef.current.instanceMatrix.needsUpdate = true;
        cradleRef.current.instanceMatrix.needsUpdate = true;
        cradleLedRef.current.instanceMatrix.needsUpdate = true;
        if (cradleLedRef.current.instanceColor)
            cradleLedRef.current.instanceColor.needsUpdate = true;
        droneBodyRef.current.instanceMatrix.needsUpdate = true;
        droneRotorRef.current.instanceMatrix.needsUpdate = true;
        droneBeaconRef.current.instanceMatrix.needsUpdate = true;
        if (droneBeaconRef.current.instanceColor)
            droneBeaconRef.current.instanceColor.needsUpdate = true;
        [postRef, beamRef, cradleRef, cradleLedRef, droneBodyRef, droneRotorRef, droneBeaconRef].forEach((r) => r.current?.computeBoundingSphere());
    }, [data]);
    const handleDroneClick = (e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined && data.droneBodies[e.instanceId]) {
            const droneMeta = data.droneBodies[e.instanceId];
            const liveDrones = useDroneHangarStore.getState().drones;
            if (liveDrones[droneMeta.id]) {
                selectDrone(droneMeta.id);
            }
            else {
                const firstKey = Object.keys(liveDrones)[0];
                if (firstKey)
                    selectDrone(firstKey);
            }
        }
    };
    return (<group position-y={yOffset}>
      {/* Upright rack columns */}
      <instancedMesh ref={postRef} args={[undefined, undefined, data.posts.length]} castShadow={castShadow} receiveShadow frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#1e2638" roughness={0.6} metalness={0.6}/>
      </instancedMesh>

      {/* Structural beams and shelf decking */}
      <instancedMesh ref={beamRef} args={[undefined, undefined, data.beams.length]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#0284c7" roughness={0.4} metalness={0.5}/>
      </instancedMesh>

      {/* Smart drone docking cradles */}
      <instancedMesh ref={cradleRef} args={[undefined, undefined, data.cradles.length]} castShadow={castShadow} receiveShadow frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8}/>
      </instancedMesh>

      {/* Cradle status LED indicator */}
      <instancedMesh ref={cradleLedRef} args={[undefined, undefined, data.cradleLeds.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false}/>
      </instancedMesh>

      {/* Stored drone airframe (click to inspect telemetry) */}
      <instancedMesh ref={droneBodyRef} args={[undefined, undefined, data.droneBodies.length]} castShadow={castShadow} receiveShadow frustumCulled={false} onClick={handleDroneClick} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
        <boxGeometry />
        <meshStandardMaterial color="#0b1120" roughness={0.2} metalness={0.9}/>
      </instancedMesh>

      {/* Stored drone rotor assembly */}
      <instancedMesh ref={droneRotorRef} args={[undefined, undefined, data.droneRotors.length]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.6}/>
      </instancedMesh>

      {/* Stored drone status beacon */}
      <instancedMesh ref={droneBeaconRef} args={[undefined, undefined, data.droneBeacons.length]} frustumCulled={false}>
        <sphereGeometry />
        <meshBasicMaterial toneMapped={false}/>
      </instancedMesh>
    </group>);
}
