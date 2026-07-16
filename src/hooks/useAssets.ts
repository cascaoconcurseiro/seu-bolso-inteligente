import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Asset, AssetPerformance } from "@/types/database";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

export const useAssets = () => {
  const queryClient = useQueryClient();

  // Buscar todos os investimentos
  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Asset[];
    },
  });

  // Buscar performance de um investimento
  const getAssetPerformance = async (assetId: string) => {
    const { data, error } = await supabase.rpc("get_asset_performance", {
      p_asset_id: assetId,
    });

    if (error) throw error;
    return data as unknown as AssetPerformance[];
  };

  // Criar investimento
  const createAsset = useMutation({
    mutationFn: async (
      asset: Omit<Asset, "id" | "user_id" | "created_at" | "updated_at" | "deleted">
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: assetData, error } = await supabase
        .from("assets")
        .insert([{ ...asset, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      // SE houver conta vinculada e valor investido, gerar transação automática
      if (assetData.account_id && asset.purchase_price && asset.quantity) {
        const totalAmount = asset.purchase_price * asset.quantity;
        const purchaseDate = asset.purchase_date || new Date().toISOString().split("T")[0];
        const competenceDate = `${purchaseDate.substring(0, 7)}-01`;

        // Buscar categoria de Investimentos ou usar uma padrão
        const { data: catData } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", user.id)
          .ilike("name", "%investimento%")
          .limit(1)
          .maybeSingle();

        const { error: txError } = await supabase.from("transactions").insert({
          user_id: user.id,
          creator_user_id: user.id,
          account_id: assetData.account_id,
          type: "EXPENSE",
          amount: totalAmount,
          description: `Compra de Ativo: ${assetData.ticker || assetData.name}`,
          category_id: catData?.id || null,
          date: purchaseDate,
          competence_date: competenceDate,
          domain: "PERSONAL",
          is_shared: false,
          is_installment: false,
          is_recurring: false,
          currency: assetData.currency || "BRL",
          notes: `Compra de ${assetData.quantity} cotas de ${assetData.name}`,
          asset_id: assetData.id,
        });

        if (txError) {
          logger.error("Erro ao gerar transação de ativo:", txError);
          // Não falhamos a criação do ativo se a transação falhar, mas avisamos
        }

        // TAMBÉM INSERE NA asset_transactions PARA MANTER O HISTÓRICO CORRETO
        const { error: assetTxError } = await supabase.from("asset_transactions").insert({
          user_id: user.id,
          asset_id: assetData.id,
          account_id: assetData.account_id,
          type: "BUY",
          quantity: asset.quantity,
          price: asset.purchase_price,
          date: purchaseDate,
        });

        if (assetTxError) {
          logger.error("Erro ao gerar transação de histórico de ativo:", assetTxError);
        }
      }

      return assetData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-transactions"] }); // ADICIONADO
      toast.success("Investimento criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar investimento", { description: error.message });
    },
  });

  // Atualizar investimento
  const updateAsset = useMutation({
    mutationFn: async ({ id, ...asset }: Partial<Asset> & { id: string }) => {
      const { data, error } = await supabase
        .from("assets")
        .update(asset)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Investimento atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar investimento", { description: error.message });
    },
  });

  // Atualizar preço atual
  const updateAssetPrice = useMutation({
    mutationFn: async ({ id, currentPrice }: { id: string; currentPrice: number }) => {
      const { data, error } = await supabase
        .from("assets")
        .update({ current_price: currentPrice })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Preço atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar preço", { description: error.message });
    },
  });

  // Deletar investimento (soft delete)
  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch the asset to know its name/ticker
      const { data: asset, error: fetchError } = await supabase
        .from("assets")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !asset) throw fetchError || new Error("Investimento não encontrado");

      // 2. Delete auto-generated transactions (Efeito Cascata via ON DELETE CASCADE no banco)
      // O banco cuidará da exclusão na tabela transactions via FK asset_id ON DELETE CASCADE
      // e na asset_transactions via FK asset_id ON DELETE CASCADE (se aplicável, mas já temos manual abaixo para garantir).

      // 3. Delete from asset_transactions (Efeito Cascata)
      await supabase.from("asset_transactions").delete().eq("asset_id", id);

      // 4. Finally, delete the asset
      const { error } = await supabase.from("assets").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Investimento excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir investimento", { description: error.message });
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
