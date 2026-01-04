import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { avatarColors, avatarIcons, getAvatarColor, getAvatarIcon } from "@/lib/avatars";
import { Check } from "lucide-react";

interface AvatarCustomizerProps {
  currentColor: string;
  currentIcon: string;
  onSave: (color: string, icon: string) => void;
  isSaving?: boolean;
}

export function AvatarCustomizer({ currentColor, currentIcon, onSave, isSaving }: AvatarCustomizerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);

  const color = getAvatarColor(selectedColor);
  const icon = getAvatarIcon(selectedIcon);

  const handleSave = () => {
    onSave(selectedColor, selectedIcon);
  };

  const hasChanges = selectedColor !== currentColor || selectedIcon !== currentIcon;

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex flex-col items-center gap-4 p-6 rounded-xl border border-border bg-muted/30">
        <Label className="text-sm font-medium">Pré-visualização</Label>
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-all duration-200 shadow-lg"
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          {icon.emoji}
        </div>
      </div>

      {/* Color Picker */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Cor de Fundo</Label>
        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
          {avatarColors.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedColor(c.id)}
              className={cn(
                "w-10 h-10 rounded-full transition-all duration-200 hover:scale-110 relative",
                selectedColor === c.id && "ring-2 ring-offset-2 ring-foreground scale-110"
              )}
              style={{ backgroundColor: c.bg }}
              title={c.name}
            >
              {selectedColor === c.id && (
                <Check className="w-5 h-5 absolute inset-0 m-auto" style={{ color: c.text }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Icon Picker */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Ícone</Label>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-lg">
          {avatarIcons.map((i) => (
            <button
              key={i.id}
              onClick={() => setSelectedIcon(i.id)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-all duration-200 hover:bg-muted hover:scale-110",
                selectedIcon === i.id && "bg-primary text-primary-foreground scale-110"
              )}
              title={i.name}
            >
              {i.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? "Salvando..." : "Salvar Avatar"}
        </Button>
      )}
    </div>
  );
}
