import { StrictMode, useContext } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import ResearchApp from "./InterviewPanel";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ResearchApp/>
  </StrictMode>,
);
