import { Edit, Trash2, Clock, ArrowRightLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Asset } from '../../types/database';
import { getBrokerById } from '@/lib/brokers';

interface AssetCardProps {
  asset: Asset;
  index: number;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onShowHistory: (asset: Asset) => void;
  onTransact: (asset: Asset) => void;
  formatAssetValue: (value: number, currency: string) => string;
}

export function AssetCard({ 
  asset, 
  index, 
  onEdit, 
  onDelete, 
  onShowHistory, 
  onTransact,
  formatAssetValue
}: AssetCardProps) {
  const totalInvested = (asset.quantity || 0) * (asset.purchase_price || 0);
  const currentValue = (asset.quantity || 0) * ((asset.current_price && asset.current_price > 0) ? asset.current_price : asset.purchase_price || 0);
  const pnl = currentValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
  const isPositive = pnl >= 0;
  const hasCurrentPrice = asset.current_price && asset.current_price > 0;

  return (
    <div 
      className={cn(
        "bg-card border border-border p-6 rounded-2xl relative overflow-hidden group hover-lift card-animated animate-stagger",
        `stagger-${(index % 5) + 1}`
      )}
    >
      <div className="absolute top-2 right-2 p-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" onClick={() => onEdit(asset)} className="h-8 w-8">
          <Edit className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(asset)} className="h-8 w-8 hover:text-destructive">
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-foreground font-display font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
          {asset.ticker ? asset.ticker.substring(0, 2) : asset.type.substring(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-display font-bold text-foreground leading-tight truncate">{asset.ticker || asset.name}</h3>
            <span className={cn(
              "text-[8px] px-1.5 py-0.5 rounded-full font-bold tracking-tighter uppercase",
              asset.location === 'BR' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            )}>
              {asset.location}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            {asset.type} {asset.sector && <span className="opacity-50">• {asset.sector}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1.5">
            Valor Total
            {asset.ticker && (
              <span className="relative flex h-2 w-2" title="Cotação em tempo real">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </p>
          <p className="text-xl font-mono font-bold text-foreground">
            {formatAssetValue(currentValue, asset.currency || 'BRL')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Retorno</p>
          {!hasCurrentPrice ? (
            <p className="text-xs text-muted-foreground font-medium mt-1">Aguardando API</p>
          ) : (
            <div className="flex flex-col items-end">
              <p className={cn(
                "text-sm font-mono font-bold",
                isPositive ? "text-green-500" : "text-red-500"
              )}>
                {isPositive ? '+' : ''}{formatAssetValue(pnl, asset.currency || 'BRL')}
              </p>
              <p className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-sm mt-0.5",
                isPositive ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}>
                {isPositive ? '▲' : '▼'} {Math.abs(pnlPercent).toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
        <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            Qtd: <span className="text-foreground font-medium font-mono">{(asset.quantity || 0).toFixed(8).replace(/\.?0+$/, '')}</span>
            <span className="opacity-30">·</span>
            PM: <span className="text-foreground font-medium font-mono">{formatAssetValue(asset.purchase_price || 0, asset.currency || 'BRL')}</span>
          </div>
          {((asset as any).broker_name || (asset as any).broker_id) && (
            <span className="text-[9px] opacity-60">
              {(asset as any).broker_name || getBrokerById((asset as any).broker_id)?.shortName}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => onShowHistory(asset)}
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            title="Ver histórico"
          >
            <Clock className="w-4 h-4" />
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            onClick={() => onTransact(asset)}
            className="gap-1.5 h-8 px-3 text-xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Operar
          </Button>
        </div>
      </div>
    </div>
  );
}
