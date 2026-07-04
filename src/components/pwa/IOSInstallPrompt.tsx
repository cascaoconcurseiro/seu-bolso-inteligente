import { useEffect, useState } from "react";
import { Share, X, PlusSquare } from "lucide-react";

const DISMISS_KEY = "ios_install_prompt_dismissed_at";
const DISMISS_DAYS = 30;

function isIOSSafariOutsideStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  // iPadOS 13+ se identifica como Mac, mas tem touch
  const isIPadOS = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS legado
    (window.navigator as { standalone?: boolean }).standalone === true;
  // Chrome/Firefox no iOS usam WebKit mas não têm o menu Compartilhar→Adicionar
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return (isIOS || isIPadOS) && isSafari && !isStandalone;
}

/**
 * iOS não dispara `beforeinstallprompt` — o único caminho de instalação é
 * manual (Compartilhar → Adicionar à Tela de Início). Este banner orienta o
 * usuário de Safari/iOS fora do modo standalone, com dispensa de 30 dias.
 * Em Android/desktop nunca renderiza (o prompt nativo do Chrome continua).
 */
export function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafariOutsideStandalone()) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    // Pequeno delay para não competir com o carregamento inicial
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar o aplicativo"
      className="fixed bottom-20 left-3 right-3 z-[80] rounded-2xl border border-border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-4 duration-300 md:hidden"
    >
      <button
        onClick={dismiss}
        aria-label="Dispensar"
        className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="text-sm font-semibold pr-6">Instale o Pé de Meia</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
        Toque em{" "}
        <Share className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" aria-hidden="true" />
        <span className="font-medium text-foreground"> Compartilhar</span> e depois em{" "}
        <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" aria-hidden="true" />
        <span className="font-medium text-foreground">Adicionar à Tela de Início</span> para usar
        como aplicativo.
      </p>
    </div>
  );
}
