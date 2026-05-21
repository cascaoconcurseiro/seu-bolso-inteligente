import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface CategorySettingsProps {
  categories: any[];
  isLoading: boolean;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
}

export function CategorySettings({ categories, isLoading, onAddCategory, onDeleteCategory }: CategorySettingsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg">Categorias</h2>
          <p className="text-sm text-muted-foreground">Organize suas transações</p>
        </div>
        <Button onClick={onAddCategory} className="group transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
          Nova
        </Button>
      </div>

      <div className="space-y-4">
      <div className="space-y-6">
        {["expense", "income"].map((type) => {
          const typeCategories = categories.filter(c => c.type === type);
          const parentCategories = typeCategories.filter(c => !c.parent_category_id);
          
          return (
            <div key={type}>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-4 px-1">
                {type === "expense" ? "Despesas" : "Receitas"}
              </h3>
              <div className="space-y-3">
                {parentCategories.map((parent) => {
                  const children = typeCategories.filter(c => c.parent_category_id === parent.id);
                  
                  return (
                    <div key={parent.id} className="space-y-2">
                      {/* Categoria Pai */}
                      <div className="group flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card hover:border-primary/30 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{parent.icon}</span>
                          <span className="font-bold text-sm sm:text-base">{parent.name}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteCategory(parent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Subcategorias (Filhas) */}
                      {children.length > 0 && (
                        <div className="ml-6 pl-4 border-l-2 border-border/40 space-y-2">
                          {children.map((child) => (
                            <div
                              key={child.id}
                              className="group flex items-center justify-between p-2.5 rounded-xl border border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">{child.icon}</span>
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{child.name}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/70 hover:text-destructive"
                                onClick={() => onDeleteCategory(child.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Categorias Órfãs (Sem pai e não são pais de ninguém - caso ocorra erro de dados) */}
                {typeCategories.filter(c => !c.parent_category_id && !parentCategories.find(p => p.id === c.id)).map(orphan => (
                   <div key={orphan.id} className="group flex items-center justify-between p-3 rounded-xl border border-border">
                     <div className="flex items-center gap-3">
                       <span className="text-xl">{orphan.icon}</span>
                       <span className="font-medium">{orphan.name}</span>
                     </div>
                     <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDeleteCategory(orphan.id)}>
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
