import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Wallet } from "lucide-react";
import { BankIcon } from "@/components/financial/BankIcon";

const currencies = [
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" },
  { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" },
  { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" },
  { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" },
  { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" },
];

type CreditCardAccount = any;

// Pay Invoice Dialog
interface PayInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCardAccount & { currency?: string; is_international?: boolean };
  invoiceTotal: number;
  accounts: unknown[];
  onPay: (fromAccountId: string, exchangeRate?: number) => void;
}

export function PayInvoiceDialog({ isOpen, onClose, card, invoiceTotal, accounts, onPay }: PayInvoiceDialogProps) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [showExchangeField, setShowExchangeField] = useState(false);

  const cardCurrency = card.currency || 'BRL';
  const isInternationalCard = card.is_international || cardCurrency !== 'BRL';

  // Filtrar contas compatíveis
  const compatibleAccounts = (accounts || []).filter(acc => {
    if (isInternationalCard) {
      // Para cartão internacional, mostrar contas na mesma moeda OU contas BRL (com câmbio)
      return acc.currency === cardCurrency || acc.currency === 'BRL' || !acc.currency;
    }
    // Para cartão nacional, mostrar apenas contas BRL
    return !acc.is_international && (acc.currency === 'BRL' || !acc.currency);
  });

  // Verificar se conta selecionada precisa de câmbio
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const needsExchange = isInternationalCard && selectedAccount && 
    (selectedAccount.currency === 'BRL' || (!selectedAccount.currency && !selectedAccount.is_international));

  // Atualizar showExchangeField quando conta muda
  React.useEffect(() => {
    setShowExchangeField(needsExchange);
    if (!needsExchange) {
      setExchangeRate("");
    }
  }, [needsExchange]);

  const formatCurrencyValue = (value: number, currency: string = 'BRL') => {
    const symbol = currencies.find(c => c.value === currency)?.symbol || 
      (currency === 'BRL' ? 'R$' : currency);
    
    if (currency === 'BRL') {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculatedBrlAmount = needsExchange && exchangeRate 
    ? invoiceTotal * parseFloat(exchangeRate) 
    : invoiceTotal;

  const handlePay = () => {
    if (needsExchange && exchangeRate) {
      onPay(selectedAccountId, parseFloat(exchangeRate));
    } else {
      onPay(selectedAccountId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar Fatura</DialogTitle>
          <DialogDescription>
            {isInternationalCard 
              ? `Fatura em ${cardCurrency} - selecione a conta de origem`
              : `Selecione a conta de origem para pagar`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor da fatura</span>
              <div className="text-right">
                <span className="font-mono font-bold text-xl">
                  {formatCurrencyValue(invoiceTotal, cardCurrency)}
                </span>
                {isInternationalCard && (
                  <p className="text-xs text-blue-500">🌍 Cartão Internacional</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Conta de origem</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {compatibleAccounts.map(acc => {
                  const accCurrency = acc.currency || 'BRL';
                  const willNeedExchange = isInternationalCard && accCurrency === 'BRL';
                  
                  return (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <BankIcon bankId={acc.bank_id} size="sm" />
                        <span>{acc.name}</span>
                        {acc.is_international && (
                          <Globe className="h-3 w-3 text-blue-500" />
                        )}
                        <span className="text-muted-foreground ml-auto font-mono text-sm">
                          {formatCurrencyValue(acc.balance, accCurrency)}
                        </span>
                        {willNeedExchange && (
                          <span className="text-xs text-orange-500">(câmbio)</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {compatibleAccounts.length === 0 && (
              <p className="text-sm text-orange-500">
                Nenhuma conta compatível. Crie uma conta em {cardCurrency} ou use uma conta BRL com câmbio.
              </p>
            )}
          </div>

          {/* Campo de câmbio quando necessário */}
          {showExchangeField && (
            <div className="space-y-2 p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <Globe className="h-4 w-4" />
                <span>Pagamento com conversão de moeda</span>
              </div>
              <div className="space-y-2">
                <Label>Taxa de câmbio ({cardCurrency} → BRL)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="Ex: 5.50"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
              </div>
              {exchangeRate && (
                <p className="text-sm text-muted-foreground">
                  Valor em BRL: <span className="font-mono font-semibold">
                    {formatCurrencyValue(calculatedBrlAmount, 'BRL')}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handlePay}
            disabled={!selectedAccountId || invoiceTotal <= 0 || (showExchangeField && !exchangeRate)}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Pagar Fatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
