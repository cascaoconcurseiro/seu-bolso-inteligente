import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Plus, Calendar, Trash2 } from "lucide-react";
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
      imageUrl:
        "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
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
          <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Diário e memórias da viagem
          </h3>
          <p className="text-sm text-muted-foreground">
            Guarde seus relatos diários, fotos e impressões em um diário visual.
          </p>
        </div>

        <Button className="gap-2" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" /> Nova Memória
        </Button>
      </div>

      <div className="space-y-6">
        {entries.map((entry) => {
          const moodObj = MOOD_OPTIONS.find((m) => m.value === entry.mood);

          return (
            <article
              key={entry.id}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition grid grid-cols-1 md:grid-cols-3 gap-0"
            >
              {entry.imageUrl && (
                <div className="h-48 md:h-full min-h-[180px] relative overflow-hidden bg-muted">
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
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {moodObj?.label || "✨ Memória"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {entry.date}
                      </span>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteEntry(entry.id)}
                      aria-label={`Excluir memória ${entry.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <h4 className="text-xl font-bold text-foreground">{entry.title}</h4>
                  {entry.location && (
                    <span className="text-sm text-primary font-medium">📍 {entry.location}</span>
                  )}

                  <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line leading-relaxed">
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
                <Label htmlFor="journal-date">Data</Label>
                <Input
                  id="journal-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="journal-mood">Sentimento / humor</Label>
                <select
                  id="journal-mood"
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
              <Label htmlFor="journal-title">Título da memória *</Label>
              <Input
                id="journal-title"
                placeholder="Ex: Pôr do sol incrível na praia..."
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="journal-location">Localização (opcional)</Label>
              <Input
                id="journal-location"
                placeholder="Ex: Mirante da Cidade"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="journal-image">URL da foto (opcional)</Label>
              <Input
                id="journal-image"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="journal-content">Seu relato / impressões *</Label>
              <Textarea
                id="journal-content"
                placeholder="Escreva como foi o dia, o que você mais gostou..."
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full">
              Salvar Memória no Diário
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
