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
    // ⚠️ IMPORTANTE: Este método deleta APENAS DADOS (registros), NÃO estrutura do banco
    // ✅ PRESERVADO: Tabelas, triggers, funções, índices, políticas RLS, foreign keys
    // ❌ DELETADO: Apenas registros inseridos pelos usuários
    
    // Ordem de exclusão respeitando Foreign Keys
    // Tabelas filhas ANTES de tabelas pais para evitar violação de FK
    const tables = [
      // Transações e relacionados
      'transaction_splits',           // Filho de transactions
      'shared_transaction_mirrors',   // Filho de transactions
      'transaction_audit',            // Filho de transactions (auditoria)
      'financial_ledger',             // Filho de transactions
      'pending_operations',           // Operações pendentes
      'transactions',                 // Filho de accounts, profiles
      
      // Viagens e relacionados
      'trip_checklist',               // Filho de trips
      'trip_exchange_purchases',      // Filho de trips
      'trip_itinerary',               // Filho de trips
      'trip_invitations',             // Filho de trips
      'trip_members',                 // Filho de trips
      'trip_participants',            // Filho de trips
      'trips',                        // Filho de profiles
      
      // Família e relacionados
      'family_invitations',           // Filho de families
      'family_members',               // Filho de families
      'families',                     // Filho de profiles
      
      // Contas e finanças
      'accounts',                     // Filho de profiles
      'budgets',                      // Filho de profiles
      'goals',                        // Metas financeiras
      'assets',                       // Ativos/investimentos
      'financial_snapshots',          // Snapshots financeiros
      
      // Categorias
      'categories',                   // Categorias personalizadas
      
      // Notificações
      'notifications',                // Notificações
      'notification_preferences',     // Preferências de notificação
      
      // Sistema de compartilhamento
      'shared_transaction_requests',  // Requests de compartilhamento
      'shared_system_audit_logs',     // Logs de auditoria
      'shared_operation_queue',       // Fila de operações
      'shared_circuit_breaker',       // Circuit breaker
      
      // Auditoria (se implementado)
      'audit_log',                    // Audit log geral
    ];

    for (const table of tables) {
      try {
        // DELETE FROM: Remove registros, preserva estrutura da tabela
        // NÃO usa DROP TABLE (que deletaria a tabela inteira)
        const { error } = await supabase
          .from(table as any)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
          console.warn(`Erro ao limpar ${table}:`, error.message);
        } else {
          console.log(`✅ Tabela ${table} limpa com sucesso`);
        }
      } catch (err) {
        console.warn(`Erro ao limpar ${table}:`, err);
      }
    }
  };

  const resetSingleUser = async (userId: string) => {
    // ⚠️ IMPORTANTE: Este método deleta APENAS DADOS do usuário específico
    // ✅ PRESERVADO: Estrutura do banco (tabelas, triggers, funções, etc.)
    // ✅ PRESERVADO: Dados de outros usuários
    // ❌ DELETADO: TODOS os registros deste usuário
    
    console.log(`🗑️ Iniciando reset do usuário: ${userId}`);
    
    // 1. Buscar famílias onde o usuário é membro
    const { data: userFamilyMemberships } = await supabase
      .from('family_members')
      .select('family_id, families(name)')
      .eq('user_id', userId);

    // 2. Buscar outros membros das famílias para notificar
    const familyIds = userFamilyMemberships?.map(m => m.family_id) || [];
    
    if (familyIds.length > 0) {
      // Buscar outros membros para notificar
      const { data: otherMembers } = await supabase
        .from('family_members')
        .select('user_id, family_id')
        .in('family_id', familyIds)
        .neq('user_id', userId);

      // Buscar nome do usuário que está saindo
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      const userName = userProfile?.full_name || userProfile?.email || 'Um membro';

      // Criar notificações para os outros membros
      if (otherMembers && otherMembers.length > 0) {
        const notifications = otherMembers.map(member => ({
          user_id: member.user_id,
          type: 'family_member_left',
          title: 'Membro saiu da família',
          message: `${userName} saiu do grupo familiar. Todos os dados foram removidos.`,
          read: false,
        }));

        await supabase.from('notifications').insert(notifications);
      }
    }

    // 3. Deletar TODOS os dados do usuário na ordem correta (respeitando FKs)
    // ⚠️ NOTA: Usa DELETE FROM (deleta registros), NÃO DROP TABLE (deletaria estrutura)
    
    console.log('🗑️ Deletando transações e relacionados...');
    
    // 3.1 Transações e relacionados (ordem: filhos antes de pais)
    await supabase.from('transaction_splits').delete().eq('user_id', userId);
    console.log('✅ transaction_splits deletados');
    
    // Buscar transações do usuário para deletar mirrors e ledger
    const { data: userTransactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId);
    
    if (userTransactions && userTransactions.length > 0) {
      const txIds = userTransactions.map(t => t.id);
      
      // Deletar mirrors
      await supabase.from('shared_transaction_mirrors').delete().in('source_transaction_id', txIds);
      console.log('✅ shared_transaction_mirrors deletados');
      
      // Deletar ledger entries
      await supabase.from('financial_ledger').delete().in('transaction_id', txIds);
      console.log('✅ financial_ledger deletados');
      
      // Deletar audit
      await supabase.from('transaction_audit').delete().in('transaction_id', txIds);
      console.log('✅ transaction_audit deletados');
    }
    
    // Deletar mirrors onde o usuário é o dono
    await supabase.from('shared_transaction_mirrors').delete().eq('user_id', userId);
    
    // Deletar ledger entries do usuário
    await supabase.from('financial_ledger').delete().eq('user_id', userId);
    
    // Deletar operações pendentes
    await supabase.from('pending_operations').delete().eq('user_id', userId);
    console.log('✅ pending_operations deletados');
    
    // Deletar transações
    await supabase.from('transactions').delete().eq('user_id', userId);
    console.log('✅ transactions deletados');

    console.log('🗑️ Deletando viagens e relacionados...');
    
    // 3.2 Viagens - deletar participações e viagens criadas pelo usuário
    const { data: userTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('owner_id', userId);

    if (userTrips && userTrips.length > 0) {
      const tripIds = userTrips.map(t => t.id);
      await supabase.from('trip_checklist').delete().in('trip_id', tripIds);
      await supabase.from('trip_exchange_purchases').delete().in('trip_id', tripIds);
      await supabase.from('trip_itinerary').delete().in('trip_id', tripIds);
      await supabase.from('trip_invitations').delete().in('trip_id', tripIds);
      await supabase.from('trip_members').delete().in('trip_id', tripIds);
      await supabase.from('trip_participants').delete().in('trip_id', tripIds);
      await supabase.from('trips').delete().in('id', tripIds);
      console.log(`✅ ${tripIds.length} viagens e relacionados deletados`);
    }

    // Remover participações em viagens de outros
    await supabase.from('trip_members').delete().eq('user_id', userId);
    await supabase.from('trip_participants').delete().eq('user_id', userId);
    await supabase.from('trip_invitations').delete().eq('invitee_id', userId);
    console.log('✅ Participações em viagens removidas');

    console.log('🗑️ Deletando família e relacionados...');
    
    // 3.3 Família - remover membro e convites
    await supabase.from('family_invitations').delete().eq('invited_user_id', userId);
    await supabase.from('family_invitations').delete().eq('from_user_id', userId);
    await supabase.from('family_members').delete().eq('user_id', userId);
    console.log('✅ Membros e convites de família deletados');

    // Verificar se o usuário é owner de alguma família e deletar a família
    const { data: ownedFamilies } = await supabase
      .from('families')
      .select('id')
      .eq('owner_id', userId);
    
    if (ownedFamilies && ownedFamilies.length > 0) {
      const ownedFamilyIds = ownedFamilies.map(f => f.id);
      
      // Deletar membros das famílias
      await supabase.from('family_members').delete().in('family_id', ownedFamilyIds);
      
      // Deletar convites das famílias
      await supabase.from('family_invitations').delete().in('family_id', ownedFamilyIds);
      
      // Deletar famílias
      await supabase.from('families').delete().in('id', ownedFamilyIds);
      console.log(`✅ ${ownedFamilyIds.length} famílias (owner) deletadas`);
    }

    // Verificar famílias vazias e deletar
    for (const familyId of familyIds) {
      const { data: remainingMembers } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', familyId);

      if (!remainingMembers || remainingMembers.length === 0) {
        // Família ficou vazia, deletar
        await supabase.from('family_invitations').delete().eq('family_id', familyId);
        await supabase.from('families').delete().eq('id', familyId);
        console.log(`✅ Família vazia ${familyId} deletada`);
      }
    }

    console.log('🗑️ Deletando contas, orçamentos e finanças...');
    
    // 3.4 Contas e orçamentos
    await supabase.from('accounts').delete().eq('user_id', userId);
    console.log('✅ accounts deletados');
    
    await supabase.from('budgets').delete().eq('user_id', userId);
    console.log('✅ budgets deletados');
    
    // Metas financeiras
    await supabase.from('goals').delete().eq('user_id', userId);
    console.log('✅ goals deletados');
    
    // Ativos/investimentos
    await supabase.from('assets').delete().eq('user_id', userId);
    console.log('✅ assets deletados');
    
    // Snapshots financeiros
    await supabase.from('financial_snapshots').delete().eq('user_id', userId);
    console.log('✅ financial_snapshots deletados');

    console.log('🗑️ Deletando categorias...');
    
    // 3.5 Categorias personalizadas
    await supabase.from('categories').delete().eq('user_id', userId);
    console.log('✅ categories deletados');

    console.log('🗑️ Deletando notificações...');
    
    // 3.6 Notificações do usuário
    await supabase.from('notifications').delete().eq('user_id', userId);
    console.log('✅ notifications deletados');
    
    await supabase.from('notification_preferences').delete().eq('user_id', userId);
    console.log('✅ notification_preferences deletados');

    console.log('🗑️ Deletando dados de compartilhamento...');
    
    // 3.7 Sistema de compartilhamento
    await supabase.from('shared_transaction_requests').delete().eq('from_user_id', userId);
    await supabase.from('shared_transaction_requests').delete().eq('to_user_id', userId);
    console.log('✅ shared_transaction_requests deletados');
    
    await supabase.from('shared_operation_queue').delete().eq('user_id', userId);
    console.log('✅ shared_operation_queue deletados');

    console.log('🗑️ Deletando audit logs...');
    
    // 3.8 Audit logs
    await supabase.from('audit_log').delete().eq('user_id', userId);
    console.log('✅ audit_log deletados');
    
    await supabase.from('shared_system_audit_logs').delete().eq('user_id', userId);
    console.log('✅ shared_system_audit_logs deletados');

    console.log('✅ Reset do usuário concluído com sucesso!');
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
