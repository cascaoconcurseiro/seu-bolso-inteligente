import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Plus, Heart, Image as ImageIcon, Smile, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  imageUrl?: string;
  location?: string;
}

const MOOD_OPTIONS = [
  { label: "🤩 Incrível", value: "amazing" },
  { label: "☕ Relaxante", value: "relaxing" },
  { label: "🧗 Aventura", value: "adventure" },
  { label: "😋 Gastronomia", value: "foodie" },
  { label: "😴 Cansativo", value: "tiring" },
];

export function TripJournalTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: "1",
      date: new Date().toISOString().split("T")[0],
      title: "Chegada Inesquecível ao Destino!",
      content:
        "O voo foi super tranquilo. Logo após fazer check-in no hotel, fomos passear pelas ruas históricas do centro. A comida local superou todas as expectativas!",
      mood: "amazing",
      location: "Centro Histórico",
      imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
    },
  ]);

  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [mood, setMood] = useState("amazing");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date,
      title: title.trim(),
      content: content.trim(),
      mood,
      location: location.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    };

    setEntries([newEntry, ...entries]);
    setShowDialog(false);
    setTitle("");
    setContent("");
    setImageUrl("");
    setLocation("");
    toast.success("Registro adicionado ao seu Diário de Viagem!");
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
    toast.success("Registro removido.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <BookOpen className="h-5 w-5 text-rose-500" />
            Diário & Memórias da Viagem (Journey)
          </h3>
          <p className="text-xs text-slate-500">
            Guarde seus relatas diários, fotos inesquecíveis e impressões em um diário visual estilo revista.
          </p>
        </div>

        <Button
          className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
          onClick={() => setShowDialog(true)}
        >
          <Plus className="h-4 w-4" /> Nova Memória
        </Button>
      </div>

      <div className="space-y-6">
        {entries.map((entry) => {
          const moodObj = MOOD_OPTIONS.find((m) => m.value === entry.mood);

          return (
            <article
              key={entry.id}
              className="bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition grid grid-cols-1 md:grid-cols-3 gap-0"
            >
              {entry.imageUrl && (
                <div className="h-48 md:h-full min-h-[180px] relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                  />
                </div>
              )}

              <div
                className={`p-6 space-y-3 flex flex-col justify-between ${
                  entry.imageUrl ? "md:col-span-2" : "md:col-span-3"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        {moodObj?.label || "✨ Memória"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {entry.date}
                      </span>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-red-500"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {entry.title}
                  </h4>
                  {entry.location && (
                    <span className="text-xs text-rose-500 font-medium">📍 {entry.location}</span>
                  )}

                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 whitespace-pre-line leading-relaxed">
                    {entry.content}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Escrever no Diário de Viagem</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateEntry} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Sentimento / Humor</Label>
                <select
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                >
                  {MOOD_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Título da Memória *</Label>
              <Input
                placeholder="Ex: Pôr do sol incrível na praia..."
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Localização (opcional)</Label>
              <Input
                placeholder="Ex: Mirante da Cidade"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL da Foto (opcional)</Label>
              <Input
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Seu Relato / Impressões *</Label>
              <Textarea
                placeholder="Escreva como foi o dia, o que você mais gostou..."
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white">
              Salvar Memória no Diário
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
