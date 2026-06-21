import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssets } from '@/hooks/useAssets';
import { useAccounts } from '@/hooks/useAccounts';
import { Asset } from '@/types/database';
import { BR_BROKERS, ABROAD_BROKERS, getBrokerById, isCustomBroker } from '@/lib/brokers';
import { searchAbroadAssets, AbroadAsset } from '@/lib/abroadAssets';
import { searchCryptoAssets } from '@/lib/cryptoAssets';
import { useB3TickersSearch, B3Ticker } from '@/hooks/useB3TickersSearch';
import { Globe, Building2, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { moneyUtils } from "@/utils/money";

interface AssetFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: Asset | null;
}

const CURRENCIES: { code: string; label: string; symbol: string }[] = [
  { code: 'BRL', label: 'Real Brasileiro', symbol: 'R$' },
  { code: 'USD', label: 'Dólar Americano', symbol: 'US$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'Libra Esterlina', symbol: '£' },
];

const ASSET_TYPES = [
  { value: 'STOCK', label: 'Ações' },
  { value: 'ETF', label: 'ETF' },
  { value: 'FII', label: 'FII - Fundo Imobiliário' },
  { value: 'REIT', label: 'REIT (Exterior)' },
  { value: 'BOND', label: 'Renda Fixa' },
  { value: 'CRYPTO', label: 'Criptomoedas' },
  { value: 'FUND', label: 'Fundo de Investimento' },
  { value: 'OTHER', label: 'Outros' },
];

const SECTORS_BR = [
  'Petróleo e Gás', 'Mineração', 'Bancos', 'Seguros', 'Varejo',
  'Alimentos e Bebidas', 'Papel e Celulose', 'Siderurgia', 'Energia Elétrica',
  'Saneamento', 'Telecomunicações', 'Saúde', 'Educação', 'Tecnologia',
  'Imobiliário', 'Logística', 'Transporte', 'Holdings', 'Índice', 'Criptomoedas', 'Outros',
];

export function AssetFormDialog({ isOpen, onClose, asset }: AssetFormDialogProps) {
  const { createAsset, updateAsset, isCreating, isUpdating } = useAssets();
  const { data: accounts } = useAccounts();

  // Localização e moeda
  const [location, setLocation] = useState<'BR' | 'ABROAD'>('BR');
  const [currency, setCurrency] = useState('BRL');

  // Identificação
  const [type, setType] = useState<Asset['type']>('STOCK');
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [cdiRate, setCdiRate] = useState('');

  // Autocomplete
  const [tickerSearch, setTickerSearch] = useState('');
  const { results: b3Results, isLoading: isSearchingB3 } = useB3TickersSearch(tickerSearch);
  const [suggestions, setSuggestions] = useState<(B3Ticker | AbroadAsset)[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Posição e valor
  const [quantity, setQuantity] = useState('');
  const [investedAmount, setInvestedAmount] = useState(''); // valor total investido
  const [purchaseDate, setPurchaseDate] = useState('');

  // Corretora
  const [brokerId, setBrokerId] = useState('');
  const [customBrokerName, setCustomBrokerName] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('none');

  // PM calculado automaticamente
  const avgPrice = useMemo(() => {
    const qty = moneyUtils.parse(quantity);
    const invested = moneyUtils.parse(investedAmount.replace(',', '.'));
    if (qty > 0 && invested > 0) return moneyUtils.round(invested / qty).toString();
    return null;
  }, [quantity, investedAmount]);

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || 'R$';
  const brokerList = location === 'BR' ? BR_BROKERS : ABROAD_BROKERS;

  // Auto-set currency when location changes
  useEffect(() => {
    if (location === 'ABROAD' && currency === 'BRL') {
      setCurrency('USD');
      setBrokerId(''); // reset corretora ao trocar localização
    } else if (location === 'BR') {
      setCurrency('BRL');
      setBrokerId('');
    }
  }, [location, currency]);

  // Populate form when editing
  useEffect(() => {
    if (asset) {
      setLocation((asset.location as 'BR' | 'ABROAD') || 'BR');
      setCurrency(asset.currency || 'BRL');
      setType(asset.type);
      setTicker(asset.ticker || '');
      setTickerSearch(asset.ticker || '');
      setName(asset.name);
      setSector(asset.sector || '');
      
      const cdiMatch = asset.notes?.match(/(\d+(?:\.\d+)?)%\s*CDI/i) || asset.notes?.match(/CDI:\s*(\d+(?:\.\d+)?)%/i);
      setCdiRate(cdiMatch ? cdiMatch[1] : '');

      setQuantity(asset.quantity?.toString() || '');
      // Reconstruct invested amount from qty * purchase_price
      if (asset.quantity && asset.purchase_price) {
        setInvestedAmount(moneyUtils.round(asset.quantity * asset.purchase_price).toString());
      } else {
        setInvestedAmount('');
      }
      setPurchaseDate(asset.purchase_date || '');
      setBrokerId((asset as any).broker_id || '');
      setCustomBrokerName((asset as any).broker_name || '');
      setLinkedAccountId(asset.account_id || 'none');
    } else {
      resetForm();
    }
  }, [asset, isOpen]);

  const resetForm = () => {
    setLocation('BR');
    setCurrency('BRL');
    setType('STOCK');
    setTicker('');
    setTickerSearch('');
    setName('');
    setSector('');
    setCdiRate('');
    setQuantity('');
    setInvestedAmount('');
    setPurchaseDate('');
    setBrokerId('');
    setCustomBrokerName('');
    setLinkedAccountId('none');
    setSuggestions([]);
  };

  // Ticker autocomplete
  const handleTickerInput = (val: string) => {
    setTickerSearch(val);
    setTicker(val.toUpperCase());
    
    if (val.length >= 2) {
      if (type === 'CRYPTO') {
        const results = searchCryptoAssets(val);
        setSuggestions(results as any[]);
        setShowSuggestions(results.length > 0);
      } else if (location === 'ABROAD') {
        const results = searchAbroadAssets(val);
        setSuggestions(results as any[]);
        setShowSuggestions(results.length > 0);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Effect to sync B3 results with suggestions dropdown when location is BR
  useEffect(() => {
    if (location === 'BR' && type !== 'CRYPTO' && tickerSearch.length >= 2) {
      setSuggestions(b3Results as any[]);
      setShowSuggestions(b3Results.length > 0);
    }
  }, [b3Results, location, type, tickerSearch]);

  const handleSelectSuggestion = (stock: any) => {
    setTicker(stock.ticker);
    setTickerSearch(stock.ticker);
    setName(stock.name);
    setSector(stock.sector || '');
    if (stock.type) {
      // Map B3 type to our enum if possible, or fallback
      const typeStr = stock.type.toUpperCase();
      if (['STOCK', 'FII', 'ETF', 'BDR'].includes(typeStr)) {
        setType(typeStr as any);
      }
    }
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = moneyUtils.parse(quantity) || 0;
    const invested = moneyUtils.parse(investedAmount.replace(',', '.')) || 0;
    const calcAvgPrice = qty > 0 && invested > 0 ? invested / qty : 0;

    const finalBrokerName = isCustomBroker(brokerId) ? customBrokerName :
      (getBrokerById(brokerId)?.name || customBrokerName || null);

    const payload = {
      name,
      type,
      ticker: ticker || null,
      quantity: qty,
      purchase_price: calcAvgPrice,
      current_price: calcAvgPrice, // Preço atual = PM inicial ao cadastrar
      purchase_date: purchaseDate || null,
      account_id: linkedAccountId === 'none' ? null : linkedAccountId,
      location,
      currency,
      sector: sector || null,
      notes: type === 'BOND' && cdiRate ? `CDI: ${cdiRate}%` : '',
      broker_id: brokerId || null,
      broker_name: finalBrokerName,
    } as any;

    if (asset) {
      delete payload.current_price; // não sobrescrever preço atual ao editar
      updateAsset({ id: asset.id, ...payload }, { onSuccess: () => { resetForm(); onClose(); } });
    } else {
      createAsset(payload, { onSuccess: () => { resetForm(); onClose(); } });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="w-full sm:w-[520px] max-w-lg !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-[2rem] !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle className="text-xl font-display font-bold">
            {asset ? 'Editar Ativo' : 'Novo Investimento'}
          </DialogTitle>
          <DialogDescription>
            Registre um ativo na sua carteira de investimentos.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">

          {/* 1. LOCALIZAÇÃO (sempre primeiro - condiciona tudo) */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Onde está custodiado?
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLocation('BR')}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                  location === 'BR'
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <span className="text-2xl">🇧🇷</span>
                <div>
                  <p className="text-sm font-semibold">Brasil</p>
                  <p className="text-[10px] text-muted-foreground">B3 · BRL</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLocation('ABROAD')}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                  location === 'ABROAD'
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-border hover:border-blue-300"
                )}
              >
                <Globe className="w-7 h-7 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Exterior</p>
                  <p className="text-[10px] text-muted-foreground">NYSE · NASDAQ · etc.</p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. MOEDA (visível apenas quando exterior) */}
          {location === 'ABROAD' && (
            <div className="space-y-2">
              <Label>Moeda do Ativo</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.filter(c => c.code !== 'BRL').map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono font-bold">{c.symbol}</span> {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 3. TIPO E TICKER */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Ativo</Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2" ref={tickerRef}>
              <Label>Código (Ticker)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={tickerSearch}
                  onChange={(e) => handleTickerInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder={location === 'BR' ? 'PETR4, VALE3...' : 'AAPL, MSFT...'}
                  className="uppercase font-mono pl-8"
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map(s => (
                      <button
                        key={s.ticker}
                        type="button"
                        onMouseDown={() => handleSelectSuggestion(s)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left transition-colors"
                      >
                        <span className="font-mono font-bold text-sm w-16 shrink-0">{s.ticker}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.sector}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Renda Fixa: Taxa do CDI */}
          {type === 'BOND' && (
            <div className="space-y-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Label className="text-blue-600 dark:text-blue-400 font-bold">Rendimento (% do CDI)</Label>
              <Input type="number" inputMode="decimal"
                value={cdiRate}
                onChange={(e) => setCdiRate(e.target.value)}
                placeholder="Ex: 110"
                className="bg-background"
              />
              <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Opcional. Preencha para calcular o rendimento automático.</p>
            </div>
          )}

          {/* 4. NOME E SETOR */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Ativo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Petrobras PN"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={sector || '_'} onValueChange={v => setSector(v === '_' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Não definido</SelectItem>
                  {SECTORS_BR.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 5. QUANTIDADE + VALOR INVESTIDO → CALCULA PM */}
          <div className="space-y-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label>Quantidade de Cotas</Label>
              <Input type="number" inputMode="decimal"
                step="0.00000001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="font-mono h-12 text-lg text-center"
              />
            </div>
            
            <div className="space-y-2">
              <AmountInput
                label="Valor Investido"
                value={investedAmount}
                onChange={setInvestedAmount}
                currency={currency}
                currencySymbol={currencySymbol}
                size="sm"
              />
              <p className="text-[10px] text-muted-foreground text-center">Total pago pela posição</p>
            </div>

            {/* PM calculado em tempo real */}
            {avgPrice && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <span className="text-xs text-muted-foreground font-medium">Preço Médio calculado:</span>
                <span className="font-mono font-bold text-sm text-foreground">
                  {currencySymbol} {moneyUtils.parse(avgPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          {/* 6. CORRETORA */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              Corretora / Instituição
            </Label>
            <Select value={brokerId} onValueChange={setBrokerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a corretora..." />
              </SelectTrigger>
              <SelectContent>
                {brokerList.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: b.color, color: b.textColor }}
                      >
                        {b.icon}
                      </div>
                      <span>{b.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isCustomBroker(brokerId) && (
              <div className="space-y-1">
                <Label>Nome da corretora (personalizado)</Label>
                <Input
                  value={customBrokerName}
                  onChange={(e) => setCustomBrokerName(e.target.value)}
                  placeholder="Ex: Minha Corretora"
                  required={isCustomBroker(brokerId)}
                />
              </div>
            )}

            {/* Conta bancária vinculada (opcional) */}
            {accounts && accounts.filter(a => a.type !== 'CREDIT_CARD').length > 0 && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Conta bancária vinculada (opcional)</Label>
                <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {accounts
                      .filter(a => a.type !== 'CREDIT_CARD' && (a.currency === currency || (!a.currency && currency === 'BRL')))
                      .map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency || 'BRL'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Vinculando a uma conta, as operações de compra/venda debitarão/creditarão nela.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating} className="flex-1">
              {isCreating || isUpdating ? 'Salvando...' : 'Salvar Ativo'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
