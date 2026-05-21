import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Shield,
  AlertTriangle,
  Loader2,
  Lock,
  Trash2,
  Users,
  Eye,
  EyeOff,
  Wrench,
  FileWarning,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrphanTransactionsManager } from "./OrphanTransactionsManager";

const ADMIN_PASSWORD = "909496";
const CONFIRM_WORD = "RESETAR";

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

export function AdminResetPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [confirmWord, setConfirmWord] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const handleAuthenticate = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      loadUsers();
    } else {
      setPasswordError(true);
      toast.error("Senha incorreta");
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleReset = async () => {
    if (confirmWord !== CONFIRM_WORD) {
      toast.error(`Digite "${CONFIRM_WORD}" para confirmar`);
      return;
    }

    setIsResetting(true);
    try {
      if (selectedUser === "all") {
        // Reset de todos os usuários - deletar tudo
        await resetAllUsers();
      } else {
        // Reset de um usuário específico
        await resetSingleUser(selectedUser);
      }

      toast.success(
        selectedUser === "all" 
          ? "Sistema resetado com sucesso!" 
          : "Dados do usuário resetados com sucesso!"
      );
      
      setShowConfirmDialog(false);
      setConfirmWord("");
    } catch (error) {
      console.error('Reset error:', error);
      toast.error("Erro ao resetar sistema");
    } finally {
      setIsResetting(false);
    }
  };

  const resetAllUsers = async () => {
    // Chamar a RPC para resetar todo o sistema de forma transacional e com privilégios adequados no Postgres
    const { error } = await (supabase as any).rpc('admin_reset_all_data');
    if (error) {
      console.error("Erro ao resetar todo o sistema via RPC:", error);
      throw error;
    }
    console.log("✅ Sistema resetado com sucesso via RPC");
  };

  const resetSingleUser = async (userId: string) => {
    console.log(`🗑️ Iniciando reset do usuário: ${userId} via RPC`);
    // Chamar a RPC para resetar o usuário de forma atômica e segura
    const { error } = await (supabase as any).rpc('admin_reset_single_user', {
      target_user_id: userId
    });
    if (error) {
      console.error(`Erro ao resetar usuário ${userId} via RPC:`, error);
      throw error;
    }
    console.log(`✅ Reset do usuário ${userId} concluído com sucesso via RPC!`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    setUsers([]);
    setSelectedUser("all");
  };

  // Tela de login admin
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Área Administrativa
            </h3>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            ⚠️ Acesso restrito apenas para administradores do sistema.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-amber-800 dark:text-amber-200">Senha de Administrador</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                  className={cn(
                    "pr-10",
                    passwordError && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordError && (
                <p className="text-sm text-red-500">Senha incorreta</p>
              )}
            </div>
            
            <Button 
              onClick={handleAuthenticate}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <Lock className="h-4 w-4 mr-2" />
              Acessar Área Admin
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Painel admin autenticado
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold">Painel Administrativo</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
        >
          Sair do Admin
        </Button>
      </div>

      {/* Ferramentas de Manutenção */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          <span>Ferramentas de Manutenção</span>
        </div>

        {/* Orphan Transactions Manager */}
        <OrphanTransactionsManager />

        {/* Info sobre contas */}
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Sobre exclusão de contas
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Contas podem ser excluídas mesmo com saldo</li>
            <li>• Contas excluídas ficam inativas (soft delete)</li>
            <li>• Transações vinculadas permanecem no histórico</li>
          </ul>
        </div>
      </div>

      {/* Zona de Perigo - Reset */}
      <div className="pt-6 border-t border-border">
        <div className="p-4 rounded-xl border-2 border-red-500/50 bg-red-50 dark:bg-red-950/20">
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-medium">ATENÇÃO: Zona de Perigo!</p>
                <p>As ações abaixo são IRREVERSÍVEIS e excluirão permanentemente todos os dados selecionados.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Seleção de usuário */}
            <div className="space-y-2">
              <Label className="text-red-800 dark:text-red-200">
                <Users className="h-4 w-4 inline mr-2" />
                Selecionar Usuário
              </Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="border-red-300 dark:border-red-800">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-red-600 font-medium">
                    🔴 TODOS OS USUÁRIOS ({users.length} cadastrados)
                  </SelectItem>
                  {isLoadingUsers ? (
                    <SelectItem value="loading" disabled>
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Carregando...
                    </SelectItem>
                  ) : users.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum usuário encontrado
                    </SelectItem>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-red-600 dark:text-red-400">
                {selectedUser === "all" 
                  ? "⚠️ Todos os dados de TODOS os usuários serão excluídos!"
                  : "⚠️ Todos os dados deste usuário serão excluídos. A família será notificada."
                }
              </p>
            </div>

            {/* O que será excluído */}
            <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Dados que serão excluídos:
              </p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                <li>• Todas as transações e parcelas</li>
                <li>• Todas as contas bancárias e cartões</li>
                <li>• Participação em famílias (membros serão notificados)</li>
                <li>• Todas as viagens e participações</li>
                <li>• Todos os orçamentos</li>
                <li>• Todas as notificações</li>
              </ul>
            </div>

            {/* Botão de reset */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowConfirmDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {selectedUser === "all" ? "Resetar Todo o Sistema" : "Resetar Dados do Usuário"}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {selectedUser === "all"
                  ? "Você está prestes a EXCLUIR TODOS OS DADOS de TODOS os usuários do sistema."
                  : "Você está prestes a excluir todos os dados do usuário selecionado. Os membros da família serão notificados."
                }
              </p>
              <p className="font-medium text-red-600">
                Esta ação é IRREVERSÍVEL!
              </p>
              <div className="pt-2">
                <Label>
                  Digite <span className="font-bold">{CONFIRM_WORD}</span> para confirmar:
                </Label>
                <Input
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
                  placeholder={CONFIRM_WORD}
                  className="mt-2 border-red-300"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmWord("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={confirmWord !== CONFIRM_WORD || isResetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetando...
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
    </div>
  );
}
