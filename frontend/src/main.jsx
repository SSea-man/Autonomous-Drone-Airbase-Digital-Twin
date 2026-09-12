import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { useStore } from "./state/store";
import { useDroneHangarStore } from "./state/droneHangarStore";
import { useDroneManufacturingStore } from "./state/droneManufacturingStore";
if (typeof window !== "undefined") {
    window.__wareTwin = {
        useStore,
        useDroneHangarStore,
        useDroneManufacturingStore,
    };
}
ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode>
    <App />
  </React.StrictMode>);
