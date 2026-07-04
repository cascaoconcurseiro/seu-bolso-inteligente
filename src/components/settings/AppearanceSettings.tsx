import { Switch } from "@/components/ui/switch";
import { Sun, Moon } from "lucide-react";

interface AppearanceSettingsProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function AppearanceSettings({ isDark, onToggleTheme }: AppearanceSettingsProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-semibold text-lg">Aparência</h2>
        <p className="text-sm text-muted-foreground">Personalize a interface</p>
      </div>
      <div className="space-y-4">
        <div
          className="flex items-center justify-between p-4 rounded-xl border border-border 
                       hover:border-foreground/20 transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-medium">Modo Escuro</p>
              <p className="text-sm text-muted-foreground">Tema claro ou escuro</p>
            </div>
          </div>
          <Switch checked={isDark} onCheckedChange={onToggleTheme} />
        </div>
      </div>
    </div>
  );
}
