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
  Key,
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
  Sparkle,
  Bug,
  Code
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrphanTransactionsManager } from "./OrphanTransactionsManager";
import { useRecalculateBalances } from "@/hooks/useAccountManagement";

// A senha administrativa não é mais mantida em texto puro no código do frontend
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

interface ErrorLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  error_message: string;
  stack_trace: string | null;
  context: string | null;
  status: string;
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



export function useAdminActions() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  
  // States
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
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
  const [isLoadingErrorLogs, setIsLoadingErrorLogs] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isInjectingCategories, setIsInjectingCategories] = useState(false);
  const [isRecalculatingTarget, setIsRecalculatingTarget] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState<string | null>(null);

  const handleResetUserPassword = async (email: string, userId: string) => {
    setIsResettingPassword(userId);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      
      if (error) throw error;
      
      toast.success(`E-mail de redefinição de senha enviado com sucesso para ${email}!`);
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast.error(`Erro ao disparar redefinição de senha: ${error.message}`);
    } finally {
      setIsResettingPassword(null);
    }
  };
  
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedDetailUser, setSelectedDetailUser] = useState<EnrichedUser | null>(null);
  const [detailAccounts, setDetailAccounts] = useState<any[]>([]);
  const [detailFamilies, setDetailFamilies] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [selectedErrorLog, setSelectedErrorLog] = useState<ErrorLog | null>(null);
  const [errorDetailOpen, setErrorDetailOpen] = useState(false);

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
    const isBlocked = false;

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

  const handleAuthenticate = async () => {
    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_system_stats', {
        admin_password: password
      });
      if (error) throw error;
      
      setIsAuthenticated(true);
      setPasswordError(false);
      
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
      
      loadUsersDetailed();
      loadAuditLogs();
      loadErrorLogs();
    } catch (error) {
      setPasswordError(true);
      toast.error("Credencial administrativa inválida");
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadAllAdminData = () => {
    // loadSystemStats is now called in handleAuthenticate
    loadUsersDetailed();
    loadAuditLogs();
    loadErrorLogs();
  };

  const loadSystemStats = async () => {
    setIsLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_system_stats', {
        admin_password: password
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
        admin_password: password
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
        admin_password: password
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

  const loadErrorLogs = async () => {
    setIsLoadingErrorLogs(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_error_logs', {
        admin_password: password
      });
      if (error) throw error;
      setErrorLogs(data || []);
    } catch (error) {
      console.error('Error loading error logs:', error);
      toast.error('Erro ao carregar relatórios de erros');
    } finally {
      setIsLoadingErrorLogs(false);
    }
  };

  const resolveErrorLog = async (reportId: string) => {
    try {
      const { error } = await supabase.rpc('resolve_error_report', {
        admin_password: password,
        p_report_id: reportId
      });
      if (error) throw error;
      toast.success('Erro marcado como resolvido!');
      loadErrorLogs();
      setErrorDetailOpen(false);
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error('Erro ao marcar como resolvido');
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
      admin_password: password
    });
    if (error) throw error;
  };

  const resetSingleUser = async (userId: string) => {
    const { error } = await supabase.rpc('admin_reset_single_user', {
      admin_password: password,
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
        admin_password: password,
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


  return {
    isAuthenticated, setIsAuthenticated,
    password, setPassword,
    showPassword, setShowPassword,
    passwordError, setPasswordError,
    enrichedUsers, setEnrichedUsers,
    auditLogs, setAuditLogs,
    errorLogs, setErrorLogs,
    stats, setStats,
    searchQuery, setSearchQuery,
    selectedUser, setSelectedUser,
    confirmWord, setConfirmWord,
    showConfirmDialog, setShowConfirmDialog,
    isResetting, setIsResetting,
    isLoadingStats, setIsLoadingStats,
    isLoadingUsers, setIsLoadingUsers,
    isLoadingLogs, setIsLoadingLogs,
    isLoadingErrorLogs, setIsLoadingErrorLogs,
    isPurging, setIsPurging,
    isInjectingCategories, setIsInjectingCategories,
    isRecalculatingTarget, setIsRecalculatingTarget,
    isResettingPassword, setIsResettingPassword,
    handleResetUserPassword,
    userDetailOpen, setUserDetailOpen,
    selectedDetailUser, setSelectedDetailUser,
    detailAccounts, setDetailAccounts,
    detailFamilies, setDetailFamilies,
    isLoadingDetails, setIsLoadingDetails,
    selectedErrorLog, setSelectedErrorLog,
    errorDetailOpen, setErrorDetailOpen,
    handleAuth,
    refreshAll,
    handlePurgeUser,
    handleClearCache,
    recalculateAllUsersBalances,
    injectMissingCategories,
    fetchUserDetails,
    filteredUsers,
    handleClearErrorLogs
  };
}
