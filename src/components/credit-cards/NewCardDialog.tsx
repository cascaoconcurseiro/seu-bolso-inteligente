
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { banks, cardBrands, internationalBanks } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";

// As moedas poderiam vir de um utils compartilhado, mas vou definir as usadas aqui
const currencies = [
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" },
  { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" },
  { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" },
  { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" },
  { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" },
];

// New Card Dialog Component
interface NewCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isLoading: boolean;
  bankId: string;
  setBankId: (v: string) => void;
  customBankName: string;
  setCustomBankName: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  cardName: string;
  setCardName: (v: string) => void;
  closingDay: string;
  setClosingDay: (v: string) => void;
  dueDay: string;
  setDueDay: (v: string) => void;
  limit: string;
  setLimit: (v: string) => void;
  isInternational: boolean;
  setIsInternational: (v: boolean) => void;
  currency: string;
  setCurrency: (v: string) => void;
}

export function NewCardDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  bankId,
  setBankId,
  customBankName,
  setCustomBankName,
  brand,
  setBrand,
  cardName,
  setCardName,
  closingDay,
  setClosingDay,
  dueDay,
  setDueDay,
  limit,
  setLimit,
  isInternational,
  setIsInternational,
  currency,
  setCurrency,
}: NewCardDialogProps) {
  // Reset bank when switching between national/international
  const handleInternationalChange = (checked: boolean) => {
    setIsInternational(checked);
    setBankId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="w-5 h-5 text-primary" />
            Adicionar Novo Cartão
          </DialogTitle>
          <DialogDescription>Cadastre um cartão para acompanhar suas faturas e lançamentos em tempo real.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-5">
          {/* Toggle Internacional */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 transition-all mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Cartão Internacional</p>
                  <p className="text-xs text-muted-foreground">Fatura em moeda estrangeira</p>
                </div>
              </div>
              <Switch checked={isInternational} onCheckedChange={handleInternationalChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Banco Emissor</Label>
            {bankId === "other" && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-medium border border-amber-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>O banco será salvo com o ícone padrão.</span>
              </div>
            )}
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {(isInternational ? Object.values(internationalBanks) : Object.values(banks)).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center gap-2">
                      <BankIcon bankId={b.id} size="sm" />
                      {b.name}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="other" className="text-amber-500 focus:text-amber-500 font-medium border-t mt-1 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-amber-500/10 rounded flex items-center justify-center">
                      <CreditCard className="w-3 h-3" />
                    </div>
                    Outro Banco (Personalizado)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {bankId === "other" && (
              <div className="pt-2 animate-fade-in">
                <Input 
                  placeholder="Ex: Carrefour, C&A, Renner..." 
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  className="border-amber-500/30 focus-visible:ring-amber-500"
                />
              </div>
            )}
          </div>

          {isInternational && (
            <div className="space-y-2">
              <Label>Moeda da Fatura</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs w-6">{curr.symbol}</span>
                        <span>{curr.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Bandeira</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue placeholder="Selecione a bandeira" /></SelectTrigger>
              <SelectContent>
                {Object.values(cardBrands).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-3 rounded flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: b.color }}
                      >
                        {b.icon}
                      </div>
                      {b.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome do cartão (opcional)</Label>
            <Input 
              placeholder="Ex: Cartão Principal"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex justify-between items-center">
                Fechamento
                <span className="text-[10px] text-muted-foreground">(dia 1-31)</span>
              </Label>
              <Input type="number" inputMode="numeric" 
                min={1} 
                max={31} 
                placeholder="Ex: 20"
                className="font-mono text-lg"
                value={closingDay}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setClosingDay('');
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    if (num < 1) setClosingDay("1");
                    else if (num > 31) setClosingDay("31");
                    else setClosingDay(num.toString());
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex justify-between items-center">
                Vencimento
                <span className="text-[10px] text-muted-foreground">(dia 1-31)</span>
              </Label>
              <Input type="number" inputMode="numeric" 
                min={1} 
                max={31} 
                placeholder="Ex: 28"
                className="font-mono text-lg"
                value={dueDay}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setDueDay('');
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    if (num < 1) setDueDay("1");
                    else if (num > 31) setDueDay("31");
                    else setDueDay(num.toString());
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Limite</Label>
            <CurrencyInput 
              placeholder="0,00"
              value={limit}
              onChange={setLimit}
              currency={isInternational ? currency : "BRL"}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-xl h-12" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
            <Button className="flex-1 rounded-xl h-12 font-bold" onClick={onSubmit} disabled={isLoading || !bankId || !closingDay || !dueDay || !limit}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : "Adicionar Cartão"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
