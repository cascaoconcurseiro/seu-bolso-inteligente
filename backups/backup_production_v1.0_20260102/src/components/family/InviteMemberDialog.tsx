import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Mail, Check, X, Loader2, ChevronDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FamilyRole, SharingScope } from "@/hooks/useFamily";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (data: { 
    name: string; 
    email: string; 
    role: FamilyRole;
    sharingScope?: SharingScope;
    scopeStartDate?: string;
    scopeEndDate?: string;
    scopeTripId?: string;
  }) => Promise<void>;
  isPending: boolean;
}

export function InviteMemberDialog({ 
  open, 
  onOpenChange, 
  onInvite, 
  isPending 
}: InviteMemberDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FamilyRole>("editor");
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sharingScope, setSharingScope] = useState<SharingScope>("all");
  const [scopeStartDate, setScopeStartDate] = useState("");
  const [scopeEndDate, setScopeEndDate] = useState("");
  const [scopeTripId, setScopeTripId] = useState("");
  const [trips, setTrips] = useState<any[]>([]);
  
  // Email verification state
  const [isChecking, setIsChecking] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [foundUser, setFoundUser] = useState<{ id: string; full_name: string | null } | null>(null);

  // Load trips for specific_trip option
  useEffect(() => {
    if (user && sharingScope === "specific_trip") {
      // Buscar viagens onde o usuário é membro (owner ou participante)
      supabase
        .from("trip_members")
        .select(`
          trip_id,
          trips:trip_id (
            id,
            name,
            start_date,
            end_date,
            destination
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) {
            // Extrair e formatar as viagens
            const userTrips = data
              .map(item => item.trips)
              .filter(trip => trip !== null)
              .map(trip => ({
                id: trip.id,
                name: trip.name,
                start_date: trip.start_date,
                end_date: trip.end_date,
                destination: trip.destination
              }));
            setTrips(userTrips);
          } else {
            setTrips([]);
          }
        });
    }
  }, [user, sharingScope]);

  // Debounced email check
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email.trim())) {
      setUserExists(null);
      setFoundUser(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .ilike("email", email.trim())
          .maybeSingle();

        if (data) {
          setUserExists(true);
          setFoundUser({ 
            id: data.id, 
            full_name: data.full_name || data.email.split('@')[0]
          });
          if (!name) {
            setName(data.full_name || data.email.split('@')[0]);
          }
        } else {
          setUserExists(false);
          setFoundUser(null);
        }
      } catch (error) {
        setUserExists(null);
        setFoundUser(null);
      } finally {
        setIsChecking(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [email, name]);

  const handleSubmit = async () => {
    await onInvite({ 
      name, 
      email, 
      role,
      sharingScope: showAdvanced ? sharingScope : "all",
      scopeStartDate: sharingScope === "date_range" ? scopeStartDate : undefined,
      scopeEndDate: sharingScope === "date_range" ? scopeEndDate : undefined,
      scopeTripId: sharingScope === "specific_trip" ? scopeTripId : undefined,
    });
    handleClose(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setName("");
      setEmail("");
      setRole("editor");
      setSharingScope("all");
      setScopeStartDate("");
      setScopeEndDate("");
      setScopeTripId("");
      setShowAdvanced(false);
      setUserExists(null);
      setFoundUser(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            {userExists 
              ? "Usuário encontrado! Será enviada uma solicitação." 
              : "Adicione alguém para compartilhar finanças"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "pr-10",
                  userExists === true && "border-positive focus-visible:ring-positive",
                  userExists === false && "border-warning focus-visible:ring-warning"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!isChecking && userExists === true && <Check className="h-4 w-4 text-positive" />}
                {!isChecking && userExists === false && <X className="h-4 w-4 text-warning" />}
              </div>
            </div>
            {userExists === true && foundUser?.full_name && (
              <p className="text-sm text-positive flex items-center gap-1">
                <Check className="h-3 w-3" />
                Usuário cadastrado: {foundUser.full_name}
              </p>
            )}
            {userExists === false && (
              <p className="text-sm text-muted-foreground">
                Usuário não cadastrado. Os dados ficarão salvos localmente.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              placeholder="Nome do membro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Permissão</Label>
            <Select value={role} onValueChange={(v) => setRole(v as FamilyRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span>Administrador</span>
                    <span className="text-xs text-muted-foreground">Acesso total</span>
                  </div>
                </SelectItem>
                <SelectItem value="editor">
                  <div className="flex flex-col items-start">
                    <span>Editor</span>
                    <span className="text-xs text-muted-foreground">Pode criar e editar</span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col items-start">
                    <span>Visualizador</span>
                    <span className="text-xs text-muted-foreground">Apenas visualização</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                <Settings className="h-4 w-4" />
                Opções Avançadas
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Escopo de Compartilhamento</Label>
                <Select value={sharingScope} onValueChange={(v) => setSharingScope(v as SharingScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex flex-col items-start">
                        <span>Tudo</span>
                        <span className="text-xs text-muted-foreground">Compartilhar todas as transações</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="trips_only">
                      <div className="flex flex-col items-start">
                        <span>🧳 Apenas Viagens</span>
                        <span className="text-xs text-muted-foreground">Apenas transações de viagens</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="date_range">
                      <div className="flex flex-col items-start">
                        <span>📅 Período Específico</span>
                        <span className="text-xs text-muted-foreground">Transações em um período</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="specific_trip">
                      <div className="flex flex-col items-start">
                        <span>🎯 Viagem Específica</span>
                        <span className="text-xs text-muted-foreground">Apenas uma viagem</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sharingScope === "date_range" && (
                <>
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={scopeStartDate}
                      onChange={(e) => setScopeStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={scopeEndDate}
                      onChange={(e) => setScopeEndDate(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Transações antigas do período permanecerão visíveis. Novas transações fora do período não aparecerão.
                  </p>
                </>
              )}

              {sharingScope === "specific_trip" && (
                <div className="space-y-2">
                  <Label>Viagem</Label>
                  <Select value={scopeTripId} onValueChange={setScopeTripId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma viagem" />
                    </SelectTrigger>
                    <SelectContent>
                      {trips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id}>
                          <div className="flex flex-col items-start">
                            <span>{trip.name}</span>
                            {trip.destination && (
                              <span className="text-xs text-muted-foreground">
                                📍 {trip.destination}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {trips.length === 0 && (
                    <p className="text-xs text-warning">
                      ⚠️ Nenhuma viagem encontrada. Crie ou participe de uma viagem primeiro.
                    </p>
                  )}
                  {trips.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      💡 Apenas transações desta viagem serão compartilhadas.
                    </p>
                  )}
                </div>
              )}

              {sharingScope === "trips_only" && (
                <p className="text-xs text-muted-foreground">
                  💡 Apenas transações vinculadas a viagens serão compartilhadas.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {userExists === true && (
            <div className="p-3 rounded-lg bg-positive/10 border border-positive/20">
              <p className="text-sm text-positive">
                ✓ Solicitação será enviada. O usuário precisa aceitar para criar o vínculo.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !email || isPending}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isPending ? "Adicionando..." : "Adicionar membro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
