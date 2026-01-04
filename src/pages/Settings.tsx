import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  Users,
  Palette,
  Bell,
  Plus,
  Moon,
  Sun,
  Trash2,
  Loader2,
  User,
  Lock,
  Mail,
  LogOut,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Download,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { useUserProfile, useUpdateUserProfile, useUpdatePassword, useDeleteAccount } from "@/hooks/useUserProfile";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { AdminResetPanel } from "@/components/settings/AdminResetPanel";
import { AvatarCustomizer } from "@/components/settings/AvatarCustomizer";

type SettingsSection = "account" | "categories" | "people" | "appearance" | "notifications" | "maintenance";

export function Settings() {
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const { preferences, isLoading: prefsLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  
  // Profile state
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const updatePassword = useUpdatePassword();
  const deleteAccount = useDeleteAccount();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  // Verificar se veio da URL com section=notifications
  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'notifications') {
      setActiveSection('notifications');
    } else if (section === 'account') {
      setActiveSection('account');
    }
  }, [searchParams]);

  // Initialize name when profile loads
  useEffect(() => {
    if (profile?.name) {
      setNewName(profile.name);
    }
  }, [profile?.name]);

  // Form state for categories
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"expense" | "income">("expense");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦");

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();

  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
  };

  const handleCreateCategory = async () => {
    await createCategory.mutateAsync({
      name: newCategoryName,
      type: newCategoryType,
      icon: newCategoryIcon,
    });
    setShowAddCategoryDialog(false);
    setNewCategoryName("");
    setNewCategoryType("expense");
    setNewCategoryIcon("📦");
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateProfile.mutateAsync({ name: newName.trim() });
    setEditingName(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      return;
    }
    if (newPassword.length < 6) {
      return;
    }
    await updatePassword.mutateAsync({ newPassword });
    setShowChangePasswordDialog(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "EXCLUIR") return;
    await deleteAccount.mutateAsync();
    setShowDeleteAccountDialog(false);
  };

  const sections = [
    { id: "account" as const, label: "Perfil", icon: User },
    { id: "categories" as const, label: "Categorias", icon: Tag, count: categories.length },
    { id: "people" as const, label: "Pessoas", icon: Users, count: members.length },
    { id: "appearance" as const, label: "Aparência", icon: Palette },
    { id: "notifications" as const, label: "Notificações", icon: Bell },
    { id: "maintenance" as const, label: "Manutenção", icon: Wrench },
  ];

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-3xl tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Personalize o app</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu */}
        <nav className="lg:col-span-1 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left",
                activeSection === section.id
                  ? "bg-foreground text-background"
                  : "hover:bg-muted hover:translate-x-1"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5" />
                <span className="font-medium">{section.label}</span>
              </div>
              {section.count !== undefined && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full transition-all",
                  activeSection === section.id ? "bg-background/20" : "bg-muted"
                )}>
                  {section.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="lg:col-span-3 p-6 rounded-xl border border-border">
          {/* Account */}
          {activeSection === "account" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="font-display font-semibold text-lg">Perfil</h2>
                <p className="text-sm text-muted-foreground">Gerencie seus dados e segurança</p>
              </div>

              {profileLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Profile Info */}
                  <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-foreground/80 to-foreground 
                                      text-background flex items-center justify-center text-xl font-bold">
                        {getInitials(profile?.name || user?.email || "U")}
                      </div>
                      <div className="flex-1">
                        {editingName ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="max-w-xs"
                              placeholder="Seu nome"
                              autoFocus
                            />
                            <Button 
                              size="sm" 
                              onClick={handleSaveName}
                              disabled={updateProfile.isPending}
                            >
                              {updateProfile.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setEditingName(false);
                                setNewName(profile?.name || "");
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{profile?.name || "Sem nome"}</p>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setEditingName(true)}
                            >
                              Editar
                            </Button>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Avatar Customization */}
                  <div className="p-4 rounded-xl border border-border">
                    <div className="mb-4">
                      <p className="font-medium mb-1">Personalizar Avatar</p>
                      <p className="text-sm text-muted-foreground">Escolha uma cor e ícone para seu perfil</p>
                    </div>
                    <AvatarCustomizer
                      currentColor={profile?.avatar_color || "green"}
                      currentIcon={profile?.avatar_icon || "user"}
                      onSave={async (color, icon) => {
                        await updateProfile.mutateAsync({ 
                          avatar_color: color, 
                          avatar_icon: icon 
                        });
                      }}
                      isSaving={updateProfile.isPending}
                    />
                  </div>

                  {/* Change Password */}
                  <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Alterar Senha</p>
                          <p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => setShowChangePasswordDialog(true)}
                      >
                        Alterar
                      </Button>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <LogOut className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Sair da Conta</p>
                          <p className="text-sm text-muted-foreground">Encerrar sessão neste dispositivo</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => signOut()}
                      >
                        Sair
                      </Button>
                    </div>
                  </div>

                  {/* Export Data */}
                  <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <Download className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Exportar Dados</p>
                          <p className="text-sm text-muted-foreground">Baixe suas transações em CSV</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => window.location.href = '/transacoes'}
                      >
                        Ir para Transações
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-sm font-medium text-destructive uppercase tracking-wider mb-3">
                      Zona de Perigo
                    </h3>
                    <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium text-destructive">Excluir Conta</p>
                            <p className="text-sm text-muted-foreground">
                              Esta ação é irreversível
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="destructive"
                          onClick={() => setShowDeleteAccountDialog(true)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categories */}
          {activeSection === "categories" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg">Categorias</h2>
                  <p className="text-sm text-muted-foreground">Organize suas transações</p>
                </div>
                <Button 
                  onClick={() => setShowAddCategoryDialog(true)}
                  className="group transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
                  Nova
                </Button>
              </div>
              {categoriesLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">Despesas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories.filter(c => c.type === "expense").map((cat) => (
                        <div
                          key={cat.id}
                          className="group flex items-center justify-between p-3 rounded-xl border border-border 
                                     hover:border-foreground/20 transition-all duration-200 hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl transition-transform group-hover:scale-125">{cat.icon}</span>
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => deleteCategory.mutate(cat.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">Receitas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories.filter(c => c.type === "income").map((cat) => (
                        <div
                          key={cat.id}
                          className="group flex items-center justify-between p-3 rounded-xl border border-border 
                                     hover:border-foreground/20 transition-all duration-200 hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl transition-transform group-hover:scale-125">{cat.icon}</span>
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => deleteCategory.mutate(cat.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* People */}
          {activeSection === "people" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg">Pessoas</h2>
                  <p className="text-sm text-muted-foreground">Membros para dividir despesas</p>
                </div>
              </div>
              {membersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-border rounded-xl">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Nenhum membro</p>
                  <p className="text-sm text-muted-foreground">Adicione membros na página Família</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((person) => (
                    <div
                      key={person.id}
                      className="group flex items-center justify-between p-4 rounded-xl border border-border 
                                 hover:border-foreground/20 transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-foreground/80 to-foreground 
                                        text-background flex items-center justify-center font-medium
                                        transition-transform duration-200 group-hover:scale-110">
                          {getInitials(person.name)}
                        </div>
                        <div>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-muted-foreground">{person.email}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        person.role === "admin" ? "bg-foreground text-background" : "bg-muted"
                      )}>
                        {person.role === "admin" ? "Admin" : person.role === "editor" ? "Editor" : "Visualizador"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Appearance */}
          {activeSection === "appearance" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="font-display font-semibold text-lg">Aparência</h2>
                <p className="text-sm text-muted-foreground">Personalize a interface</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border 
                               hover:border-foreground/20 transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">Modo Escuro</p>
                      <p className="text-sm text-muted-foreground">Tema claro ou escuro</p>
                    </div>
                  </div>
                  <Switch checked={isDark} onCheckedChange={toggleTheme} />
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="font-display font-semibold text-lg">Notificações</h2>
                <p className="text-sm text-muted-foreground">Configure alertas e lembretes do sistema</p>
              </div>
              
              {prefsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Faturas */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Cartões de Crédito
                    </h3>
                    <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Vencimento de Faturas</p>
                          <p className="text-sm text-muted-foreground">
                            Alertas {preferences?.invoice_due_days_before || 3} dias antes do vencimento
                          </p>
                        </div>
                        <Switch 
                          checked={preferences?.invoice_due_enabled ?? true}
                          onCheckedChange={(checked) => updatePreferences({ invoice_due_enabled: checked })}
                          disabled={isUpdating}
                        />
                      </div>
                      {preferences?.invoice_due_enabled && (
                        <div className="mt-4 pt-4 border-t">
                          <Label className="text-sm">Dias de antecedência</Label>
                          <Select 
                            value={String(preferences?.invoice_due_days_before || 3)}
                            onValueChange={(v) => updatePreferences({ invoice_due_days_before: parseInt(v) })}
                          >
                            <SelectTrigger className="w-32 mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 dia</SelectItem>
                              <SelectItem value="2">2 dias</SelectItem>
                              <SelectItem value="3">3 dias</SelectItem>
                              <SelectItem value="5">5 dias</SelectItem>
                              <SelectItem value="7">7 dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Orçamentos */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Orçamentos
                    </h3>
                    <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Alertas de Orçamento</p>
                          <p className="text-sm text-muted-foreground">
                            Aviso quando atingir {preferences?.budget_warning_threshold || 80}% do limite
                          </p>
                        </div>
                        <Switch 
                          checked={preferences?.budget_warning_enabled ?? true}
                          onCheckedChange={(checked) => updatePreferences({ budget_warning_enabled: checked })}
                          disabled={isUpdating}
                        />
                      </div>
                      {preferences?.budget_warning_enabled && (
                        <div className="mt-4 pt-4 border-t">
                          <Label className="text-sm">Limite de alerta</Label>
                          <Select 
                            value={String(preferences?.budget_warning_threshold || 80)}
                            onValueChange={(v) => updatePreferences({ budget_warning_threshold: parseInt(v) })}
                          >
                            <SelectTrigger className="w-32 mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="50">50%</SelectItem>
                              <SelectItem value="70">70%</SelectItem>
                              <SelectItem value="80">80%</SelectItem>
                              <SelectItem value="90">90%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compartilhados */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Despesas Compartilhadas
                    </h3>
                    <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Divisões Pendentes</p>
                          <p className="text-sm text-muted-foreground">
                            Lembrete de valores a receber de membros
                          </p>
                        </div>
                        <Switch 
                          checked={preferences?.shared_pending_enabled ?? true}
                          onCheckedChange={(checked) => updatePreferences({ shared_pending_enabled: checked })}
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recorrências */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Transações Recorrentes
                    </h3>
                    <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Recorrências Pendentes</p>
                          <p className="text-sm text-muted-foreground">
                            Aviso quando há transações recorrentes para gerar
                          </p>
                        </div>
                        <Switch 
                          checked={preferences?.recurring_enabled ?? true}
                          onCheckedChange={(checked) => updatePreferences({ recurring_enabled: checked })}
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metas */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Metas e Economia
                    </h3>
                    <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Progresso de Metas</p>
                          <p className="text-sm text-muted-foreground">
                            Atualizações sobre suas metas de economia
                          </p>
                        </div>
                        <Switch 
                          checked={preferences?.savings_goal_enabled ?? true}
                          onCheckedChange={(checked) => updatePreferences({ savings_goal_enabled: checked })}
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumo Semanal */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Resumos
                    </h3>
                    <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Resumo Semanal</p>
                          <p className="text-sm text-muted-foreground">
                            Relatório semanal das suas finanças
                          </p>
                        </div>
                        <Switch 
                          checked={preferences?.weekly_summary_enabled ?? true}
                          onCheckedChange={(checked) => updatePreferences({ weekly_summary_enabled: checked })}
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email (futuro) */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Canais
                    </h3>
                    <div className="p-4 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-muted-foreground">Notificações por Email</p>
                          <p className="text-sm text-muted-foreground">
                            Em breve - Receba alertas importantes por email
                          </p>
                        </div>
                        <Switch 
                          checked={false}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Maintenance */}
          {activeSection === "maintenance" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="font-display font-semibold text-lg">Manutenção</h2>
                <p className="text-sm text-muted-foreground">Ferramentas administrativas do sistema</p>
              </div>

              {/* Admin Reset Panel - contém todas as ferramentas */}
              <AdminResetPanel />
            </div>
          )}
        </div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma categoria para suas transações</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                placeholder="Ex: Alimentação"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newCategoryType} onValueChange={(value) => setNewCategoryType(value as "expense" | "income")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-8 gap-2 p-2 border rounded-lg max-h-[200px] overflow-y-auto">
                {[
                  // Alimentação
                  "🍔", "🍕", "🍜", "🍱", "🍳", "☕", "🍺", "🍷",
                  // Transporte
                  "🚗", "🚌", "🚇", "✈️", "⛽", "🚕", "🚲", "🛵",
                  // Casa
                  "🏠", "🔌", "💡", "🚿", "🛋️", "🧹", "🔧", "🏗️",
                  // Saúde
                  "💊", "🏥", "🩺", "💉", "🧘", "🏋️", "🦷", "👓",
                  // Educação
                  "📚", "🎓", "✏️", "💻", "🎨", "🎵", "📖", "🧠",
                  // Lazer
                  "🎬", "🎮", "🎭", "🎪", "🏖️", "⚽", "🎾", "🎳",
                  // Compras
                  "🛒", "👕", "👗", "👟", "💄", "🎁", "📦", "🛍️",
                  // Finanças
                  "💰", "💳", "🏦", "📈", "💵", "🪙", "💎", "📊",
                  // Trabalho
                  "💼", "📱", "🖥️", "📧", "📝", "🗂️", "📋", "🔒",
                  // Pets
                  "🐕", "🐈", "🐠", "🐦", "🐾", "🦴", "🐶", "🐱",
                  // Outros
                  "❤️", "⭐", "🔥", "✨", "🎯", "🏆", "🎉", "📌",
                ].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCategoryIcon(emoji)}
                    className={cn(
                      "w-9 h-9 text-xl rounded-lg hover:bg-muted transition-colors flex items-center justify-center",
                      newCategoryIcon === emoji && "bg-primary/20 ring-2 ring-primary"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecionado: <span className="text-lg">{newCategoryIcon}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateCategory}
              disabled={createCategory.isPending || !newCategoryName}
            >
              {createCategory.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
      />

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>Digite sua nova senha</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input 
                type={showPassword ? "text" : "password"}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">As senhas não coincidem</p>
            )}
            {newPassword && newPassword.length < 6 && (
              <p className="text-sm text-destructive">A senha deve ter no mínimo 6 caracteres</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowChangePasswordDialog(false);
              setNewPassword("");
              setConfirmPassword("");
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={
                updatePassword.isPending || 
                !newPassword || 
                newPassword.length < 6 || 
                newPassword !== confirmPassword
              }
            >
              {updatePassword.isPending ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.
              <br /><br />
              Para confirmar, digite <span className="font-bold">EXCLUIR</span> abaixo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input 
            placeholder="Digite EXCLUIR"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "EXCLUIR" || deleteAccount.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? "Excluindo..." : "Excluir Conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
