import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2 } from "lucide-react";
import { banks, internationalBanks } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";
import { Account } from "@/hooks/useAccounts";
import { moneyUtils } from "@/utils/money";

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  mode: "create" | "edit";
  initialData?: Account | null;
  isLoading?: boolean;
}

const accountTypeLabels: Record<string, string> = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
  CASH: "Dinheiro",
  EMERGENCY_FUND: "Reserva de Emergência",
  GLOBAL_ACCOUNT: "Conta Global",
};

const currencies = [
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" },
  { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" },
  { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" },
  { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" },
  { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" },
  { value: "CNY", label: "CNY - Yuan Chinês", symbol: "¥" },
  { value: "MXN", label: "MXN - Peso Mexicano", symbol: "$" },
  { value: "ARS", label: "ARS - Peso Argentino", symbol: "$" },
  { value: "CLP", label: "CLP - Peso Chileno", symbol: "$" },
  { value: "COP", label: "COP - Peso Colombiano", symbol: "$" },
  { value: "PEN", label: "PEN - Sol Peruano", symbol: "S/" },
  { value: "UYU", label: "UYU - Peso Uruguaio", symbol: "$" },
  { value: "NZD", label: "NZD - Dólar Neozelandês", symbol: "NZ$" },
  { value: "SGD", label: "SGD - Dólar de Singapura", symbol: "S$" },
  { value: "HKD", label: "HKD - Dólar de Hong Kong", symbol: "HK$" },
  { value: "KRW", label: "KRW - Won Sul-Coreano", symbol: "₩" },
  { value: "INR", label: "INR - Rúpia Indiana", symbol: "₹" },
  { value: "THB", label: "THB - Baht Tailandês", symbol: "฿" },
  { value: "ZAR", label: "ZAR - Rand Sul-Africano", symbol: "R" },
  { value: "TRY", label: "TRY - Lira Turca", symbol: "₺" },
  { value: "RUB", label: "RUB - Rublo Russo", symbol: "₽" },
  { value: "PLN", label: "PLN - Zloty Polonês", symbol: "zł" },
  { value: "SEK", label: "SEK - Coroa Sueca", symbol: "kr" },
  { value: "NOK", label: "NOK - Coroa Norueguesa", symbol: "kr" },
  { value: "DKK", label: "DKK - Coroa Dinamarquesa", symbol: "kr" },
  { value: "CZK", label: "CZK - Coroa Tcheca", symbol: "Kč" },
  { value: "HUF", label: "HUF - Forint Húngaro", symbol: "Ft" },
  { value: "ILS", label: "ILS - Shekel Israelense", symbol: "₪" },
  { value: "AED", label: "AED - Dirham dos Emirados", symbol: "د.إ" },
  { value: "SAR", label: "SAR - Riyal Saudita", symbol: "﷼" },
];

export function AccountFormModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  isLoading = false,
}: AccountFormModalProps) {
  // Create state
  const [isInternational, setIsInternational] = useState(false);
  const [bankId, setBankId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [type, setType] = useState<string>("CHECKING");
  const [balance, setBalance] = useState("");
  
  // Shared state
  const [name, setName] = useState("");
  const [hideBalance, setHideBalance] = useState(false);
  const [yieldType, setYieldType] = useState<string>("NONE");
  const [yieldRate, setYieldRate] = useState<string>("100");

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        setName(initialData.name || "");
        setHideBalance(initialData.hide_balance || false);
        setYieldType(initialData.yield_type || "NONE");
        setYieldRate(initialData.yield_rate ? initialData.yield_rate.toString() : "100");
        setIsInternational(initialData.is_international || false);
        setType(initialData.type || "CHECKING");
      } else {
        // Reset create form
        setIsInternational(false);
        setBankId("");
        setCurrency("USD");
        setType("CHECKING");
        setBalance("");
        setName("");
        setHideBalance(false);
        setYieldType("NONE");
        setYieldRate("100");
      }
    }
  }, [isOpen, mode, initialData]);

  const handleSubmit = async () => {
    if (mode === "create") {
      const bank = bankId ? (isInternational ? internationalBanks[bankId] : banks[bankId]) : null;
      const bankName = bank ? bank.name : "";
      
      const defaultName = bankName 
        ? `${bankName} - ${accountTypeLabels[type] || type}` 
        : accountTypeLabels[type] || type;

      const yRate = yieldType !== "NONE" ? moneyUtils.parse(yieldRate) : null;
      const yType = yieldType !== "NONE" ? yieldType : null;

      await onSubmit({
        name: defaultName,
        type,
        bank_id: bankId || null,
        balance: moneyUtils.parse(balance) || 0,
        is_international: isInternational,
        currency: isInternational ? currency : "BRL",
        hide_balance: hideBalance,
        yield_rate: yRate,
        yield_type: yType,
      });
    } else {
      const yRate = yieldType !== "NONE" ? moneyUtils.parse(yieldRate) : null;
      const yType = yieldType !== "NONE" ? yieldType : null;

      await onSubmit({
        name: name.trim(),
        hide_balance: hideBalance,
        yield_type: yType,
        yield_rate: yRate,
      });
    }
  };

  const isFormValid = () => {
    if (mode === "create") {
      return !!bankId;
    }
    return !!name.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova conta" : "Editar conta"}</DialogTitle>
          {mode === "edit" && (
            <DialogDescription>
              Edite as preferências e o nome da sua conta. Para ajustar o saldo, registre uma nova transação.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "create" ? (
            <>
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Conta Internacional</p>
                  </div>
                </div>
                <Switch
                  checked={isInternational}
                  onCheckedChange={(v) => {
                    setIsInternational(v);
                    setBankId("");
                    setType(v ? "GLOBAL_ACCOUNT" : "CHECKING");
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>{isInternational ? "Instituição" : "Banco"}</Label>
                <Select value={bankId} onValueChange={setBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {isInternational
                      ? Object.values(internationalBanks).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            <div className="flex items-center gap-2">
                              <BankIcon bankId={b.id} size="sm" />
                              {b.name}
                            </div>
                          </SelectItem>
                        ))
                      : Object.values(banks)
                          .filter((b) => b.id !== "default")
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              <div className="flex items-center gap-2">
                                <BankIcon bankId={b.id} size="sm" />
                                {b.name}
                              </div>
                            </SelectItem>
                          ))}
                  </SelectContent>
                </Select>
              </div>

              {isInternational && (
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="font-mono text-xs mr-2">{c.symbol}</span>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(isInternational
                      ? [{ v: "GLOBAL_ACCOUNT", l: "Conta Global" }]
                      : [
                          { v: "CHECKING", l: "Conta Corrente" },
                          { v: "SAVINGS", l: "Poupança" },
                          { v: "INVESTMENT", l: "Investimento" },
                          { v: "CASH", l: "Dinheiro" },
                          { v: "EMERGENCY_FUND", l: "Reserva de Emergência" },
                        ]
                    ).map((t) => (
                      <SelectItem key={t.v} value={t.v}>
                        {t.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Saldo inicial</Label>
                <CurrencyInput
                  value={balance}
                  onChange={setBalance}
                  currency={isInternational ? currency : "BRL"}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Nome da Conta</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank Principal"
              />
            </div>
          )}

          {/* Opções de Rendimento para Investimentos/Reserva (Aplica tanto no Create quanto Edit) */}
          {(type === "INVESTMENT" || type === "EMERGENCY_FUND") && !isInternational && (
            <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
              <div className="space-y-2">
                <Label>Rendimento Automático Diário</Label>
                <Select value={yieldType} onValueChange={setYieldType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nenhum</SelectItem>
                    <SelectItem value="CDI">CDI (% do CDI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {yieldType === "CDI" && (
                <div className="space-y-2">
                  <Label>Taxa (%)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={yieldRate}
                    onChange={(e) => setYieldRate(e.target.value)}
                    placeholder="Ex: 100"
                  />
                  <p className="text-xs text-muted-foreground">
                    O rendimento será calculado sobre a taxa global de CDI definida nas Configurações.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 border rounded-xl">
            <div className="space-y-0.5">
              <Label>Ocultar Saldo</Label>
              <p className="text-xs text-muted-foreground">O valor ficará desfocado no painel.</p>
            </div>
            <Switch checked={hideBalance} onCheckedChange={setHideBalance} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid() || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Criar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
