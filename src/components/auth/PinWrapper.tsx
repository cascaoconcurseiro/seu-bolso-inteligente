import React, { useState, useEffect, useRef } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Lock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000; // 1 minute
const ATTEMPTS_KEY = '@pedemeia:pin_attempts';
const LOCKOUT_UNTIL_KEY = '@pedemeia:pin_lockout_until';

function getRemainingLockout(): number {
  try {
    const until = Number(localStorage.getItem(LOCKOUT_UNTIL_KEY) || '0');
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}

function recordFailedAttempt(): number {
  try {
    const attempts = Number(localStorage.getItem(ATTEMPTS_KEY) || '0') + 1;
    localStorage.setItem(ATTEMPTS_KEY, String(attempts));
    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem(LOCKOUT_UNTIL_KEY, String(Date.now() + LOCKOUT_MS));
      localStorage.setItem(ATTEMPTS_KEY, '0');
    }
    return attempts;
  } catch {
    return 1;
  }
}

function clearAttempts() {
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);
  } catch { /* ignore */ }
}

export function PinWrapper({ children }: { children: React.ReactNode }) {
  const { data: profile } = useUserProfile();

  const [isLocked, setIsLocked] = useState(() => {
    try {
      return localStorage.getItem('@pedemeia:require_pin') === 'true';
    } catch {
      return false;
    }
  });

  const [pinInput, setPinInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const hasCheckedProfile = useRef(false);

  useEffect(() => {
    if (!hasCheckedProfile.current && profile) {
      hasCheckedProfile.current = true;
      const hasPinHash = !!(profile as any).app_pin_hash;
      if (profile.require_pin_on_open && hasPinHash) {
        const localConfig = localStorage.getItem('@pedemeia:require_pin');
        if (localConfig !== 'true' && localConfig !== 'false') {
          setIsLocked(true);
        }
      }
    }
  }, [profile]);

  // Lockout countdown
  useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(() => {
      const remaining = getRemainingLockout();
      setLockoutSeconds(Math.ceil(remaining / 1000));
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    setLockoutSeconds(Math.ceil(getRemainingLockout() / 1000));
    return () => clearInterval(interval);
  }, [isLocked]);

  const requirePin = profile?.require_pin_on_open ?? (localStorage.getItem('@pedemeia:require_pin') === 'true');
  const hasPinHash = !!(profile as any)?.app_pin_hash;

  if (!requirePin || !hasPinHash || !isLocked) {
    return <>{children}</>;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    const remaining = getRemainingLockout();
    if (remaining > 0) {
      toast.error(`Muitas tentativas. Aguarde ${Math.ceil(remaining / 1000)}s.`);
      return;
    }

    setIsVerifying(true);
    try {
      const { data: ok, error } = await supabase.rpc('verify_pin', { p_pin: pinInput });

      if (error) {
        toast.error('Erro ao verificar PIN. Tente novamente.');
        return;
      }

      if (ok === true) {
        clearAttempts();
        setIsLocked(false);
      } else {
        const attempts = recordFailedAttempt();
        const newRemaining = getRemainingLockout();
        if (newRemaining > 0) {
          toast.error(`PIN bloqueado por ${Math.ceil(newRemaining / 1000)}s após ${MAX_ATTEMPTS} tentativas incorretas.`);
        } else {
          toast.error(`PIN incorreto. Tentativa ${attempts} de ${MAX_ATTEMPTS}.`);
        }
        setPinInput('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const isLockedOut = lockoutSeconds > 0;

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
          {isLockedOut && (
            <p className="text-sm font-medium text-destructive">
              Bloqueado por {lockoutSeconds}s
            </p>
          )}
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Digite o PIN numérico"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            className="text-center text-xl tracking-[0.5em] h-14"
            autoFocus
            disabled={isVerifying || isLockedOut}
          />
          <Button
            type="submit"
            className="w-full h-12"
            disabled={pinInput.length < 4 || isVerifying || isLockedOut}
          >
            {isVerifying ? 'Verificando...' : 'Desbloquear'}
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
