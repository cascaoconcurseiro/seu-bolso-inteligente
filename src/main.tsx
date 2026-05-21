import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/mobile.css";
import { initThemeFromStorage } from "./components/layout/ThemeInitScript";

// Inicializa o tema antes do React montar para evitar flash de tema errado
initThemeFromStorage();

createRoot(document.getElementById("root")!).render(<App />);

