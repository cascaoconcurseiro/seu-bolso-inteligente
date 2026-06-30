import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
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
  CREDIT_CARD: "Cartão de Crédito",
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
  const [isInternational, setIsInternational] = useState(false);
  const [bankId, setBankId] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [type, setType] = useState<string>("CHECKING");
  const [balance, setBalance] = useState("");

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
        setCurrency(initialData.currency || "BRL");

        const isCustomBank = initialData.bank_id?.startsWith("custom:");
        if (isCustomBank) {
          setBankId(initialData.is_international ? "default_international" : "default");
          setCustomBankName(initialData.bank_id!.substring(7));
        } else {
          setBankId(initialData.bank_id || "");
          setCustomBankName("");
        }
      } else {
        setIsInternational(false);
        setBankId("");
        setCustomBankName("");
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
    const isCustom = bankId === "default" || bankId === "default_international";
    const finalBankId =
      isCustom && customBankName.trim() ? `custom:${customBankName.trim()}` : bankId;

    const yRate = yieldType !== "NONE" ? moneyUtils.parse(yieldRate) : null;
    const yType = yieldType !== "NONE" ? yieldType : null;

    if (mode === "create") {
      let bankName = "";
      if (isCustom) {
        bankName = customBankName.trim();
      } else if (finalBankId) {
        const bank = isInternational ? internationalBanks[finalBankId] : banks[finalBankId];
        bankName = bank ? bank.name : "";
      }

      const defaultName = bankName
        ? `${bankName} - ${accountTypeLabels[type] || type}`
        : accountTypeLabels[type] || type;

      // Usa o nome digitado pelo usuário ou o nome gerado automaticamente como fallback
      const finalName = name.trim() || defaultName;

      await onSubmit({
        name: finalName,
        type,
        bank_id: finalBankId || null,
        balance: moneyUtils.parse(balance) || 0,
        is_international: isInternational,
        currency: isInternational ? currency : "BRL",
        hide_balance: hideBalance,
        yield_rate: yRate,
        yield_type: yType,
      });
    } else {
      await onSubmit({
        name: name.trim(),
        hide_balance: hideBalance,
        yield_type: yType,
        yield_rate: yRate,
        bank_id: finalBankId || null,
        type,
        is_international: isInternational,
        currency: isInternational ? currency : "BRL",
      });
    }
  };

  // Pré-preenche o nome quando o banco ou tipo mudam no modo create
  // O usuário pode sobrescrever livremente
  const getAutoName = () => {
    const isCustom = bankId === "default" || bankId === "default_international";
    let bankName = "";
    if (isCustom) {
      bankName = customBankName.trim();
    } else if (bankId) {
      const bank = isInternational ? internationalBanks[bankId] : banks[bankId];
      bankName = bank ? bank.name : "";
    }
    return bankName
      ? `${bankName} - ${accountTypeLabels[type] || type}`
      : accountTypeLabels[type] || type;
  };

  const isFormValid = () => {
    const isCustom = bankId === "default" || bankId === "default_international";
    if (isCustom && !customBankName.trim()) return false;
    if (!bankId) return false;

    if (mode === "create") {
      return true;
    }
    return !!name.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:w-[500px] max-w-lg !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-3xl sm:!rounded-3xl !rounded-b-none sm:!rounded-b-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b">
        <div className="w-full flex justify-center pt-4 pb-2 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-base font-display font-bold">
            {mode === "create" ? "Nova conta" : "Editar conta"}
          </DialogTitle>
          {mode === "edit" && (
            <DialogDescription>
              Edite as preferências e o nome da sua conta. Para ajustar o saldo, registre uma nova
              transação.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="overflow-y-auto hide-scrollbar space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-2xl">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-accent" />
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

          <FormField label={isInternational ? "Instituição" : "Banco"} htmlFor="account-bank">
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger id="account-bank">
                <SelectValue placeholder="Selecione…" />
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
                  : Object.values(banks).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex items-center gap-2">
                          <BankIcon bankId={b.id} size="sm" />
                          {b.name}
                        </div>
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </FormField>

          {(bankId === "default" || bankId === "default_international") && (
            <FormField label="Nome da Instituição" htmlFor="account-custom-bank">
              <Input
                id="account-custom-bank"
                name="account-custom-bank"
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                placeholder="Digite o nome do banco…"
                autoComplete="organization"
              />
            </FormField>
          )}

          {isInternational && (
            <FormField label="Moeda" htmlFor="account-currency">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="account-currency">
                  <SelectValue placeholder="Selecione a moeda…" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="font-mono text-sm mr-2">{c.symbol}</span>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <FormField label="Tipo" htmlFor="account-type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="account-type">
                <SelectValue placeholder="Selecione o tipo…" />
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
          </FormField>

          {mode === "edit" && (
            <FormField label="Nome da Conta" htmlFor="account-name">
              <Input
                id="account-name"
                name="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank Principal…"
                autoComplete="off"
              />
            </FormField>
          )}

          {mode === "create" && (
            <FormField label="Saldo inicial" htmlFor="account-balance">
              <CurrencyInput
                id="account-balance"
                value={balance}
                onChange={setBalance}
                currency={isInternational ? currency : "BRL"}
              />
            </FormField>
          )}

          {(type === "INVESTMENT" || type === "EMERGENCY_FUND") && !isInternational && (
            <div className="space-y-4 p-4 border rounded-2xl bg-muted/20">
              <FormField label="Rendimento Automático Diário" htmlFor="account-yield-type">
                <Select value={yieldType} onValueChange={setYieldType}>
                  <SelectTrigger id="account-yield-type">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nenhum</SelectItem>
                    <SelectItem value="CDI">CDI (% do CDI)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {yieldType === "CDI" && (
                <FormField label="Taxa (%)" htmlFor="account-yield-rate">
                  <Input
                    id="account-yield-rate"
                    name="account-yield-rate"
                    type="number"
                    inputMode="decimal"
                    value={yieldRate}
                    onChange={(e) => setYieldRate(e.target.value)}
                    placeholder="Ex: 100…"
                    autoComplete="off"
                  />
                  <p className="text-sm text-muted-foreground">
                    O rendimento será calculado sobre a taxa global de CDI definida nas
                    Configurações.
                  </p>
                </FormField>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 border rounded-2xl">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Ocultar Saldo</p>
              <p className="text-sm text-muted-foreground">O valor ficará desfocado no painel.</p>
            </div>
            <Switch checked={hideBalance} onCheckedChange={setHideBalance} />
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Criar Conta" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
