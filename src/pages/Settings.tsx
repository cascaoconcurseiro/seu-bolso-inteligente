import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { useUserProfile, useUpdateUserProfile, useUpdatePassword, useDeleteAccount } from "@/hooks/useUserProfile";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import { AdminResetPanel } from "@/components/settings/AdminResetPanel";
import { SettingsSidebar, SettingsSection } from "@/components/settings/SettingsSidebar";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { CategorySettings } from "@/components/settings/CategorySettings";
import { PeopleSettings } from "@/components/settings/PeopleSettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { BackupManager } from "@/components/settings/BackupManager";
import { HelpSettings } from "@/components/settings/HelpSettings";
import { AutoShareRulesSettings } from "@/components/settings/AutoShareRulesSettings";

export function Settings() {
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const { showTransactionModal, setShowTransactionModal } = useTransactionModal();
  const { preferences, isLoading: prefsLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const updatePassword = useUpdatePassword();
  const deleteAccount = useDeleteAccount();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'notifications') setActiveSection('notifications');
    else if (section === 'account') setActiveSection('account');
  }, [searchParams]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"expense" | "income">("expense");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦");
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();

  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const handleCreateCategory = async () => {
    await createCategory.mutateAsync({ 
      name: newCategoryName, 
      type: newCategoryType, 
      icon: newCategoryIcon,
      parent_category_id: parentCategoryId
    });
    setShowAddCategoryDialog(false);
    setNewCategoryName("");
    setNewCategoryType("expense");
    setNewCategoryIcon("📦");
    setParentCategoryId(null);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword || newPassword.length < 6) return;
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

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl tracking-tighter">Configurações</h1>
            <p className="text-muted-foreground text-sm font-medium">Personalize sua experiência financeira</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <SettingsSidebar activeSection={activeSection} setActiveSection={setActiveSection} categoriesCount={categories.length} membersCount={members.length} />

        <div className="lg:col-span-3 p-6 rounded-xl border border-border">
          {activeSection === "help" && (
            <HelpSettings />
          )}

          {activeSection === "account" && (
            <AccountSettings
              profile={profile} user={user} profileLoading={profileLoading}
              updateProfile={updateProfile} signOut={signOut}
              onDeleteAccount={() => setShowDeleteAccountDialog(true)}
            />
          )}

          {activeSection === "preferences" && (
            <PreferencesSettings profile={profile} isLoading={profileLoading} updateProfile={updateProfile} />
          )}

          {activeSection === "security" && (
            <SecuritySettings profile={profile} isLoading={profileLoading} updateProfile={updateProfile} onChangePassword={() => setShowChangePasswordDialog(true)} />
          )}

          {activeSection === "categories" && (
            <CategorySettings
              categories={categories} isLoading={categoriesLoading}
              onAddCategory={() => setShowAddCategoryDialog(true)}
              onDeleteCategory={(id) => deleteCategory.mutate(id)}
            />
          )}

          {activeSection === "people" && (
            <PeopleSettings members={members} isLoading={membersLoading} getInitials={getInitials} />
          )}

          {activeSection === "notifications" && (
            <NotificationSettings preferences={preferences} isLoading={prefsLoading} isUpdating={isUpdating} updatePreferences={updatePreferences} profile={profile ?? null} updateProfile={updateProfile} />
          )}

          {activeSection === "backup" && (
            <BackupManager />
          )}

          {activeSection === "automations" && (
            <AutoShareRulesSettings />
          )}

          {activeSection === "admin" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="font-display font-semibold text-base">Área Adm</h2>
                <p className="text-sm text-muted-foreground">Ferramentas administrativas e de integridade do sistema</p>
              </div>
              <div className="max-w-4xl">
                <AdminResetPanel />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:rounded-lg rounded-b-none sm:rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b">
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-2 bg-muted rounded-full" />
          </div>
          <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma nova categoria para suas transações</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input id="new-category-name" name="new-category-name" placeholder="Ex: Mercado, Aluguel…" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newCategoryType} onValueChange={(v: any) => { setNewCategoryType(v); setParentCategoryId(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria Pai (Opcional)</Label>
              <Select value={parentCategoryId || "none"} onValueChange={(v) => setParentCategoryId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (Categoria Principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Categoria Principal)</SelectItem>
                  {categories
                    .filter(c => c.type === newCategoryType && !c.parent_category_id)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1">
                {[
                  "🍔", "🍕", "🍜", "🍱", "🍳", "☕", "🍺", "🍷",
                  "🚗", "🚌", "🚇", "✈️", "⛽", "🚕", "🚲", "🛵",
                  "🏠", "🔌", "💡", "🚿", "🛋️", "🧹", "🔧", "🏗️",
                  "💊", "🏥", "🩺", "💉", "🧘", "🏋️", "🦷", "👓",
                  "📚", "🎓", "✏️", "💻", "🎨", "🎵", "📖", "🧠",
                  "🎬", "🎮", "🎭", "🎪", "🏖️", "⚽", "🎾", "🎳",
                  "🛒", "👕", "👗", "👟", "💄", "🎁", "📦", "🛍️",
                  "💰", "💳", "🏦", "📈", "💵", "🪙", "💎", "📊",
                  "💼", "📱", "🖥️", "📧", "📝", "🗂️", "📋", "🔒",
                  "🐕", "🐈", "🐠", "🐦", "🐾", "🦴", "🐶", "🐱",
                  "❤️", "⭐", "🔥", "✨", "🎯", "🏆", "🎉", "📌",
                ].map((icon) => (
                  <button key={icon} onClick={() => setNewCategoryIcon(icon)} className={cn("h-10 w-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors", newCategoryIcon === icon && "bg-foreground text-background border-foreground")}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAddCategoryDialog(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName || createCategory.isPending} className="flex-1">{createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Categoria"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:rounded-lg rounded-b-none sm:rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b">
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-2 bg-muted rounded-full" />
          </div>
          <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>Digite sua nova senha abaixo</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto hide-scrollbar space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <div className="relative">
                <Input id="new-password" name="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input id="confirm-password" name="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setShowChangePasswordDialog(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={!newPassword || newPassword !== confirmPassword || newPassword.length < 6 || updatePassword.isPending} className="flex-1">{updatePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar Senha"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir Conta Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os seus dados, transações, contas e categorias serão excluídos para sempre.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm font-medium">Para confirmar, digite <span className="font-bold text-destructive">EXCLUIR</span> abaixo:</p>
            <Input id="delete-confirm" name="delete-confirm" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="EXCLUIR" className="border-destructive/50 focus-visible:ring-destructive" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirmText !== "EXCLUIR" || deleteAccount.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleteAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, excluir minha conta"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransactionModal open={showTransactionModal} onOpenChange={setShowTransactionModal} />
    </div>
  );
}
