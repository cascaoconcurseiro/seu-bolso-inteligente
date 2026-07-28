/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Lock, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * PinWrapper — Proteção de sessão com PIN.
 *
 * Segurança (LGPD Art. 46):
 * - PIN armazenado com bcrypt (pgcrypto) — nunca plaintext
 * - Verificação server-side via verify_pin RPC
 * - Lockout server-side: 5 tentativas, 60s (tabela pin_attempts)
 * - PIN nunca trafega em localStorage para lockout (era bypassável)
 */

export function PinWrapper({ children }: { children: React.ReactNode }) {
  const { data: profile } = useUserProfile();

  const [isLocked, setIsLocked] = useState(() => {
    try {
      return localStorage.getItem("@pedemeia:require_pin") === "true";
    } catch {
      return false;
    }
  });

  const [pinInput, setPinInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hasCheckedProfile = useRef(false);

  useEffect(() => {
    if (!hasCheckedProfile.current && profile) {
      hasCheckedProfile.current = true;
      const hasPinHash = !!(profile as any).app_pin_hash;
      if (profile.require_pin_on_open && hasPinHash) {
        const localConfig = localStorage.getItem("@pedemeia:require_pin");
        if (localConfig !== "true" && localConfig !== "false") {
          setIsLocked(true);
        }
      }
    }
  }, [profile]);

  const requirePin =
    profile?.require_pin_on_open ?? localStorage.getItem("@pedemeia:require_pin") === "true";
  const hasPinHash = !!(profile as any)?.app_pin_hash;

  if (!requirePin || !hasPinHash || !isLocked) {
    return <>{children}</>;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMessage("");

    try {
      const { data: ok, error } = await supabase.rpc("verify_pin", { p_pin: pinInput });

      if (error) {
        // Erro do servidor (inclui lockout — P0004)
        setErrorMessage(error.message);
        setPinInput("");
        return;
      }

      if (ok === true) {
        setIsLocked(false);
      } else {
        setErrorMessage("PIN incorreto.");
        setPinInput("");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold font-display">Aplicativo Bloqueado</h2>
          <p className="text-sm text-muted-foreground">
            Digite o seu PIN de segurança para acessar as suas informações financeiras.
          </p>
          {errorMessage && <p className="text-sm font-medium text-destructive">{errorMessage}</p>}
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Digite o PIN numérico"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
            className="text-center text-xl tracking-[0.5em] h-14"
            autoFocus
            disabled={isVerifying}
          />
          <Button
            type="submit"
            className="w-full h-12"
            disabled={pinInput.length < 4 || isVerifying}
          >
            {isVerifying ? "Verificando..." : "Desbloquear"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Proteção ativa.</span>
        </div>
      </div>
    </div>
  );
}
