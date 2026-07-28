/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Code,
  Info,
  Key,
  Loader2,
  Lock,
  Shield,
  Trash2,
  Users,
} from "lucide-react";

const CONFIRM_WORD = "RESETAR";

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDetailUser: any;
  isLoadingDetails: boolean;
  detailAccounts: any[];
  detailFamilies: any[];
  isResettingPassword: string | null;
  handleResetUserPassword: (email: string, id: string) => void;
}

export function UserDetailDialog({
  open,
  onOpenChange,
  selectedDetailUser,
  isLoadingDetails,
  detailAccounts,
  detailFamilies,
  isResettingPassword,
  handleResetUserPassword,
}: UserDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Dossiê Financeiro do Usuário
          </DialogTitle>
          <DialogDescription>Dados e relacionamentos cadastrados na plataforma</DialogDescription>
        </DialogHeader>
        {selectedDetailUser && (
          <div className="space-y-4 py-4 px-6 overflow-y-auto min-h-0 flex-1">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: selectedDetailUser.avatar_color || "#10b981" }}
              >
                {getInitials(selectedDetailUser.full_name || selectedDetailUser.email)}
              </div>
              <div>
                <h4 className="font-semibold text-base">
                  {selectedDetailUser.full_name || "Sem Nome"}
                </h4>
                <p className="text-sm text-muted-foreground">{selectedDetailUser.email}</p>
                <p className="text-sm text-muted-foreground mt-1">ID: {selectedDetailUser.id}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Contas Bancárias Ativas
              </h5>
              {isLoadingDetails ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              ) : detailAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma conta cadastrada</p>
              ) : (
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {detailAccounts.map((acc: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm p-2 rounded bg-muted/30"
                    >
                      <span className="font-medium">
                        {acc.name}{" "}
                        <Badge variant="outline" className="text-[8px] py-0 px-1 ml-1">
                          {acc.type}
                        </Badge>
                      </span>
                      <Badge
                        variant="outline"
                        className="text-sm bg-accent/10 text-accent border-accent/20 font-medium flex items-center gap-1 py-0.5 px-2"
                      >
                        <Lock className="h-3 w-3" />
                        Saldo Oculto (LGPD)
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Grupos Familiares Associados
              </h5>
              {isLoadingDetails ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              ) : detailFamilies.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Não pertence a nenhum grupo familiar
                </p>
              ) : (
                <div className="space-y-2">
                  {detailFamilies.map((fam: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm p-2 rounded bg-muted/30"
                    >
                      <span className="font-medium">👨‍👩‍👧‍👦 {fam.name}</span>
                      <span className="text-sm font-mono capitalize px-2 py-0.5 rounded bg-foreground/10 text-foreground">
                        {fam.role} ({fam.status})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h5 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-warning">
                <Shield className="h-3.5 w-3.5" />
                Controles de Segurança e LGPD
              </h5>
              <div className="p-3 rounded-lg border border-warning/20 bg-warning/5 space-y-3">
                <div className="flex gap-2 text-sm text-warning dark:text-warning">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Para redefinir a senha de forma segura e em total conformidade com a LGPD,
                    envie um e-mail de redefinição de senha oficial. O administrador não tem acesso
                    a senhas em texto puro.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-warning/30 text-warning hover:text-warning hover:bg-warning/10 dark:text-warning"
                  disabled={isResettingPassword === selectedDetailUser.id}
                  onClick={() =>
                    handleResetUserPassword(selectedDetailUser.email, selectedDetailUser.id)
                  }
                >
                  {isResettingPassword === selectedDetailUser.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  Disparar E-mail de Redefinição de Senha
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SafetyResetAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: string;
  confirmWord: string;
  setConfirmWord: (v: string) => void;
  isResetting: boolean;
  handleReset: () => void;
}

export function SafetyResetAlertDialog({
  open,
  onOpenChange,
  selectedUser,
  confirmWord,
  setConfirmWord,
  isResetting,
  handleReset,
}: SafetyResetAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-destructive w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <AlertDialogHeader className="px-6 pt-6">
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 animate-bounce" />
            CONFIRMAR COMPROMETIMENTO E EXCLUSÃO DE DADOS
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {selectedUser === "all"
                ? "Você está prestes a EXCLUIR DEFINITIVAMENTE TODOS OS DADOS de TODOS os usuários do banco de dados (Contas, Transações, Parcelamentos, Investimentos, Splits e Orçamentos)."
                : "Você está prestes a excluir permanentemente todo o histórico financeiro e perfil do usuário selecionado. Os membros de famílias associadas serão notificados imediatamente."}
            </p>
            <div className="p-3 rounded-lg bg-destructive/5 text-sm text-destructive dark:text-destructive font-medium">
              Esta operação é IRREVERSÍVEL! Os dados serão removidos do servidor Supabase Postgres
              sem possibilidade de restauração.
            </div>
            <div className="pt-2">
              <Label className="text-sm font-semibold">
                Digite <span className="font-bold text-destructive">{CONFIRM_WORD}</span> abaixo para
                validar a operação administrativa:
              </Label>
              <Input
                id="confirmResetWord"
                name="confirmResetWord"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
                placeholder={CONFIRM_WORD}
                className="mt-2 border-destructive/30 focus-visible:ring-destructive"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-6 pb-6">
          <AlertDialogCancel onClick={() => setConfirmWord("")}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={confirmWord !== CONFIRM_WORD || isResetting}
            className="bg-destructive hover:bg-destructive/92 text-white"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redefinindo…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Confirmar Reset
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ErrorDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedErrorLog: any;
  resolveErrorLog: (id: string) => void;
}

export function ErrorDetailDialog({
  open,
  onOpenChange,
  selectedErrorLog,
  resolveErrorLog,
}: ErrorDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-destructive" />
            Detalhes do Erro
          </DialogTitle>
          <DialogDescription>Inspeção técnica do erro capturado</DialogDescription>
        </DialogHeader>

        {selectedErrorLog && (
          <div className="space-y-4 py-4 px-6 overflow-y-auto min-h-0 flex-1">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground text-sm block">Reportado por</span>
                <span className="font-semibold">
                  {selectedErrorLog.user_email || "Usuário Não Identificado"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-sm block">Data da Ocorrência</span>
                <span>{new Date(selectedErrorLog.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground text-sm block">Contexto (URL)</span>
                <span className="font-mono text-sm bg-muted px-2 py-1 rounded break-all">
                  {selectedErrorLog.context || "N/A"}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-border">
                <span className="text-muted-foreground text-sm block">Mensagem de Erro</span>
                <p className="font-medium text-destructive mt-1 break-words">
                  {selectedErrorLog.error_message}
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <span className="text-muted-foreground text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                <Code className="h-4 w-4" /> Stack Trace
              </span>
              <pre className="bg-muted text-foreground p-4 rounded-lg text-sm font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
                {selectedErrorLog.stack_trace || "Nenhum stack trace disponível"}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 pb-6 flex justify-between sm:justify-between items-center w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {selectedErrorLog?.status === "open" && (
            <Button
              variant="default"
              onClick={() => resolveErrorLog(selectedErrorLog.id)}
              className="bg-success hover:bg-success/92 text-white"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como Resolvido
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
