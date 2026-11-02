import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GuestPage } from "./guest/GuestPage";
import { Studio } from "./studio/Studio";
import "./styles.css";

const isGuest = location.pathname.startsWith("/join");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isGuest ? <GuestPage /> : <Studio />}</StrictMode>,
);
