#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==============================================================="
echo "  AUTONOMOUS DRONE AIRBASE - AUTOMATED DEMO RECORDING PIPELINE "
echo "  Project Root: $PROJECT_ROOT"
echo "==============================================================="

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ]; then
    echo "Stopping temporary backend process (PID $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    echo "Stopping temporary frontend process (PID $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Step 1: Verify Backend
echo "[1/5] Checking Backend Service on port 8000..."
if curl -s -f http://localhost:8000/api/health >/dev/null 2>&1; then
  echo "  [OK] Backend is already running and healthy."
else
  echo "  Backend not detected. Starting FastAPI backend in background..."
  cd "$PROJECT_ROOT/backend"
  if [ -f ".venv/bin/uvicorn" ]; then
    .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 >/dev/null 2>&1 &
  else
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >/dev/null 2>&1 &
  fi
  BACKEND_PID=$!
  for i in {1..30}; do
    if curl -s -f http://localhost:8000/api/health >/dev/null 2>&1; then
      echo "  [OK] Backend started successfully (PID $BACKEND_PID)."
      break
    fi
    sleep 1
  done
fi

# Step 2: Verify Frontend
echo "[2/5] Checking Frontend Service on port 5173..."
if curl -s -f http://localhost:5173 >/dev/null 2>&1; then
  echo "  [OK] Frontend is already running."
else
  echo "  Frontend not detected. Starting Vite frontend in background..."
  cd "$PROJECT_ROOT/frontend"
  npx vite --host 0.0.0.0 --port 5173 >/dev/null 2>&1 &
  FRONTEND_PID=$!
  for i in {1..30}; do
    if curl -s -f http://localhost:5173 >/dev/null 2>&1; then
      echo "  [OK] Frontend started successfully (PID $FRONTEND_PID)."
      break
    fi
    sleep 1
  done
fi

# Step 3: Run Recording Tour Script
echo "[3/5] Launching local browser automation recording..."
cd "$PROJECT_ROOT"
node "$PROJECT_ROOT/scripts/record-airbase-demo.js"

# Step 4: Verify Artifact
echo "[4/5] Verifying generated video artifacts..."
VIDEO_PATH="$PROJECT_ROOT/artifacts/airbase-demo.mp4"
if [ -f "$VIDEO_PATH" ] && [ -s "$VIDEO_PATH" ]; then
  FILE_SIZE=$(ls -lh "$VIDEO_PATH" | awk '{print $5}')
  echo "  [SUCCESS] Video artifact verified at: $VIDEO_PATH ($FILE_SIZE)"
  ffmpeg -i "$VIDEO_PATH" 2>&1 | grep -E "Duration|Stream" | sed 's/^/  /'
else
  echo "  [ERROR] Video file was not generated or is empty!"
  exit 1
fi

echo "[5/5] Recording pipeline completed cleanly."
