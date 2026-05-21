
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as dateFns from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Asset } from '@/types/database';

interface AssetHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
}

export function AssetHistoryDialog({ isOpen, onClose, asset }: AssetHistoryDialogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['asset-transactions', asset.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_transactions')
        .select('*')
        .eq('asset_id', asset.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const formatMoney = (val: number) => {
    return val.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: asset.currency || 'BRL',
      minimumFractionDigits: 2 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Histórico: {asset.ticker || asset.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Carregando histórico...</div>
          ) : history?.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-2xl border-border">
              <p className="text-muted-foreground text-sm">Nenhuma operação registrada para este ativo.</p>
            </div>
          ) : (
            history?.map((tx) => (
              <div key={tx.id} className="p-4 rounded-xl border border-border bg-card/50 flex items-center justify-between group hover:bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    tx.type === 'BUY' ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-red-100 text-red-600 dark:bg-red-900/30"
                  )}>
                    {tx.type === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {tx.type === 'BUY' ? 'Compra' : 'Venda'}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">
                      {dateFns.format(new Date(tx.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-foreground">
                    {tx.quantity} <span className="text-[10px] text-muted-foreground font-sans">unid.</span>
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatMoney(tx.price)} <span className="text-[10px] font-sans">/un</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
