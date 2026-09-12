const path = require("path");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/playwright"));

const fs = require("fs");
const { execSync } = require("child_process");

const PROJECT_ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, "artifacts");
const VIDEO_RAW_DIR = path.join(ARTIFACTS_DIR, "video_raw");

if (!fs.existsSync(VIDEO_RAW_DIR)) {
  fs.mkdirSync(VIDEO_RAW_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log("===============================================================");
  console.log("  AUTONOMOUS DRONE AIRBASE DIGITAL TWIN - 3-MINUTE DEMO TOUR   ");
  console.log("===============================================================");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu-sandbox",
      "--window-size=1920,1080",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: VIDEO_RAW_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  console.log("[1/7] Connecting to Digital Twin at http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  // Wait for 3D shaders, instanced racks, and campus geometry to initialize
  console.log("[Init] Compiling 3D campus shaders & assets...");
  await sleep(6000);

  // -------------------------------------------------------------
  // CHAPTER 1: CAMPUS OVERVIEW (00:00 - 00:30)
  // -------------------------------------------------------------
  console.log(">>> CHAPTER 1: 300m x 200m Campus Spatial Architecture");
  // Set wide aerial camera overview
  await page.evaluate(() => {
    if (window.__wareTwin) {
      window.__wareTwin.useStore.getState().focus([50, 0, 90], [130, 95, 230]);
    }
  });
  await sleep(8000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "frame_01_campus_overview.png") });

  // Gentle camera orbit to showcase facilities layout
  await page.evaluate(() => {
    if (window.__wareTwin) {
      window.__wareTwin.useStore.getState().focus([75, 0, 105], [95, 80, 215]);
    }
  });
  await sleep(8000);

  await page.evaluate(() => {
    if (window.__wareTwin) {
      window.__wareTwin.useStore.getState().focus([35, 0, 95], [45, 75, 195]);
    }
  });
  await sleep(8000);

  // -------------------------------------------------------------
  // CHAPTER 2: HANGAR 01 ROBOTIC MANUFACTURING (00:30 - 01:00)
  // -------------------------------------------------------------
  console.log(">>> CHAPTER 2: Hangar 01 Robotic Manufacturing Facility");
  await page.evaluate(() => {
    if (window.__wareTwin) {
      // Focus camera closely on Hangar 01
      window.__wareTwin.useStore.getState().focus([-55, 3, 30], [-55, 15, 62]);
      // Switch right panel to Robotic Assembly tab
      const btns = Array.from(document.querySelectorAll("button"));
      const b = btns.find((x) => x.textContent && x.textContent.includes("Robotic Assembly"));
      if (b) b.click();
    }
  });
  await sleep(10000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "frame_02_manufacturing_line.png") });

  // Angle shift inside Hangar 01 to show calibration cage & workcells
  await page.evaluate(() => {
    if (window.__wareTwin) {
      window.__wareTwin.useStore.getState().focus([-45, 3, 25], [-35, 12, 50]);
    }
  });
  await sleep(10000);

  // -------------------------------------------------------------
  // CHAPTER 3: HANGAR 02 160-BAY FLEET STORAGE (01:00 - 01:30)
  // -------------------------------------------------------------
  console.log(">>> CHAPTER 3: Hangar 02 Automated Fleet Storage & Docking Racks");
  await page.evaluate(() => {
    if (window.__wareTwin) {
      // Focus camera on Hangar 02
      window.__wareTwin.useStore.getState().focus([50, 4, 35], [50, 15, 66]);
      // Switch right panel to Drone Hangar
      const btns = Array.from(document.querySelectorAll("button"));
      const b = btns.find((x) => x.textContent && x.textContent.includes("Drone Hangar"));
      if (b) b.click();
    }
  });
  await sleep(10000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "frame_03_fleet_hangar_racks.png") });

  // Perspective pan along the rack aisles
  await page.evaluate(() => {
    if (window.__wareTwin) {
      window.__wareTwin.useStore.getState().focus([65, 4, 35], [75, 13, 58]);
    }
  });
  await sleep(10000);

  // -------------------------------------------------------------
  // CHAPTER 4: AUTONOMOUS FLIGHT TEST OPERATION (01:30 - 02:20)
  // -------------------------------------------------------------
  console.log(">>> CHAPTER 4: Autonomous Hangar-to-Runway Flight Test");
  await page.evaluate(() => {
    if (window.__wareTwin) {
      const hangarStore = window.__wareTwin.useDroneHangarStore.getState();
      const drones = hangarStore.drones;
      const readyDrone = Object.values(drones).find(
        (d) => d.state === "READY" || d.state === "STORED"
      );
      const targetId = readyDrone ? readyDrone.id : "DRN-1425";
      hangarStore.dispatchRunwayFlightTest(targetId);
      hangarStore.selectDrone(targetId);
    }
  });
  console.log("Flight test dispatched! Drone undocking from Hangar 02...");
  await sleep(8000);

  console.log("Tracking drone taxiing down Taxiway Alpha to Runway 09...");
  await sleep(10000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "frame_04_flight_takeoff_circuit.png") });

  console.log("Tracking Runway 09 acceleration takeoff roll and rotation...");
  await sleep(12000);

  console.log("Tracking campus circuit flight and glideslope approach...");
  await sleep(14000);

  console.log("Tracking Runway 09/27 touchdown flare and rollout...");
  await sleep(8000);

  // -------------------------------------------------------------
  // CHAPTER 5: REAL-TIME TELEMETRY DOSSIER (02:20 - 02:45)
  // -------------------------------------------------------------
  console.log(">>> CHAPTER 5: Real-Time Drone Telemetry Dossier");
  await page.evaluate(() => {
    if (window.__wareTwin) {
      const droneCards = Array.from(document.querySelectorAll("div"));
      const activeCard = droneCards.find((x) => x.textContent && x.textContent.includes("DRN-"));
      if (activeCard) activeCard.click();
    }
  });
  await sleep(10000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "frame_05_telemetry_dossier.png") });
  await sleep(10000);

  // -------------------------------------------------------------
  // CHAPTER 6: COMMAND & OPERATIONS CENTER (02:45 - 03:00)
  // -------------------------------------------------------------
  console.log(">>> CHAPTER 6: Autonomous Command & Operations Center");
  await page.evaluate(() => {
    if (window.__wareTwin) {
      // Clear drone selection and focus camera on Command Center
      window.__wareTwin.useDroneHangarStore.getState().selectDrone(null);
      window.__wareTwin.useStore.getState().focus([-35, 2, 85], [-35, 10, 110]);
    }
  });
  await sleep(5000);

  // Demonstrate AI Ops Drawer
  console.log("Demonstrating AI Ops Intelligence Drawer...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent && x.textContent.includes("AI Ops"));
    if (b) b.click();
  });
  await sleep(4000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, "frame_06_command_operations.png") });

  // Close AI Ops Drawer
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent && x.textContent.includes("AI Ops"));
    if (b) b.click();
  });
  await sleep(2000);

  // Final wide establishing shot of the entire Airbase
  await page.evaluate(() => {
    if (window.__wareTwin) {
      window.__wareTwin.useStore.getState().focus([50, 0, 90], [120, 90, 220]);
    }
  });
  await sleep(5000);

  console.log("Closing recording session...");
  await page.close();
  await context.close();
  await browser.close();

  // Find recorded WebM file
  const videoFiles = fs.readdirSync(VIDEO_RAW_DIR).filter((f) => f.endsWith(".webm"));
  if (videoFiles.length > 0) {
    const rawVideoPath = path.join(VIDEO_RAW_DIR, videoFiles[0]);
    const finalMp4Path = path.join(ARTIFACTS_DIR, "airbase-demo.mp4");
    const finalWebmPath = path.join(ARTIFACTS_DIR, "airbase-demo.webm");

    // Save WebM
    fs.copyFileSync(rawVideoPath, finalWebmPath);
    console.log("[OK] WebM Demonstration Video: " + finalWebmPath);

    // Transcode to MP4 using ffmpeg
    console.log("[Transcoding] Converting to 1080p MP4 via ffmpeg...");
    try {
      execSync(
        `ffmpeg -y -i "${rawVideoPath}" -c:v mpeg4 -q:v 3 -r 25 "${finalMp4Path}"`,
        { stdio: "inherit" }
      );
      console.log("[OK] MP4 Demonstration Video: " + finalMp4Path);
    } catch (e) {
      console.warn("ffmpeg transcode note: " + e.message);
    }
  }

  console.log("===============================================================");
  console.log("  DEMONSTRATION RECORDING WORKFLOW COMPLETED SUCCESSFULLY!     ");
  console.log("===============================================================");
})();
