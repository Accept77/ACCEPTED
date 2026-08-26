import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

import { TossApp } from "./app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TossApp />
  </StrictMode>,
);
