import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Coins,
  Database,
  TrendingUp,
  Activity,
  History,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Search,
  RefreshCw,
  Sparkles,
  Info,
  Calendar,
  XCircle,
  Clock,
  Sparkle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrphanTransactionsManager } from "./OrphanTransactionsManager";
import { useRecalculateBalances } from "@/hooks/useAccountManagement";

const ADMIN_PASSWORD = "909496";
const CONFIRM_WORD = "RESETAR";

interface EnrichedUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  avatar_color: string | null;
  avatar_icon: string | null;
  accountsCount: number;
  transactionsCount: number;
  assetsCount: number;
  totalBalance: number;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  operation: string;
  table_name: string;
  record_id: string;
  old_data: any | null;
  new_data: any | null;
  created_at: string;
}

interface SystemStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  totalAccounts: number;
  totalFamilies: number;
  totalAssets: number;
}

export function AdminResetPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  
  // States
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    totalAccounts: 0,
    totalFamilies: 0,
    totalAssets: 0,
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [confirmWord, setConfirmWord] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Loading states
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isInjectingCategories, setIsInjectingCategories] = useState(false);
  const [isRecalculatingTarget, setIsRecalculatingTarget] = useState<string | null>(null);
  
  // Detail Modal States
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedDetailUser, setSelectedDetailUser] = useState<EnrichedUser | null>(null);
  const [detailAccounts, setDetailAccounts] = useState<any[]>([]);
  const [detailFamilies, setDetailFamilies] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const recalculateBalances = useRecalculateBalances();

  // Unified parser for database change-data-capture logs
  const parseAuditLog = (log: AuditLog) => {
    const op = log.operation || 'OUTRO';
    const tbl = log.table_name || '';
    
    let opType = `${op} - ${tbl.toUpperCase()}`;
    let reason = `Registro de ${tbl} modificado.`;
    let amount: number | null = null;
    let currency = 'BRL';
    let isSettlement = false;
    let isBlocked = false;

    if (tbl === 'transactions') {
      const data = log.new_data || log.old_data || {};
      amount = data.amount ? Number(data.amount) : null;
      currency = data.currency || 'BRL';
      const desc = data.description || '';
      
      if (op === 'INSERT') {
        opType = 'NOVA TRANSAÇÃO';
        reason = `Transação inserida: "${desc}"`;
      } else if (op === 'UPDATE') {
        opType = 'TRANSAÇÃO EDITADA';
        reason = `Transação alterada: "${desc}"`;
      } else if (op === 'DELETE') {
        opType = 'TRANSAÇÃO EXCLUÍDA';
        reason = `Transação removida definitivamente: "${desc}"`;
      }
      
      if (desc.toLowerCase().includes('acerto') || desc.toLowerCase().includes('conciliação') || data.is_settled) {
        isSettlement = true;
      }
    } 
    else if (tbl === 'accounts') {
      const data = log.new_data || log.old_data || {};
      amount = data.balance ? Number(data.balance) : null;
      currency = data.currency || 'BRL';
      const name = data.name || '';
      
      if (op === 'INSERT') {
        opType = 'NOVA CONTA';
        reason = `Conta criada: "${name}" (${data.type || ''})`;
      } else if (op === 'UPDATE') {
        opType = 'CONTA EDITADA';
        reason = `Conta alterada: "${name}"`;
      } else if (op === 'DELETE') {
        opType = 'CONTA EXCLUÍDA';
        reason = `Conta removida definitivamente: "${name}"`;
      }
    }
    else if (tbl === 'families') {
      const data = log.new_data || log.old_data || {};
      const name = data.name || '';
      if (op === 'INSERT') {
        opType = 'NOVA FAMÍLIA';
        reason = `Grupo familiar criado: "${name}"`;
      } else if (op === 'DELETE') {
        opType = 'FAMÍLIA REMOVIDA';
        reason = `Grupo familiar removido: "${name}"`;
      }
    }
    else {
      if (op === 'INSERT') {
        opType = `NOVO - ${tbl.toUpperCase()}`;
        reason = `Inserção na tabela ${tbl} (ID: ${log.record_id})`;
      } else if (op === 'UPDATE') {
        opType = `ATUALIZADO - ${tbl.toUpperCase()}`;
        reason = `Atualização na tabela ${tbl} (ID: ${log.record_id})`;
      } else if (op === 'DELETE') {
        opType = `REMOVIDO - ${tbl.toUpperCase()}`;
        reason = `Exclusão na tabela ${tbl} (ID: ${log.record_id})`;
      }
    }

    return { opType, reason, amount, currency, isSettlement, isBlocked };
  };

  const handleAuthenticate = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      loadAllAdminData();
    } else {
      setPasswordError(true);
      toast.error("Senha incorreta");
    }
  };

  const loadAllAdminData = () => {
    loadSystemStats();
    loadUsersDetailed();
    loadAuditLogs();
  };

  const loadSystemStats = async () => {
    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_system_stats', {
        admin_password: ADMIN_PASSWORD
      });
      
      if (error) throw error;
      
      if (data) {
        setStats({
          totalUsers: Number(data.totalUsers) || 0,
          totalTransactions: Number(data.totalTransactions) || 0,
          totalVolume: Number(data.totalVolume) || 0,
          totalAccounts: Number(data.totalAccounts) || 0,
          totalFamilies: Number(data.totalFamilies) || 0,
          totalAssets: Number(data.totalAssets) || 0
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Erro ao carregar métricas globais');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadUsersDetailed = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_users_detailed', {
        admin_password: ADMIN_PASSWORD
      });
      
      if (error) throw error;
      
      if (data) {
        const enriched = (data as any[]).map((u: any) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          created_at: u.created_at,
          avatar_color: u.avatar_color,
          avatar_icon: u.avatar_icon,
          accountsCount: Number(u.accountsCount) || 0,
          transactionsCount: Number(u.transactionsCount) || 0,
          assetsCount: Number(u.assetsCount) || 0,
          totalBalance: Number(u.totalBalance) || 0
        }));
        setEnrichedUsers(enriched);
      }
    } catch (error) {
      console.error('Error enriching users:', error);
      toast.error('Erro ao processar dados dos usuários');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_audit_logs', {
        admin_password: ADMIN_PASSWORD
      });
      
      if (error) throw error;
      
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setIsLoadingLogs(false);
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
        await resetAllUsers();
      } else {
        await resetSingleUser(selectedUser);
      }

      toast.success(
        selectedUser === "all" 
          ? "Sistema resetado com sucesso!" 
          : "Dados do usuário resetados com sucesso!"
      );
      
      setShowConfirmDialog(false);
      setConfirmWord("");
      loadAllAdminData();
    } catch (error) {
      console.error('Reset error:', error);
      toast.error("Erro ao resetar sistema");
    } finally {
      setIsResetting(false);
    }
  };

  const resetAllUsers = async () => {
    const { error } = await supabase.rpc('admin_reset_all_data', {
      admin_password: ADMIN_PASSWORD
    });
    if (error) throw error;
  };

  const resetSingleUser = async (userId: string) => {
    const { error } = await supabase.rpc('admin_reset_single_user', {
      admin_password: ADMIN_PASSWORD,
      target_user_id: userId
    });
    if (error) throw error;
  };

  const handlePurgeSoftDeleted = async () => {
    setIsPurging(true);
    try {
      // Purgamos apenas as contas marcadas como deletadas (accounts.deleted = true).
      // Como transactions não tem soft-delete, a exclusão da conta propaga a remoção das transações vinculadas via cascade trigger.
      const { count: accCount, error: accErr } = await supabase
        .from('accounts')
        .delete({ count: 'exact' })
        .eq('deleted', true);

      if (accErr) throw accErr;
      
      toast.success(`Limpeza concluída! ${accCount || 0} conta(s) inativa(s) deletada(s) definitivamente.`);
      loadSystemStats();
    } catch (error) {
      console.error('Error purging soft-deletes:', error);
      toast.error('Erro ao purgar registros deletados');
    } finally {
      setIsPurging(false);
    }
  };

  const handleRecalculateTargetBalances = async (targetUserId: string) => {
    setIsRecalculatingTarget(targetUserId);
    try {
      const { data, error } = await supabase.rpc("recalculate_all_balances", {
        p_user_id: targetUserId,
      });

      if (error) throw error;
      
      toast.success(`Saldos recalculados para o usuário! (${data || 0} contas atualizadas)`);
      loadUsersDetailed();
    } catch (error: any) {
      console.error('Error recalculating target balances:', error);
      toast.error('Erro ao recalcular saldos: ' + error.message);
    } finally {
      setIsRecalculatingTarget(null);
    }
  };

  const handleInjectDefaultCategories = async (userId: string) => {
    setIsInjectingCategories(true);
    try {
      const { data: existing, error: checkError } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        toast.warning("O usuário já possui categorias cadastradas!");
        return;
      }

      const { DEFAULT_CATEGORIES } = await import("@/lib/defaultCategories");

      const parentCategories = DEFAULT_CATEGORIES.map(cat => ({
        user_id: userId,
        name: cat.name,
        icon: cat.icon,
        type: cat.type,
        parent_category_id: null,
      }));

      const { data: createdParents, error: parentError } = await supabase
        .from("categories")
        .insert(parentCategories)
        .select();

      if (parentError) throw parentError;

      const parentMap = new Map(createdParents.map(cat => [cat.name, cat.id]));
      const childCategories: any[] = [];
      
      DEFAULT_CATEGORIES.forEach(parent => {
        const parentId = parentMap.get(parent.name);
        if (parent.children && parentId) {
          parent.children.forEach(child => {
            childCategories.push({
              user_id: userId,
              name: child.name,
              icon: child.icon,
              type: child.type,
              parent_category_id: parentId,
            });
          });
        }
      });

      if (childCategories.length > 0) {
        const { error: childError } = await supabase
          .from("categories")
          .insert(childCategories);

        if (childError) throw childError;
      }

      toast.success(`Categorias padrão criadas com sucesso! (${createdParents.length} principais e ${childCategories.length} subcategorias)`);
      loadUsersDetailed();
    } catch (error: any) {
      console.error('Error injecting default categories:', error);
      toast.error('Erro ao injetar categorias padrão: ' + error.message);
    } finally {
      setIsInjectingCategories(false);
    }
  };

  const openUserDetailModal = async (targetUser: EnrichedUser) => {
    setSelectedDetailUser(targetUser);
    setIsLoadingDetails(true);
    setUserDetailOpen(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_user_dossier', {
        admin_password: ADMIN_PASSWORD,
        target_user_id: targetUser.id
      });
      
      if (error) throw error;
      
      if (data) {
        setDetailAccounts(data.accounts || []);
        setDetailFamilies(data.families || []);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Erro ao carregar detalhes do perfil');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    setEnrichedUsers([]);
    setAuditLogs([]);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getUserEmail = (userId: string) => {
    const found = enrichedUsers.find(u => u.id === userId);
    return found ? (found.full_name || found.email) : 'Admin/Sistema';
  };

  // Filter users by search query
  const filteredUsers = enrichedUsers.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Authenticator screen
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="p-6 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-950/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Shield className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-amber-900 dark:text-amber-200">
                Área Administrativa Restrita
              </h3>
              <p className="text-xs text-muted-foreground">Console central de administração corporativa</p>
            </div>
          </div>
          
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-6">
            ⚠️ Acesso restrito apenas para engenheiros e administradores do sistema. Insira a chave criptográfica para descriptografar os painéis de manutenção.
          </p>
          
          <div className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label className="text-sm text-amber-800 dark:text-amber-200 font-medium">Chave de Administrador</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha Administrativa"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                  className={cn(
                    "pr-10 border-amber-500/30 focus-visible:ring-amber-500 bg-background/50",
                    passwordError && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-amber-600 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordError && (
                <p className="text-xs text-red-500 font-medium">Credencial administrativa inválida.</p>
              )}
            </div>
            
            <Button 
              onClick={handleAuthenticate}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-lg shadow-amber-600/20"
            >
              <Lock className="h-4 w-4 mr-2" />
              Autenticar Console Admin
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              Painel Administrativo do Sistema
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 py-0 px-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Operacional
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">Monitoramento global, manutenção estrutural e integridade de transações.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAllAdminData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
            Sair do Admin
          </Button>
        </div>
      </div>

      {/* Main Tabs Dashboard */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full lg:w-[600px] bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg gap-2 text-xs">
            <Sparkle className="h-3.5 w-3.5" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg gap-2 text-xs">
            <Users className="h-3.5 w-3.5" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg gap-2 text-xs">
            <History className="h-3.5 w-3.5" />
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-lg gap-2 text-xs">
            <Wrench className="h-3.5 w-3.5" />
            Manutenção
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {isLoadingStats ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Compilando estatísticas do sistema...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Usuários Registrados</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Perfis cadastrados na base</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Volume Transacionado</CardTitle>
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Movimentações financeiras sob gestão</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Transações Totais</CardTitle>
                  <Activity className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registros de fluxo de caixa</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-sky-500/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Contas e Cartões</CardTitle>
                  <Database className="h-4 w-4 text-sky-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAccounts}</div>
                  <p className="text-xs text-muted-foreground mt-1">Contas bancárias e cartões ativos</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Investimentos e Ativos</CardTitle>
                  <Briefcase className="h-4 w-4 text-pink-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAssets}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ativos imobiliários, ações e tesouro</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Grupos Familiares</CardTitle>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalFamilies}</div>
                  <p className="text-xs text-muted-foreground mt-1">Famílias com compartilhamento integrado</p>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="p-4 rounded-xl border border-border bg-muted/10">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Saúde do Banco de Dados
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• As estatísticas são compiladas e integradas diretamente dos esquemas da tabela Supabase Postgres.</p>
              <p>• Volumes transacionados consideram apenas moedas registradas como BRL. Valores em outras moedas estrangeiras não são consolidados na conversão global padrão.</p>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Gerenciar Usuários */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-[350px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mostrando {filteredUsers.length} de {enrichedUsers.length} usuários cadastrados.
            </p>
          </div>

          {isLoadingUsers ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Mapeando usuários e carregando estatísticas individuais...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center border border-border rounded-xl">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-semibold text-sm">Nenhum usuário localizado</p>
              <p className="text-xs text-muted-foreground">Tente alterar os termos da busca.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-center">Indicadores</TableHead>
                    <TableHead className="text-right">Saldo Líquido</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105"
                            style={{ backgroundColor: user.avatar_color || '#10b981' }}
                          >
                            {getInitials(user.full_name || user.email)}
                          </div>
                          <div>
                            <p className="font-medium text-sm leading-none">{user.full_name || 'Sem Nome'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium" title="Contas Bancárias">
                            🏦 {user.accountsCount}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium" title="Transações">
                            💼 {user.transactionsCount}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium" title="Investimentos">
                            📈 {user.assetsCount}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-semibold text-sm",
                        user.totalBalance > 0 ? "text-positive" : user.totalBalance < 0 ? "text-negative" : "text-muted-foreground"
                      )}>
                        {formatCurrency(user.totalBalance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-medium"
                            onClick={() => openUserDetailModal(user)}
                          >
                            Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10"
                            disabled={isRecalculatingTarget === user.id}
                            onClick={() => handleRecalculateTargetBalances(user.id)}
                            title="Recalcular saldos deste usuário"
                          >
                            {isRecalculatingTarget === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => {
                              setSelectedUser(user.id);
                              setShowConfirmDialog(true);
                            }}
                            title="Resetar dados deste usuário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Logs de Auditoria */}
        <TabsContent value="audit" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Fila de Eventos de Conciliação</h4>
              <p className="text-xs text-muted-foreground">Lista recente de ações financeiras auditadas (Tabela `audit_logs` no Postgres)</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { error } = await supabase.rpc('clean_old_audit_logs', {
                    admin_password: ADMIN_PASSWORD,
                    p_days_to_keep: 30
                  });
                  if (error) throw error;
                  toast.success("Logs mais antigos que 30 dias limpos com sucesso!");
                  loadAuditLogs();
                } catch (err: any) {
                  toast.error("Erro ao limpar logs: " + err.message);
                }
              }}
            >
              Excluir Logs Antigos (&gt;30d)
            </Button>
          </div>

          {isLoadingLogs ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Lendo registros de auditoria financeira...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center border border-border rounded-xl bg-card">
              <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-semibold text-sm">Nenhum evento registrado</p>
              <p className="text-xs text-muted-foreground">O sistema ainda não registrou eventos de conciliação ou auditoria.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {auditLogs.map((log) => {
                const { opType, reason, amount, currency, isSettlement, isBlocked } = parseAuditLog(log);
                
                return (
                  <div key={log.id} className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-muted-foreground/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          className={cn(
                            "text-[10px] font-semibold py-0.5 px-2.5",
                            isSettlement ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                            isBlocked ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                            "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}
                          variant="outline"
                        >
                          {opType}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Executado por: <span className="font-medium text-foreground">{getUserEmail(log.user_id || '')}</span>
                      </p>
                    </div>
                    {amount !== null && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{currency || 'BRL'}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Ferramentas de Manutenção */}
        <TabsContent value="maintenance" className="space-y-6">
          {/* Orphan Transactions Manager integration */}
          <OrphanTransactionsManager />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database vacuum */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5" />
                  Manutenção do Banco de Dados
                </CardTitle>
                <CardDescription>
                  Remova registros obsoletos inativos (soft deleted) para liberar armazenamento e otimizar queries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Atenção: A purga definitiva excluirá fisicamente do banco de dados registros que já foram marcados como deletados no app.
                </div>
                <Button
                  onClick={handlePurgeSoftDeleted}
                  disabled={isPurging}
                  variant="outline"
                  className="w-full gap-2 border-amber-500/30 text-amber-600 hover:text-amber-700 hover:bg-amber-500/5"
                >
                  {isPurging ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Purgar Registros Deletados
                </Button>
              </CardContent>
            </Card>

            {/* Default category injector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-5 w-5" />
                  Injetor de Categorias Padrão
                </CardTitle>
                <CardDescription>
                  Recrie e alinhe a hierarquia de categorias padrão de despesas/receitas caso o usuário possua falhas de cadastro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Selecionar Usuário Alvo</label>
                  <Select onValueChange={(val) => handleInjectDefaultCategories(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrichedUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Isso irá verificar se o usuário não possui categorias e injetar as categorias estruturais corretas (🍔 Alimentação, 🏠 Habitação, etc.) e subcategorias correspondentes.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Global Balance Recalculate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-5 w-5" />
                Sincronizar Saldos de Contas
              </CardTitle>
              <CardDescription>
                Calcula e reconcilia os saldos acumulados de todas as contas ativas do app inteiro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => recalculateBalances.mutate()}
                disabled={recalculateBalances.isPending}
                variant="outline"
                className="w-full gap-2"
              >
                {recalculateBalances.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Reconciliar Saldos Globais
              </Button>
            </CardContent>
          </Card>

          {/* Warning section */}
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
            <h4 className="font-semibold text-sm text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              ZONA CRÍTICA: Limpeza e Redefinição Global
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Use as ferramentas a seguir apenas sob extrema necessidade corporativa de redefinição de demonstração.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedUser} onValueChange={setSelectedUser} className="w-full sm:w-[300px]">
                <SelectTrigger className="border-red-500/30">
                  <SelectValue placeholder="Selecione um escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-red-500 font-semibold">
                    🔴 TODO O SISTEMA (Todos os dados de todos os usuários)
                  </SelectItem>
                  {enrichedUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="destructive" 
                onClick={() => setShowConfirmDialog(true)}
                className="shadow-lg shadow-red-500/10"
              >
                {selectedUser === 'all' ? 'Resetar Todo o Banco de Dados' : 'Resetar Usuário Selecionado'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* View User Details Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Dossiê Financeiro do Usuário
            </DialogTitle>
            <DialogDescription>Dados e relacionamentos cadastrados na plataforma</DialogDescription>
          </DialogHeader>
          {selectedDetailUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundColor: selectedDetailUser.avatar_color || '#10b981' }}
                >
                  {getInitials(selectedDetailUser.full_name || selectedDetailUser.email)}
                </div>
                <div>
                  <h4 className="font-semibold text-base">{selectedDetailUser.full_name || 'Sem Nome'}</h4>
                  <p className="text-xs text-muted-foreground">{selectedDetailUser.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">ID: {selectedDetailUser.id}</p>
                </div>
              </div>
              
              <div className="border-t border-border pt-4 space-y-3">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contas Bancárias Ativas</h5>
                {isLoadingDetails ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                ) : detailAccounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma conta cadastrada</p>
                ) : (
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {detailAccounts.map((acc, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 rounded bg-muted/30">
                        <span className="font-medium">{acc.name} <Badge variant="outline" className="text-[8px] py-0 px-1 ml-1">{acc.type}</Badge></span>
                        <span className={cn("font-semibold", acc.balance >= 0 ? "text-positive" : "text-negative")}>
                          {formatCurrency(Number(acc.balance))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grupos Familiares Associados</h5>
                {isLoadingDetails ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                ) : detailFamilies.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Não pertence a nenhum grupo familiar</p>
                ) : (
                  <div className="space-y-2">
                    {detailFamilies.map((fam, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 rounded bg-muted/30">
                        <span className="font-medium">👨‍👩‍👧‍👦 {fam.name}</span>
                        <span className="text-[10px] font-mono capitalize px-2 py-0.5 rounded bg-foreground/10 text-foreground">
                          {fam.role} ({fam.status})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Safety Reset Alert Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
              CONFIRMAR COMPROMETIMENTO E EXCLUSÃO DE DADOS
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {selectedUser === "all"
                  ? "Você está prestes a EXCLUIR DEFINITIVAMENTE TODOS OS DADOS de TODOS os usuários do banco de dados (Contas, Transações, Parcelamentos, Investimentos, Splits e Orçamentos)."
                  : "Você está prestes a excluir permanentemente todo o histórico financeiro e perfil do usuário selecionado. Os membros de famílias associadas serão notificados imediatamente."
                }
              </p>
              <div className="p-3 rounded-lg bg-red-500/5 text-xs text-red-600 dark:text-red-400 font-medium">
                Esta operação é IRREVERSÍVEL! Os dados serão removidos do servidor Supabase Postgres sem possibilidade de restauração.
              </div>
              <div className="pt-2">
                <Label className="text-xs font-semibold">
                  Digite <span className="font-bold text-red-600">{CONFIRM_WORD}</span> abaixo para validar a operação administrativa:
                </Label>
                <Input
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
                  placeholder={CONFIRM_WORD}
                  className="mt-2 border-red-300 focus-visible:ring-red-500"
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redefinindo...
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
