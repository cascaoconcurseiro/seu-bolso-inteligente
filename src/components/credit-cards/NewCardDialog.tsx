
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Cartão</DialogTitle>
          <DialogDescription>Adicione um cartão para acompanhar</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Toggle Internacional */}
          <div className="p-4 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Cartão Internacional</p>
                  <p className="text-sm text-muted-foreground">Fatura em moeda estrangeira</p>
                </div>
              </div>
              <Switch 
                checked={isInternational} 
                onCheckedChange={handleInternationalChange} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isInternational ? 'Instituição' : 'Banco'}</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger><SelectValue placeholder={isInternational ? "Selecione a instituição" : "Selecione o banco"} /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {isInternational ? (
                  // Bancos internacionais
                  Object.values(internationalBanks).map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-3">
                        <BankIcon bankId={bank.id} size="sm" />
                        <span>{bank.name}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  // Bancos nacionais
                  Object.values(banks).filter(b => b.id !== 'default').map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-3">
                        <BankIcon bankId={bank.id} size="sm" />
                        <span>{bank.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Moeda (apenas para internacional) */}
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
              <Label>Fechamento</Label>
              <Input type="number" inputMode="decimal" 
                min={1} 
                max={31} 
                placeholder="20"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="number" inputMode="decimal" 
                min={1} 
                max={31} 
                placeholder="28"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={isLoading || !bankId}>
            {isLoading ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

