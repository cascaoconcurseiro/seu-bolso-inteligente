import { useState, useRef, useMemo } from "react";
import { sheetDialogCn } from "@/lib/dialog-variants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { XMLParser } from "fast-xml-parser";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { insertRecords } from "@/utils/supabaseHelpers";
import { useAuth } from "@/contexts/AuthContext";
import { CreateTransactionInput } from "@/hooks/useTransactions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from '@/utils/logger';

interface OFXImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OFXImportModal({ isOpen, onClose }: OFXImportModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: accounts } = useAccounts();
  const { data: existingTransactions } = useTransactions();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [isUploading, setIsUploading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [duplicatesCount, setDuplicatesCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAccounts = useMemo(() => {
    return accounts?.filter(acc => acc.is_active !== false) || [];
  }, [accounts]);

  const parseOFXDate = (dateStr: string): string => {
    // OFX Date format: YYYYMMDDHHMMSS or YYYYMMDD
    if (!dateStr || dateStr.length < 8) {
      // Retorna ontem como fallback seguro em vez de hoje para evitar datas futuras
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return format(yesterday, 'yyyy-MM-dd');
    }
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const iso = `${year}-${month}-${day}`;
    // Valida que a data é real antes de retornar
    try {
      const parsed = parseISO(iso);
      if (isNaN(parsed.getTime())) throw new Error();
      return iso;
    } catch {
      return format(new Date(), 'yyyy-MM-dd');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAccountId) {
      toast.error("Por favor, selecione uma conta de destino primeiro.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.ofx') && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Formato inválido. Envie um arquivo .OFX ou .CSV");
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      let importedTx: any[] = [];

      if (file.name.toLowerCase().endsWith('.ofx')) {
        const xmlContent = text.substring(text.indexOf("<OFX>"));
        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlContent);
        
        const transactions = extractTransactionsFromOFX(jsonObj);
        
        importedTx = transactions.map(tx => {
          const amt = parseFloat(tx.TRNAMT || "0");
          return {
            amount: Math.abs(amt),
            type: amt < 0 ? "EXPENSE" : "INCOME",
            description: tx.MEMO || tx.NAME || "Transação Importada",
            date: parseOFXDate(tx.DTPOSTED),
            external_id: tx.FITID
          };
        });
      } else {
        // Fallback to minimal CSV logic or throw
        throw new Error("Suporte apenas para OFX no momento para precisão.");
      }

      if (importedTx.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo.");
        setIsUploading(false);
        return;
      }

      // Filtrar duplicados: compara data, valor e conta. 
      // Em um cenário mais robusto, external_id (FITID) salvaria.
      const newTransactions: any[] = [];
      let duplicateCounter = 0;

      for (const tx of importedTx) {
        const isDuplicate = existingTransactions?.some(et => 
          et.account_id === selectedAccountId &&
          et.type === tx.type &&
          et.date === tx.date &&
          Math.abs(et.amount - tx.amount) < 0.01 &&
          // Compara pelo FITID se já tivermos salvo
          (et.external_id === tx.external_id || et.description.toLowerCase() === tx.description.toLowerCase())
        );

        if (isDuplicate) {
          duplicateCounter++;
        } else {
          newTransactions.push({
            user_id: user?.id,
            account_id: selectedAccountId,
            amount: tx.amount,
            type: tx.type,
            description: tx.description,
            date: tx.date,
            competence_date: `${tx.date.substring(0, 7)}-01`,
            external_id: tx.external_id,
            domain: 'PERSONAL',
            is_shared: false,
            is_installment: false,
            is_recurring: false
          });
        }
      }

      if (newTransactions.length > 0) {
        await insertRecords('transactions', newTransactions);
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      }

      setSuccessCount(newTransactions.length);
      setDuplicatesCount(duplicateCounter);
      
      if (newTransactions.length > 0) {
        toast.success(`${newTransactions.length} transações salvas com sucesso!`);
      } else {
        toast.info(`Nenhuma transação nova. ${duplicateCounter} duplicadas ignoradas.`);
      }
      
    } catch (error) {
      logger.error(error);
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

  const resetState = () => {
    setSuccessCount(null);
    setDuplicatesCount(0);
    setSelectedAccountId("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={`max-w-md ${sheetDialogCn}`}>
        <div className="w-full flex justify-center pt-4 sm:hidden">
          <div className="w-12 h-2 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-0">
          <DialogTitle>Importar Extrato (OFX)</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Importe seu extrato bancário. O sistema filtrará duplicatas automaticamente.
          </p>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-6 pb-6 pt-4">
          {successCount !== null ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-6 animate-fade-in">
              <div className="h-12 w-12 bg-positive/10 text-positive rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h3 className="font-medium text-sm text-foreground">Importação Concluída</h3>
                <p className="text-xs text-muted-foreground">{successCount} novas transações adicionadas</p>
                {duplicatesCount > 0 && (
                  <p className="text-xs text-warning mt-1">{duplicatesCount} transações duplicadas ignoradas.</p>
                )}
              </div>
              <Button onClick={handleClose} size="sm" className="mt-2">
                Ver Transações
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Conta de Destino</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta para importar" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedAccountId && (
                <Alert variant="warning" className="bg-warning/10 text-warning border-warning/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">Selecione uma conta acima para liberar o botão de upload.</AlertDescription>
                </Alert>
              )}

              <div 
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors
                  ${!selectedAccountId ? 'border-border/50 bg-muted/10 opacity-50 cursor-not-allowed' : 'border-border hover:bg-muted/30 cursor-pointer'}
                `}
                onClick={() => selectedAccountId && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".ofx"
                  onChange={handleFileChange}
                />
                
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                    <p className="font-medium text-sm">Processando arquivo...</p>
                    <p className="text-xs text-muted-foreground mt-1">Sincronizando com o banco...</p>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                      <FileUp className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-sm text-foreground mb-1">Clique para enviar OFX</p>
                    <p className="text-xs text-muted-foreground">O sistema criará os lançamentos na categoria "A Revisar" (Sem Categoria)</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
