import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Check, X, Loader2, ChevronDown, Settings, Users, UserCircle2 } from "lucide-react";
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
  onAddContact?: (data: { name: string; email?: string }) => Promise<void>;
  isPending: boolean;
  isContactPending?: boolean;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  onInvite,
  onAddContact,
  isPending,
  isContactPending = false,
}: InviteMemberDialogProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"family" | "contact">("family");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FamilyRole>("editor");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sharingScope, setSharingScope] = useState<SharingScope>("all");
  const [scopeStartDate, setScopeStartDate] = useState("");
  const [scopeEndDate, setScopeEndDate] = useState("");
  const [scopeTripId, setScopeTripId] = useState("");
  const [trips, setTrips] = useState<any[]>([]);

  const [isChecking, setIsChecking] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [foundUser, setFoundUser] = useState<{ id: string; full_name: string | null } | null>(null);

  useEffect(() => {
    if (user && sharingScope === "specific_trip") {
      supabase
        .from("trip_members")
        .select(
          `
          trip_id,
          trips:trip_id (
            id,
            name,
            start_date,
            end_date,
            destination
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) {
            const userTrips = data
              .map((item) => item.trips)
              .filter((trip) => trip !== null)
              .map((trip) => ({
                id: trip.id,
                name: trip.name,
                start_date: trip.start_date,
                end_date: trip.end_date,
                destination: trip.destination,
              }));
            setTrips(userTrips);
          } else {
            setTrips([]);
          }
        });
    }
  }, [user, sharingScope]);

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
            full_name: data.full_name || data.email.split("@")[0],
          });
          if (!name) {
            setName(data.full_name || data.email.split("@")[0]);
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
    if (tab === "contact" && onAddContact) {
      await onAddContact({ name, email: email || undefined });
    } else {
      await onInvite({
        name,
        email,
        role,
        sharingScope: showAdvanced ? sharingScope : "all",
        scopeStartDate: sharingScope === "date_range" ? scopeStartDate : undefined,
        scopeEndDate: sharingScope === "date_range" ? scopeEndDate : undefined,
        scopeTripId: sharingScope === "specific_trip" ? scopeTripId : undefined,
      });
    }
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
      setTab("family");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-2xl !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0 border-b border-border/40">
          <DialogTitle>{tab === "family" ? "Convidar membro" : "Adicionar contato"}</DialogTitle>
          <DialogDescription>
            {tab === "family"
              ? userExists
                ? "Usuário encontrado! Será enviada uma solicitação."
                : "Adicione alguém para compartilhar finanças"
              : "Contatos aparecem no formulário de transação mas não têm acesso à família"}
          </DialogDescription>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="px-6 pt-3 pb-1 shrink-0">
          <div className="flex gap-1 p-1 rounded-xl bg-muted">
            <button
              type="button"
              onClick={() => setTab("family")}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5",
                tab === "family"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Família
            </button>
            <button
              type="button"
              onClick={() => setTab("contact")}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5",
                tab === "contact"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <UserCircle2 className="h-3.5 w-3.5" />
              Contato
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-4">
          <div className="space-y-4 mt-4">
            <FormField label="Email" htmlFor="invite-email">
              <div className="relative">
                <Input
                  id="invite-email"
                  name="invite-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={cn(
                    "pr-10 h-12 rounded-xl",
                    userExists === true && "border-positive focus-visible:ring-positive",
                    userExists === false && "border-warning focus-visible:ring-warning"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!isChecking && userExists === true && (
                    <Check className="h-4 w-4 text-positive" />
                  )}
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
            </FormField>

            <FormField label="Nome" htmlFor="invite-name">
              <Input
                id="invite-name"
                name="invite-name"
                placeholder="Nome do membro…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoCapitalize="words"
                className="h-12 rounded-xl"
              />
            </FormField>

            {tab === "family" && (
              <FormField label="Permissão" htmlFor="invite-role">
                <Select value={role} onValueChange={(v) => setRole(v as FamilyRole)}>
                  <SelectTrigger id="invite-role" className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start py-1">
                        <span>Administrador</span>
                        <span className="text-sm text-muted-foreground">Acesso total</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex flex-col items-start py-1">
                        <span>Editor</span>
                        <span className="text-sm text-muted-foreground">Pode criar e editar</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start py-1">
                        <span>Visualizador</span>
                        <span className="text-sm text-muted-foreground">Apenas visualização</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {tab === "family" && (
              <Collapsible
                open={showAdvanced}
                onOpenChange={setShowAdvanced}
                className="border border-border/50 rounded-xl overflow-hidden bg-muted/10"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-2 w-full justify-between h-12 px-4 hover:bg-muted/20"
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <Settings className="h-4 w-4" />
                      Opções Avançadas
                    </div>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-4 border-t border-border/50">
                  <FormField label="Escopo de Compartilhamento" htmlFor="invite-scope">
                    <Select
                      value={sharingScope}
                      onValueChange={(v) => setSharingScope(v as SharingScope)}
                    >
                      <SelectTrigger id="invite-scope" className="h-12 rounded-xl">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">
                          <div className="flex flex-col items-start py-1">
                            <span>Tudo</span>
                            <span className="text-sm text-muted-foreground">
                              Compartilhar todas as transações
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="trips_only">
                          <div className="flex flex-col items-start py-1">
                            <span>🧳 Apenas Viagens</span>
                            <span className="text-sm text-muted-foreground">
                              Apenas transações de viagens
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="date_range">
                          <div className="flex flex-col items-start py-1">
                            <span>📅 Período Específico</span>
                            <span className="text-sm text-muted-foreground">
                              Transações em um período
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="specific_trip">
                          <div className="flex flex-col items-start py-1">
                            <span>🎯 Viagem Específica</span>
                            <span className="text-sm text-muted-foreground">Apenas uma viagem</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  {sharingScope === "date_range" && (
                    <>
                      <FormField label="Data Início" htmlFor="invite-start">
                        <Input
                          id="invite-start"
                          name="invite-start"
                          type="date"
                          value={scopeStartDate}
                          onChange={(e) => setScopeStartDate(e.target.value)}
                          autoComplete="off"
                          className="h-12 rounded-xl"
                        />
                      </FormField>
                      <FormField label="Data Fim" htmlFor="invite-end">
                        <Input
                          id="invite-end"
                          name="invite-end"
                          type="date"
                          value={scopeEndDate}
                          onChange={(e) => setScopeEndDate(e.target.value)}
                          autoComplete="off"
                          className="h-12 rounded-xl"
                        />
                      </FormField>
                      <p className="text-sm text-muted-foreground bg-background p-2 rounded-lg border">
                        📆 Transações antigas do período permanecerão visíveis
                      </p>
                    </>
                  )}

                  {sharingScope === "specific_trip" && (
                    <FormField label="Viagem" htmlFor="invite-trip">
                      <Select value={scopeTripId} onValueChange={setScopeTripId}>
                        <SelectTrigger id="invite-trip" className="h-12 rounded-xl">
                          <SelectValue placeholder="Selecione uma viagem…" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {trips.map((trip) => (
                            <SelectItem key={trip.id} value={trip.id} className="py-2">
                              <div className="flex flex-col items-start">
                                <span>{trip.name}</span>
                                {trip.destination && (
                                  <span className="text-sm text-muted-foreground">
                                    📍 {trip.destination}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {trips.length === 0 && (
                        <p className="text-sm text-warning bg-warning/10 p-2 rounded-lg">
                          ⚠️ Nenhuma viagem encontrada. Crie ou participe de uma viagem primeiro.
                        </p>
                      )}
                      {trips.length > 0 && (
                        <p className="text-sm text-muted-foreground bg-background p-2 rounded-lg border">
                          🧳 Apenas transações desta viagem serão compartilhadas
                        </p>
                      )}
                    </FormField>
                  )}

                  {sharingScope === "trips_only" && (
                    <p className="text-sm text-muted-foreground bg-background p-2 rounded-lg border">
                      ✈️ Apenas transações vinculadas a viagens serão compartilhadas
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {tab === "family" && userExists === true && (
              <div className="p-3 rounded-xl bg-positive/10 border border-positive/20">
                <p className="text-sm text-positive">
                  ✓ Solicitação será enviada. O usuário precisa aceitar para criar o vínculo.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl h-12"
              onClick={() => handleClose(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-xl h-12 font-bold"
              onClick={handleSubmit}
              disabled={
                !email.trim() || !name.trim() || (tab === "family" ? isPending : isContactPending)
              }
            >
              {(tab === "family" ? isPending : isContactPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {tab === "family" ? "Enviar Convite" : "Salvar Contato"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
