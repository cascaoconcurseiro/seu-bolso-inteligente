import React, { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  type: 'income' | 'expense';
  placeholder?: string;
}

export function CategorySelector({
  categories,
  value,
  onValueChange,
  type,
  placeholder = "Selecione uma categoria"
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const { data: profile } = useUserProfile();
  const useSubcategories = profile?.use_subcategories ?? false;

  // Prevenir scroll da página quando o popover está aberto (mobile)
  React.useEffect(() => {
    if (open) {
      // Salvar posição atual do scroll
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restaurar scroll
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      // Cleanup ao desmontar
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [open]);

  // Validação: se categories não existe ou está vazio, retornar componente vazio
  if (!categories || categories.length === 0) {
    return (
      <Button
        variant="outline"
        disabled
        className="h-12 w-full justify-between font-normal"
      >
        <span className="text-muted-foreground">Carregando categorias...</span>
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
    "Impostos e Taxas",
    "Outros"
  ];

  const parents = categories.filter(c => {
    if (c.parent_category_id) return false;
    if (c.type !== type) return false;
    if (type === 'expense') {
      return ALLOWED_EXPENSE_PARENTS.includes(c.name);
    }
    return true;
  });

  const childrenMap = new Map<string, Category[]>();
  
  categories.forEach(cat => {
    if (cat.parent_category_id && cat.type === type) {
      if (!childrenMap.has(cat.parent_category_id)) {
        childrenMap.set(cat.parent_category_id, []);
      }
      childrenMap.get(cat.parent_category_id)!.push(cat);
    }
  });

  // Encontrar categoria selecionada
  const selectedCategory = categories.find(c => c.id === value);
  const selectedParent = selectedCategory?.parent_category_id 
    ? categories.find(c => c.id === selectedCategory.parent_category_id)
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
                <span className="text-muted-foreground text-xs">
                  {selectedParent.icon} {selectedParent.name} /
                </span>
              )}
              <span>{selectedCategory.icon} {selectedCategory.name}</span>
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
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
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
                    <span className="text-lg">{parent.icon}</span>
                    <span className="flex-1 text-left font-semibold">{parent.name}</span>
                    {value === parent.id && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                </div>

                {/* Subcategorias */}
                {isExpanded && hasChildren && (
                  <div className="ml-8 mt-1 space-y-1 border-l-2 border-muted pl-2">
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
                        {value === child.id && (
                          <Check className="h-3 w-3 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
