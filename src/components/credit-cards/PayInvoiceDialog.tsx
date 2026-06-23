import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, Wallet, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AmountInput } from "@/components/ui/amount-input";
import { BankIcon } from "@/components/financial/BankIcon";
import { moneyUtils } from "@/utils/money";

const currencies = [
  { value: "USD", label: "USD - Dólar Americano", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - Libra Esterlina", symbol: "£" },
  { value: "CAD", label: "CAD - Dólar Canadense", symbol: "C$" },
  { value: "AUD", label: "AUD - Dólar Australiano", symbol: "A$" },
  { value: "JPY", label: "JPY - Iene Japonês", symbol: "¥" },
  { value: "CHF", label: "CHF - Franco Suíço", symbol: "CHF" },
];

const getCurrencyFlag = (currency: string) => {
  switch (currency) {
    case 'USD': return '🇺🇸';
    case 'EUR': return '🇪🇺';
    case 'GBP': return '🇬🇧';
    case 'CAD': return '🇨🇦';
    case 'AUD': return '🇦🇺';
    case 'JPY': return '🇯🇵';
    case 'CHF': return '🇨🇭';
    default: return '🇧🇷';
  }
};

type CreditCardAccount = any;

interface PayInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCardAccount & { currency?: string; is_international?: boolean };
  invoiceTotal: number;
  accounts: any[];
  onPay: (fromAccountId: string, amount: number, exchangeRate?: number) => void;
}

export function PayInvoiceDialog({ isOpen, onClose, card, invoiceTotal, accounts, onPay }: PayInvoiceDialogProps) {
  const [step, setStep] = useState(1);
  const [amountToPay, setAmountToPay] = useState(invoiceTotal.toString());
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [showExchangeField, setShowExchangeField] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (invoiceTotal > 0 && isOpen && step === 1) {
      setAmountToPay(invoiceTotal.toString());
      setStep(1);
    }
  }, [invoiceTotal, isOpen, step]);

  const cardCurrency = card.currency || 'BRL';
  const isInternationalCard = card.is_international || cardCurrency !== 'BRL';

  const compatibleAccounts = (accounts || []).filter(acc => {
    if (isInternationalCard) {
      return acc.currency === cardCurrency || acc.currency === 'BRL' || !acc.currency;
    }
    return !acc.is_international && (acc.currency === 'BRL' || !acc.currency);
  });

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const needsExchange = isInternationalCard && selectedAccount && 
    (selectedAccount.currency === 'BRL' || (!selectedAccount.currency && !selectedAccount.is_international));

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

  const currentAmountToPay = moneyUtils.parse(amountToPay) || 0;

  const calculatedBrlAmount = needsExchange && exchangeRate 
    ? currentAmountToPay * moneyUtils.parse(exchangeRate) 
    : currentAmountToPay;

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      if (needsExchange && exchangeRate) {
        await onPay(selectedAccountId, currentAmountToPay, moneyUtils.parse(exchangeRate));
      } else {
        await onPay(selectedAccountId, currentAmountToPay);
      }
      setTimeout(() => {
        setStep(1);
      }, 500);
    } finally {
      setIsProcessing(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  const [direction, setDirection] = useState(1);

  const nextStep = () => {
    setDirection(1);
    setStep(2);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b overflow-hidden bg-background">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-5 pt-2 pb-2 text-left shrink-0 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Pagar Fatura</span>
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <BankIcon bankId={card.bank_id} size="xs" />
                {card.name}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Defina o valor a pagar' : 'Escolha a conta de origem'}
          </DialogDescription>
          <div className="flex gap-2 mt-3">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {step === 1 && (
              <motion.div 
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="p-4 flex flex-col min-h-full"
              >
                <div className="flex-1 space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium text-muted-foreground mb-0.5 uppercase tracking-wider">Total da fatura</span>
                    <span className="text-2xl font-display font-bold text-foreground">
                      {formatCurrencyValue(invoiceTotal, cardCurrency)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <AmountInput
                      label="Qual valor deseja pagar agora?"
                      value={amountToPay}
                      onChange={setAmountToPay}
                      currency={cardCurrency}
                      currencySymbol={currencies.find(c => c.value === cardCurrency)?.symbol || (cardCurrency === 'BRL' ? 'R$' : cardCurrency)}
                      size="md"
                      autoFocus
                    />
                    {currentAmountToPay < invoiceTotal && currentAmountToPay > 0 && (
                      <p className="text-sm text-warning font-medium bg-warning/10 p-2 rounded-lg border border-warning/20">
                        ⚠️ Pagamento parcial: restará {formatCurrencyValue(invoiceTotal - currentAmountToPay, cardCurrency)} para o próximo mês.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-auto shrink-0">
                  <Button 
                    onClick={nextStep} 
                    className="w-full text-md font-semibold rounded-xl shadow-lg shadow-primary/20"
                    disabled={currentAmountToPay <= 0}
                  >
                    Continuar <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="p-4 flex flex-col min-h-full"
              >
                <div className="flex-1 space-y-4">
                  <FormField label="De onde sairá o dinheiro?" htmlFor="pay-account">
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger id="pay-account" className="rounded-xl bg-background/50 border-white/10">
                        <SelectValue placeholder="Selecione a conta de origem…" />
                      </SelectTrigger>
                      <SelectContent>
                        {compatibleAccounts.map(acc => {
                          const accCurrency = acc.currency || 'BRL';
                          const willNeedExchange = isInternationalCard && accCurrency === 'BRL';
                          
                          return (
                            <SelectItem key={acc.id} value={acc.id} className="py-3">
                              <div className="flex items-center gap-3 w-full">
                                <BankIcon bankId={acc.bank_id} size="sm" />
                                <div className="flex flex-col text-left">
                                  <span className="font-medium flex items-center gap-2">
                                    {acc.name}
                                    <span className="text-sm bg-background border border-border/50 px-1 rounded shadow-sm">{getCurrencyFlag(accCurrency)}</span>
                                  </span>
                                  <span className="text-sm text-muted-foreground flex gap-1">
                                    Saldo: {formatCurrencyValue(acc.balance, accCurrency)}
                                    {willNeedExchange && <span className="text-warning font-medium">(câmbio)</span>}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    
                    {compatibleAccounts.length === 0 && (
                      <p className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-lg">
                        Nenhuma conta compatível. Crie uma conta em {cardCurrency} ou use uma conta BRL com câmbio.
                      </p>
                    )}
                  </FormField>

                  {showExchangeField && (
                    <div className="space-y-3 p-4 rounded-xl border border-warning/30 bg-warning/5 shadow-inner">
                      <div className="flex items-center gap-2 text-sm font-semibold text-warning">
                        <Globe className="h-4 w-4" />
                        <span>Conversão de Moeda Necessária</span>
                      </div>
                      <FormField label={`Taxa de câmbio (${cardCurrency} → BRL)`} htmlFor="pay-exchange-rate">
                        <Input type="number" inputMode="decimal"
                          id="pay-exchange-rate"
                          name="pay-exchange-rate"
                          step="0.0001"
                          placeholder="Ex: 5,50…"
                          className="bg-background font-mono"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          autoComplete="off"
                        />
                      </FormField>
                      {exchangeRate && (
                        <div className="flex justify-between items-center pt-2 border-t border-border/50">
                          <span className="text-sm text-muted-foreground">Débito em BRL:</span>
                          <span className="font-mono font-bold text-foreground">
                            {formatCurrencyValue(calculatedBrlAmount, 'BRL')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handlePay}
                    disabled={!selectedAccountId || currentAmountToPay <= 0 || (showExchangeField && !exchangeRate) || isProcessing}
                    className="w-full text-md font-semibold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processando…
                      </>
                    ) : (
                      <>
                        <Wallet className="h-5 w-5 mr-2" />
                        Confirmar Pagamento
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
