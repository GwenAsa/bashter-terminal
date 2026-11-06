import { createRoot } from "react-dom/client";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "./styles.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("#root element is missing from index.html");

// StrictMode is intentionally off: it double-mounts effects in dev, which would
// spawn and immediately kill a throwaway shell for every tab.
createRoot(root).render(<App />);
