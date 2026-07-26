import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Luggage, Plus, Scale, Trash2, User } from "lucide-react";
import { toast } from "sonner";

export interface Bag {
  id: string;
  name: string;
  ownerName: string;
  maxWeightKg: number;
  currentWeightKg: number;
  type: "hand" | "checked" | "backpack";
}

export function TripBagTracker() {
  const [bags, setBags] = useState<Bag[]>([
    {
      id: "1",
      name: "Mala de Mão",
      ownerName: "Passageiro 1",
      maxWeightKg: 10,
      currentWeightKg: 7.5,
      type: "hand",
    },
    {
      id: "2",
      name: "Mala Despachada Porão",
      ownerName: "Passageiro 1",
      maxWeightKg: 23,
      currentWeightKg: 19.2,
      type: "checked",
    },
  ]);

  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [maxWeightKg, setMaxWeightKg] = useState("10");
  const [currentWeightKg, setCurrentWeightKg] = useState("0");
  const [type, setType] = useState<"hand" | "checked" | "backpack">("hand");

  const handleAddBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newBag: Bag = {
      id: Date.now().toString(),
      name: name.trim(),
      ownerName: ownerName.trim() || "Passageiro",
      maxWeightKg: parseFloat(maxWeightKg) || 10,
      currentWeightKg: parseFloat(currentWeightKg) || 0,
      type,
    };

    setBags([...bags, newBag]);
    setShowDialog(false);
    setName("");
    setOwnerName("");
    setMaxWeightKg("10");
    setCurrentWeightKg("0");
    toast.success("Mala cadastrada no rastreador!");
  };

  const handleDeleteBag = (id: string) => {
    setBags(bags.filter((b) => b.id !== id));
    toast.success("Mala removida.");
  };

  const handleUpdateWeight = (id: string, weight: number) => {
    setBags(
      bags.map((b) => (b.id === id ? { ...b, currentWeightKg: Math.max(0, weight) } : b))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Luggage className="h-5 w-5 text-sky-600" />
            Controle & Rastreamento de Peso de Malas
          </h3>
          <p className="text-xs text-slate-500">
            Monitore o peso das bagagens de mão e despachadas para evitar taxas no aeroporto.
          </p>
        </div>

        <Button
          className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
          onClick={() => setShowDialog(true)}
        >
          <Plus className="h-4 w-4" /> Nova Bagagem
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bags.map((bag) => {
          const percent = Math.min(100, Math.round((bag.currentWeightKg / bag.maxWeightKg) * 100));
          const isOver = bag.currentWeightKg > bag.maxWeightKg;
          const isWarning = percent >= 85 && !isOver;

          return (
            <div
              key={bag.id}
              className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-3 shadow-sm hover:shadow transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                    {bag.type === "hand" ? "🎒 Bagagem de Mão" : bag.type === "checked" ? "🧳 Mala Despachada" : "🎒 Mochila"}
                  </span>
                  <h4 className="font-bold text-base mt-1 text-slate-800 dark:text-slate-100">
                    {bag.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <User className="h-3 w-3" /> {bag.ownerName}
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-slate-400 hover:text-red-500"
                  onClick={() => handleDeleteBag(bag.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>Peso Atual / Limite:</span>
                  <span
                    className={
                      isOver
                        ? "text-red-600 font-bold"
                        : isWarning
                        ? "text-amber-600 font-bold"
                        : "text-slate-700 dark:text-slate-300 font-semibold"
                    }
                  >
                    {bag.currentWeightKg.toFixed(1)} kg / {bag.maxWeightKg} kg ({percent}%)
                  </span>
                </div>

                <Progress
                  value={percent}
                  className={`h-2.5 ${
                    isOver ? "bg-red-100 [&>div]:bg-red-600" : isWarning ? "bg-amber-100 [&>div]:bg-amber-500" : "bg-sky-100 [&>div]:bg-sky-600"
                  }`}
                />

                {isOver && (
                  <p className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/60 p-1.5 rounded border border-red-200 dark:border-red-800 text-center">
                    ⚠️ Atenção: Limite excedido em {(bag.currentWeightKg - bag.maxWeightKg).toFixed(1)} kg!
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t text-xs">
                <Scale className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-500">Ajustar Peso:</span>
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 w-24 text-xs"
                  value={bag.currentWeightKg}
                  onChange={(e) => handleUpdateWeight(bag.id, parseFloat(e.target.value) || 0)}
                />
                <span className="text-slate-400">kg</span>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Mala</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddBag} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da Mala</Label>
              <Input
                placeholder="Ex: Mala Rigida Azul Samsonite"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Dono da Bagagem</Label>
              <Input
                placeholder="Ex: Nome do Passageiro"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Limite (kg)</Label>
                <Input
                  type="number"
                  step="0.5"
                  required
                  value={maxWeightKg}
                  onChange={(e) => setMaxWeightKg(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Peso Atual (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={currentWeightKg}
                  onChange={(e) => setCurrentWeightKg(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white">
              Cadastrar Mala
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
