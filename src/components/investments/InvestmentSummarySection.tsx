import { Globe, PieChart, TrendingUp, Coins } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

interface InvestmentSummarySectionProps {
  totalBR: number;
  totalsByCurrency: Record<string, number>;
  brAssetsCount: number;
  abroadAssetsCount: number;
  assetTypesCount: number;
}

const ESTIMATED_RATES: Record<string, number> = {
  'USD': 5.25,
  'EUR': 5.65,
  'GBP': 6.50,
  'BRL': 1.0
};

export function InvestmentSummarySection({
  totalBR,
  totalsByCurrency,
  brAssetsCount,
  abroadAssetsCount,
  assetTypesCount
}: InvestmentSummarySectionProps) {
  
  const totalAbroadInBRL = Object.entries(totalsByCurrency).reduce((sum, [curr, val]) => {
    const rate = ESTIMATED_RATES[curr] || 5.0; // Fallback mais sensato que 5 fixo
    return sum + (val * rate);
  }, 0);

  const totalEquity = totalBR + totalAbroadInBRL;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-down">
      <div className="p-4 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-lg transition-all group">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className="p-1 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
            <Globe className="w-3 h-3 text-blue-500" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.1em]">Brasil (BRL)</span>
        </div>
        <p className="text-xl font-mono font-bold text-foreground">{formatCurrency(totalBR)}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{brAssetsCount} ativos custodiados</p>
      </div>
      
      <div className="p-4 rounded-2xl bg-card border border-border hover:border-purple/20 hover:shadow-lg transition-all group">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className="p-1 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
            <Coins className="w-3 h-3 text-purple-500" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.1em]">Exterior (Moeda)</span>
        </div>
        <div className="space-y-0.5">
          {Object.keys(totalsByCurrency).length > 0 ? (
            Object.entries(totalsByCurrency).map(([curr, val]) => (
              <p key={curr} className="text-sm font-mono font-bold text-foreground">
                {curr} {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            ))
          ) : (
            <p className="text-xl font-mono font-bold text-foreground/40">---</p>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{abroadAssetsCount} ativos internacionais</p>
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border hover:border-green/20 hover:shadow-lg transition-all group">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <div className="p-1 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
            <PieChart className="w-3 h-3 text-green-500" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.1em]">Diversificação</span>
        </div>
        <p className="text-xl font-mono font-bold text-foreground">{assetTypesCount} Classes</p>
        <p className="text-[10px] text-muted-foreground mt-1">Sua carteira está ativa</p>
      </div>

      <div className="relative overflow-hidden p-4 rounded-2xl bg-foreground text-background shadow-xl hover:-translate-y-1 transition-all">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-background/5 rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold tracking-[0.1em]">Patrimônio Total</span>
          </div>
          <p className="text-2xl font-mono font-black tracking-tighter">
            {formatCurrency(totalEquity)}
          </p>
          <p className="text-[10px] opacity-60 mt-1 font-medium italic">Estimativa BRL (Câmbio ref.)</p>
        </div>
      </div>
    </div>
  );
}
