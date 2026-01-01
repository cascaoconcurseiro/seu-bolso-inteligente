import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Asset, AssetPerformance } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useAssets = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os investimentos
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Asset[];
    },
  });

  // Buscar performance de um investimento
  const getAssetPerformance = async (assetId: string) => {
    const { data, error } = await supabase.rpc('get_asset_performance', {
      p_asset_id: assetId,
    });

    if (error) throw error;
    return data as AssetPerformance[];
  };

  // Criar investimento
  const createAsset = useMutation({
    mutationFn: async (asset: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('assets')
        .insert([{ ...asset, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast({
        title: 'Investimento criado',
        description: 'Investimento criado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar investimento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar investimento
  const updateAsset = useMutation({
    mutationFn: async ({ id, ...asset }: Partial<Asset> & { id: string }) => {
      const { data, error } = await supabase
        .from('assets')
        .update(asset)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast({
        title: 'Investimento atualizado',
        description: 'Investimento atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar investimento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar preço atual
  const updateAssetPrice = useMutation({
    mutationFn: async ({ id, currentPrice }: { id: string; currentPrice: number }) => {
      const { data, error } = await supabase
        .from('assets')
        .update({ current_price: currentPrice })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast({
        title: 'Preço atualizado',
        description: 'Preço atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar preço',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar investimento (soft delete)
  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assets')
        .update({ deleted: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast({
        title: 'Investimento excluído',
        description: 'Investimento excluído com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir investimento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    assets,
    isLoading,
    getAssetPerformance,
    createAsset: createAsset.mutate,
    updateAsset: updateAsset.mutate,
    updateAssetPrice: updateAssetPrice.mutate,
    deleteAsset: deleteAsset.mutate,
    isCreating: createAsset.isPending,
    isUpdating: updateAsset.isPending,
    isDeleting: deleteAsset.isPending,
  };
};
