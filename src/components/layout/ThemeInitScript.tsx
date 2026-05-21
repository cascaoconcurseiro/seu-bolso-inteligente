/**
 * ThemeInitScript: injeta a classe .dark no <html> antes do React carregar,
 * evitando o flash de tema errado (FOUC - Flash Of Unstyled Content).
 * Este componente não renderiza nada visível.
 */

// Este script deve ser injetado diretamente no <head> via index.html ou main.tsx.
// A função abaixo pode ser chamada antes do React.createRoot().
export function initThemeFromStorage() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldBeDark = saved ? saved === "dark" : prefersDark;
  if (shouldBeDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
