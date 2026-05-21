import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { XMLParser } from "fast-xml-parser";

interface OFXImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OFXImportModal({ isOpen, onClose }: OFXImportModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.ofx') && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Formato inválido. Envie um arquivo .OFX ou .CSV");
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      let txCount = 0;

      if (file.name.toLowerCase().endsWith('.ofx')) {
        // Simple OFX parsing using fast-xml-parser
        // OFX headers are usually not valid XML, so we strip them
        const xmlContent = text.substring(text.indexOf("<OFX>"));
        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlContent);
        
        // Find STMTTRN array deeply
        const transactions = extractTransactionsFromOFX(jsonObj);
        txCount = transactions.length;
        
        // TODO: Send to Supabase via useAddTransaction mutation
        console.log("Parsed OFX Transactions:", transactions);
        
      } else {
        // CSV parsing fallback
        txCount = text.split('\n').length - 1;
      }

      setSuccessCount(txCount);
      toast.success(`${txCount} transações lidas com sucesso!`);
      
    } catch (error) {
      console.error(error);
      toast.error("Erro ao ler arquivo. Verifique o formato.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const extractTransactionsFromOFX = (obj: any): any[] => {
    let results: any[] = [];
    if (typeof obj !== 'object' || obj === null) return results;
    
    if (obj.STMTTRN) {
      if (Array.isArray(obj.STMTTRN)) {
        results = [...results, ...obj.STMTTRN];
      } else {
        results.push(obj.STMTTRN);
      }
    } else {
      for (const key in obj) {
        results = [...results, ...extractTransactionsFromOFX(obj[key])];
      }
    }
    return results;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar Extrato (OFX)</DialogTitle>
          <DialogDescription>
            Importe seu extrato bancário para leitura e categorização inteligente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {successCount !== null ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-fade-in">
              <div className="h-16 w-16 bg-positive/10 text-positive rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="text-center">
                <h3 className="font-medium text-lg text-foreground">Importação Concluída</h3>
                <p className="text-sm text-muted-foreground">{successCount} transações processadas</p>
              </div>
              <Button onClick={onClose} className="mt-4">
                Ver Transações
              </Button>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".ofx,.csv"
                onChange={handleFileChange}
              />
              
              {isUploading ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                  <p className="font-medium">Processando arquivo...</p>
                  <p className="text-xs text-muted-foreground mt-1">Lendo transações...</p>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                    <FileUp className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-foreground mb-1">Clique para enviar OFX</p>
                  <p className="text-xs text-muted-foreground">Suporta arquivos .ofx e .csv do seu banco</p>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
