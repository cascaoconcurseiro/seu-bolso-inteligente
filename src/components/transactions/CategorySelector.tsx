import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  console.log('🔍 [CategorySelector] Props:', {
    categoriesLength: categories?.length,
    value,
    type,
    categories: categories?.slice(0, 3) // Primeiras 3 para debug
  });

  // Validação: se categories não existe ou está vazio, retornar componente vazio
  if (!categories || categories.length === 0) {
    console.warn('⚠️ [CategorySelector] Categories vazio ou undefined');
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
  const parents = categories.filter(c => !c.parent_category_id && c.type === type);
  const childrenMap = new Map<string, Category[]>();
  
  categories.forEach(cat => {
    if (cat.parent_category_id && cat.type === type) {
      if (!childrenMap.has(cat.parent_category_id)) {
        childrenMap.set(cat.parent_category_id, []);
      }
      childrenMap.get(cat.parent_category_id)!.push(cat);
    }
  });

  console.log('🔍 [CategorySelector] Hierarquia:', {
    parentsCount: parents.length,
    childrenMapSize: childrenMap.size,
    parents: parents.map(p => ({ id: p.id, name: p.name, type: p.type }))
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
      <PopoverContent className="w-[400px] p-0" align="start">
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {parents.map((parent) => {
              const children = childrenMap.get(parent.id) || [];
              if (children.length === 0) return null;

              const isExpanded = expandedParents.has(parent.id);

              return (
                <div key={parent.id} className="mb-1">
                  {/* Categoria Pai - Clicável para expandir/recolher */}
                  <button
                    onClick={() => toggleParent(parent.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span>{parent.icon}</span>
                    <span>{parent.name}</span>
                    <span className="ml-auto text-xs opacity-60">
                      {children.length}
                    </span>
                  </button>

                  {/* Subcategorias - Mostrar apenas se expandido */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => handleSelect(child.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                            value === child.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <span>{child.icon}</span>
                          <span className="flex-1 text-left">{child.name}</span>
                          {value === child.id && (
                            <Check className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
