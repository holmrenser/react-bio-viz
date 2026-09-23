import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
// The library ships its chrome (shadcn/Tailwind) and theme tokens as one stylesheet; Vite's
// library build emits it alongside the JS rather than importing it from there, so every consumer
// imports it once, like this. Without it the toolbars are unstyled and `--rbv-accent` &c. are unset.
import "react-bio-viz/style.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
