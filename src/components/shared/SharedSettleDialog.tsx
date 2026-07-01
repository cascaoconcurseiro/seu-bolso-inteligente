import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Wallet, Globe, ArrowRight, Loader2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import * as dateFns from "date-fns";
import { getCurrencySymbol } from "@/services/exchangeCalculations";

interface SharedSettleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMember: string | null;
  members: any[];
  pendingMemberItems: any[];
  selectedItems: string[];
  onToggleItem: (id: string) => void;
  onSelectAll: () => void;
  settleType: "PAY" | "RECEIVE";
  settleAmount: string;
  settleDate: string;
  setSettleDate: (date: string) => void;
  settleAccountId: string;
  setSettleAccountId: (id: string) => void;
  accounts: any[];
  trips: any[];
  profile: any;
  user: any;
  onSettle: () => void;
  isSettling: boolean;
  settlingMode: "ALL" | "SINGLE";
}

export function SharedSettleDialog({
  isOpen,
  onOpenChange,
  selectedMember,
  members,
  pendingMemberItems,
  selectedItems,
  onToggleItem,
  onSelectAll,
  settleType,
  settleAmount,
  settleDate,
  setSettleDate,
  settleAccountId,
  setSettleAccountId,
  accounts,
  trips,
  profile,
  user,
  onSettle,
  isSettling,
  settlingMode,
}: SharedSettleDialogProps) {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);

  if (!selectedMember) return null;

  const member = members.find(m => m.id === selectedMember);
  const itemsToConsider = selectedItems.length > 0
    ? pendingMemberItems.filter(i => selectedItems.includes(i.id))
    : pendingMemberItems;

  const tripIds = [...new Set(itemsToConsider.filter(i => i.tripId).map(i => i.tripId))];
  const internationalTrip = tripIds.length > 0
    ? trips.find(t => tripIds.includes(t.id) && t.currency !== "BRL")
    : null;

  const settlementCurrency = internationalTrip?.currency || "BRL";
  const isInternationalSettlement = settlementCurrency !== "BRL";

  const filteredSettleAccounts = (accounts || []).filter(a => {
    if (a.type === "CREDIT_CARD") return false;
    if (isInternationalSettlement) {
      return a.is_international && a.currency === settlementCurrency;
    }
    return !a.is_international;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full flex flex-col gap-0 p-0 !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-3xl sm:rounded-3xl !rounded-b-none sm:!rounded-b-3xl max-h-[92dvh] border-b-0 sm:border-b overflow-hidden">
        {/* Header fixo */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Wallet className="h-5 w-5 text-primary" />
              {settlingMode === "SINGLE"
                ? "Acertar Item Específico"
                : (settleType === "PAY" ? "Pagar Conta" : "Receber Pagamento")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {settlingMode === "SINGLE"
                ? "Registre o acerto apenas deste item específico"
                : (settleType === "PAY" ? "Registre o pagamento da sua dívida total" : "Registre o recebimento do valor total devido")}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-2">
          {isInternationalSettlement && (
            <Alert className="border-accent/20 bg-accent/5 dark:bg-accent/10">
              <Globe className="h-4 w-4 text-accent" />
              <AlertDescription className="text-sm text-accent">
                Acerto de viagem internacional em <span className="font-semibold">{settlementCurrency}</span>.
              </AlertDescription>
            </Alert>
          )}

          {(() => {
            const hasCredits = itemsToConsider.some(i => i.type === "CREDIT");
            const hasDebits = itemsToConsider.some(i => i.type === "DEBIT");
            if (hasCredits && hasDebits) {
              return (
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <AlertDescription className="text-sm text-primary/80 leading-relaxed">
                    <strong>Compensação Automática:</strong> Como você possui valores a pagar e a receber com <strong>{member?.name}</strong>, o sistema abate os débitos e créditos mútuos, resultando no valor líquido final.
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          {/* Card de transferência */}
          <div className={cn(
            "flex items-center justify-center gap-6 p-4 rounded-2xl",
            settleType === "PAY" ? "bg-destructive/5" : "bg-success/5"
          )}>
            <div className="text-center">
              <div className="mx-auto w-12 h-12">
                {settleType === "PAY" ? (
                  <UserAvatar name={profile?.full_name || user?.email || "Eu"} avatarUrl={profile?.avatar_url} colorId={profile?.avatar_color || "green"} iconId={profile?.avatar_icon || "avatar_1"} size="md" />
                ) : (
                  <UserAvatar name={member?.name || ""} avatarUrl={member?.avatar_url} colorId={member?.avatar_color} iconId={member?.avatar_icon} size="md" />
                )}
              </div>
              <p className="text-xs font-medium mt-1.5 text-muted-foreground">{settleType === "PAY" ? "Eu" : member?.name}</p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <ArrowRight className={cn("h-5 w-5", settleType === "PAY" ? "text-destructive" : "text-success")} />
              <p className={cn("font-mono font-bold text-base tabular-nums", settleType === "PAY" ? "text-destructive" : "text-success")}>
                {getCurrencySymbol(settlementCurrency)} {settleAmount || "0,00"}
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto w-12 h-12">
                {settleType === "PAY" ? (
                  <UserAvatar name={member?.name || ""} avatarUrl={member?.avatar_url} colorId={member?.avatar_color} iconId={member?.avatar_icon} size="md" />
                ) : (
                  <UserAvatar name={profile?.full_name || user?.email || "Eu"} avatarUrl={profile?.avatar_url} colorId={profile?.avatar_color || "green"} iconId={profile?.avatar_icon || "avatar_1"} size="md" />
                )}
              </div>
              <p className="text-xs font-medium mt-1.5 text-muted-foreground">{settleType === "PAY" ? member?.name : "Eu"}</p>
            </div>
          </div>

          {pendingMemberItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold cursor-pointer select-none" onClick={() => setIsItemsExpanded(!isItemsExpanded)}>
                    Itens para acertar ({pendingMemberItems.length})
                  </Label>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsItemsExpanded(!isItemsExpanded)}>
                    {isItemsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                {settlingMode !== "SINGLE" && (
                  <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-xs h-7 px-2 text-primary shrink-0">
                    {selectedItems.length === pendingMemberItems.length ? "Desmarcar todos" : "Selecionar todos"}
                  </Button>
                )}
              </div>
              
              {isItemsExpanded && (
                <div className="border border-border/60 rounded-2xl divide-y divide-border/40 overflow-hidden">
                {pendingMemberItems.filter(i => settlingMode === "SINGLE" ? selectedItems.includes(i.id) : true).map(item => {
                  const itemTrip = item.tripId ? trips.find(t => t.id === item.tripId) : null;
                  const itemCurrency = itemTrip?.currency || "BRL";
                  const isCredit = item.type === "CREDIT";
                  return (
                    <label key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => onToggleItem(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{(() => { if (!item.date) return '-'; const dt = new Date(item.date + 'T12:00:00'); return dateFns.isValid(dt) ? dateFns.format(dt, "dd/MM/yyyy") : '-'; })()}</p>
                      </div>
                      <span className={cn("font-mono text-sm font-semibold tabular-nums shrink-0", isCredit ? "text-success" : "text-foreground")}>
                        {getCurrencySymbol(itemCurrency)} {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </label>
                  );
                })}
              </div>
              )}
            </div>
          )}

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Data do {settleType === "PAY" ? "Pagamento" : "Recebimento"}</Label>
              <Input type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} className="rounded-xl" max={new Date().toISOString().split("T")[0]} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Conta {isInternationalSettlement && <span className="text-muted-foreground font-normal">({settlementCurrency})</span>}</Label>
              <Select value={settleAccountId} onValueChange={setSettleAccountId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSettleAccounts.length === 0 ? (
                    <SelectItem value="no-accounts" disabled>Nenhuma conta disponível</SelectItem>
                  ) : (
                    filteredSettleAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer fixo */}
        <div className="px-6 py-4 shrink-0 border-t border-border/40 flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSettle}
            disabled={isSettling || !settleAccountId}
            className="flex-1 rounded-xl h-11"
          >
            {isSettling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</> : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
