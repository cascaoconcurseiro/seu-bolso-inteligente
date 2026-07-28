/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
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




import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock,
  Sparkle,
  Bug,
  Database,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRecalculateBalances } from "@/hooks/useAccountManagement";
import {
  UserDetailDialog,
  SafetyResetAlertDialog,
  ErrorDetailDialog,
} from "./admin/AdminDialogs";

// A senha administrativa não é mais mantida em texto puro no código do frontend
const CONFIRM_WORD = "RESETAR";

import { useAdminActions } from "@/hooks/useAdminActions";
import {
  Activity,
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Info,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export function AdminResetPanel() {
  const recalculateBalances = useRecalculateBalances();
  const {
    isAuthenticated,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    passwordError,
    setPasswordError,
    enrichedUsers,
    auditLogs,
    errorLogs,
    stats,
    searchQuery,
    setSearchQuery,
    selectedUser,
    setSelectedUser,
    confirmWord,
    setConfirmWord,
    showConfirmDialog,
    setShowConfirmDialog,
    isResetting,
    isLoadingStats,
    isLoadingUsers,
    isLoadingLogs,
    isLoadingErrorLogs,
    isPurging,
    isRecalculatingTarget,
    isResettingPassword,
    handleResetUserPassword,
    userDetailOpen,
    setUserDetailOpen,
    selectedDetailUser,
    detailAccounts,
    detailFamilies,
    isLoadingDetails,
    selectedErrorLog,
    setSelectedErrorLog,
    errorDetailOpen,
    setErrorDetailOpen,
    handleAuthenticate,
    handleLogout,
    handlePurgeSoftDeleted,
    handleRecalculateTargetBalances,
    handleInjectDefaultCategories,
    handleReset,
    filteredUsers,
    loadAllAdminData,
    loadAuditLogs,
    loadErrorLogs,
    parseAuditLog,
    formatCurrency,
    getInitials,
    getUserEmail,
    resolveErrorLog,
    openUserDetailModal,
  } = useAdminActions();

  // Authenticator screen
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="p-6 rounded-2xl border-2 border-warning/30 bg-gradient-to-b from-warning/10 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center text-warning dark:text-warning">
              <Shield className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-warning">Área Administrativa Restrita</h3>
              <p className="text-sm text-muted-foreground">
                Console central de administração corporativa
              </p>
            </div>
          </div>

          <p className="text-sm text-warning dark:text-warning mb-6">
            ⚠️ Acesso restrito apenas para engenheiros e administradores do sistema. Insira a chave
            criptográfica para descriptografar os painéis de manutenção.
          </p>

          <div className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label className="text-sm text-warning font-medium">Chave de Administrador</Label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  name="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha Administrativa"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                  className={cn(
                    "pr-10 border-warning/30 focus-visible:ring-warning bg-background/50",
                    passwordError && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-warning hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive font-medium">
                  Credencial administrativa inválida.
                </p>
              )}
            </div>

            <Button
              onClick={handleAuthenticate}
              className="w-full bg-warning hover:bg-warning/92 text-white font-medium shadow-lg shadow-warning/20"
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
            <h3 className="font-display font-semibold text-base flex items-center gap-2">
              Painel Administrativo do Sistema
              <Badge
                variant="outline"
                className="text-sm bg-success/10 text-success border-success/20 gap-2 py-0 px-2"
              >
                <span className="h-2 w-1.5 rounded-full bg-success animate-ping" />
                Operacional
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Monitoramento global, manutenção estrutural e integridade de transações.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAllAdminData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:bg-destructive/10"
          >
            Sair do Admin
          </Button>
        </div>
      </div>

      {/* Main Tabs Dashboard */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full lg:w-[750px] bg-muted/50 p-1 rounded-xl overflow-x-auto">
          <TabsTrigger value="overview" className="rounded-lg gap-2 text-sm">
            <Sparkle className="h-3.5 w-3.5" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg gap-2 text-sm">
            <Users className="h-3.5 w-3.5" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg gap-2 text-sm">
            <History className="h-3.5 w-3.5" />
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="errors" className="rounded-lg gap-2 text-sm">
            <Bug className="h-3.5 w-3.5" />
            Erros
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-lg gap-2 text-sm">
            <Wrench className="h-3.5 w-3.5" />
            Manutenção
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {isLoadingStats ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Compilando estatísticas do sistema…</p>
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
                  <p className="text-sm text-muted-foreground mt-1">Perfis cadastrados na base</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Volume Transacionado</CardTitle>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Movimentações financeiras sob gestão
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-success/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Transações Totais</CardTitle>
                  <Activity className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                  <p className="text-sm text-muted-foreground mt-1">Registros de fluxo de caixa</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Contas e Cartões</CardTitle>
                  <Database className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAccounts}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contas bancárias e cartões ativos
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Investimentos e Ativos</CardTitle>
                  <Briefcase className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAssets}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ativos imobiliários, ações e tesouro
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-warning/5 via-transparent to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Grupos Familiares</CardTitle>
                  <Sparkles className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalFamilies}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Famílias com compartilhamento integrado
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="p-4 rounded-xl border border-border bg-muted/10">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Saúde do Banco de Dados
            </h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                • As estatísticas são compiladas e integradas diretamente dos esquemas da tabela
                Supabase Postgres.
              </p>
              <p>
                • Volumes transacionados consideram apenas moedas registradas como BRL. Valores em
                outras moedas estrangeiras não são consolidados na conversão global padrão.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Gerenciar Usuários */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-[350px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="adminUserSearch"
                name="adminUserSearch"
                placeholder="Buscar usuário por nome ou email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredUsers.length} de {enrichedUsers.length} usuários cadastrados.
            </p>
          </div>

          {isLoadingUsers ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Mapeando usuários e carregando estatísticas individuais…
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center border border-border rounded-xl">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-semibold text-sm">Nenhum usuário localizado</p>
              <p className="text-sm text-muted-foreground">Tente alterar os termos da busca.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-center">Indicadores</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105"
                            style={{ backgroundColor: user.avatar_color || "#10b981" }}
                          >
                            {getInitials(user.full_name || user.email)}
                          </div>
                          <div>
                            <p className="font-medium text-sm leading-none">
                              {user.full_name || "Sem Nome"}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-sm py-0 px-2 font-medium"
                            title="Contas Bancárias"
                          >
                            🏦 {user.accountsCount}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-sm py-0 px-2 font-medium"
                            title="Transações"
                          >
                            💼 {user.transactionsCount}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-sm py-0 px-2 font-medium"
                            title="Investimentos"
                          >
                            📈 {user.assetsCount}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-sm font-medium"
                            onClick={() => openUserDetailModal(user)}
                          >
                            Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-accent hover:text-accent/80 hover:bg-accent/10"
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
                            className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                            disabled={isResettingPassword === user.id}
                            onClick={() => handleResetUserPassword(user.email, user.id)}
                            title="Enviar e-mail para redefinir senha (LGPD Seguro)"
                          >
                            {isResettingPassword === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Key className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/12"
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
              <p className="text-sm text-muted-foreground">
                Lista recente de ações financeiras auditadas (Tabela `audit_logs` no Postgres)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { error } = await supabase.rpc("clean_old_audit_logs", {
                    admin_password: password,
                    p_days_to_keep: 30,
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
              <p className="text-sm text-muted-foreground">
                Lendo registros de auditoria financeira…
              </p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center border border-border rounded-xl bg-card">
              <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-semibold text-sm">Nenhum evento registrado</p>
              <p className="text-sm text-muted-foreground">
                O sistema ainda não registrou eventos de conciliação ou auditoria.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {auditLogs.map((log) => {
                const { opType, reason, amount, currency, isSettlement, isBlocked } =
                  parseAuditLog(log);

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-muted-foreground/30"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={cn(
                            "text-xs font-semibold py-0.5 px-2.5",
                            isSettlement
                              ? "bg-success/10 text-success border-success/20"
                              : isBlocked
                                ? "bg-destructive/12 text-destructive border-destructive/20"
                                : "bg-warning/10 text-warning border-warning/20"
                          )}
                          variant="outline"
                        >
                          {opType}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{reason}</p>
                      <p className="text-sm text-muted-foreground">
                        Executado por:{" "}
                        <span className="font-medium text-foreground">
                          {getUserEmail(log.user_id || "")}
                        </span>
                      </p>
                    </div>
                    {amount !== null && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">{currency || "BRL"}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab Erros */}
        <TabsContent value="errors" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Central de Relatórios de Erros</h4>
              <p className="text-sm text-muted-foreground">
                Erros capturados e enviados pelos usuários
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadErrorLogs}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>

          {isLoadingErrorLogs ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Lendo relatórios de erros...</p>
            </div>
          ) : errorLogs.length === 0 ? (
            <div className="p-12 text-center border border-border rounded-xl bg-card">
              <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
              <p className="font-semibold text-sm">Nenhum erro reportado</p>
              <p className="text-sm text-muted-foreground">
                Tudo funcionando perfeitamente no momento.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className={log.status === "resolved" ? "opacity-50" : ""}
                    >
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {log.user_email || "Anônimo / Deslogado"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-[200px]" title={log.error_message}>
                          {log.error_message}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === "resolved" ? "secondary" : "destructive"}
                          className="text-sm"
                        >
                          {log.status === "resolved" ? "Resolvido" : "Aberto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-sm font-medium"
                          onClick={() => {
                            setSelectedErrorLog(log);
                            setErrorDetailOpen(true);
                          }}
                        >
                          Detalhes Técnicos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                  Remova registros obsoletos inativos (soft deleted) para liberar armazenamento e
                  otimizar queries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-sm text-warning dark:text-warning">
                  ⚠️ Atenção: A purga definitiva excluirá fisicamente do banco de dados registros
                  que já foram marcados como deletados no app.
                </div>
                <Button
                  onClick={handlePurgeSoftDeleted}
                  disabled={isPurging}
                  variant="outline"
                  className="w-full gap-2 border-warning/30 text-warning hover:text-warning hover:bg-warning/5"
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
                  Recrie e alinhe a hierarquia de categorias padrão de despesas/receitas caso o
                  usuário possua falhas de cadastro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecionar Usuário Alvo</label>
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
                <p className="text-sm text-muted-foreground">
                  Isso irá verificar se o usuário não possui categorias e injetar as categorias
                  estruturais corretas (🍔 Alimentação, 🏠 Habitação, etc.) e subcategorias
                  correspondentes.
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
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
            <h4 className="font-semibold text-sm text-destructive dark:text-destructive mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              ZONA CRÍTICA: Limpeza e Redefinição Global
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Use as ferramentas a seguir apenas sob extrema necessidade corporativa de redefinição
              de demonstração.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full border-destructive/30 sm:w-[300px]">
                  <SelectValue placeholder="Selecione um escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-destructive font-semibold">
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
                className="shadow-lg shadow-destructive/10"
              >
                {selectedUser === "all"
                  ? "Resetar Todo o Banco de Dados"
                  : "Resetar Usuário Selecionado"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* View User Details Dialog */}
      <UserDetailDialog
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        selectedDetailUser={selectedDetailUser}
        isLoadingDetails={isLoadingDetails}
        detailAccounts={detailAccounts}
        detailFamilies={detailFamilies}
        isResettingPassword={isResettingPassword}
        handleResetUserPassword={handleResetUserPassword}
      />

      {/* Safety Reset Alert Dialog */}
      <SafetyResetAlertDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        selectedUser={selectedUser}
        confirmWord={confirmWord}
        setConfirmWord={setConfirmWord}
        isResetting={isResetting}
        handleReset={handleReset}
      />

      {/* Error Details Modal */}
      <ErrorDetailDialog
        open={errorDetailOpen}
        onOpenChange={setErrorDetailOpen}
        selectedErrorLog={selectedErrorLog}
        resolveErrorLog={resolveErrorLog}
      />
    </div>
  );
}
