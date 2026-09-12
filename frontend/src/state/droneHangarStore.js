import { create } from "zustand";
import { layout } from "./store";
import { mulberry32 } from "../simulation/engine";
// 4 dedicated VTOL pads spaced 30m apart along Z=130
export const LAUNCH_PADS = [
    [65, 0.08, 130],
    [95, 0.08, 130],
    [125, 0.08, 130],
    [155, 0.08, 130],
];
export const PAD_IDS = ["PAD 01", "PAD 02", "PAD 03", "PAD 04"];
export const PREP_STATIONS = [
    { name: "Structural Airframe Inspection", position: [22, 0.95, 80] },
    { name: "Battery & Voltage Verification", position: [28, 0.95, 80] },
    { name: "Payload & Sensor Latch", position: [34, 0.95, 80] },
    { name: "Avionics & Telemetry Check", position: [22, 0.95, 90] },
    { name: "Mission Corridor Upload", position: [28, 0.95, 90] },
    { name: "Flight Safety Clearance", position: [34, 0.95, 90] },
];
export const PATROL_CORRIDORS = {
    PERIMETER_SURVEY: {
        id: "PERIMETER_SURVEY",
        name: "Campus Perimeter Surveillance Loop",
        waypoints: [
            { position: [-70, 14.5, -20], name: "NW Boundary Waypoint", zone: "Perimeter North" },
            { position: [220, 14.5, -20], name: "NE Boundary Waypoint", zone: "Perimeter East" },
            { position: [220, 14.5, 180], name: "SE Runway Buffer", zone: "Perimeter South" },
            { position: [-70, 14.5, 180], name: "SW Airspace Gate", zone: "Perimeter West" },
        ],
    },
    FACILITY_SECURITY: {
        id: "FACILITY_SECURITY",
        name: "Hangar Complex & Apron Patrol",
        waypoints: [
            { position: [15, 12.0, 35], name: "Warehouse West Perimeter", zone: "Hangar 02" },
            { position: [50, 12.0, 35], name: "Hangar 02 Fleet Racks", zone: "Hangar 02" },
            { position: [110, 10.0, 105], name: "Flight Apron Skyway", zone: "Flight Apron" },
            { position: [-35, 10.0, 85], name: "Command Center Airspace", zone: "Command Center" },
        ],
    },
    INFRASTRUCTURE_AUDIT: {
        id: "INFRASTRUCTURE_AUDIT",
        name: "Runway 09/27 Precision Corridor",
        waypoints: [
            { position: [55, 6.0, 160], name: "Runway 09 Threshold", zone: "Runway 09/27" },
            { position: [110, 8.0, 160], name: "Runway Midpoint Check", zone: "Runway 09/27" },
            { position: [175, 6.0, 160], name: "Runway 27 End Zone", zone: "Runway 09/27" },
            { position: [110, 16.0, 125], name: "Apron Transition Pass", zone: "Flight Apron" },
        ],
    },
    RUNWAY_FLIGHT_TEST: {
        id: "RUNWAY_FLIGHT_TEST",
        name: "Runway 09/27 Maiden Flight Test Certification",
        waypoints: [
            { position: [55, 0.38, 160], name: "RWY 09 Threshold Lineup", zone: "Runway 09/27" },
            { position: [95, 0.38, 160], name: "High-Speed Ground Takeoff Acceleration Roll", zone: "Runway 09/27" },
            { position: [135, 3.5, 160], name: "Rotation Vr & Initial Climb", zone: "Runway 09/27" },
            { position: [175, 8.5, 160], name: "Upwind Departure Transition", zone: "Runway 09/27" },
            { position: [175, 14.5, 105], name: "Crosswind Turn to 14.5m Altitude", zone: "Airspace East" },
            { position: [110, 14.5, 65], name: "Downwind High-Speed Pass (16 m/s) over Campus", zone: "Campus Airspace" },
            { position: [35, 10.0, 105], name: "Base Leg Descent & Telemetry Audit", zone: "Airspace West" },
            { position: [55, 3.8, 160], name: "Final Approach 3 Degree Glideslope", zone: "Runway 09/27" },
            { position: [90, 0.38, 160], name: "Runway 09/27 Touchdown Flare", zone: "Runway 09/27" },
            { position: [135, 0.38, 160], name: "Runway Deceleration Rollout", zone: "Runway 09/27" },
            { position: [135, 0.38, 125], name: "Taxiway Turnoff to Charlie Taxiway", zone: "Flight Apron" },
        ],
    },
};
const MODELS = ["AeroScout-M4", "HeavyLift-X8", "VoltRacer-F4", "Surveyor-LiDAR"];
const PAYLOADS = ["EO_CAMERA", "LIDAR_POD", "MULTI_SPECTRAL", "CARGO_CONTAINER"];
function getZoneFromPosition([x]) {
    if (x < -10)
        return "HANGAR 01 (MANUFACTURING)";
    return "HANGAR 02 (FLEET STORAGE)";
}
function getTimeString() {
    const d = new Date();
    return d.toTimeString().split(" ")[0];
}
/** Build deterministic ground taxi route from dock to VTOL pad */
export function buildOutboundTaxiRoute(clearancePos, padPos) {
    const hangarAisle = [clearancePos[0], 0.38, 55];
    const hangarExit = [50, 0.38, 68];
    const taxiwayAlpha = [50, 0.38, 85];
    const apronTransit = [padPos[0], 0.38, 100];
    const padThreshold = [padPos[0], 0.08, padPos[2] - 4];
    const padCenter = [padPos[0], 0.08, padPos[2]];
    return [
        [clearancePos[0], 0.38, clearancePos[2]],
        hangarAisle,
        hangarExit,
        taxiwayAlpha,
        apronTransit,
        padThreshold,
        padCenter,
    ];
}
/** Build deterministic ground taxi route from VTOL pad back to dock */
export function buildInboundTaxiRoute(padPos, clearancePos, dockPos) {
    const padThreshold = [padPos[0], 0.38, padPos[2] - 4];
    const apronTransit = [padPos[0], 0.38, 100];
    const taxiwayAlpha = [50, 0.38, 85];
    const hangarExit = [50, 0.38, 68];
    const hangarAisle = [clearancePos[0], 0.38, 55];
    return [
        [padPos[0], 0.38, padPos[2]],
        padThreshold,
        apronTransit,
        taxiwayAlpha,
        hangarExit,
        hangarAisle,
        [clearancePos[0], 0.38, clearancePos[2]],
        [dockPos[0], dockPos[1], dockPos[2]],
    ];
}
/** Build taxi route from hangar to runway threshold */
export function buildRunwayOutboundTaxiRoute(clearancePos) {
    const hangarAisle = [clearancePos[0], 0.38, 55];
    const hangarExit = [50, 0.38, 68];
    const taxiwayAlpha = [50, 0.38, 85];
    const runwayHoldShort = [50, 0.38, 155];
    const runway09Centerline = [55, 0.38, 160];
    return [
        [clearancePos[0], 0.38, clearancePos[2]],
        hangarAisle,
        hangarExit,
        taxiwayAlpha,
        runwayHoldShort,
        runway09Centerline,
    ];
}
/** Build taxi route from runway rollout back to hangar */
export function buildRunwayInboundTaxiRoute(clearancePos, dockPos) {
    const taxiwayTurnoff = [135, 0.38, 125];
    const apronTransit = [95, 0.38, 98];
    const taxiwayAlpha = [50, 0.38, 85];
    const hangarExit = [50, 0.38, 68];
    const hangarAisle = [clearancePos[0], 0.38, 55];
    return [
        taxiwayTurnoff,
        apronTransit,
        taxiwayAlpha,
        hangarExit,
        hangarAisle,
        [clearancePos[0], 0.38, clearancePos[2]],
        [dockPos[0], dockPos[1], dockPos[2]],
    ];
}
function initializeHangarTwin() {
    const docks = {};
    const drones = {};
    const rnd = mulberry32(8888);
    const padReservations = {
        "PAD 01": { padId: "PAD 01", position: LAUNCH_PADS[0], status: "CLEAR", droneId: null, missionName: null },
        "PAD 02": { padId: "PAD 02", position: LAUNCH_PADS[1], status: "CLEAR", droneId: null, missionName: null },
        "PAD 03": { padId: "PAD 03", position: LAUNCH_PADS[2], status: "CLEAR", droneId: null, missionName: null },
        "PAD 04": { padId: "PAD 04", position: LAUNCH_PADS[3], status: "CLEAR", droneId: null, missionName: null },
    };
    const initialEvents = [
        { id: "EVT-001", timestamp: "09:20:00", droneId: "SYSTEM", text: "URO Bangladesh Airbase Digital Twin initialized", severity: "INFO" },
        { id: "EVT-002", timestamp: "09:20:05", droneId: "SYS-OPS", text: "Autonomous Command & Operations Center online", severity: "SUCCESS" },
        { id: "EVT-003", timestamp: "09:20:12", droneId: "H2-CORE", text: "Hangar 02: 160 docking racks synchronized", severity: "INFO" },
    ];
    let droneCounter = 1;
    const corridorKeys = Object.keys(PATROL_CORRIDORS);
    layout.racks.forEach((rack, rIdx) => {
        const floor = rack.floor ?? 1;
        const [rx, , rz] = rack.position;
        const [, rh, rd] = rack.size;
        const levelH = rh / rack.levels;
        const yBase = floor === 2 ? 8.0 : 0.0;
        for (let l = 0; l < rack.levels; l++) {
            const y = yBase + l * levelH + 0.12;
            for (let s = 0; s < 2; s++) {
                const slotX = rx + 0.75 + s * 1.5;
                const slotZ = rz + rd / 2;
                const padPos = [slotX, y, slotZ];
                const dockId = `BAY-R${rIdx + 1}-L${l + 1}-${s === 0 ? "A" : "B"}`;
                const aisleClearanceZ = rz < 35 ? slotZ + rd / 2 + 1.1 : slotZ - rd / 2 - 1.1;
                const aisleClearancePos = [slotX, y, aisleClearanceZ];
                const idNum = String(droneCounter++).padStart(3, "0");
                const droneId = `DRN-${idNum}`;
                const model = MODELS[Math.floor(rnd() * MODELS.length)];
                const payload = PAYLOADS[Math.floor(rnd() * PAYLOADS.length)];
                const corrId = corridorKeys[(droneCounter + l) % corridorKeys.length];
                // Default state initialization
                let status = "STORED";
                let phase = "DOCK_STORED";
                let battery = 100;
                let pos = [...padPos];
                let currentLoc = `Hangar 02 · Rack ${rIdx + 1} Slot ${s + 1}`;
                let nextAct = "Standby for flight assignment";
                let decReason = "Stored in Hangar 02 cradle";
                let assignedPadId = null;
                let currentRoute = [];
                let routeIdx = 0;
                const prepChecklist = {
                    structural: false,
                    battery: false,
                    payload: false,
                    telemetry: false,
                    missionUpload: false,
                    clearance: false,
                };
                // Initialize active drone fleet across operational states
                if (droneCounter === 2) {
                    // DR-001: Charging at cradle
                    status = "CHARGING";
                    phase = "INDUCTIVE_CHARGING";
                    battery = 45;
                    currentLoc = "Hangar 02 · Bay 01";
                    nextAct = "Charging via 12.5 kW wireless pad";
                    decReason = "Battery below 90% — inductive charging active";
                }
                else if (droneCounter === 3) {
                    // DR-002: Standby ready
                    status = "READY";
                    phase = "READY_STANDBY";
                    battery = 100;
                    nextAct = "Available for immediate dispatch";
                    decReason = "Pre-flight checks passed — 100% battery";
                }
                else if (droneCounter === 4) {
                    // DR-003: Mission preparation
                    status = "MISSION_PREP";
                    phase = "MISSION_PREP";
                    battery = 100;
                    assignedPadId = "PAD 01";
                    padReservations["PAD 01"].status = "RESERVED";
                    padReservations["PAD 01"].droneId = droneId;
                    padReservations["PAD 01"].missionName = "Campus Perimeter Patrol";
                    currentLoc = "Mission Prep Facility";
                    nextAct = "Flight Clearance Approval";
                    decReason = "Executing 6-point pre-flight checklist";
                    prepChecklist.structural = true;
                    prepChecklist.battery = true;
                    prepChecklist.payload = true;
                    prepChecklist.telemetry = true;
                }
                else if (droneCounter === 5) {
                    // DR-004: Taxiing to pad
                    status = "TAXIING";
                    phase = "TAXIING_OUTBOUND";
                    battery = 98;
                    assignedPadId = "PAD 02";
                    padReservations["PAD 02"].status = "RESERVED";
                    padReservations["PAD 02"].droneId = droneId;
                    currentRoute = buildOutboundTaxiRoute(aisleClearancePos, LAUNCH_PADS[1]);
                    routeIdx = 3;
                    pos = [50, 0.38, 85]; // Taxiway Alpha
                    currentLoc = "Taxiway Alpha";
                    nextAct = "Taxi to PAD-02 for lineup";
                    decReason = "Outbound taxi clearance granted";
                }
                else if (droneCounter === 6) {
                    // DR-005: Pad hold
                    status = "TAXIING";
                    phase = "PAD_HOLD";
                    battery = 96;
                    assignedPadId = "PAD 03";
                    padReservations["PAD 03"].status = "OCCUPIED";
                    padReservations["PAD 03"].droneId = droneId;
                    pos = [LAUNCH_PADS[2][0], 0.08, LAUNCH_PADS[2][2]];
                    currentLoc = "PAD-03";
                    nextAct = "Rotor spool-up for vertical takeoff";
                    decReason = "Arrived at assigned pad — waiting for departure window";
                }
                else if (droneCounter === 7) {
                    // DR-006: Vertical climb
                    status = "TAKEOFF";
                    phase = "TAKEOFF_CLIMB";
                    battery = 95;
                    assignedPadId = "PAD 04";
                    padReservations["PAD 04"].status = "OCCUPIED";
                    padReservations["PAD 04"].droneId = droneId;
                    pos = [LAUNCH_PADS[3][0], 4.5, LAUNCH_PADS[3][2]];
                    currentLoc = "PAD-04 Airspace";
                    nextAct = "Ascend to 14.5m cruise altitude";
                    decReason = "Takeoff clearance approved — vertical climb";
                }
                else if (droneCounter === 8) {
                    // DR-007: Airborne patrol
                    status = "AIRBORNE";
                    phase = "AIRBORNE_MISSION";
                    battery = 78;
                    assignedPadId = "PAD 01";
                    const corridor = PATROL_CORRIDORS[corrId];
                    const wp = corridor.waypoints[1];
                    pos = [wp.position[0], wp.position[1], wp.position[2]];
                    currentLoc = "Airspace · Perimeter Loop";
                    nextAct = "Fly to Waypoint 3/4";
                    decReason = "Autonomous corridor survey active";
                }
                else if (droneCounter === 9) {
                    // DR-008: Inbound return
                    status = "RETURNING";
                    phase = "RETURNING_PAD";
                    battery = 62;
                    assignedPadId = "PAD 02";
                    pos = [LAUNCH_PADS[1][0] + 15, 12.0, LAUNCH_PADS[1][2] + 20];
                    currentLoc = "Airspace · Inbound Approach";
                    nextAct = "Descend to 8.5m pattern over PAD-02";
                    decReason = "Mission complete — RTH executed";
                }
                else if (droneCounter === 10) {
                    // DR-009: Final descent
                    status = "LANDING";
                    phase = "PRECISION_LANDING";
                    battery = 58;
                    assignedPadId = "PAD 03";
                    pos = [LAUNCH_PADS[2][0], 2.2, LAUNCH_PADS[2][2]];
                    currentLoc = "PAD-03 Descent Slope";
                    nextAct = "Touchdown on PAD-03 center ring";
                    decReason = "Glideslope locked — landing thrusters active";
                }
                else if (droneCounter === 11) {
                    // DR-010: Stored reserve
                    status = "READY";
                    phase = "READY_STANDBY";
                    battery = 100;
                    pos = padPos;
                    currentLoc = "Hangar 02 Fleet Rack";
                    nextAct = "Standby in rack";
                    decReason = "Full diagnostic certified — ready for dispatch";
                }
                else if (rnd() > 0.82) {
                    status = "CHARGING";
                    phase = "INDUCTIVE_CHARGING";
                    battery = Math.floor(35 + rnd() * 50);
                    nextAct = "Charging via inductive cradle";
                    decReason = "Wireless fast charging";
                }
                else if (rnd() > 0.6) {
                    status = "READY";
                    phase = "READY_STANDBY";
                    battery = 100;
                    nextAct = "Standby in rack";
                    decReason = "Fully charged and tested";
                }
                const isOccupied = status !== "AIRBORNE" && status !== "TAKEOFF" && status !== "RETURNING" && status !== "LANDING";
                docks[dockId] = {
                    dockId,
                    rackIndex: rIdx,
                    level: l + 1,
                    slotIndex: s + 1,
                    floor,
                    position: padPos,
                    aisleClearancePosition: aisleClearancePos,
                    occupancy: isOccupied,
                    chargingState: status === "CHARGING" ? "CHARGING" : isOccupied ? "READY" : "EMPTY",
                    batteryState: battery,
                    droneId: isOccupied ? droneId : null,
                    availability: isOccupied ? "OCCUPIED" : "AVAILABLE",
                };
                drones[droneId] = {
                    id: droneId,
                    name: `${model} #${idNum}`,
                    model,
                    status,
                    phase,
                    battery,
                    health: Math.floor(94 + rnd() * 6),
                    speed: status === "AIRBORNE" ? 3.6 : status === "TAXIING" ? 2.0 : 0,
                    altitude: pos[1],
                    firmware: `v4.4.${Math.floor(rnd() * 9)}-PX4`,
                    flightHours: Math.floor(14 + rnd() * 280),
                    cycles: Math.floor(22 + rnd() * 190),
                    payload,
                    assignedSlot: {
                        dockId,
                        rackIndex: rIdx,
                        level: l + 1,
                        slotIndex: s + 1,
                        bayLabel: dockId,
                        floor,
                        position: padPos,
                        aisleClearancePosition: aisleClearancePos,
                    },
                    currentPosition: pos,
                    velocity: [0, 0, 0],
                    heading: rnd() * Math.PI * 2,
                    pitch: 0,
                    roll: 0,
                    targetPosition: [...pos],
                    currentFacility: getZoneFromPosition(pos),
                    currentZone: getZoneFromPosition(pos),
                    currentLocation: currentLoc,
                    nextAction: nextAct,
                    decisionReason: decReason,
                    currentPadId: assignedPadId,
                    prepChecklist,
                    mission: status === "AIRBORNE" || status === "TAKEOFF" || status === "RETURNING" || status === "LANDING" ? {
                        missionId: `MSN-${idNum}-SURVEY`,
                        droneId,
                        missionType: "PERIMETER_SURVEY",
                        priority: "ROUTINE",
                        payload,
                        origin: dockId,
                        destination: assignedPadId || "PAD 01",
                        status: "ACTIVE",
                        progress: 0.45,
                        startTime: Date.now() - 40000,
                        estimatedCompletion: Date.now() + 80000,
                        waypoints: PATROL_CORRIDORS[corrId].waypoints.map((w) => w.position),
                    } : null,
                    missionName: status === "AIRBORNE" ? PATROL_CORRIDORS[corrId].name : "Standby Operations",
                    missionProgress: status === "AIRBORNE" ? 0.45 : 0,
                    corridorId: corrId,
                    waypointIndex: 0,
                    patrolLaps: 0,
                    stateTimer: 0,
                    currentRoute,
                    routeIndex: routeIdx,
                    prepStationIndex: 0,
                };
            }
        }
    });
    return { docks, drones, padReservations, eventFeed: initialEvents };
}
const initialHangarTwin = initializeHangarTwin();
let tickAccumulator = 0;
let batteryTickAccumulator = 0;
let autoMissionSchedulerTimer = 0;
export const useDroneHangarStore = create((set, get) => ({
    docks: initialHangarTwin.docks,
    drones: initialHangarTwin.drones,
    padReservations: initialHangarTwin.padReservations,
    eventFeed: initialHangarTwin.eventFeed,
    selectedDroneId: null, // Default to null to prevent initial camera lock
    selectedDockId: null,
    inspectorOpen: false,
    autoPatrolScheduler: true,
    demoRunning: false,
    selectDrone: (id) => set({ selectedDroneId: id, selectedDockId: null }),
    selectDock: (dockId) => {
        set((state) => {
            if (!dockId)
                return { selectedDockId: null };
            const dock = state.docks[dockId];
            const droneId = dock ? dock.droneId : null;
            return { selectedDockId: dockId, selectedDroneId: droneId };
        });
    },
    toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
    toggleAutoPatrolScheduler: () => set((s) => ({ autoPatrolScheduler: !s.autoPatrolScheduler })),
    addEvent: (droneId, text, severity = "INFO") => {
        set((state) => {
            const newEvent = {
                id: `EVT-${Date.now().toString().slice(-5)}`,
                timestamp: getTimeString(),
                droneId,
                text,
                severity,
            };
            return { eventFeed: [newEvent, ...state.eventFeed.slice(0, 99)] };
        });
    },
    /** Launch autonomous flight demonstration sequence */
    startAutonomousDemo: () => {
        const state = get();
        // Select ready or stored drone
        const candidate = Object.values(state.drones).find((d) => d.status === "READY" || d.status === "STORED");
        if (!candidate)
            return;
        const droneId = candidate.id;
        get().addEvent(droneId, "▶ Autonomous Demo Initiated by Operator", "SUCCESS");
        get().dispatchMission(droneId, "PERIMETER_SURVEY");
        set({ selectedDroneId: droneId, demoRunning: true });
    },
    /** Dispatch drone on autonomous mission sequence */
    dispatchMission: (id, missionType = "PERIMETER_SURVEY") => {
        set((state) => {
            const drone = state.drones[id];
            if (!drone)
                return state;
            // Identify available VTOL pad
            let padIdx = 0;
            for (let i = 0; i < PAD_IDS.length; i++) {
                if (state.padReservations[PAD_IDS[i]].status === "CLEAR") {
                    padIdx = i;
                    break;
                }
            }
            const targetPad = LAUNCH_PADS[padIdx];
            const targetPadId = PAD_IDS[padIdx];
            const corridor = PATROL_CORRIDORS[missionType] || PATROL_CORRIDORS.PERIMETER_SURVEY;
            const mission = {
                missionId: `MSN-${drone.id.slice(4)}-${Date.now().toString().slice(-4)}`,
                droneId: drone.id,
                missionType,
                priority: "HIGH",
                payload: drone.payload,
                origin: drone.assignedSlot.bayLabel,
                destination: targetPadId,
                status: "PREPARING",
                progress: 0.05,
                startTime: Date.now(),
                estimatedCompletion: Date.now() + 120000,
                waypoints: corridor.waypoints.map((w) => w.position),
            };
            const route = buildOutboundTaxiRoute(drone.assignedSlot.aisleClearancePosition, targetPad);
            const updatedDocks = { ...state.docks };
            if (updatedDocks[drone.assignedSlot.bayLabel]) {
                updatedDocks[drone.assignedSlot.bayLabel] = {
                    ...updatedDocks[drone.assignedSlot.bayLabel],
                    occupancy: false,
                    chargingState: "EMPTY",
                    droneId: null,
                    availability: "AVAILABLE",
                };
            }
            const updatedPads = { ...state.padReservations };
            updatedPads[targetPadId] = {
                ...updatedPads[targetPadId],
                status: "RESERVED",
                droneId: drone.id,
                missionName: corridor.name,
            };
            const newEvent = {
                id: `EVT-${Date.now().toString().slice(-5)}`,
                timestamp: getTimeString(),
                droneId: drone.id,
                text: `Mission assigned: ${corridor.name} -> Target ${targetPadId}`,
                severity: "INFO",
            };
            return {
                docks: updatedDocks,
                padReservations: updatedPads,
                eventFeed: [newEvent, ...state.eventFeed.slice(0, 99)],
                drones: {
                    ...state.drones,
                    [id]: {
                        ...drone,
                        status: "MISSION_PREP",
                        phase: "MISSION_PREP",
                        mission,
                        missionName: corridor.name,
                        missionProgress: 0.05,
                        currentPadId: targetPadId,
                        currentRoute: route,
                        routeIndex: 0,
                        prepStationIndex: 0,
                        targetPosition: [...PREP_STATIONS[0].position],
                        currentLocation: "Hangar 02 · Pre-Flight Prep Gate",
                        nextAction: "Pre-flight structural and systems inspection",
                        decisionReason: `Assigned to ${targetPadId} for autonomous perimeter surveillance`,
                        prepChecklist: {
                            structural: false,
                            battery: false,
                            payload: false,
                            telemetry: false,
                            missionUpload: false,
                            clearance: false,
                        },
                        stateTimer: 0,
                    },
                },
            };
        });
    },
    /** Dispatch drone to runway 09/27 for flight test circuit */
    dispatchRunwayFlightTest: (id) => {
        set((state) => {
            const drone = state.drones[id];
            if (!drone)
                return state;
            const corridor = PATROL_CORRIDORS.RUNWAY_FLIGHT_TEST;
            const mission = {
                missionId: `TEST-${drone.id.slice(4)}-${Date.now().toString().slice(-4)}`,
                droneId: drone.id,
                missionType: "PERIMETER_SURVEY",
                priority: "URGENT",
                payload: drone.payload,
                origin: drone.assignedSlot.bayLabel,
                destination: "RUNWAY 09/27",
                status: "READY",
                progress: 0.1,
                startTime: Date.now(),
                estimatedCompletion: Date.now() + 90000,
                waypoints: corridor.waypoints.map((w) => w.position),
            };
            const route = buildRunwayOutboundTaxiRoute(drone.assignedSlot.aisleClearancePosition);
            const updatedDocks = { ...state.docks };
            if (updatedDocks[drone.assignedSlot.bayLabel]) {
                updatedDocks[drone.assignedSlot.bayLabel] = {
                    ...updatedDocks[drone.assignedSlot.bayLabel],
                    occupancy: false,
                    chargingState: "EMPTY",
                    droneId: null,
                    availability: "AVAILABLE",
                };
            }
            const newEvent = {
                id: `EVT-${Date.now().toString().slice(-5)}`,
                timestamp: getTimeString(),
                droneId: drone.id,
                text: `Runway 09/27 Flight Test Dispatched · Outbound taxi cleared`,
                severity: "SUCCESS",
            };
            return {
                docks: updatedDocks,
                eventFeed: [newEvent, ...state.eventFeed.slice(0, 99)],
                drones: {
                    ...state.drones,
                    [id]: {
                        ...drone,
                        status: "TAXIING",
                        phase: "TAXIING_OUTBOUND",
                        mission,
                        missionName: "Runway 09/27 Maiden Flight Test",
                        missionProgress: 0.15,
                        corridorId: "RUNWAY_FLIGHT_TEST",
                        currentRoute: route,
                        routeIndex: 0,
                        targetPosition: [...route[0]],
                        currentLocation: "Hangar 02 Exit Aisle",
                        nextAction: "Taxi via Taxiway Alpha to Runway 09 Threshold",
                        decisionReason: "Runway acceleration flight test clearance approved",
                        stateTimer: 0,
                    },
                },
            };
        });
    },
    returnToHome: (id) => {
        set((state) => {
            const drone = state.drones[id];
            if (!drone || drone.status !== "AIRBORNE")
                return state;
            const padIdx = drone.currentPadId ? PAD_IDS.indexOf(drone.currentPadId) : 0;
            const padPos = LAUNCH_PADS[padIdx >= 0 ? padIdx : 0];
            const newEvent = {
                id: `EVT-${Date.now().toString().slice(-5)}`,
                timestamp: getTimeString(),
                droneId: drone.id,
                text: `RTH command issued · Inbound flight to ${drone.currentPadId || "PAD 01"}`,
                severity: "WARNING",
            };
            return {
                eventFeed: [newEvent, ...state.eventFeed.slice(0, 99)],
                drones: {
                    ...state.drones,
                    [id]: {
                        ...drone,
                        status: "RETURNING",
                        phase: "RETURNING_PAD",
                        targetPosition: [padPos[0], 12.0, padPos[2]],
                        nextAction: `Descend into landing pattern over ${drone.currentPadId || "PAD 01"}`,
                        decisionReason: "Return-to-Home command executed by operator",
                        stateTimer: 0,
                    },
                },
            };
        });
    },
    fastCharge: (id) => {
        set((state) => {
            const drone = state.drones[id];
            if (!drone)
                return state;
            return {
                drones: {
                    ...state.drones,
                    [id]: {
                        ...drone,
                        status: "CHARGING",
                        phase: "INDUCTIVE_CHARGING",
                        battery: Math.min(100, drone.battery + 35),
                        nextAction: "Charging via 12.5 kW wireless induction",
                        decisionReason: "Manual fast-charge triggered",
                        stateTimer: 0,
                    },
                },
            };
        });
    },
    sendToMaintenance: (id) => {
        set((state) => {
            const drone = state.drones[id];
            if (!drone)
                return state;
            return {
                drones: {
                    ...state.drones,
                    [id]: {
                        ...drone,
                        status: "MAINTENANCE",
                        phase: "MRO_MAINTENANCE",
                        currentPosition: [drone.assignedSlot.position[0], drone.assignedSlot.position[1], drone.assignedSlot.position[2]],
                        currentLocation: "Hangar 02 Maintenance Bay",
                        nextAction: "Sensor and airframe diagnostics",
                        decisionReason: "Undergoing internal hangar maintenance check",
                        stateTimer: 0,
                    },
                },
            };
        });
    },
    tickHangar: (dt) => {
        tickAccumulator += dt;
        batteryTickAccumulator += dt;
        autoMissionSchedulerTimer += dt;
        set((state) => {
            let changed = false;
            const dronesMap = state.drones;
            const updatedDocks = { ...state.docks };
            const updatedPads = { ...state.padReservations };
            let newEvents = [...state.eventFeed];
            const pushEvent = (droneId, text, severity = "INFO") => {
                newEvents = [
                    {
                        id: `EVT-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 100)}`,
                        timestamp: getTimeString(),
                        droneId,
                        text,
                        severity,
                    },
                    ...newEvents.slice(0, 99),
                ];
                changed = true;
            };
            // Count active airborne and taxiing drones
            const activeIds = [];
            for (const id in dronesMap) {
                const st = dronesMap[id].status;
                if (st !== "STORED" && st !== "READY" && st !== "CHARGING") {
                    activeIds.push(id);
                }
            }
            // Periodically update wireless induction charging
            if (batteryTickAccumulator >= 1.2) {
                batteryTickAccumulator = 0;
                for (const id in dronesMap) {
                    const d = dronesMap[id];
                    if (d.status === "CHARGING") {
                        if (d.battery < 99) {
                            d.battery = Math.min(100, Math.round((d.battery + 2.5) * 10) / 10);
                        }
                        else {
                            d.status = "READY";
                            d.phase = "READY_STANDBY";
                            d.battery = 100;
                            d.nextAction = "Standby in cradle for mission assignment";
                            d.decisionReason = "Wireless fast charging complete (100%)";
                            d.stateTimer = 0;
                            pushEvent(d.id, `Wireless charging complete (100%) · Ready in dock ${d.assignedSlot.bayLabel}`, "SUCCESS");
                        }
                        changed = true;
                    }
                    else if (d.status === "STORED" && d.battery < 85) {
                        d.status = "CHARGING";
                        d.phase = "INDUCTIVE_CHARGING";
                        d.nextAction = "Automatic inductive top-up charging";
                        d.decisionReason = "Battery level below cyclic readiness threshold";
                        if (updatedDocks[d.assignedSlot.bayLabel]) {
                            updatedDocks[d.assignedSlot.bayLabel].chargingState = "CHARGING";
                        }
                        changed = true;
                    }
                }
            }
            // Autonomous scheduler maintaining operational rhythm
            if (autoMissionSchedulerTimer >= 4.0) {
                autoMissionSchedulerTimer = 0;
                const activeFlightCount = Object.values(dronesMap).filter((d) => d.status === "MISSION_PREP" ||
                    d.status === "TAXIING" ||
                    d.status === "TAKEOFF" ||
                    d.status === "AIRBORNE" ||
                    d.status === "RETURNING" ||
                    d.status === "LANDING").length;
                // Maintain 2-4 concurrent active drones
                if (activeFlightCount < 4) {
                    const freePad = PAD_IDS.find((pid) => updatedPads[pid].status === "CLEAR");
                    const readyDrone = Object.values(dronesMap).find((d) => d.status === "READY" && d.phase === "READY_STANDBY" && d.battery >= 95);
                    if (freePad && readyDrone) {
                        const padIdx = PAD_IDS.indexOf(freePad);
                        const targetPad = LAUNCH_PADS[padIdx];
                        const missions = [
                            "PERIMETER_SURVEY",
                            "FACILITY_INSPECTION",
                            "SOUTHERN_PATROL",
                            "EASTERN_BORDER",
                        ];
                        const chosenMission = missions[Math.floor(Math.random() * missions.length)];
                        const corridor = PATROL_CORRIDORS[chosenMission];
                        // Reserve target VTOL pad
                        updatedPads[freePad] = {
                            ...updatedPads[freePad],
                            status: "RESERVED",
                            droneId: readyDrone.id,
                            missionName: corridor.name,
                        };
                        // Release cradle occupancy
                        if (updatedDocks[readyDrone.assignedSlot.bayLabel]) {
                            updatedDocks[readyDrone.assignedSlot.bayLabel] = {
                                ...updatedDocks[readyDrone.assignedSlot.bayLabel],
                                occupancy: false,
                                chargingState: "EMPTY",
                                droneId: null,
                                availability: "AVAILABLE",
                            };
                        }
                        const route = buildOutboundTaxiRoute(readyDrone.assignedSlot.aisleClearancePosition, targetPad);
                        const mission = {
                            missionId: `MSN-${readyDrone.id.slice(4)}-${Date.now().toString().slice(-4)}`,
                            droneId: readyDrone.id,
                            missionType: "PERIMETER_SURVEY",
                            priority: "HIGH",
                            payload: readyDrone.payload,
                            origin: readyDrone.assignedSlot.bayLabel,
                            destination: freePad,
                            status: "PREPARING",
                            progress: 0.05,
                            startTime: Date.now(),
                            estimatedCompletion: Date.now() + 120000,
                            waypoints: corridor.waypoints.map((w) => w.position),
                        };
                        dronesMap[readyDrone.id] = {
                            ...readyDrone,
                            status: "MISSION_PREP",
                            phase: "MISSION_PREP",
                            mission,
                            missionName: corridor.name,
                            missionProgress: 0.05,
                            corridorId: chosenMission,
                            currentPadId: freePad,
                            currentRoute: route,
                            routeIndex: 0,
                            targetPosition: [...route[0]],
                            prepChecklist: {
                                structural: false,
                                battery: false,
                                payload: false,
                                telemetry: false,
                                missionUpload: false,
                                clearance: false,
                            },
                            currentLocation: "Hangar 02 Prep Station",
                            nextAction: "Executing automated 6-point pre-flight checklist",
                            decisionReason: `Autonomous task allocated: ${corridor.name} via ${freePad}`,
                            stateTimer: 0,
                        };
                        pushEvent(readyDrone.id, `Autonomous dispatch: ${corridor.name} -> Assigned ${freePad}`, "INFO");
                        changed = true;
                    }
                }
            }
            // Advance active drone state machines and kinematics
            for (const id of activeIds) {
                const d = dronesMap[id];
                if (!d)
                    continue;
                d.stateTimer += dt;
                d.altitude = Math.round(d.currentPosition[1] * 10) / 10;
                d.currentFacility = getZoneFromPosition(d.currentPosition);
                d.currentZone = d.currentFacility;
                switch (d.status) {
                    // 1. MISSION_PREP: Step through pre-flight checklist
                    case "MISSION_PREP": {
                        d.speed = 0;
                        const timer = d.stateTimer;
                        const checklist = { ...d.prepChecklist };
                        if (timer > 0.6 && !checklist.structural) {
                            checklist.structural = true;
                            d.nextAction = "Verifying high-voltage battery state";
                            d.decisionReason = "Structural airframe inspection passed";
                            pushEvent(d.id, "Pre-flight structural inspection: PASSED");
                        }
                        else if (timer > 1.2 && !checklist.battery) {
                            checklist.battery = true;
                            d.nextAction = "Verifying optical gimbal & LiDAR sensors";
                            d.decisionReason = `Battery capacity verified (${d.battery}%)`;
                            pushEvent(d.id, `Battery voltage verified: ${d.battery}% (Nominal)`);
                        }
                        else if (timer > 1.8 && !checklist.payload) {
                            checklist.payload = true;
                            d.nextAction = "Testing PX4 telemetry & IMU attitude";
                            d.decisionReason = "Sensor payload latch secure";
                            pushEvent(d.id, `Payload sensor latch verified: ${d.payload}`);
                        }
                        else if (timer > 2.4 && !checklist.telemetry) {
                            checklist.telemetry = true;
                            d.nextAction = "Uploading flight corridors & geofence";
                            d.decisionReason = "PX4 telemetry link lock 100%";
                            pushEvent(d.id, "PX4 autopilot & telemetry verified");
                        }
                        else if (timer > 3.0 && !checklist.missionUpload) {
                            checklist.missionUpload = true;
                            d.nextAction = "Requesting departure clearance";
                            d.decisionReason = `Uploaded corridor: ${d.missionName}`;
                            pushEvent(d.id, `Mission corridor uploaded: ${d.missionName}`);
                        }
                        else if (timer > 3.6 && !checklist.clearance) {
                            checklist.clearance = true;
                            d.status = "TAXIING";
                            d.phase = "TAXIING_OUTBOUND";
                            d.currentLocation = "Hangar 02 Service Exit";
                            d.nextAction = `Taxi via Taxiway Alpha to ${d.currentPadId || "PAD 01"}`;
                            d.decisionReason = "Flight safety clearance approved · Ground taxi active";
                            d.routeIndex = 0;
                            d.stateTimer = 0;
                            pushEvent(d.id, `Flight clearance granted -> Taxi to ${d.currentPadId || "PAD 01"}`, "SUCCESS");
                        }
                        d.prepChecklist = checklist;
                        changed = true;
                        break;
                    }
                    // 2. TAXIING: Follow ground taxiway route waypoints
                    case "TAXIING": {
                        d.speed = 2.4;
                        if (d.currentRoute && d.routeIndex < d.currentRoute.length) {
                            const [tx, , tz] = d.currentRoute[d.routeIndex];
                            const dx = tx - d.currentPosition[0];
                            const dz = tz - d.currentPosition[2];
                            const dist = Math.hypot(dx, dz);
                            d.heading = Math.atan2(dx, dz);
                            d.pitch = 0;
                            d.roll = 0;
                            const step = Math.min(1, (dt * 2.6) / Math.max(0.01, dist));
                            d.currentPosition = [
                                d.currentPosition[0] + dx * step,
                                0.38,
                                d.currentPosition[2] + dz * step,
                            ];
                            // Update location string
                            if (d.currentPosition[2] < 70)
                                d.currentLocation = "Hangar 02 Exit Aisle";
                            else if (d.currentPosition[2] < 92)
                                d.currentLocation = "Taxiway Alpha";
                            else if (d.currentPosition[2] < 120)
                                d.currentLocation = "Flight Apron Transit";
                            else
                                d.currentLocation = d.currentPadId || "Runway 09 Threshold";
                            if (dist < 0.9) {
                                d.routeIndex += 1;
                                if (d.routeIndex >= d.currentRoute.length) {
                                    // Reached target waypoint
                                    if (d.phase === "TAXIING_INBOUND") {
                                        // Inbound taxi complete -> switch to charging
                                        d.status = "CHARGING";
                                        d.phase = "INDUCTIVE_CHARGING";
                                        d.currentPosition = [...d.assignedSlot.position];
                                        d.currentLocation = d.assignedSlot.bayLabel;
                                        d.nextAction = "Charging via inductive cradle";
                                        d.decisionReason = "Returned to dock · Mission certified";
                                        if (updatedDocks[d.assignedSlot.bayLabel]) {
                                            updatedDocks[d.assignedSlot.bayLabel].occupancy = true;
                                            updatedDocks[d.assignedSlot.bayLabel].droneId = d.id;
                                            updatedDocks[d.assignedSlot.bayLabel].chargingState = "CHARGING";
                                        }
                                        if (d.currentPadId && updatedPads[d.currentPadId]) {
                                            updatedPads[d.currentPadId].status = "CLEAR";
                                            updatedPads[d.currentPadId].droneId = null;
                                            updatedPads[d.currentPadId].missionName = null;
                                        }
                                        pushEvent(d.id, `Docked at ${d.assignedSlot.bayLabel} · Inductive charging started`, "SUCCESS");
                                        d.stateTimer = 0;
                                        changed = true;
                                    }
                                    else if (d.corridorId === "RUNWAY_FLIGHT_TEST") {
                                        // Reached runway threshold -> initiate takeoff roll
                                        d.status = "TAKEOFF";
                                        d.phase = "TAKEOFF_CLIMB";
                                        d.waypointIndex = 0;
                                        d.heading = Math.PI / 2;
                                        d.currentLocation = "Runway 09";
                                        d.nextAction = "Full-throttle acceleration takeoff run";
                                        d.decisionReason = "Runway 09 centerline aligned · Takeoff clearance approved";
                                        pushEvent(d.id, "Runway 09 acceleration run initiated", "SUCCESS");
                                        d.stateTimer = 0;
                                        changed = true;
                                    }
                                    else {
                                        // Reached pad -> transition to PAD_HOLD
                                        d.status = "TAKEOFF";
                                        d.phase = "PAD_HOLD";
                                        d.currentLocation = d.currentPadId || "PAD 01";
                                        d.nextAction = "Holding on pad · Rotor spool-up to 85 RPM";
                                        d.decisionReason = "Arrived at assigned pad · Pre-takeoff rotor spool-up";
                                        if (d.currentPadId && updatedPads[d.currentPadId]) {
                                            updatedPads[d.currentPadId].status = "OCCUPIED";
                                        }
                                        pushEvent(d.id, `Arrived at ${d.currentPadId || "PAD 01"} · Holding for takeoff clearance`);
                                        d.stateTimer = 0;
                                        changed = true;
                                    }
                                }
                            }
                        }
                        break;
                    }
                    // 3. TAKEOFF: Vertical ascent to cruising altitude (14.5m)
                    case "TAKEOFF": {
                        if (d.phase === "PAD_HOLD") {
                            d.speed = 0;
                            if (d.stateTimer > 2.0) {
                                d.phase = "TAKEOFF_CLIMB";
                                d.nextAction = "Vertical climb to 14.5m cruise corridor";
                                d.decisionReason = "Takeoff clearance confirmed · Ascending";
                                pushEvent(d.id, `Vertical takeoff initiated from ${d.currentPadId || "PAD 01"}`, "SUCCESS");
                                d.stateTimer = 0;
                            }
                        }
                        else {
                            // Vertical ascent
                            d.speed = 2.8;
                            d.currentPosition = [
                                d.currentPosition[0],
                                d.currentPosition[1] + dt * 3.5,
                                d.currentPosition[2],
                            ];
                            if (d.currentPosition[1] >= 14.5) {
                                d.currentPosition[1] = 14.5;
                                d.status = "AIRBORNE";
                                d.phase = "AIRBORNE_MISSION";
                                d.currentLocation = "Airbase Airspace";
                                d.nextAction = "Execute autonomous corridor survey waypoints";
                                d.decisionReason = "Reached cruise altitude (14.5m) · Mission active";
                                d.stateTimer = 0;
                                const corridor = PATROL_CORRIDORS[d.corridorId] || PATROL_CORRIDORS.PERIMETER_SURVEY;
                                d.targetPosition = [...corridor.waypoints[0].position];
                                d.waypointIndex = 0;
                                pushEvent(d.id, `Airborne at 14.5m · Executing ${d.missionName}`, "SUCCESS");
                                changed = true;
                            }
                        }
                        break;
                    }
                    // 4. AIRBORNE: Cruising active flight pattern
                    case "AIRBORNE": {
                        const corridor = PATROL_CORRIDORS[d.corridorId] || PATROL_CORRIDORS.PERIMETER_SURVEY;
                        const currentWp = corridor.waypoints[d.waypointIndex];
                        const [tx, ty, tz] = currentWp.position;
                        const dx = tx - d.currentPosition[0];
                        const dy = ty - d.currentPosition[1];
                        const dz = tz - d.currentPosition[2];
                        const distToWp = Math.hypot(dx, dz);
                        d.speed = 3.8;
                        d.currentLocation = `${currentWp.zone} (${Math.round(d.currentPosition[1])}m)`;
                        d.nextAction = `Fly to ${currentWp.name} (Waypoint ${d.waypointIndex + 1}/${corridor.waypoints.length})`;
                        d.decisionReason = "Autonomous navigation along survey corridor";
                        const targetHeading = Math.atan2(dx, dz);
                        let dHeading = targetHeading - d.heading;
                        while (dHeading > Math.PI)
                            dHeading -= 2 * Math.PI;
                        while (dHeading < -Math.PI)
                            dHeading += 2 * Math.PI;
                        d.heading += dHeading * Math.min(1, dt * 3.5);
                        d.pitch = 0.16;
                        d.roll = Math.max(-0.25, Math.min(0.25, -dHeading * 0.45));
                        const moveStep = Math.min(1, dt * 1.5);
                        d.currentPosition = [
                            d.currentPosition[0] + dx * moveStep,
                            d.currentPosition[1] + dy * moveStep,
                            d.currentPosition[2] + dz * moveStep,
                        ];
                        d.velocity = [dx * moveStep, dy * moveStep, dz * moveStep];
                        d.battery = Math.max(10, Math.round((d.battery - dt * 0.15) * 10) / 10);
                        if (distToWp < 3.0) {
                            if (d.corridorId === "RUNWAY_FLIGHT_TEST") {
                                const nextIdx = d.waypointIndex + 1;
                                if (nextIdx >= corridor.waypoints.length) {
                                    // Runway test circuit complete -> taxi back to hangar
                                    d.status = "TAXIING";
                                    d.phase = "TAXIING_INBOUND";
                                    d.currentRoute = buildRunwayInboundTaxiRoute(d.assignedSlot.aisleClearancePosition, d.assignedSlot.position);
                                    d.routeIndex = 0;
                                    d.currentLocation = "Charlie Taxiway Turnoff";
                                    d.nextAction = "Taxi inbound to Hangar 02 cradle";
                                    d.decisionReason = "Flight test certified · Runway vacated";
                                    pushEvent(d.id, "Flight Test Certified · Vacated runway to Charlie Taxiway", "SUCCESS");
                                    d.stateTimer = 0;
                                    changed = true;
                                }
                                else {
                                    d.waypointIndex = nextIdx;
                                }
                            }
                            else {
                                const nextIdx = (d.waypointIndex + 1) % corridor.waypoints.length;
                                d.waypointIndex = nextIdx;
                                if (nextIdx === 0) {
                                    d.patrolLaps += 1;
                                    pushEvent(d.id, `Completed mission circuit lap ${d.patrolLaps}`);
                                }
                            }
                        }
                        // Circuit complete or low battery -> initiate return
                        if (d.corridorId !== "RUNWAY_FLIGHT_TEST" && (d.patrolLaps >= 1 || d.battery < 40)) {
                            d.status = "RETURNING";
                            d.phase = "RETURNING_PAD";
                            d.stateTimer = 0;
                            const padIdx = d.currentPadId ? PAD_IDS.indexOf(d.currentPadId) : 0;
                            const padPos = LAUNCH_PADS[padIdx >= 0 ? padIdx : 0];
                            d.targetPosition = [padPos[0], 14.5, padPos[2]];
                            d.currentLocation = "Airspace · Inbound Transition";
                            d.nextAction = `Return to pattern altitude over ${d.currentPadId || "PAD 01"}`;
                            d.decisionReason = "Survey circuit completed · Executing RTH";
                            pushEvent(d.id, `Mission completed · Inbound return to ${d.currentPadId || "PAD 01"}`, "INFO");
                            changed = true;
                        }
                        break;
                    }
                    // 5. RETURNING: Inbound descent above assigned pad
                    case "RETURNING": {
                        const [tx, ty, tz] = d.targetPosition;
                        const dx = tx - d.currentPosition[0];
                        const dy = ty - d.currentPosition[1];
                        const dz = tz - d.currentPosition[2];
                        const dist = Math.hypot(dx, dz);
                        d.speed = 3.0;
                        const step = Math.min(1, dt * 1.8);
                        d.currentPosition = [
                            d.currentPosition[0] + dx * step,
                            d.currentPosition[1] + dy * step,
                            d.currentPosition[2] + dz * step,
                        ];
                        d.currentLocation = `Inbound to ${d.currentPadId || "PAD 01"}`;
                        d.nextAction = "Align with precision landing glideslope";
                        d.decisionReason = "Overhead pad alignment";
                        if (dist < 1.5) {
                            d.status = "LANDING";
                            d.phase = "PRECISION_LANDING";
                            d.currentLocation = `${d.currentPadId || "PAD 01"} Glideslope`;
                            d.nextAction = "Vertical precision descent to pad surface";
                            d.decisionReason = "Pad clear · Precision landing guidance locked";
                            pushEvent(d.id, `Final approach locked on ${d.currentPadId || "PAD 01"}`);
                            d.stateTimer = 0;
                            changed = true;
                        }
                        break;
                    }
                    // 6. LANDING: Touchdown on pad
                    case "LANDING": {
                        d.speed = 1.2;
                        d.pitch = 0;
                        d.roll = 0;
                        d.currentPosition = [
                            d.currentPosition[0],
                            Math.max(0.08, d.currentPosition[1] - dt * 2.8),
                            d.currentPosition[2],
                        ];
                        d.currentLocation = `${d.currentPadId || "PAD 01"} (${Math.round(d.currentPosition[1] * 10) / 10}m)`;
                        d.nextAction = "Precision touchdown";
                        d.decisionReason = "Landing descent in progress";
                        if (d.currentPosition[1] <= 0.12) {
                            d.currentPosition[1] = 0.08;
                            d.status = "RECOVERY";
                            d.phase = "PAD_RECOVERY";
                            d.currentLocation = d.currentPadId || "PAD 01";
                            d.nextAction = "Post-flight sensor check & telemetry offload";
                            d.decisionReason = "Touchdown confirmed · Pad recovery checks";
                            pushEvent(d.id, `Touchdown confirmed on ${d.currentPadId || "PAD 01"} · Recovery active`, "SUCCESS");
                            d.stateTimer = 0;
                            changed = true;
                        }
                        break;
                    }
                    // 7. RECOVERY: Post-landing checks -> taxi to hangar
                    case "RECOVERY": {
                        d.speed = 0;
                        if (d.stateTimer > 2.5) {
                            d.status = "TAXIING";
                            d.phase = "TAXIING_INBOUND";
                            const padIdx = d.currentPadId ? PAD_IDS.indexOf(d.currentPadId) : 0;
                            const padPos = LAUNCH_PADS[padIdx >= 0 ? padIdx : 0];
                            d.currentRoute = buildInboundTaxiRoute(padPos, d.assignedSlot.aisleClearancePosition, d.assignedSlot.position);
                            d.routeIndex = 0;
                            d.currentLocation = "Flight Apron";
                            d.nextAction = "Inbound taxi via Taxiway Alpha to Hangar 02";
                            d.decisionReason = "Post-flight recovery complete · Returning to dock";
                            pushEvent(d.id, `Recovery complete -> Inbound taxi to Hangar 02`, "INFO");
                            d.stateTimer = 0;
                            changed = true;
                        }
                        break;
                    }
                }
            }
            return changed
                ? {
                    drones: { ...dronesMap },
                    docks: updatedDocks,
                    padReservations: updatedPads,
                    eventFeed: newEvents,
                }
                : state;
        });
    },
}));
