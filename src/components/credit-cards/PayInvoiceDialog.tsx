import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Wallet, ChevronRight, ArrowLeft, CreditCard } from "lucide-react";
import { BankIcon } from "@/components/financial/BankIcon";
import { moneyUtils } from "@/utils/money";
import { motion, AnimatePresence } from "framer-motion";

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

interface PayInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCardAccount & { currency?: string; is_international?: boolean };
  invoiceTotal: number;
  accounts: unknown[];
  onPay: (fromAccountId: string, amount: number, exchangeRate?: number) => void;
}

export function PayInvoiceDialog({ isOpen, onClose, card, invoiceTotal, accounts, onPay }: PayInvoiceDialogProps) {
  const [step, setStep] = useState(1);
  const [amountToPay, setAmountToPay] = useState(invoiceTotal.toString());
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [showExchangeField, setShowExchangeField] = useState(false);

  React.useEffect(() => {
    if (invoiceTotal > 0 && isOpen && step === 1) {
      setAmountToPay(invoiceTotal.toString());
      setStep(1);
    }
  }, [invoiceTotal, isOpen]);

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

  const handlePay = () => {
    if (needsExchange && exchangeRate) {
      onPay(selectedAccountId, currentAmountToPay, moneyUtils.parse(exchangeRate));
    } else {
      onPay(selectedAccountId, currentAmountToPay);
    }
    setTimeout(() => {
      setStep(1);
    }, 500);
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
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) { onClose(); setTimeout(() => setStep(1), 300); } }}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl rounded-t-[2rem] sm:rounded-2xl">
        <DialogHeader className="p-6 pb-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            {step === 2 && (
              <Button variant="ghost" size="icon" onClick={prevStep} className="h-8 w-8 -ml-2 rounded-full hover:bg-background">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-xl font-display font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Pagamento de Fatura
            </DialogTitle>
            {step === 1 && <div className="w-8" />} {/* Balancer */}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </DialogHeader>
        
        <div className="relative min-h-[350px]">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div 
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 p-6 flex flex-col"
              >
                <div className="flex-1 space-y-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Total da fatura</span>
                    <span className="text-3xl font-display font-bold text-foreground">
                      {formatCurrencyValue(invoiceTotal, cardCurrency)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Qual valor deseja pagar agora?</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-medium">
                        {currencies.find(c => c.value === cardCurrency)?.symbol || (cardCurrency === 'BRL' ? 'R$' : cardCurrency)}
                      </span>
                      <Input type="number" inputMode="decimal"
                        step="0.01"
                        className="pl-12 h-14 font-mono text-xl font-bold bg-background/50 rounded-xl transition-all focus-visible:ring-primary/50 border-white/10"
                        value={amountToPay}
                        onChange={(e) => setAmountToPay(e.target.value)}
                      />
                    </div>
                    {currentAmountToPay < invoiceTotal && currentAmountToPay > 0 && (
                      <p className="text-xs text-amber-500 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        ⚠️ Pagamento parcial: restará {formatCurrencyValue(invoiceTotal - currentAmountToPay, cardCurrency)} para o próximo mês.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={nextStep} 
                    className="w-full h-12 text-md font-semibold rounded-xl shadow-lg shadow-primary/20"
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
                className="absolute inset-0 p-6 flex flex-col"
              >
                <div className="flex-1 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">De onde sairá o dinheiro?</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger className="h-14 rounded-xl bg-background/50 border-white/10">
                        <SelectValue placeholder="Selecione a conta de origem" />
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
                                  <span className="font-medium flex items-center gap-1">
                                    {acc.name}
                                    {acc.is_international && <Globe className="h-3 w-3 text-blue-500" />}
                                  </span>
                                  <span className="text-xs text-muted-foreground flex gap-1">
                                    Saldo: {formatCurrencyValue(acc.balance, accCurrency)}
                                    {willNeedExchange && <span className="text-orange-500 font-medium">(câmbio)</span>}
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
                  </div>

                  {showExchangeField && (
                    <div className="space-y-3 p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 shadow-inner">
                      <div className="flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
                        <Globe className="h-4 w-4" />
                        <span>Conversão de Moeda Necessária</span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Taxa de câmbio ({cardCurrency} → BRL)</Label>
                        <Input type="number" inputMode="decimal"
                          step="0.0001"
                          placeholder="Ex: 5.50"
                          className="h-12 bg-background font-mono"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                        />
                      </div>
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
                    disabled={!selectedAccountId || currentAmountToPay <= 0 || (showExchangeField && !exchangeRate)}
                    className="w-full h-12 text-md font-semibold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                  >
                    <Wallet className="h-5 w-5 mr-2" />
                    Confirmar Pagamento
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
