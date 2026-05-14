import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { setBaseUrl } from "@workspace/api-client-react";

// Initialize API base URL from environment variables
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
} else {
  // Fallback to relative path for development if not provided
  console.warn("VITE_API_BASE_URL is not defined. Falling back to relative paths.");
}

createRoot(document.getElementById("root")!).render(<App />);
