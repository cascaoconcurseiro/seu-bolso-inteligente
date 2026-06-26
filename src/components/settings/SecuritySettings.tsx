import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { UserProfile } from "@/hooks/useUserProfile";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { supabase } from "@/integrations/supabase/client";

interface SecuritySettingsProps {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: any;
}

export function SecuritySettings({ profile, isLoading, updateProfile }: SecuritySettingsProps) {
  const [requirePin, setRequirePin] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      setRequirePin(profile.require_pin_on_open || false);
      if ((profile as any).app_pin_hash) {
        setPin("****"); // Visual placeholder — PIN já configurado
        setConfirmPin("****");
      }
    }
  }, [profile]);

  const handleSavePin = async () => {
    if (requirePin && pin !== confirmPin) {
      toast.error("Os PINs não coincidem.");
      return;
    }
    if (requirePin && pin.length < 4) {
      toast.error("O PIN deve ter 4 dígitos.");
      return;
    }

    try {
      if (!requirePin) {
        // Disabling PIN: clear hash via RPC + update flag
        const { error } = await supabase.rpc('clear_pin');
        if (error) throw error;
      } else if (pin !== "****" && pin.length >= 4) {
        // New PIN: hash via RPC (never send to profiles directly)
        const { error } = await supabase.rpc('set_pin', {
          p_pin: pin,
          p_require_on_open: requirePin,
        });
        if (error) throw error;
      } else {
        // Only toggling require_pin_on_open without changing PIN
        await updateProfile.mutateAsync({ require_pin_on_open: requirePin });
      }

      toast.success("Configuração de segurança salva!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar PIN.");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const hasPinSet = !!(profile as any)?.app_pin_hash;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="font-display font-semibold text-lg">Segurança de Acesso</h2>
        <p className="text-sm text-muted-foreground">Proteja seus dados financeiros com um bloqueio por PIN.</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="p-4 bg-muted/30 border border-border rounded-xl flex items-start gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0 mt-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Bloqueio do Aplicativo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ao ativar, o sistema pedirá um PIN numérico de 4 dígitos sempre que o aplicativo for aberto. Isso protege seus dados caso alguém pegue seu dispositivo destravado.
            </p>
            
            <div className="mt-6 flex items-center justify-between p-4 bg-background border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="require-pin" className="cursor-pointer">Exigir PIN ao abrir o app</Label>
                <InfoTooltip content="Quando ativado, caso o aplicativo seja fechado ou recarregado, será necessário digitar o PIN para visualizar suas finanças." />
              </div>
              <Switch 
                id="require-pin" 
                checked={requirePin} 
                onCheckedChange={(checked) => {
                  setRequirePin(checked);
                  setIsEditing(true);
                  if (checked && !hasPinSet) {
                    setPin("");
                    setConfirmPin("");
                  }
                }} 
              />
            </div>

            {requirePin && (hasPinSet || isEditing) && (
              <div className="mt-4 p-4 border border-border rounded-lg bg-background space-y-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Lock className="h-4 w-4" />
                  {hasPinSet && !isEditing ? "PIN Configurado" : "Configure seu PIN de 4 dígitos"}
                </div>
                
                {hasPinSet && !isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setPin(""); setConfirmPin(""); }}>
                    Alterar PIN
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PIN Numérico</Label>
                      <Input 
                        type="password" 
                        maxLength={4} 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0000"
                        className="text-center tracking-widest text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar PIN</Label>
                      <Input 
                        type="password" 
                        maxLength={4} 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0000"
                        className="text-center tracking-widest text-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {isEditing && (
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleSavePin} 
                  disabled={updateProfile.isPending || (requirePin && (pin.length !== 4 || pin !== confirmPin))}
                >
                  {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Configuração de Segurança
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
