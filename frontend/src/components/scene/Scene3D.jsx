import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer, Bloom, N8AO, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { layout, useStore } from "../../state/store";
import { WarehouseShell } from "./WarehouseShell";
import { RackInstances } from "./RackInstances";
import { Fixtures } from "./Fixtures";
import { ZoneOverlay } from "./ZoneOverlay";
import { Robots } from "./Robots";
import { CameraGizmos } from "./Cameras";
import { People } from "./People";
import { Mezzanine, FLOOR_ELEV } from "./Mezzanine";
/** Camera focus transition with automatic control release for interactive navigation */
function CameraRig({ controls }) {
    const focusTarget = useStore((s) => s.focusTarget);
    const focusCameraPos = useStore((s) => s.focusCameraPos);
    const focus = useStore((s) => s.focus);
    const selected = useStore((s) => s.selectedRobot);
    const robots = useStore((s) => s.twin.robots);
    const goal = useRef(null);
    const camGoal = useRef(null);
    const prevSel = useRef(selected);
    // Release target tracking immediately upon user orbit drag
    useEffect(() => {
        const c = controls.current;
        if (!c)
            return;
        const onStart = () => {
            goal.current = null;
            camGoal.current = null;
        };
        c.addEventListener("start", onStart);
        return () => {
            c.removeEventListener("start", onStart);
        };
    }, [controls]);
    useEffect(() => {
        if (focusTarget) {
            goal.current = new THREE.Vector3(...focusTarget);
            if (focusCameraPos) {
                camGoal.current = new THREE.Vector3(...focusCameraPos);
            }
            else {
                camGoal.current = new THREE.Vector3(focusTarget[0], 28, focusTarget[2] + 26);
            }
        }
    }, [focusTarget, focusCameraPos]);
    useEffect(() => {
        if (selected && selected !== prevSel.current) {
            const r = robots[selected];
            if (r) {
                const ey = FLOOR_ELEV[r.floor] ?? 0;
                goal.current = new THREE.Vector3(r.position[0], ey + 0.5, r.position[2]);
                camGoal.current = new THREE.Vector3(r.position[0] + 16, ey + 11, r.position[2] + 2.5);
            }
        }
        prevSel.current = selected;
    }, [selected, robots]);
    useFrame(({ camera }, dt) => {
        const c = controls.current;
        if (!c || !goal.current)
            return;
        const k = 1 - Math.pow(0.001, dt);
        c.target.lerp(goal.current, k);
        if (camGoal.current)
            camera.position.lerp(camGoal.current, k);
        c.update();
        if (c.target.distanceTo(goal.current) < 0.15) {
            goal.current = null;
            camGoal.current = null;
            focus(null);
        }
    });
    return null;
}
/** Keyboard WASD / arrow key fly-through controls */
function KeyboardNavigation({ controls }) {
    const keys = useRef({});
    useEffect(() => {
        const onDown = (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            keys.current[e.key.toLowerCase()] = true;
        };
        const onUp = (e) => {
            keys.current[e.key.toLowerCase()] = false;
        };
        window.addEventListener("keydown", onDown);
        window.addEventListener("keyup", onUp);
        return () => {
            window.removeEventListener("keydown", onDown);
            window.removeEventListener("keyup", onUp);
        };
    }, []);
    useFrame(({ camera }, dt) => {
        const c = controls.current;
        if (!c)
            return;
        const turbo = keys.current["shift"];
        const speed = (turbo ? 85 : 38) * dt;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        let moved = false;
        const move = new THREE.Vector3();
        if (keys.current["w"] || keys.current["arrowup"]) {
            move.addScaledVector(forward, speed);
            moved = true;
        }
        if (keys.current["s"] || keys.current["arrowdown"]) {
            move.addScaledVector(forward, -speed);
            moved = true;
        }
        if (keys.current["d"] || keys.current["arrowright"]) {
            move.addScaledVector(right, speed);
            moved = true;
        }
        if (keys.current["a"] || keys.current["arrowleft"]) {
            move.addScaledVector(right, -speed);
            moved = true;
        }
        if (keys.current["e"] || keys.current[" "]) {
            move.y += speed * 0.7;
            moved = true;
        }
        if (keys.current["q"] || keys.current["c"]) {
            move.y -= speed * 0.7;
            moved = true;
        }
        if (moved) {
            camera.position.add(move);
            c.target.add(move);
            c.update();
        }
    });
    return null;
}
function Lights({ quality }) {
    const shadows = quality !== "low";
    return (<>
      <ambientLight intensity={0.4} color="#b9c6e0"/>
      <hemisphereLight args={["#9db4e0", "#1a2233", 0.45]}/>
      <directionalLight position={[80, 130, 75]} intensity={1.7} color="#e8eefc" castShadow={shadows} shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-180} shadow-camera-right={180} shadow-camera-top={130} shadow-camera-bottom={-130} shadow-camera-near={10} shadow-camera-far={350}/>
      <pointLight position={[80, 25, 75]} intensity={0.8} color="#60a5fa" distance={160} decay={1}/>
      <pointLight position={[-35, 12, 85]} intensity={1.4} color="#00f0ff" distance={45} decay={1.5}/>
      <pointLight position={[110, 15, 160]} intensity={1.4} color="#22c55e" distance={75} decay={1.5}/>
    </>);
}
function FpsCounter({ onFps }) {
    const acc = useRef({ t: 0, n: 0 });
    useFrame((_, dt) => { acc.current.t += dt; acc.current.n++; if (acc.current.t >= 0.5) {
        onFps(Math.round(acc.current.n / acc.current.t));
        acc.current = { t: 0, n: 0 };
    } });
    return null;
}
/** Background lighting, fog, and procedural environment map */
function Background({ env = true }) {
    const { scene, gl } = useThree();
    useEffect(() => {
        scene.background = new THREE.Color("#05080f");
        scene.fog = new THREE.Fog("#05080f", 220, 560);
        if (!env)
            return;
        const pmrem = new THREE.PMREMGenerator(gl);
        const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = tex;
        scene.environmentIntensity = 0.35;
        return () => { scene.environment = null; tex.dispose(); pmrem.dispose(); };
    }, [scene, gl, env]);
    return null;
}
import { DroneFlightController } from "./DroneFlightController";
export function SceneContent({ quality, lite = false }) {
    const af = useStore((s) => s.activeFloor);
    const activeFloor = lite ? "all" : af; // CCTV thumbnail scenes render all floors
    const f2 = layout.floors?.find((f) => f.id === 2);
    return (<>
      <Background env={!lite}/>
      <Lights quality={lite ? "low" : quality}/>
      <group visible={activeFloor === "all" || activeFloor === "exploded" || activeFloor === 1}>
        <WarehouseShell lite={lite}/>
        <RackInstances castShadow={!lite && quality !== "low"} floor={1}/>
        <Fixtures lite={lite}/>
      </group>
      {f2 && (<group visible={activeFloor === "all" || activeFloor === "exploded" || activeFloor === 2} position-y={activeFloor === "exploded" ? 5 : 0}>
          <Mezzanine lite={lite}/>
          <RackInstances castShadow={false} floor={2} yOffset={f2.elevation}/>
        </group>)}
      {/* Active airborne drone renderer and flight controller */}
      <DroneFlightController />
      <ZoneOverlay labels={!lite}/>
      <People lite={lite}/>
      <Robots lite={lite}/>
      {!lite && <CameraGizmos />}
    </>);
}
export function Scene3D() {
    const quality = useStore((s) => s.quality);
    const tool = useStore((s) => s.tool);
    const select = useStore((s) => s.select);
    const controls = useRef(null);
    const [fps, setFps] = useState(0);
    return (<>
      <Canvas resize={{ offsetSize: true }} shadows={quality !== "low"} dpr={quality === "high" ? [1, 1.5] : 1} gl={{ antialias: quality !== "low", powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} camera={{ position: [80, 110, 230], fov: 38, near: 0.5, far: 800 }} onPointerMissed={() => tool === "select" && select(null)}>
        <SceneContent quality={quality}/>
        <OrbitControls ref={controls} target={[80, 0, 75]} maxPolarAngle={Math.PI / 2.05} minDistance={4} maxDistance={600} enableDamping dampingFactor={0.08} enablePan mouseButtons={tool === "pan" ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}/>
        <CameraRig controls={controls}/>
        <KeyboardNavigation controls={controls}/>
        <FpsCounter onFps={setFps}/>
        {quality === "high" && (<EffectComposer multisampling={2}>
            <N8AO aoRadius={1.5} intensity={1.0} distanceFalloff={1}/>
            <Bloom luminanceThreshold={0.88} intensity={0.45} mipmapBlur/>
            <Vignette eskil={false} offset={0.2} darkness={0.5}/>
          </EffectComposer>)}
        {quality === "medium" && (<EffectComposer multisampling={0}>
            <Bloom luminanceThreshold={0.9} intensity={0.35} mipmapBlur/>
          </EffectComposer>)}
      </Canvas>
      <div className="fps">{fps} FPS · {quality.toUpperCase()}</div>
    </>);
}
