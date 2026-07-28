import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ListChecks, Trash2, UserRound } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AITripSuggestions } from "./AITripSuggestions";
import { EmptyState } from "@/components/ui/empty-state";
import type { Trip } from "@/hooks/useTrips";
import type { TripSuggestion } from "@/services/aiAdvisorService";
import { getErrorMessage } from "./types";
import { useTripMembers } from "@/hooks/useTripMembers";

interface ChecklistItem {
  id: string;
  trip_id: string;
  item: string;
  is_completed: boolean;
  assigned_to: string | null;
  category: string | null;
  order_index: number;
  created_at: string;
}

interface TripChecklistProps {
  trip: Trip;
}

const PRIMARY_CATEGORIES = [
  { value: "documentos_imigracao", label: "Documentos e imigração" },
  { value: "dinheiro_cartoes", label: "Dinheiro e cartões" },
  { value: "roupas", label: "Roupas" },
  { value: "calcados_treino", label: "Calçados e treino" },
  { value: "eletronicos", label: "Eletrônicos" },
  { value: "higiene_saude", label: "Higiene e saúde" },
  { value: "bagagem_mao", label: "Mochila ou bagagem de mão" },
  { value: "mala", label: "Mala" },
  { value: "antes_sair", label: "Antes de sair de casa" },
  { value: "outros", label: "Outros" },
];
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  documentos: "Documentos",
  higiene: "Higiene",
  remedios: "Remédios",
  remédios: "Remédios",
  eletrônicos: "Eletrônicos",
};
const CATEGORY_ORDER = new Map(
  [
    ...PRIMARY_CATEGORIES.map((category) => category.value),
    ...Object.keys(LEGACY_CATEGORY_LABELS),
  ].map((category, index) => [category, index])
);

export function TripChecklist({ trip }: TripChecklistProps) {
  const tripId = trip.id;
  const [showDialog, setShowDialog] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newAssignee, setNewAssignee] = useState("unassigned");
  const [, setIsApplyingAI] = useState(false);

  const queryClient = useQueryClient();
  const { data: members = [] } = useTripMembers(tripId);

  // Fetch checklist items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["trip-checklist", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_checklist")
        .select("*")
        .eq("trip_id", tripId)
        .order("category", { ascending: true })
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as ChecklistItem[];
    },
  });

  // Create mutation
  const createItem = useMutation({
    mutationFn: async (item: {
      trip_id: string;
      item: string;
      category: string | null;
      assigned_to: string | null;
    }) => {
      const { data, error } = await supabase
        .from("trip_checklist")
        .insert({
          ...item,
          is_completed: false,
          order_index: items.length,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
      toast.success("Item adicionado");
      setNewItem("");
      setNewCategory("");
      setNewAssignee("unassigned");
      setShowDialog(false);
    },
    onError: (error) => {
      toast.error("Erro ao adicionar", { description: error.message });
    },
  });

  // Toggle completion mutation
  const toggleItem = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase.from("trip_checklist").update({ is_completed }).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar", { description: error.message });
    },
  });

  // Delete mutation
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_checklist").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
      toast.success("Item removido");
    },
    onError: (error) => {
      toast.error("Erro ao remover", { description: error.message });
    },
  });

  const handleSubmit = () => {
    if (!newItem.trim()) return;
    createItem.mutate({
      trip_id: tripId,
      item: newItem.trim(),
      category: newCategory || null,
      assigned_to: newAssignee === "unassigned" ? null : newAssignee,
    });
  };

  const handleApplyAISuggestions = async (suggestions: TripSuggestion[]) => {
    setIsApplyingAI(true);
    try {
      const promises = suggestions.map((s, idx) => {
        return supabase.from("trip_checklist").insert({
          trip_id: tripId,
          item: s.item || "Item sugerido",
          category: s.category || "outros",
          is_completed: false,
          order_index: items.length + idx,
        });
      });

      await Promise.all(promises);

      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
      toast.success("Sucesso", {
        description: `${suggestions.length} itens adicionados ao checklist.`,
      });
    } catch (error: unknown) {
      toast.error("Erro ao salvar", {
        description: getErrorMessage(error, "Não foi possível salvar as sugestões"),
      });
    } finally {
      setIsApplyingAI(false);
    }
  };

  // Agrupar por categoria
  const groupedItems = items.reduce(
    (acc, item) => {
      const cat = item.category || "outros";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  // Calcular progresso
  const completedCount = items.filter((i) => i.is_completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const assigneeNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.display_name || "Participante"])),
    [members]
  );
  const getCategoryLabel = (category: string) =>
    PRIMARY_CATEGORIES.find((option) => option.value === category)?.label ||
    LEGACY_CATEGORY_LABELS[category] ||
    "Outros";

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Carregando checklist">
        <div className="h-32 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-52 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
          <div className="h-52 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
        </div>
        <span className="sr-only">Carregando checklist</span>
      </div>
    );
  }

  // Estado vazio
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={ListChecks}
          title="Checklist vazio"
          description="Organize o que levar na viagem. Adicione itens manualmente ou deixe a IA sugerir com base no destino."
          action={
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar item
              </Button>
              <AITripSuggestions
                type="checklist"
                destination={trip.destination || trip.name}
                startDate={trip.start_date}
                endDate={trip.end_date}
                onApply={handleApplyAISuggestions}
              />
            </div>
          }
        />

        <ChecklistDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          isLoading={createItem.isPending}
          newItem={newItem}
          setNewItem={setNewItem}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          newAssignee={newAssignee}
          setNewAssignee={setNewAssignee}
          members={members}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
        aria-labelledby="trip-checklist-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Preparação da viagem
            </p>
            <h2 id="trip-checklist-title" className="mt-1 text-xl font-semibold tracking-tight">
              Checklist pré-viagem
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {completedCount} de {items.length} itens concluídos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AITripSuggestions
              type="checklist"
              destination={trip.destination || trip.name}
              startDate={trip.start_date}
              endDate={trip.end_date}
              onApply={handleApplyAISuggestions}
            />
            <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
        <div
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Progresso do checklist"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={completedCount}
          aria-valuetext={`${completedCount} de ${items.length} itens concluídos`}
        >
          <div
            className="h-full rounded-full bg-positive transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {Object.entries(groupedItems)
          .sort(
            ([categoryA], [categoryB]) =>
              (CATEGORY_ORDER.get(categoryA) ?? PRIMARY_CATEGORIES.length) -
              (CATEGORY_ORDER.get(categoryB) ?? PRIMARY_CATEGORIES.length)
          )
          .map(([category, categoryItems]) => {
            const categoryLabel = getCategoryLabel(category);
            const categoryCompleted = categoryItems.filter((item) => item.is_completed).length;
            return (
              <section
                key={category}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                aria-labelledby={`checklist-category-${category}`}
              >
                <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <h3 id={`checklist-category-${category}`} className="font-semibold">
                    {categoryLabel}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {categoryCompleted}/{categoryItems.length}
                  </span>
                </header>
                <div className="divide-y divide-border/50 px-4">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "group flex items-start justify-between gap-3 py-3 transition-colors",
                        item.is_completed && "opacity-65"
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <Checkbox
                          id={`checklist-item-${item.id}`}
                          aria-label={`${item.is_completed ? "Desmarcar" : "Marcar"} ${item.item}`}
                          checked={item.is_completed}
                          disabled={toggleItem.isPending && toggleItem.variables?.id === item.id}
                          className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-muted-foreground/40 data-[state=checked]:border-positive data-[state=checked]:bg-positive data-[state=checked]:text-white"
                          onCheckedChange={async (checked) => {
                            try {
                              await toggleItem.mutateAsync({
                                id: item.id,
                                is_completed: !!checked,
                              });
                            } catch (error: unknown) {
                              toast.error(getErrorMessage(error, "Erro ao atualizar item"));
                            }
                          }}
                        />
                        <label
                          htmlFor={`checklist-item-${item.id}`}
                          className="min-w-0 cursor-pointer"
                        >
                          <span
                            className={cn(
                              "block text-sm font-medium leading-5",
                              item.is_completed && "line-through text-muted-foreground"
                            )}
                          >
                            {item.item}
                          </span>
                          {item.assigned_to && assigneeNames.has(item.assigned_to) && (
                            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <UserRound className="h-3 w-3" aria-hidden="true" />
                              {assigneeNames.get(item.assigned_to)}
                            </span>
                          )}
                        </label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleteItem.isPending && deleteItem.variables === item.id}
                        onClick={async () => {
                          try {
                            await deleteItem.mutateAsync(item.id);
                          } catch (error: unknown) {
                            toast.error(getErrorMessage(error, "Erro ao excluir item"));
                          }
                        }}
                        className="h-8 w-8 shrink-0 text-muted-foreground opacity-70 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        aria-label={`Remover ${item.item}`}
                      >
                        {deleteItem.isPending && deleteItem.variables === item.id ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
      </div>

      {/* Dialog */}
      <ChecklistDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        isLoading={createItem.isPending}
        newItem={newItem}
        setNewItem={setNewItem}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newAssignee={newAssignee}
        setNewAssignee={setNewAssignee}
        members={members}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// Dialog component
function ChecklistDialog({
  open,
  onOpenChange,
  isLoading,
  newItem,
  setNewItem,
  newCategory,
  setNewCategory,
  newAssignee,
  setNewAssignee,
  members,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  newItem: string;
  setNewItem: (v: string) => void;
  newCategory: string;
  setNewCategory: (v: string) => void;
  newAssignee: string;
  setNewAssignee: (v: string) => void;
  members: Array<{ id: string; display_name?: string }>;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-3xl !rounded-b-none sm:!rounded-3xl transition-transform duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Swipe handle */}
        <div className="w-full flex justify-center pt-4 sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <DialogHeader className="px-6 shrink-0">
          <DialogTitle>Novo Item</DialogTitle>
          <DialogDescription>Adicione um item ao checklist</DialogDescription>
        </DialogHeader>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-checklist-item">Item *</Label>
              <Input
                id="new-checklist-item"
                placeholder="Ex: Passaporte"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-checklist-category">Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger id="new-checklist-category" className="h-11">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {PRIMARY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-checklist-assignee">Responsável</Label>
              <Select value={newAssignee} onValueChange={setNewAssignee}>
                <SelectTrigger id="new-checklist-assignee" className="h-11">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.display_name || "Participante"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-border bg-background">
          <Button
            type="button"
            variant="outline"
            className="w-1/2 h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="w-1/2 h-11 font-bold"
            onClick={onSubmit}
            disabled={isLoading || !newItem.trim()}
          >
            {isLoading ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
