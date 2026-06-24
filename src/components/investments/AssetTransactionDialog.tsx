import React, { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAssets } from '@/hooks/useAssets';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { Asset } from '@/types/database';
import { TrendingDown, TrendingUp, RefreshCw, AlertCircle, Info, Coins } from 'lucide-react';
import * as dateFns from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { moneyUtils } from "@/utils/money";
import { logger } from '@/utils/logger';

interface AssetTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
}

const DIVIDEND_TYPES_BY_ASSET: Record<string, { value: string, label: string }[]> = {
  STOCK: [
    { value: 'DIVIDENDOS', label: 'Dividendos' },
    { value: 'JCP', label: 'Juros sobre Capital Próprio (JCP)' },
    { value: 'RESTITUICAO', label: 'Restituição de Capital' },
  ],
  FII: [
    { value: 'RENDIMENTO', label: 'Rendimentos' },
    { value: 'AMORTIZACAO', label: 'Amortização' },
  ],
  BOND: [
    { value: 'JUROS', label: 'Juros' },
    { value: 'AMORTIZACAO', label: 'Amortização' },
    { value: 'RENDIMENTO', label: 'Rendimento' },
  ],
  CRYPTO: [
    { value: 'STAKING', label: 'Staking' },
    { value: 'AIRDROP', label: 'Airdrop' },
  ],
  ETF: [
    { value: 'DIVIDENDOS', label: 'Dividendos' }
  ],
  REIT: [
    { value: 'DIVIDENDOS', label: 'Dividendos' }
  ],
  FUND: [
    { value: 'RENDIMENTO', label: 'Rendimentos' },
    { value: 'AMORTIZACAO', label: 'Amortização' },
  ],
  DEFAULT: [
    { value: 'RENDIMENTO', label: 'Rendimentos' },
    { value: 'DIVIDENDOS', label: 'Dividendos' },
  ]
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  BRL: 'R$',
  USD: 'US$',
  EUR: '€',
  GBP: '£',
};

export function AssetTransactionDialog({ isOpen, onClose, asset }: AssetTransactionDialogProps) {
  const { updateAssetPrice } = useAssets();
  const { data: accounts } = useAccounts();
  const { mutateAsync: createTransaction } = useCreateTransaction();

  const [type, setType] = useState<'buy' | 'sell' | 'update' | 'dividend'>('buy');
  const [dividendType, setDividendType] = useState('RENDIMENTO');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(''); // preço POR COTA executado
  const [accountId, setAccountId] = useState(asset.account_id || '');
  const [opDate, setOpDate] = useState(dateFns.format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default dividendType when asset or dialog opens
  React.useEffect(() => {
    const opts = DIVIDEND_TYPES_BY_ASSET[asset.type] || DIVIDEND_TYPES_BY_ASSET['DEFAULT'];
    setDividendType(opts[0].value);
  }, [asset.type, isOpen]);

  const currency = asset.currency || 'BRL';
  const isAbroad = asset.location === 'ABROAD';
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const currentQty = asset.quantity || 0;
  const currentAvgPrice = asset.purchase_price || 0;

  // ── CÁLCULOS EM TEMPO REAL ────────────────────────────────
  const qty = moneyUtils.parse(quantity) || 0;
  const prc = moneyUtils.parse(price) || 0;
  const totalOp = qty * prc;

  // Simulação do PM após operação
  const simulatedAvgPrice = useMemo(() => {
    if (type === 'buy' && qty > 0 && prc > 0) {
      const newTotalCost = (currentQty * currentAvgPrice) + totalOp;
      const newQty = currentQty + qty;
      return newQty > 0 ? newTotalCost / newQty : 0;
    }
    return currentAvgPrice; // venda não muda PM (FIFO)
  }, [type, qty, prc, currentQty, currentAvgPrice, totalOp]);

  const simulatedQty = useMemo(() => {
    if (type === 'buy') return currentQty + qty;
    if (type === 'sell') return Math.max(0, currentQty - qty);
    return currentQty;
  }, [type, qty, currentQty]);

  // Lucro/Prejuízo na venda
  const sellPnl = useMemo(() => {
    if (type === 'sell' && qty > 0 && prc > 0) {
      return (prc - currentAvgPrice) * qty;
    }
    return null;
  }, [type, qty, prc, currentAvgPrice]);

  // Contas válidas para a operação
  const validAccounts = accounts?.filter(a => {
    if (isAbroad) {
      // Para ativos no exterior, mostrar contas internacionais preferencialmente
      return a.type !== 'CREDIT_CARD';
    }
    return a.type !== 'CREDIT_CARD';
  }) || [];

  const selectedAccount = validAccounts.find(a => a.id === accountId);

  const formatMoney = (val: number) => {
    if (currency === 'BRL') {
      return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
    }
    return `${currencySymbol} ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Atualização de cotação não precisa de conta
    if (type === 'update') {
      if (!prc) return;
      updateAssetPrice({ id: asset.id, currentPrice: prc }, {
        onSuccess: () => { toast.success('Cotação atualizada!'); resetAndClose(); }
      });
      return;
    }

    if (type !== 'dividend') {
      if (!qty || !prc) {
        toast.error('Informe a quantidade e o preço.');
        return;
      }
    } else {
      if (!prc) {
        toast.error('Informe o valor do rendimento recebido.');
        return;
      }
    }

    // Conta é OBRIGATÓRIA para compra/venda/rendimento
    if (!accountId) {
      toast.error('Selecione a conta para débito/crédito da operação.');
      return;
    }

    // Venda: não pode vender mais do que tem
    if (type === 'sell' && qty > currentQty) {
      toast.error(`Você possui apenas ${currentQty} cotas disponíveis para vender.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (type === 'buy') {
        // 1. Criar transação de DESPESA no extrato
        await createTransaction({
          account_id: accountId,
          amount: totalOp,
          description: `Compra ${asset.ticker || asset.name} (${qty}x ${formatMoney(prc)})`,
          date: opDate,
          type: 'EXPENSE',
          domain: 'PERSONAL',
          competence_date: opDate,
        } as any);

        // 2. Registrar no histórico de ativos (O banco atualizará o PM automaticamente)
        await supabase.from('asset_transactions').insert({
          user_id: user.id,
          asset_id: asset.id,
          account_id: accountId,
          type: 'BUY',
          quantity: qty,
          price: prc,
          date: opDate
        });

        toast.success('Compra registrada com sucesso!');
        resetAndClose();

      } else if (type === 'sell') {
        // 1. Criar transação de RECEITA no extrato
        await createTransaction({
          account_id: accountId,
          amount: totalOp,
          description: `Venda ${asset.ticker || asset.name} (${qty}x ${formatMoney(prc)})`,
          date: opDate,
          type: 'INCOME',
          domain: 'PERSONAL',
          competence_date: opDate,
        } as any);

        // 2. Registrar no histórico de ativos
        await supabase.from('asset_transactions').insert({
          user_id: user.id,
          asset_id: asset.id,
          account_id: accountId,
          type: 'SELL',
          quantity: qty,
          price: prc,
          date: opDate
        });

        toast.success('Venda registrada com sucesso!');
        resetAndClose();

      } else if (type === 'dividend') {
        // 1. Buscar categoria de Investimentos ou usar uma padrão
        let categoryId: string | null = null;
        try {
          const { data: catData } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', user.id)
            .ilike('name', '%investimento%')
            .limit(1)
            .maybeSingle();
          if (catData) {
            categoryId = catData.id;
          }
        } catch (catErr) {
          logger.error("Erro ao buscar categoria de investimentos:", catErr);
        }

        // 2. Criar transação de RECEITA no extrato
        const dividendLabel = (DIVIDEND_TYPES_BY_ASSET[asset.type] || DIVIDEND_TYPES_BY_ASSET['DEFAULT']).find(d => d.value === dividendType)?.label || 'Rendimento';
        
        await createTransaction({
          account_id: accountId,
          amount: prc,
          description: `${dividendLabel} - ${asset.ticker || asset.name}`,
          date: opDate,
          type: 'INCOME',
          domain: 'PERSONAL',
          competence_date: opDate,
          category_id: categoryId,
        } as any);

        // 3. Registrar no histórico de ativos (com quantidade fictícia 1 e preço igual ao total recebido)
        await supabase.from('asset_transactions').insert({
          user_id: user.id,
          asset_id: asset.id,
          account_id: accountId,
          type: `DIVIDEND:${dividendType}`,
          quantity: 1,
          price: prc,
          date: opDate
        });

        toast.success('Rendimento registrado com sucesso!');
        resetAndClose();
      }
    } catch (error: any) {
      toast.error(`Erro ao registrar operação: ${error?.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setQuantity('');
    setPrice('');
    setOpDate(dateFns.format(new Date(), 'yyyy-MM-dd'));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-[440px] w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <DialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
          <DialogTitle className="text-base font-display font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm">
              {(asset.ticker || asset.name).substring(0, 3)}
            </div>
            <div>
              <span>{asset.ticker || asset.name}</span>
              <p className="text-sm font-normal text-muted-foreground">{asset.name}</p>
            </div>
          </DialogTitle>
          <DialogDescription>
            PM atual: <span className="font-mono font-semibold">{formatMoney(currentAvgPrice)}</span>
            {' · '} Qtd: <span className="font-mono font-semibold">{currentQty}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2 px-5 pb-5 sm:px-6 sm:pb-6 overflow-y-auto flex-1">
          {/* Tabs de operação */}
          <div className="flex bg-secondary p-1 rounded-xl border border-border overflow-x-auto gap-1 scrollbar-none">
            {[
              { key: 'buy', label: 'Comprar', icon: <TrendingUp className="w-4 h-4 text-success" /> },
              { key: 'sell', label: 'Vender', icon: <TrendingDown className="w-4 h-4 text-destructive" /> },
              { key: 'dividend', label: 'Rendimento', icon: <Coins className="w-4 h-4 text-accent" /> },
              { key: 'update', label: 'Cotação', icon: <RefreshCw className="w-4 h-4 text-accent" /> },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 white-space-nowrap min-w-[80px]",
                  type === t.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Aviso conta obrigatória para compra/venda/rendimento */}
          {type !== 'update' && (
            <Alert className="border-warning/20 bg-warning/8">
              <Info className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm text-warning">
                {type === 'buy' && 'O valor da compra será debitado da conta selecionada.'}
                {type === 'sell' && 'O valor da venda será creditado na conta selecionada.'}
                {type === 'dividend' && 'O valor do rendimento será creditado como receita na conta selecionada.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Campos de Qtd + Preço */}
          {type === 'dividend' ? (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Rendimento</Label>
                <Select value={dividendType} onValueChange={setDividendType}>
                  <SelectTrigger id="dividendType" name="dividendType">
                    <SelectValue placeholder="Selecione o tipo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(DIVIDEND_TYPES_BY_ASSET[asset.type] || DIVIDEND_TYPES_BY_ASSET['DEFAULT']).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-border mt-4">
                <AmountInput
                  label="Valor Total Recebido"
                  value={price}
                  onChange={setPrice}
                  currency={currency}
                  currencySymbol={currencySymbol}
                  size="sm"
                  textColorClass="text-positive"
                />
              </div>
            </div>
          ) : type !== 'update' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" inputMode="decimal"
                  id="quantity" name="quantity"
                  step="0.00000001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Preço por Cota</Label>
                {asset.type === 'CRYPTO' ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                      {currencySymbol}
                    </span>
                    <Input type="number" inputMode="decimal"
                      id="price" name="price"
                      step="0.00000001"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0,00"
                      className="font-mono pl-10"
                      required
                    />
                  </div>
                ) : (
                  <CurrencyInput
                    id="price" name="price"
                    value={price}
                    onChange={setPrice}
                    currency={currency}
                    placeholder="0,00"
                    className="font-mono"
                    required
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Nova Cotação Atual</Label>
              {asset.type === 'CRYPTO' ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                    {currencySymbol}
                  </span>
                  <Input type="number" inputMode="decimal"
                    id="currentPrice" name="currentPrice"
                    step="0.00000001"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0,00"
                    className="font-mono pl-10"
                    required
                  />
                </div>
              ) : (
                <CurrencyInput
                  id="currentPrice" name="currentPrice"
                  value={price}
                  onChange={setPrice}
                  currency={currency}
                  placeholder="0,00"
                  className="font-mono"
                  required
                />
              )}
            </div>
          )}

          {/* Simulação em tempo real */}
          {type !== 'update' && type !== 'dividend' && qty > 0 && prc > 0 && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2 text-sm">
              <p className="text-sm uppercase tracking-wider font-bold text-muted-foreground">Resumo da operação</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total da operação</span>
                <span className="font-mono font-bold">{formatMoney(totalOp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nova quantidade</span>
                <span className="font-mono">{simulatedQty.toFixed(8).replace(/\.?0+$/, '')}</span>
              </div>
              {type === 'buy' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Novo PM</span>
                  <span className="font-mono font-semibold text-foreground">{formatMoney(simulatedAvgPrice)}</span>
                </div>
              )}
              {type === 'sell' && sellPnl !== null && (
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Lucro/Prejuízo</span>
                  <span className={cn("font-mono font-bold", sellPnl >= 0 ? "text-success" : "text-destructive")}>
                    {sellPnl >= 0 ? '+' : ''}{formatMoney(sellPnl)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Data da operação */}
          {type !== 'update' && (
            <div className="space-y-2">
              <Label>Data da Operação</Label>
              <Input
                id="opDate" name="opDate"
                type="date"
                value={opDate}
                onChange={(e) => setOpDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* Conta — OBRIGATÓRIA para compra/venda */}
          {type !== 'update' && (
            <div className="space-y-2">
              <Label>
                Conta para {type === 'buy' ? 'débito' : 'crédito'}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Select value={accountId} onValueChange={setAccountId} required>
                <SelectTrigger className={cn(!accountId && "border-destructive/50")}>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {validAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <span>{acc.name}</span>
                        {acc.is_international && (
                          <span className="text-sm bg-accent/15 text-accent px-1 rounded">
                            {acc.currency}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAbroad && selectedAccount && !selectedAccount.is_international && (
                <p className="text-sm text-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Conta em BRL selecionada. Considere usar uma conta internacional para ativos em {currency}.
                </p>
              )}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" onClick={resetAndClose} className="flex-1">
              Cancelar
            </Button>
             <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1",
                type === 'buy' && "bg-success hover:bg-success/92",
                type === 'sell' && "bg-destructive hover:bg-destructive/92",
                type === 'dividend' && "bg-accent hover:bg-accent/92",
              )}
            >
              {isSubmitting ? 'Processando…' : (
                type === 'buy' ? '✓ Confirmar Compra' :
                type === 'sell' ? '✓ Confirmar Venda' :
                type === 'dividend' ? '✓ Confirmar Rendimento' :
                '✓ Atualizar Cotação'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
