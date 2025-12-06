import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker is handled by Vite PWA plugin (generates sw.js)
// No manual registration needed - it's done automatically
