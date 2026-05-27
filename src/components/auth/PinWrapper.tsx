import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Lock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PinWrapper({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useUserProfile();
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  // Verifica se deve bloquear assim que o perfil carregar
  useEffect(() => {
    if (!isLoading && profile?.require_pin_on_open && profile?.app_pin) {
      // Bloqueia sempre que a página carrega/atualiza e o recurso está ativo
      setIsLocked(true);
    }
  }, [isLoading, profile?.require_pin_on_open, profile?.app_pin]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Se não requer PIN ou já desbloqueou, renderiza as filhas normais (AppLayout)
  if (!profile?.require_pin_on_open || !profile?.app_pin || !isLocked) {
    return <>{children}</>;
  }

  // Tela de Bloqueio
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === profile.app_pin) {
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
