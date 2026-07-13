import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Trash2, FileText, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export function PrivacySettings() {
  const { user, signOut } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    toast.info("Preparando seus dados…");

    try {
      const tables = [
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
      ] as const;

      // [B-25] Evitar SELECT * massivo — limita a 500 linhas por tabela
      const results = await Promise.all(tables.map((t) => supabase.from(t).select("*").limit(500)));

      const data: Partial<Record<(typeof tables)[number], unknown[]>> = {};
      tables.forEach((t, i) => {
        data[t] = results[i].data || [];
      });

      const payload = { exportedAt: new Date().toISOString(), userId: user.id, data };

      // [SEC] Validate payload size before creating blob (prevent memory DoS)
      const jsonStr = JSON.stringify(payload);
      if (jsonStr.length > 50 * 1024 * 1024) {
        // 50 MB max
        toast.error("Dados muito grandes para exportação. Tente exportar por período.");
        setIsExporting(false);
        return;
      }

      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pedemeia-dados-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados com sucesso.");
    } catch {
      toast.error("Falha ao exportar dados. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_user_account" as any);
      if (error) throw error;
      toast.success("Conta excluída. Até logo!");
      await signOut();
    } catch {
      toast.error("Falha ao excluir conta. Contate o suporte.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-black text-2xl tracking-tight">Privacidade & LGPD</h2>
        <p className="text-sm text-muted-foreground">
          Seus direitos sobre seus dados pessoais conforme a Lei 13.709/2018
        </p>
      </div>

      <Card className="p-5 border border-primary/20 bg-primary/5 rounded-2xl flex gap-4">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Seus dados pertencem a você</p>
          <p className="text-sm text-muted-foreground">
            O Pé de Meia armazena seus dados financeiros exclusivamente para funcionar. Nunca
            vendemos ou compartilhamos dados com terceiros para fins publicitários.
          </p>
          <Link
            to="/privacidade"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
          >
            <FileText className="h-3.5 w-3.5" />
            Ler Política de Privacidade completa
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 rounded-2xl border border-border bg-card/50 flex flex-col gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Exportar meus dados</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Baixe uma cópia completa de todas as suas transações, contas, metas e viagens em
              formato JSON.
            </p>
          </div>
          <Button className="w-full rounded-xl h-10" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exportando…" : "Baixar meus dados"}
          </Button>
        </Card>

        <Card className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5 flex flex-col gap-4">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-destructive">Excluir minha conta</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Remove permanentemente sua conta e todos os dados associados. Esta ação é
              irreversível.
            </p>
          </div>
          <Button
            variant="destructive"
            className="w-full rounded-xl h-10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Excluir conta permanentemente
          </Button>
        </Card>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os seus dados financeiros, transações, contas e configurações serão removidos do
              nosso sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo…" : "Sim, excluir tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
