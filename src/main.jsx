import { StrictMode, useContext } from "react";
import { createRoot } from "react-dom/client";
import DaroboApp from "./Darobo";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DaroboApp />
  </StrictMode>,
);
