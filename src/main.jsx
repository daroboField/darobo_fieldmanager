import { StrictMode, useContext } from "react";
import { createRoot } from "react-dom/client";
//import Darobo_collect from "./Darobo";
import Survey_Dashboard from "./Dashboard";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Survey_Dashboard />
  </StrictMode>,
);
