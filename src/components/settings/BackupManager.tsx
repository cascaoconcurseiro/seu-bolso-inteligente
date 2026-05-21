import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, AlertTriangle, ShieldAlert, CheckCircle, Database } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

interface BackupData {
  version: string;
  exportedAt: string;
  userId: string;
  data: {
    accounts: any[];
    categories: any[];
    transactions: any[];
    transaction_splits: any[];
    trips: any[];
    trip_members: any[];
    trip_itinerary: any[];
    trip_checklist: any[];
    trip_exchange_purchases: any[];
    budgets: any[];
    goals: any[];
    assets: any[];
    asset_transactions: any[];
    notification_preferences: any[];
  };
}

export function BackupManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ step: string; percent: number }>({ step: "", percent: 0 });
  const [confirmText, setConfirmText] = useState("");
  const [importedFile, setImportedFile] = useState<BackupData | null>(null);

  // 1. Exportar Backup
  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    toast.info("Iniciando exportação completa de dados...");

    try {
      const getTableData = async (tableName: string) => {
        const { data, error } = await supabase
          .from(tableName)
          .select("*");
        if (error) {
          logger.error(`Erro ao exportar tabela ${tableName}:`, error);
          throw error;
        }
        return data || [];
      };

      const [
        accounts,
        categories,
        transactions,
        transaction_splits,
        trips,
        trip_members,
        trip_itinerary,
        trip_checklist,
        trip_exchange_purchases,
        budgets,
        goals,
        assets,
        asset_transactions,
        notification_preferences
      ] = await Promise.all([
        getTableData("accounts"),
        getTableData("categories"),
        getTableData("transactions"),
        getTableData("transaction_splits"),
        getTableData("trips"),
        getTableData("trip_members"),
        getTableData("trip_itinerary"),
        getTableData("trip_checklist"),
        getTableData("trip_exchange_purchases"),
        getTableData("budgets"),
        getTableData("goals"),
        getTableData("assets"),
        getTableData("asset_transactions"),
        getTableData("notification_preferences")
      ]);

      const backup: BackupData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        userId: user.id,
        data: {
          accounts,
          categories,
          transactions,
          transaction_splits,
          trips,
          trip_members,
          trip_itinerary,
          trip_checklist,
          trip_exchange_purchases,
          budgets,
          goals,
          assets,
          asset_transactions,
          notification_preferences
        }
      };

      // Disparar download do arquivo JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pe-de-meia-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Todos os dados do sistema foram exportados com orgulho contábil!");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao exportar backup.");
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Upload do Arquivo para Pré-visualização
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.version || !json.data || !json.data.accounts || !json.data.categories) {
          toast.error("Formato de backup inválido.");
          return;
        }
        setImportedFile(json);
        setConfirmText("");
        toast.success("Arquivo de backup carregado com sucesso. Pronto para restauração.");
      } catch (err) {
        toast.error("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  // 3. Executar Restauração Completa
  const handleRestore = async () => {
    if (!user || !importedFile) return;
    if (confirmText !== "RESTAURAR") {
      toast.warning("Por favor, digite RESTAURAR para prosseguir.");
      return;
    }

    setIsImporting(true);
    const data = importedFile.data;

    try {
      // Helper para deletar em lote
      const cleanTable = async (tableName: string) => {
        const { error } = await supabase.from(tableName).delete().eq("user_id", user.id);
        if (error) {
          logger.error(`Erro ao limpar tabela ${tableName}:`, error);
          throw error;
        }
      };

      // Helper para inserir em lote mantendo IDs originais
      const insertRows = async (tableName: string, rows: any[]) => {
        if (!rows || rows.length === 0) return;
        
        // Garante que cada linha está associada ao usuário correto (segurança extra!)
        const safeRows = rows.map(r => ({ ...r, user_id: user.id }));
        
        const { error } = await supabase.from(tableName).insert(safeRows);
        if (error) {
          logger.error(`Erro ao restaurar tabela ${tableName}:`, error);
          throw error;
        }
      };

      // PASSO 1: LIMPAR DADOS EXISTENTES (Respeitando Constraints de Foreign Key)
      setImportProgress({ step: "1. Limpando dados atuais do usuário...", percent: 10 });
      await cleanTable("asset_transactions");
      await cleanTable("assets");
      await cleanTable("transaction_splits");
      await cleanTable("transactions");
      await cleanTable("budgets");
      await cleanTable("goals");
      await cleanTable("trip_itinerary");
      await cleanTable("trip_checklist");
      await cleanTable("trip_exchange_purchases");
      await cleanTable("trip_members");
      await cleanTable("trips");
      await cleanTable("accounts");
      await cleanTable("categories");

      // PASSO 2: RESTAURAR DADOS EM ORDEM DE INDEPENDÊNCIA
      setImportProgress({ step: "2. Restaurando categorias...", percent: 25 });
      await insertRows("categories", data.categories);

      setImportProgress({ step: "3. Restaurando contas...", percent: 40 });
      await insertRows("accounts", data.accounts);

      setImportProgress({ step: "4. Restaurando objetivos de poupança...", percent: 50 });
      await insertRows("goals", data.goals);

      setImportProgress({ step: "5. Restaurando orçamentos mensais...", percent: 60 });
      await insertRows("budgets", data.budgets);

      setImportProgress({ step: "6. Restaurando viagens organizadas...", percent: 70 });
      await insertRows("trips", data.trips);
      await insertRows("trip_members", data.trip_members);
      await insertRows("trip_itinerary", data.trip_itinerary);
      await insertRows("trip_checklist", data.trip_checklist);
      await insertRows("trip_exchange_purchases", data.trip_exchange_purchases);

      setImportProgress({ step: "7. Restaurando investimentos e ativos...", percent: 80 });
      await insertRows("assets", data.assets);
      await insertRows("asset_transactions", data.asset_transactions);

      setImportProgress({ step: "8. Restaurando transações e lançamentos...", percent: 90 });
      await insertRows("transactions", data.transactions);
      await insertRows("transaction_splits", data.transaction_splits);

      setImportProgress({ step: "9. Sincronizando preferências...", percent: 98 });
      await insertRows("notification_preferences", data.notification_preferences);

      setImportProgress({ step: "Concluído!", percent: 100 });
      toast.success("Sistema restaurado com sucesso absoluto para a data do backup!");
      
      // Invalidar todas as queries para recarregar a interface
      queryClient.invalidateQueries();
      setImportedFile(null);
      setConfirmText("");
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro crítico durante a restauração do banco de dados.");
    } finally {
      setIsImporting(false);
      setImportProgress({ step: "", percent: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-black text-2xl tracking-tight">Backup e Dados</h2>
        <p className="text-sm text-muted-foreground">Exportação integral e restauração total do banco de dados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Bloco de Exportar */}
        <Card className="p-6 border border-border bg-card/50 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Exportar Backup Completo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gera um arquivo seguro contendo todas as suas transações, contas, categorias, metas, viagens e ativos. Ideal para guardar como cópia física ou migrar de conta.
              </p>
            </div>
          </div>
          <Button 
            className="w-full mt-6 gap-2 rounded-xl h-10 font-medium" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? "Exportando..." : "Baixar arquivo de Backup"}
          </Button>
        </Card>

        {/* Bloco de Restaurar */}
        <Card className="p-6 border border-border bg-card/50 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Upload className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Restaurar do Backup</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Substitui de forma completa todos os seus dados atuais pelas informações de um backup anterior.
              </p>
            </div>

            {/* Input de Arquivo */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="backup-file" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecionar arquivo de Backup (.json)</Label>
              <Input 
                id="backup-file" 
                type="file" 
                accept=".json" 
                onChange={handleFileChange}
                disabled={isImporting}
                className="cursor-pointer bg-muted/20 border-border/50 rounded-xl file:bg-primary file:text-white file:border-0 file:rounded-lg file:mr-2 file:text-xs file:font-semibold"
              />
            </div>
          </div>

          {importedFile && (
            <div className="mt-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-4">
              <div className="flex gap-3 text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold uppercase tracking-wide">Atenção Crítica</p>
                  <p>A restauração irá deletar <strong>todos os seus lançamentos, contas e configurações atuais</strong> para inserir os dados do backup.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-restore" className="text-[10px] font-bold uppercase text-muted-foreground">Digite RESTAURAR para autorizar:</Label>
                <Input 
                  id="confirm-restore"
                  placeholder="RESTAURAR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isImporting}
                  className="rounded-xl border-destructive/30 focus-visible:ring-destructive font-bold text-center placeholder:font-normal placeholder:text-muted-foreground/50 h-9"
                />
              </div>

              <Button 
                variant="destructive"
                className="w-full gap-2 rounded-xl h-10 font-bold" 
                onClick={handleRestore}
                disabled={isImporting || confirmText !== "RESTAURAR"}
              >
                {isImporting ? "Restaurando..." : "Confirmar Restauração Total"}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Barra de Progresso da Restauração */}
      {isImporting && (
        <Card className="p-6 border border-primary/20 bg-primary/5 rounded-2xl animate-pulse">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-primary">{importProgress.step}</span>
              <span className="font-mono font-bold text-primary">{importProgress.percent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${importProgress.percent}%` }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
