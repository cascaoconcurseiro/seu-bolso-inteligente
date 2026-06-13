import React, { useState, useEffect, useRef } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Lock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PinWrapper({ children }: { children: React.ReactNode }) {
  const { data: profile } = useUserProfile();
  
  // Inicialização síncrona pelo LocalStorage
  const [isLocked, setIsLocked] = useState(() => {
    try {
      return localStorage.getItem('@pedemeia:require_pin') === 'true';
    } catch {
      return false;
    }
  });
  
  const [pinInput, setPinInput] = useState('');
  const hasCheckedProfile = useRef(false);
  
  // Validação quando o perfil chegar da nuvem (caso o cache estivesse vazio no primeiro acesso)
  useEffect(() => {
    if (!hasCheckedProfile.current && profile) {
      hasCheckedProfile.current = true;
      // Se não travamos no inicio, mas o BD diz que precisa (ex: limparam o cache)
      if (profile.require_pin_on_open && profile.app_pin) {
        // Só tenta travar de novo se não há histórico no storage, para não travar num reload indevido
        const localConfig = localStorage.getItem('@pedemeia:require_pin');
        if (localConfig !== 'true' && localConfig !== 'false') {
          setIsLocked(true);
        }
      }
    }
  }, [profile]);

  // Lê a necessidade e o PIN, preferindo cache se o profile ainda não chegou
  const requirePin = profile?.require_pin_on_open ?? (localStorage.getItem('@pedemeia:require_pin') === 'true');
  const currentPin = profile?.app_pin || localStorage.getItem('@pedemeia:app_pin');

  // Se não requer PIN ou já desbloqueou, renderiza as filhas normais de forma instantânea
  if (!requirePin || !currentPin || !isLocked) {
    return <>{children}</>;
  }

  // Tela de Bloqueio
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === currentPin) {
      setIsLocked(false);
    } else {
      toast.error('PIN incorreto');
      setPinInput('');
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
          />
          <Button type="submit" className="w-full h-12" disabled={pinInput.length < 4}>
            Desbloquear
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
