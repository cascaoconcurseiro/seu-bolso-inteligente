import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

const BACKUP_TABLES = [
  "accounts",
  "categories",
  "transactions",
  "transaction_splits",
  "trips",
  "trip_members",
  "trip_itinerary",
  "trip_checklist",
  "trip_exchange_purchases",
  "budgets",
  "goals",
  "assets",
  "asset_transactions",
  "notification_preferences",
] as const;

type BackupTableName = (typeof BACKUP_TABLES)[number];
const BACKUP_PAGE_SIZE = 1000;

export function BackupManager() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  // 1. Exportar Backup
  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    toast.info("Iniciando exportação dos registros disponíveis...");

    try {
      const getTableData = async <Table extends BackupTableName>(tableName: Table) => {
        const rows: unknown[] = [];
        let expectedCount: number | null = null;

        for (let offset = 0; ; ) {
          const { data, error, count } = await supabase
            .from(tableName)
            .select("*", offset === 0 ? { count: "exact" } : undefined)
            .order("id", { ascending: true })
            .range(offset, offset + BACKUP_PAGE_SIZE - 1);

          if (error) {
            logger.error(`Erro ao exportar tabela ${tableName}:`, error);
            throw error;
          }

          if (expectedCount === null && typeof count === "number") expectedCount = count;
          const page = data || [];
          rows.push(...page);

          if (expectedCount !== null && rows.length >= expectedCount) return rows;
          if (page.length === 0) {
            if (expectedCount !== null) {
              throw new Error(`A tabela ${tableName} mudou durante a exportação.`);
            }
            return rows;
          }

          offset += page.length;
        }
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
        notification_preferences,
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
        getTableData("notification_preferences"),
      ]);

      const backup = {
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
          notification_preferences,
        },
      };

      // Disparar download do arquivo JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `pe-de-meia-backup-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success("A cópia parcial dos dados foi baixada.");
    } catch (error) {
      logger.error("Error exporting backup:", error);
      toast.error("Falha ao exportar backup.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-black text-2xl tracking-tight">Backup e Dados</h2>
        <p className="text-sm text-muted-foreground">
          Exportação parcial de dados. A restauração está desativada temporariamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bloco de Exportar */}
        <Card className="p-6 border border-border bg-card/50 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Exportar cópia parcial</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Baixa um JSON sem criptografia com os registros acessíveis nas{" "}
                {BACKUP_TABLES.length} tabelas incluídas. O arquivo não representa um snapshot
                consistente e não garante que todos os dados estejam incluídos. Guarde-o em um local
                protegido. Como as consultas seguem as permissões de compartilhamento da sua conta,
                o arquivo também pode conter dados compartilhados e identificadores de outras
                pessoas.
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

        {/* A restauração fica bloqueada até existir um fluxo completo e atômico. */}
        <Card className="p-6 border border-border bg-card/50 shadow-sm rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Restauração temporariamente indisponível</h3>
              <p className="text-sm text-muted-foreground mt-1">
                A cópia atual é parcial e ainda não pode ser restaurada com segurança. A restauração
                será reativada quando cobrir os dados compartilhados e puder ser concluída de forma
                atômica, com rollback em caso de erro.
              </p>
            </div>
          </div>
          <Button className="w-full mt-6" disabled>
            Restauração desativada
          </Button>
        </Card>
      </div>
    </div>
  );
}
