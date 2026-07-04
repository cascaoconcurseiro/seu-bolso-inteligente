import React, { useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCategory } from "@/hooks/useCategories";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
  parent_category_id: string | null;
}

interface CategorySelectorProps {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  type: "income" | "expense";
  placeholder?: string;
}

export function CategorySelector({
  categories,
  value,
  onValueChange,
  type,
  placeholder = "Selecione uma categoria",
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const { data: profile } = useUserProfile();
  const useSubcategories = profile?.use_subcategories ?? false;

  // Estados para criação rápida de categoria
  const createCategory = useCreateCategory();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🏷️");
  const [newParentId, setNewParentId] = useState<string | null>(null);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const newCat = await createCategory.mutateAsync({
        name: newCatName.trim(),
        type: type,
        icon: newCatIcon,
        parent_category_id: newParentId,
      });
      toast.success("Categoria criada com sucesso!");
      setShowCreateDialog(false);
      setNewCatName("");
      setNewCatIcon("🏷️");
      setNewParentId(null);

      // Auto-seleciona a categoria recém-criada
      if (newCat && newCat.id) {
        onValueChange(newCat.id);
        setOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar categoria");
    }
  };

  // Prevenir scroll da página quando o popover está aberto (mobile)
  React.useEffect(() => {
    if (open) {
      // Salvar posição atual do scroll
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      // Restaurar scroll
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      // Cleanup ao desmontar
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [open]);

  // Validação: se categories não existe ou está vazio, retornar componente vazio
  if (!categories || categories.length === 0) {
    return (
      <Button variant="outline" disabled className="h-12 w-full justify-between font-normal">
        <span className="text-muted-foreground">Carregando categorias…</span>
      </Button>
    );
  }

  // Organizar categorias em hierarquia
  const ALLOWED_EXPENSE_PARENTS = [
    "Supermercado",
    "Restaurantes e Lanches",
    "Delivery",
    "Gasolina",
    "Transporte",
    "Moradia",
    "Contas e Assinaturas",
    "Saúde",
    "Educação",
    "Compras",
    "Lazer",
    "Viagens",
    "Família e Pets",
    "Financeiro",
    "Impostos",
    "Outros",
  ];

  const parents = categories.filter((c) => {
    if (c.parent_category_id) return false;
    if (c.type !== type) return false;
    if (type === "expense") {
      return ALLOWED_EXPENSE_PARENTS.includes(c.name);
    }
    return true;
  });

  const childrenMap = new Map<string, Category[]>();

  categories.forEach((cat) => {
    if (cat.parent_category_id && cat.type === type) {
      if (!childrenMap.has(cat.parent_category_id)) {
        childrenMap.set(cat.parent_category_id, []);
      }
      childrenMap.get(cat.parent_category_id)!.push(cat);
    }
  });

  // Encontrar categoria selecionada
  const selectedCategory = categories.find((c) => c.id === value);
  const selectedParent = selectedCategory?.parent_category_id
    ? categories.find((c) => c.id === selectedCategory.parent_category_id)
    : null;

  const toggleParent = (parentId: string) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId);
    } else {
      newExpanded.add(parentId);
    }
    setExpandedParents(newExpanded);
  };

  const handleSelect = (categoryId: string) => {
    onValueChange(categoryId);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-12 w-full justify-between font-normal"
          >
            {selectedCategory ? (
              <div className="flex items-center gap-2">
                {selectedParent && (
                  <span className="text-muted-foreground text-sm">
                    {selectedParent.icon} {selectedParent.name} /
                  </span>
                )}
                <span>
                  {selectedCategory.icon} {selectedCategory.name}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0"
          align="start"
          onWheel={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
        >
          <div
            className="max-h-[400px] overflow-y-auto p-2 overscroll-contain touch-pan-y"
            style={{
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {parents.map((parent) => {
              const children = childrenMap.get(parent.id) || [];
              const isExpanded = expandedParents.has(parent.id);
              const hasChildren = useSubcategories && children.length > 0;

              return (
                <div key={parent.id} className="mb-1">
                  <div className="flex items-center gap-1">
                    {hasChildren && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleParent(parent.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {!hasChildren && <div className="w-8 shrink-0" />}

                    <button
                      type="button"
                      onClick={() => handleSelect(parent.id)}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                        value === parent.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="text-base">{parent.icon}</span>
                      <span className="flex-1 text-left font-semibold">{parent.name}</span>
                      {value === parent.id && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </div>

                  {/* Subcategorias */}
                  {isExpanded && hasChildren && (
                    <div className="ml-8 mt-1 space-y-2 border-l-2 border-muted pl-2">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleSelect(child.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            value === child.id
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <span className="text-base">{child.icon}</span>
                          <span className="flex-1 text-left">{child.name}</span>
                          {value === child.id && <Check className="h-3 w-3 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-2 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm font-bold justify-center text-primary gap-1"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-3 w-3" />
              Criar Nova Categoria
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px] w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background pb-[env(safe-area-inset-bottom)] overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria para organizar seus lançamentos de{" "}
              {type === "expense" ? "despesas" : "receitas"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                id="new-category-name"
                name="new-category-name"
                placeholder="Ex: Mercado, Aluguel…"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
            </div>

            {useSubcategories && (
              <div className="space-y-2">
                <Label>Categoria Pai (Opcional)</Label>
                <Select
                  value={newParentId || "none"}
                  onValueChange={(v) => setNewParentId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (Principal)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (Principal)</SelectItem>
                    {categories
                      .filter((c) => c.type === type && !c.parent_category_id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-6 gap-2 max-h-[160px] overflow-y-auto p-1 border rounded-lg bg-background">
                {[
                  "🍔",
                  "🍕",
                  "🍜",
                  "🍱",
                  "🍳",
                  "☕",
                  "🍺",
                  "🍷",
                  "🚗",
                  "🚌",
                  "🚇",
                  "✈️",
                  "⛽",
                  "🚕",
                  "🚲",
                  "🛵",
                  "🏠",
                  "🔌",
                  "💡",
                  "🚿",
                  "🛋️",
                  "🧹",
                  "🔧",
                  "🏗️",
                  "💊",
                  "🏥",
                  "🩺",
                  "💉",
                  "🧘",
                  "🏋️",
                  "🦷",
                  "👓",
                  "📚",
                  "🎓",
                  "✏️",
                  "💻",
                  "🎨",
                  "🎵",
                  "📖",
                  "🧠",
                  "🎬",
                  "🎮",
                  "🎭",
                  "🎪",
                  "🏖️",
                  "⚽",
                  "🎾",
                  "🎳",
                  "🛒",
                  "👕",
                  "👗",
                  "👟",
                  "💄",
                  "🎁",
                  "📦",
                  "🛍️",
                  "💰",
                  "💳",
                  "🏦",
                  "📈",
                  "💵",
                  "🪙",
                  "💎",
                  "📊",
                  "💼",
                  "📱",
                  "🖥️",
                  "📧",
                  "📝",
                  "🗂️",
                  "📋",
                  "🔒",
                  "🐕",
                  "🐈",
                  "🐠",
                  "🐦",
                  "🐾",
                  "🦴",
                  "🐶",
                  "🐱",
                  "❤️",
                  "⭐",
                  "🔥",
                  "✨",
                  "🎯",
                  "🏆",
                  "🎉",
                  "📌",
                ].map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    onClick={() => setNewCatIcon(icon)}
                    className={cn(
                      "h-10 w-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors text-lg",
                      newCatIcon === icon && "bg-primary text-primary-foreground border-primary"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createCategory.isPending}>
                {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
