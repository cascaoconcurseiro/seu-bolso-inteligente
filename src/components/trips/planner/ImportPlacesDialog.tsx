import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, MapPin, Check, FileCode, Link as LinkIcon } from "lucide-react";
import { parseGPX, parseKML, parseGeoJSON, type ParsedPlace } from "@/utils/gpxKmlParser";
import { parseGoogleMapsPlaceName, geocodeDestination } from "@/services/overpassService";
import { toast } from "sonner";

interface ImportPlacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportPlaces: (places: ParsedPlace[]) => void;
}

export function ImportPlacesDialog({
  open,
  onOpenChange,
  onImportPlaces,
}: ImportPlacesDialogProps) {
  const [linksText, setLinksText] = useState("");
  const [parsedPlaces, setParsedPlaces] = useState<ParsedPlace[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"links" | "file">("links");

  const handleParseLinks = async () => {
    if (!linksText.trim()) return;
    setIsProcessing(true);

    const lines = linksText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const results: ParsedPlace[] = [];

    for (const line of lines) {
      const placeName = parseGoogleMapsPlaceName(line);
      if (placeName) {
        const coords = await geocodeDestination(placeName);
        results.push({
          title: placeName,
          description: `Importado via link: ${line}`,
          latitude: coords?.lat || 0,
          longitude: coords?.lon || 0,
        });
      } else if (line.length > 2) {
        // Trata texto puro como nome de lugar
        const coords = await geocodeDestination(line);
        results.push({
          title: line,
          description: "Importado via texto",
          latitude: coords?.lat || 0,
          longitude: coords?.lon || 0,
        });
      }
    }

    setParsedPlaces(results);
    setIsProcessing(false);
    if (results.length > 0) {
      toast.success(`${results.length} local(is) identificados!`);
    } else {
      toast.error("Nenhum local foi encontrado no texto fornecido.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      let extracted: ParsedPlace[] = [];
      const filename = file.name.toLowerCase();

      if (filename.endsWith(".gpx")) {
        extracted = parseGPX(content);
      } else if (filename.endsWith(".kml")) {
        extracted = parseKML(content);
      } else if (filename.endsWith(".json") || filename.endsWith(".geojson")) {
        extracted = parseGeoJSON(content);
      }

      setParsedPlaces(extracted);
      if (extracted.length > 0) {
        toast.success(`${extracted.length} local(is) extraídos do arquivo!`);
      } else {
        toast.error("Formato de arquivo não reconhecido ou sem pontos válidos.");
      }
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedPlaces.length === 0) return;
    onImportPlaces(parsedPlaces);
    onOpenChange(false);
    setParsedPlaces([]);
    setLinksText("");
    toast.success("Locais adicionados ao roteiro!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-sky-600" />
            Importar Locais para o Roteiro
          </DialogTitle>
          <DialogDescription>
            Importe locais colando links do Google Maps ou enviando arquivos GPX / KML / GeoJSON.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "links" | "file")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="links" className="gap-2">
              <LinkIcon className="h-4 w-4" /> Links do Google Maps
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-2">
              <FileCode className="h-4 w-4" /> Arquivos GPX / KML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cole URLs do Google Maps ou nomes de locais (um por linha)</Label>
              <Textarea
                placeholder="https://maps.app.goo.gl/...\nCristo Redentor, Rio de Janeiro\nhttps://www.google.com/maps/place/..."
                rows={5}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
              onClick={handleParseLinks}
              disabled={isProcessing || !linksText.trim()}
            >
              {isProcessing ? "Analisando Links..." : "Analisar Links"}
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 py-2">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
              <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Clique para selecionar ou arraste arquivos GPX, KML ou GeoJSON
              </p>
              <p className="text-xs text-slate-500 mt-1">Exportados de mapas de trilha ou GPS</p>
              <input
                type="file"
                accept=".gpx,.kml,.json,.geojson"
                className="mt-4 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                onChange={handleFileUpload}
              />
            </div>
          </TabsContent>
        </Tabs>

        {parsedPlaces.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Prévia ({parsedPlaces.length} locais)
              </span>
              <Button size="sm" variant="ghost" onClick={() => setParsedPlaces([])}>
                Limpar
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {parsedPlaces.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                    <span className="font-medium truncate">{p.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {p.latitude ? `${p.latitude.toFixed(3)}, ${p.longitude.toFixed(3)}` : "Sem coord"}
                  </span>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleConfirmImport}
            >
              <Check className="h-4 w-4" /> Adicionar Todos ao Roteiro
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
