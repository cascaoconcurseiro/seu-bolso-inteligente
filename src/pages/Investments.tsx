import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssets } from '@/hooks/useAssets';
import { AssetCard } from '@/components/investments/AssetCard';
import { AssetForm } from '@/components/investments/AssetForm';
import { PortfolioChart } from '@/components/investments/PortfolioChart';
import { Asset } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Investments = () => {
  const { assets, isLoading, createAsset, updateAsset, updateAssetPrice, deleteAsset } = useAssets();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const handleCreate = (asset: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted'>) => {
    createAsset(asset);
    setIsFormOpen(false);
  };

  const handleUpdate = (asset: Partial<Asset> & { id: string }) => {
    updateAsset(asset);
    setEditingAsset(null);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este investimento?')) {
      deleteAsset(id);
    }
  };

  const handleUpdatePrice = (id: string, currentPrice: number) => {
    updateAssetPrice({ id, currentPrice });
  };

  // Calcular totais
  const totalInvested = assets?.reduce((sum, asset) => {
    return sum + ((asset.quantity || 0) * (asset.purchase_price || 0));
  }, 0) || 0;

  const totalCurrent = assets?.reduce((sum, asset) => {
    return sum + ((asset.quantity || 0) * (asset.current_price || 0));
  }, 0) || 0;

  const totalProfitLoss = totalCurrent - totalInvested;
  const profitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">
            Gerencie sua carteira de investimentos
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Investimento
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(totalInvested)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(totalCurrent)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro/Prejuízo</CardTitle>
            {totalProfitLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(totalProfitLoss)}
            </div>
            <p className="text-xs text-muted-foreground">
              {profitLossPercentage.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Alocação */}
      {assets && assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alocação da Carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioChart assets={assets} />
          </CardContent>
        </Card>
      )}

      {/* Lista de Investimentos */}
      {assets && assets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Você ainda não tem investimentos cadastrados
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Investimento
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets?.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdatePrice={handleUpdatePrice}
            />
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Investimento</DialogTitle>
          </DialogHeader>
          <AssetForm
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAsset} onOpenChange={() => setEditingAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Investimento</DialogTitle>
          </DialogHeader>
          {editingAsset && (
            <AssetForm
              asset={editingAsset}
              onSubmit={handleUpdate}
              onCancel={() => setEditingAsset(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
