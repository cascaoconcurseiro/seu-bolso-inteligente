import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  type: "expense" | "income";
  color: string | null;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  type: "expense" | "income";
  color?: string;
}

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
    retry: false, // Não tentar novamente se falhar
    staleTime: 300000, // Cache por 5 minutos (categorias mudam pouco)
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria criada!");
    },
    onError: (error) => {
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover categoria: " + error.message);
    },
  });
}

// Criar categorias padrão para um novo usuário
export function useCreateDefaultCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const defaultCategories: CreateCategoryInput[] = [
        // ALIMENTAÇÃO
        { name: "Supermercado", icon: "🛒", type: "expense" },
        { name: "Restaurante", icon: "🍽️", type: "expense" },
        { name: "Lanche", icon: "🍔", type: "expense" },
        { name: "Delivery", icon: "🍕", type: "expense" },
        { name: "Padaria", icon: "🥖", type: "expense" },
        { name: "Café", icon: "☕", type: "expense" },
        { name: "Bar", icon: "🍺", type: "expense" },
        
        // MORADIA
        { name: "Aluguel", icon: "🏠", type: "expense" },
        { name: "Condomínio", icon: "🏢", type: "expense" },
        { name: "Água", icon: "💧", type: "expense" },
        { name: "Luz", icon: "💡", type: "expense" },
        { name: "Gás", icon: "🔥", type: "expense" },
        { name: "Internet", icon: "🌐", type: "expense" },
        { name: "Telefone", icon: "📱", type: "expense" },
        { name: "IPTU", icon: "🏘️", type: "expense" },
        { name: "Manutenção", icon: "🔧", type: "expense" },
        { name: "Móveis", icon: "🛋️", type: "expense" },
        { name: "Decoração", icon: "🖼️", type: "expense" },
        
        // TRANSPORTE
        { name: "Combustível", icon: "⛽", type: "expense" },
        { name: "Uber/Taxi", icon: "🚕", type: "expense" },
        { name: "Ônibus", icon: "🚌", type: "expense" },
        { name: "Metrô", icon: "🚇", type: "expense" },
        { name: "Estacionamento", icon: "🅿️", type: "expense" },
        { name: "Pedágio", icon: "🛣️", type: "expense" },
        { name: "Manutenção Veículo", icon: "🔧", type: "expense" },
        { name: "IPVA", icon: "🚗", type: "expense" },
        { name: "Seguro Veículo", icon: "🛡️", type: "expense" },
        
        // SAÚDE
        { name: "Plano de Saúde", icon: "🏥", type: "expense" },
        { name: "Médico", icon: "👨‍⚕️", type: "expense" },
        { name: "Dentista", icon: "🦷", type: "expense" },
        { name: "Farmácia", icon: "💊", type: "expense" },
        { name: "Exames", icon: "🔬", type: "expense" },
        { name: "Academia", icon: "💪", type: "expense" },
        { name: "Terapia", icon: "🧠", type: "expense" },
        
        // EDUCAÇÃO
        { name: "Mensalidade", icon: "🎓", type: "expense" },
        { name: "Curso", icon: "📚", type: "expense" },
        { name: "Livros", icon: "📖", type: "expense" },
        { name: "Material Escolar", icon: "✏️", type: "expense" },
        { name: "Idiomas", icon: "🗣️", type: "expense" },
        
        // LAZER E ENTRETENIMENTO
        { name: "Cinema", icon: "🎬", type: "expense" },
        { name: "Streaming", icon: "📺", type: "expense" },
        { name: "Jogos", icon: "🎮", type: "expense" },
        { name: "Shows", icon: "🎵", type: "expense" },
        { name: "Esportes", icon: "⚽", type: "expense" },
        { name: "Hobbies", icon: "🎨", type: "expense" },
        { name: "Parque", icon: "🎡", type: "expense" },
        
        // COMPRAS
        { name: "Roupas", icon: "👕", type: "expense" },
        { name: "Calçados", icon: "👟", type: "expense" },
        { name: "Acessórios", icon: "👜", type: "expense" },
        { name: "Eletrônicos", icon: "📱", type: "expense" },
        { name: "Cosméticos", icon: "💄", type: "expense" },
        { name: "Presentes", icon: "🎁", type: "expense" },
        
        // PETS
        { name: "Veterinário", icon: "🐕", type: "expense" },
        { name: "Ração", icon: "🦴", type: "expense" },
        { name: "Pet Shop", icon: "🐾", type: "expense" },
        
        // SERVIÇOS PESSOAIS
        { name: "Cabeleireiro", icon: "💇", type: "expense" },
        { name: "Manicure", icon: "💅", type: "expense" },
        { name: "Barbeiro", icon: "✂️", type: "expense" },
        { name: "Lavanderia", icon: "🧺", type: "expense" },
        
        // FINANCEIRO
        { name: "Investimentos", icon: "📈", type: "expense" },
        { name: "Seguros", icon: "🛡️", type: "expense" },
        { name: "Taxas Bancárias", icon: "🏦", type: "expense" },
        { name: "Empréstimo", icon: "💳", type: "expense" },
        { name: "Doações", icon: "❤️", type: "expense" },
        
        // VIAGEM
        { name: "Passagem Aérea", icon: "✈️", type: "expense" },
        { name: "Hotel", icon: "🏨", type: "expense" },
        { name: "Hospedagem", icon: "🛏️", type: "expense" },
        { name: "Turismo", icon: "🗺️", type: "expense" },
        
        // OUTROS
        { name: "Outros", icon: "📦", type: "expense" },
        
        // ===== RECEITAS =====
        
        // TRABALHO
        { name: "Salário", icon: "💰", type: "income" },
        { name: "Freelance", icon: "💻", type: "income" },
        { name: "Bônus", icon: "🎯", type: "income" },
        { name: "Comissão", icon: "💼", type: "income" },
        { name: "13º Salário", icon: "💵", type: "income" },
        { name: "Férias", icon: "🏖️", type: "income" },
        { name: "Hora Extra", icon: "⏰", type: "income" },
        
        // INVESTIMENTOS
        { name: "Dividendos", icon: "📈", type: "income" },
        { name: "Juros", icon: "💹", type: "income" },
        { name: "Aluguel Recebido", icon: "🏠", type: "income" },
        { name: "Venda de Ações", icon: "📊", type: "income" },
        
        // OUTROS
        { name: "Presente Recebido", icon: "🎁", type: "income" },
        { name: "Reembolso", icon: "💳", type: "income" },
        { name: "Prêmio", icon: "🏆", type: "income" },
        { name: "Venda", icon: "🏷️", type: "income" },
        { name: "Outros", icon: "💵", type: "income" },
      ];

      const { error } = await supabase.from("categories").insert(
        defaultCategories.map((cat) => ({
          user_id: user.id,
          ...cat,
        }))
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
