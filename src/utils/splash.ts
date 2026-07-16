/**
 * Remove o splash nativo do index.html (fora do #root) com fade.
 * Chamado quando a primeira tela real está pronta: ProtectedRoute resolvido,
 * página pública montada ou ErrorBoundary ativado. Idempotente.
 */
export function hideNativeSplash() {
  const el = document.getElementById("native-splash");
  if (!el) return;
  el.classList.add("hide");
  window.setTimeout(() => el.remove(), 300);
}
