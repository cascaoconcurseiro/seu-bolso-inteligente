import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Wallet, Globe, ArrowRight, Loader2, Info } from "lucide-react";
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
      <DialogContent className="max-w-lg overflow-y-auto w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {settlingMode === "SINGLE" 
              ? "Acertar Item Específico" 
              : (settleType === "PAY" ? "Pagar Conta" : "Receber Pagamento")}
          </DialogTitle>
          <DialogDescription>
            {settlingMode === "SINGLE"
              ? "Registre o acerto apenas deste item específico"
              : (settleType === "PAY" ? "Registre o pagamento da sua dívida total" : "Registre o recebimento do valor total devido")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {isInternationalSettlement && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Globe className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                Acerto de viagem internacional em <span className="font-semibold">{settlementCurrency}</span>.
              </AlertDescription>
            </Alert>
          )}

          {(() => {
            const hasCredits = itemsToConsider.some(i => i.type === "CREDIT");
            const hasDebits = itemsToConsider.some(i => i.type === "DEBIT");
            if (hasCredits && hasDebits) {
              return (
                <Alert className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/15">
                  <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <AlertDescription className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    <strong>💡 Compensação Automática de Saldos:</strong> Como você possui valores a pagar e a receber com <strong>{member?.name}</strong>, o sistema realiza automaticamente o <em>encontro de contas</em>. Os débitos e créditos mútuos são abatidos, resultando em apenas um único pagamento ou recebimento líquido (a diferença final).
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          <div className={cn(
            "flex items-center justify-center gap-6 p-4 rounded-xl",
            settleType === "PAY" ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"
          )}>
            {/* Lado esquerdo: quem ENVIA o dinheiro */}
            <div className="text-center">
              <div className="mx-auto w-12 h-12">
                {settleType === "PAY" ? (
                  // PAY: EU pago → meu avatar na esquerda
                  <UserAvatar
                    name={profile?.full_name || user?.email || "Eu"}
                    avatarUrl={profile?.avatar_url}
                    colorId={profile?.avatar_color || "green"}
                    iconId={profile?.avatar_icon || "avatar_1"}
                    size="md"
                  />
                ) : (
                  // RECEIVE: O MEMBRO me paga → avatar do membro na esquerda
                  <UserAvatar
                    name={member?.name || ""}
                    avatarUrl={member?.avatar_url}
                    colorId={member?.avatar_color}
                    iconId={member?.avatar_icon}
                    size="md"
                  />
                )}
              </div>
              <p className="text-sm mt-2">{settleType === "PAY" ? "Eu" : member?.name}</p>
            </div>

            <div className="text-center">
              <ArrowRight className={cn("h-5 w-5", settleType === "PAY" ? "text-red-500" : "text-green-500")} />
              <p className={cn("font-mono font-bold mt-1", settleType === "PAY" ? "text-red-600" : "text-green-600")}>
                {getCurrencySymbol(settlementCurrency)} {settleAmount || "0,00"}
              </p>
            </div>

            {/* Lado direito: quem RECEBE o dinheiro */}
            <div className="text-center">
              <div className="mx-auto w-12 h-12">
                {settleType === "PAY" ? (
                  // PAY: EU pago → avatar do membro na direita (quem recebe)
                  <UserAvatar
                    name={member?.name || ""}
                    avatarUrl={member?.avatar_url}
                    colorId={member?.avatar_color}
                    iconId={member?.avatar_icon}
                    size="md"
                  />
                ) : (
                  // RECEIVE: O membro me paga → meu avatar na direita (eu recebo)
                  <UserAvatar
                    name={profile?.full_name || user?.email || "Eu"}
                    avatarUrl={profile?.avatar_url}
                    colorId={profile?.avatar_color || "green"}
                    iconId={profile?.avatar_icon || "avatar_1"}
                    size="md"
                  />
                )}
              </div>
              <p className="text-sm mt-2">{settleType === "PAY" ? member?.name : "Eu"}</p>
            </div>
          </div>

          {pendingMemberItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">Itens para acertar</Label>
                {settlingMode !== "SINGLE" && (
                  <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-sm h-7 shrink-0">
                    {selectedItems.length === pendingMemberItems.length ? "Desmarcar" : "Selecionar todos"}
                  </Button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {pendingMemberItems.filter(i => settlingMode === "SINGLE" ? selectedItems.includes(i.id) : true).map(item => {
                  const itemTrip = item.tripId ? trips.find(t => t.id === item.tripId) : null;
                  const itemCurrency = itemTrip?.currency || "BRL";
                  const isCredit = item.type === "CREDIT";
                  return (
                    <label key={item.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => onToggleItem(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{dateFns.format(new Date(item.date + 'T12:00:00'), "dd/MM/yyyy")}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn("font-mono text-sm font-medium", isCredit ? "text-green-600" : "text-red-600")}>
                          {getCurrencySymbol(itemCurrency)} {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Data do {settleType === "PAY" ? "Pagamento" : "Recebimento"}</Label>
              <Input type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Conta {isInternationalSettlement && `(${settlementCurrency})`}</Label>
              <Select value={settleAccountId} onValueChange={setSettleAccountId}>
                <SelectTrigger>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={onSettle}
            disabled={isSettling || !settleAccountId}
            className={cn(settleType === "PAY" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700")}
          >
            {isSettling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</> : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
