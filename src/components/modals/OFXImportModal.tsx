/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useMemo } from "react";
import { sheetDialogCn } from "@/lib/dialog-variants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { insertRecords } from "@/utils/supabaseHelpers";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/utils/logger";
import {
  ofxBatchDuplicateKey,
  ofxContentDuplicateKey,
  ofxTransactionDuplicateBaseKey,
  parseOfxTransactions,
} from "@/utils/ofxParser";

interface OFXImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OFX_DUPLICATE_PAGE_SIZE = 1000;

export function OFXImportModal({ isOpen, onClose }: OFXImportModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [isUploading, setIsUploading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [duplicatesCount, setDuplicatesCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAccounts = useMemo(() => {
    return accounts?.filter((acc) => acc.is_active !== false) || [];
  }, [accounts]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAccountId) {
      toast.error("Por favor, selecione uma conta de destino primeiro.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".ofx")) {
      toast.error("Formato inválido. Envie um arquivo .OFX");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // [SEC] Validate file size — max 10MB to prevent memory DoS
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. O tamanho máximo é 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    let failurePhase: "read" | "duplicates" | "save" = "read";

    try {
      if (!user) throw new Error("Não autenticado");

      const text = await file.text();
      const importedTx = parseOfxTransactions(text);

      if (importedTx.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo.");
        setIsUploading(false);
        return;
      }

      // A consulta cobre todo o intervalo do arquivo, não apenas o mês selecionado na tela.
      failurePhase = "duplicates";
      const importedDates = importedTx.map((transaction) => transaction.date);
      const minDate = importedDates.reduce((min, date) => (date < min ? date : min));
      const maxDate = importedDates.reduce((max, date) => (date > max ? date : max));
      const existingTransactions: Array<{
        account_id: string | null;
        amount: number | string;
        type: string;
        date: string;
        external_id: string | null;
        description: string;
      }> = [];

      for (let offset = 0; ; offset += OFX_DUPLICATE_PAGE_SIZE) {
        const { data, error } = await supabase
          .from("transactions")
          .select("account_id, amount, type, date, external_id, description")
          .eq("user_id", user.id)
          .eq("account_id", selectedAccountId)
          .is("deleted_at", null)
          .or("status.neq.PENDING,status.is.null")
          .gte("date", minDate)
          .lte("date", maxDate)
          .order("id", { ascending: true })
          .range(offset, offset + OFX_DUPLICATE_PAGE_SIZE - 1);

        if (error) throw error;
        const rows = data ?? [];
        existingTransactions.push(...rows);
        if (rows.length < OFX_DUPLICATE_PAGE_SIZE) break;
      }

      const existingFitIds = new Set<string>();
      const existingContentKeys = new Set<string>();
      const existingWithoutFitIdContentKeys = new Set<string>();
      for (const existing of existingTransactions) {
        const contentKey = ofxContentDuplicateKey(existing, selectedAccountId);
        const baseKey = ofxTransactionDuplicateBaseKey(existing, selectedAccountId);
        existingContentKeys.add(contentKey);
        if (existing.external_id?.trim())
          existingFitIds.add(`${baseKey}:fitid:${existing.external_id.trim()}`);
        else existingWithoutFitIdContentKeys.add(contentKey);
      }

      const newTransactions: any[] = [];
      let duplicateCounter = 0;
      const seenInFile = new Set<string>();
      failurePhase = "save";

      for (const tx of importedTx) {
        const batchKey = ofxBatchDuplicateKey(tx, selectedAccountId);
        const contentKey = ofxContentDuplicateKey(tx, selectedAccountId);
        const baseKey = ofxTransactionDuplicateBaseKey(tx, selectedAccountId);
        const fitId = tx.external_id?.trim();
        const isDuplicate =
          seenInFile.has(batchKey) ||
          (fitId
            ? existingFitIds.has(`${baseKey}:fitid:${fitId}`) ||
              existingWithoutFitIdContentKeys.has(contentKey)
            : existingContentKeys.has(contentKey));
        seenInFile.add(batchKey);

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
            domain: "PERSONAL",
            is_shared: false,
            is_installment: false,
            is_recurring: false,
          });
        }
      }

      // O índice único (user_id, account_id, external_id) barra duplicatas que
      // a checagem em memória não vê (ex.: import repetido em outra sessão).
      // Se o lote inteiro falhar por 23505, insere linha a linha pulando conflitos.
      let insertedCount = 0;
      if (newTransactions.length > 0) {
        try {
          await insertRecords("transactions", newTransactions);
          insertedCount = newTransactions.length;
        } catch (bulkError: unknown) {
          const code = (bulkError as { code?: string })?.code;
          if (code !== "23505") throw bulkError;
          for (const row of newTransactions) {
            try {
              await insertRecords("transactions", [row]);
              insertedCount++;
            } catch (rowError: unknown) {
              if ((rowError as { code?: string })?.code === "23505") {
                duplicateCounter++;
              } else {
                throw rowError;
              }
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      }

      setSuccessCount(insertedCount);
      setDuplicatesCount(duplicateCounter);

      if (insertedCount > 0) {
        toast.success(
          insertedCount === 1
            ? "1 transação salva com sucesso!"
            : `${insertedCount} transações salvas com sucesso!`
        );
      } else {
        toast.info(
          duplicateCounter === 1
            ? "Nenhuma transação nova. 1 duplicada ignorada."
            : `Nenhuma transação nova. ${duplicateCounter} duplicadas ignoradas.`
        );
      }
    } catch (error) {
      logger.error("Falha na importação OFX", error);
      if (failurePhase === "read") {
        toast.error("Erro ao ler arquivo. Verifique o formato.");
      } else if (failurePhase === "duplicates") {
        toast.error("Não foi possível verificar duplicatas. Nenhuma transação foi importada.");
      } else {
        toast.error("Não foi possível salvar as transações. Tente novamente.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          <DialogDescription>
            Importe seu extrato bancário. O sistema filtrará duplicatas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-6 pb-6 pt-4">
          {successCount !== null ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-6 animate-fade-in">
              <div className="h-12 w-12 bg-positive/10 text-positive rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h3 className="font-medium text-sm text-foreground">Importação Concluída</h3>
                <p className="text-xs text-muted-foreground">
                  {successCount === 1
                    ? "1 nova transação adicionada"
                    : `${successCount} novas transações adicionadas`}
                </p>
                {duplicatesCount > 0 && (
                  <p className="text-xs text-warning mt-1">
                    {duplicatesCount === 1
                      ? "1 transação duplicada ignorada."
                      : `${duplicatesCount} transações duplicadas ignoradas.`}
                  </p>
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
                <Alert variant="default" className="bg-warning/10 text-warning border-warning/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Selecione uma conta acima para liberar o botão de upload.
                  </AlertDescription>
                </Alert>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors
                  ${!selectedAccountId ? "border-border/50 bg-muted/10 opacity-50 cursor-not-allowed" : "border-border hover:bg-muted/30 cursor-pointer"}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Sincronizando com o banco...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                      <FileUp className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-sm text-foreground mb-1">
                      Clique para enviar OFX
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O sistema criará os lançamentos na categoria "A Revisar" (Sem Categoria)
                    </p>
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
