import { useState } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ListChecks, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  tripId: string;
}

const CATEGORIES = [
  { value: "documentos", label: "Documentos" },
  { value: "roupas", label: "Roupas" },
  { value: "higiene", label: "Higiene" },
  { value: "eletronicos", label: "Eletrônicos" },
  { value: "remedios", label: "Remédios" },
  { value: "outros", label: "Outros" },
];

export function TripChecklist({ tripId }: TripChecklistProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    mutationFn: async (item: { trip_id: string; item: string; category: string | null }) => {
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
      toast({ title: "Item adicionado" });
      setNewItem("");
      setNewCategory("");
      setShowDialog(false);
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    },
  });

  // Toggle completion mutation
  const toggleItem = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from("trip_checklist")
        .update({ is_completed })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trip_checklist")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
      toast({ title: "Item removido" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!newItem.trim()) return;
    createItem.mutate({
      trip_id: tripId,
      item: newItem.trim(),
      category: newCategory || null,
    });
  };

  // Agrupar por categoria
  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || "outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Calcular progresso
  const completedCount = items.filter((i) => i.is_completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  // Estado vazio
  if (!isLoading && items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center border border-dashed border-border rounded-xl">
          <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-lg mb-2">Checklist</h3>
          <p className="text-muted-foreground mb-6">Organize o que levar na viagem</p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar item
          </Button>
        </div>

        <ChecklistDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          isLoading={createItem.isPending}
          newItem={newItem}
          setNewItem={setNewItem}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com progresso */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Checklist ({completedCount}/{items.length})
          </h2>
          <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-positive transition-all rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lista agrupada por categoria */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label || "Outros";
          return (
            <div key={category} className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">{categoryLabel}</h3>
              <div className="space-y-1">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border border-border hover:border-foreground/20 transition-colors",
                      item.is_completed && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.is_completed}
                        onCheckedChange={(checked) =>
                          toggleItem.mutate({ id: item.id, is_completed: !!checked })
                        }
                      />
                      <span className={cn(item.is_completed && "line-through text-muted-foreground")}>
                        {item.item}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteItem.mutate(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
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
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  newItem: string;
  setNewItem: (v: string) => void;
  newCategory: string;
  setNewCategory: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Item</DialogTitle>
          <DialogDescription>Adicione um item ao checklist</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Item *</Label>
            <Input
              placeholder="Ex: Passaporte"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isLoading || !newItem.trim()}>
            {isLoading ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
