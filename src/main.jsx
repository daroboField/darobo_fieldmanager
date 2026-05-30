import { StrictMode, useContext } from "react";
import { createRoot } from "react-dom/client";
import Darobo_collect from "./Darobo";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Darobo_collect />
  </StrictMode>,
);
