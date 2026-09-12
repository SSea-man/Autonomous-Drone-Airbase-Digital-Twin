import { create } from "zustand";
import { useDroneHangarStore } from "./droneHangarStore";
export const WORKCELLS_CONFIG = [
    {
        id: "WC-A1",
        name: "Workcell A1 · Carbon Chassis Assembly",
        stage: "FRAME_ASSEMBLY",
        position: [16, 0.95, 18],
        toolType: "GRIPPER",
        status: "ACTIVE",
        currentBuildId: "BLD-01",
    },
    {
        id: "WC-A2",
        name: "Workcell A2 · Brushless Motor & ESC Wiring",
        stage: "MOTOR_INSTALLATION",
        position: [24, 0.95, 18],
        toolType: "SCREWDRIVER",
        status: "ACTIVE",
        currentBuildId: null,
    },
    {
        id: "WC-A3",
        name: "Workcell A3 · Flight Controller & Avionics",
        stage: "AVIONICS_INSTALLATION",
        position: [32, 0.95, 18],
        toolType: "SOLDERING",
        status: "ACTIVE",
        currentBuildId: null,
    },
    {
        id: "WC-A4",
        name: "Workcell A4 · 4K Gimbal & LiDAR Integration",
        stage: "SENSOR_INSTALLATION",
        position: [40, 0.95, 18],
        toolType: "OPTICAL_MOUNT",
        status: "ACTIVE",
        currentBuildId: null,
    },
    {
        id: "WC-A5",
        name: "Workcell A5 · Battery Clamping & Final Fastening",
        stage: "BATTERY_INSTALLATION",
        position: [36, 0.95, 26],
        toolType: "FASTENER",
        status: "ACTIVE",
        currentBuildId: null,
    },
    {
        id: "WC-A6",
        name: "Workcell A6 · AI Optical Vision Inspection Gantry",
        stage: "AI_QUALITY_CHECK",
        position: [22, 0.95, 26],
        toolType: "LASER_SCANNER",
        status: "ACTIVE",
        currentBuildId: null,
    },
];
const STAGES_ORDER = [
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
export const useDroneManufacturingStore = create((set, get) => ({
    isLineRunning: true,
    activeBuild: {
        buildId: "BLD-2026-088",
        model: "AeroScout-M4",
        stage: "MOTOR_INSTALLATION",
        progress: 0.28,
        currentWorkcell: "Workcell A2 · Brushless Motor & ESC Wiring",
        qaScore: 99.4,
        startTime: Date.now() - 35000,
        stageTimer: 6.5,
    },
    completedBuilds: [],
    workcells: WORKCELLS_CONFIG,
    dailyCompletedCount: 42,
    aiQaPassRate: 99.7,
    avgCycleTimeMinutes: 4.2,
    toggleAssemblyLine: () => set((state) => ({ isLineRunning: !state.isLineRunning })),
    startNewBuild: (model = "AeroScout-M4") => {
        const buildId = `BLD-2026-${String(Math.floor(Math.random() * 800) + 100)}`;
        set({
            activeBuild: {
                buildId,
                model,
                stage: "COMPONENTS_RESERVED",
                progress: 0.05,
                currentWorkcell: "Automated Picking Bin",
                qaScore: 99.8,
                startTime: Date.now(),
                stageTimer: 0,
            },
        });
    },
    advanceStageManually: () => {
        const build = get().activeBuild;
        if (!build)
            return;
        const currentIdx = STAGES_ORDER.indexOf(build.stage);
        if (currentIdx < STAGES_ORDER.length - 1) {
            const nextStage = STAGES_ORDER[currentIdx + 1];
            const nextCell = WORKCELLS_CONFIG.find((w) => w.stage === nextStage)?.name ||
                (nextStage === "CALIBRATION"
                    ? "Zone C · Calibration Cage"
                    : nextStage === "FLIGHT_TEST"
                        ? "Zone D · Launch Pad 01"
                        : "Hangar Bay Assigned");
            set({
                activeBuild: {
                    ...build,
                    stage: nextStage,
                    progress: (currentIdx + 1) / (STAGES_ORDER.length - 1),
                    currentWorkcell: nextCell,
                    stageTimer: 0,
                },
            });
        }
    },
    tickManufacturing: (dt) => {
        const { isLineRunning, activeBuild } = get();
        if (!isLineRunning || !activeBuild)
            return;
        const build = { ...activeBuild };
        build.stageTimer += dt;
        // Advance manufacturing phase sequentially
        const stageDuration = build.stage === "AI_QUALITY_CHECK"
            ? 4.5
            : build.stage === "CALIBRATION"
                ? 5.0
                : build.stage === "FLIGHT_TEST"
                    ? 6.0
                    : 7.0;
        if (build.stageTimer >= stageDuration) {
            const currentIdx = STAGES_ORDER.indexOf(build.stage);
            if (currentIdx < STAGES_ORDER.length - 1) {
                const nextStage = STAGES_ORDER[currentIdx + 1];
                const nextCell = WORKCELLS_CONFIG.find((w) => w.stage === nextStage)?.name ||
                    (nextStage === "CALIBRATION"
                        ? "Zone C · Dynamic Calibration Cage"
                        : nextStage === "FLIGHT_TEST"
                            ? "Zone D · Maiden Flight Test"
                            : "Hangar Fleet Integration");
                build.stage = nextStage;
                build.stageTimer = 0;
                build.currentWorkcell = nextCell;
                build.progress = (currentIdx + 1) / (STAGES_ORDER.length - 1);
                // If completed: register new drone and assign storage dock
                if (nextStage === "COMPLETED") {
                    const hangarStore = useDroneHangarStore.getState();
                    const hangarDrones = hangarStore.drones;
                    const droneCount = Object.keys(hangarDrones).length;
                    const newDroneId = `DRN-${String(droneCount + 1).padStart(3, "0")}`;
                    build.assignedDroneId = newDroneId;
                    build.assignedBayLabel = `BAY-R04-L2-B (F1)`;
                    // Register in fleet registry
                    useDroneHangarStore.setState((s) => ({
                        drones: {
                            ...s.drones,
                            [newDroneId]: {
                                id: newDroneId,
                                name: `${build.model} #${newDroneId.slice(4)}`,
                                model: build.model,
                                status: "READY",
                                phase: "READY_STANDBY",
                                battery: 100,
                                health: 100,
                                speed: 0,
                                altitude: 0.12,
                                firmware: "v4.4.0-PX4-PROD",
                                flightHours: 0.0,
                                cycles: 0,
                                payload: "EO_CAMERA",
                                assignedSlot: {
                                    dockId: "BAY-R04-L2-B",
                                    rackIndex: 3,
                                    level: 2,
                                    slotIndex: 2,
                                    bayLabel: `BAY-R04-L2-B`,
                                    floor: 1,
                                    position: [58, 2.1, 24],
                                    aisleClearancePosition: [58, 2.1, 27],
                                },
                                currentPosition: [58, 2.1, 24],
                                velocity: [0, 0, 0],
                                heading: 0,
                                pitch: 0,
                                roll: 0,
                                targetPosition: [58, 2.1, 24],
                                currentFacility: "HANGAR 02",
                                currentZone: "HANGAR 02",
                                currentLocation: "Hangar 02 · Dock BAY-R04-L2-B",
                                nextAction: "Standby for maiden flight test",
                                decisionReason: "Factory acceptance certified — stored in Hangar 02",
                                currentPadId: null,
                                prepChecklist: {
                                    structural: true,
                                    battery: true,
                                    payload: true,
                                    telemetry: true,
                                    missionUpload: false,
                                    clearance: false,
                                },
                                mission: null,
                                missionName: "Factory Acceptance Passed · Ready for Runway Test",
                                missionProgress: 0,
                                corridorId: "RUNWAY_FLIGHT_TEST",
                                waypointIndex: 0,
                                patrolLaps: 0,
                                stateTimer: 0,
                                currentRoute: [],
                                routeIndex: 0,
                                prepStationIndex: 0,
                            },
                        },
                    }));
                    // New airframe built, register into hangar inventory
                    useDroneHangarStore.getState().addEvent(newDroneId, `Build Complete · Unit accepted into Hangar 02 Fleet`, "SUCCESS");
                    set((state) => ({
                        completedBuilds: [build, ...state.completedBuilds.slice(0, 19)],
                        dailyCompletedCount: state.dailyCompletedCount + 1,
                    }));
                    // Queue next assembly cycle
                    setTimeout(() => {
                        const models = [
                            "AeroScout-M4",
                            "HeavyLift-X8",
                            "VoltRacer-F4",
                            "Surveyor-LiDAR",
                        ];
                        const nextModel = models[Math.floor(Math.random() * models.length)];
                        get().startNewBuild(nextModel);
                    }, 3500);
                }
                set({ activeBuild: build });
            }
        }
        else {
            // Increment progress ratio
            build.progress = Math.min(1, (STAGES_ORDER.indexOf(build.stage) + build.stageTimer / stageDuration) /
                (STAGES_ORDER.length - 1));
            set({ activeBuild: build });
        }
    },
}));
