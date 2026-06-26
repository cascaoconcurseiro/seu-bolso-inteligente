import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, LogOut, AlertTriangle, Check, Download, FileSpreadsheet, FileJson } from "lucide-react";
import { AvatarCustomizer } from "./AvatarCustomizer";
import { avatarIcons } from "@/lib/avatars";
import { supabase } from "@/integrations/supabase/client";
import { exportTransactions } from "@/services/exportService";
import { toast } from "sonner";
import { logger } from '@/utils/logger';

interface AccountSettingsProps {
  profile: any;
  user: any;
  profileLoading: boolean;
  updateProfile: any;
  signOut: () => void;
  onChangePassword: () => void;
  onDeleteAccount: () => void;
}

export function AccountSettings({
  profile,
  user,
  profileLoading,
  updateProfile,
  signOut,
  onChangePassword,
  onDeleteAccount
}: AccountSettingsProps) {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  useEffect(() => {
    if (profile?.name) {
      setNewName(profile.name);
    }
  }, [profile?.name]);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateProfile.mutateAsync({ name: newName.trim() });
    setEditingName(false);
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      setIsExporting(true);
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          account:accounts!account_id(id, name, currency),
          category:categories(id, name, icon)
        `)
        .order("date", { ascending: false });
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info("Você ainda não possui transações registradas para exportar.");
        return;
      }
      
      exportTransactions(data, format);
      toast.success("Backup financeiro exportado com sucesso!");
    } catch (e) {
      logger.error("Erro ao exportar backup:", e);
      toast.error("Ocorreu um erro ao exportar seus dados. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (profileLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-semibold text-base">Perfil</h2>
        <p className="text-sm text-muted-foreground">Gerencie seus dados e segurança</p>
      </div>

      <div className="space-y-4">
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
                  <Button size="sm" onClick={handleSaveName} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNewName(profile?.name || ""); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base">{profile?.name || "Sem nome"}</p>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>Editar</Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border">
          <div className="mb-4">
            <p className="font-medium mb-1">Personalizar Avatar</p>
            <p className="text-sm text-muted-foreground">Escolha uma cor e ícone para seu perfil</p>
          </div>
          <AvatarCustomizer
            currentColor={profile?.avatar_color || "green"}
            currentIcon={profile?.avatar_icon || "avatar_1"}
            onSave={async (color, icon) => {
              const selectedAvatar = avatarIcons.find(a => a.id === icon);
              const avatarPath = selectedAvatar?.path || null;
              await updateProfile.mutateAsync({ 
                avatar_url: avatarPath,
                avatar_color: color,
                avatar_icon: icon
              });
            }}
            isSaving={updateProfile.isPending}
          />
        </div>

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
            <Button variant="outline" onClick={onChangePassword}>Alterar</Button>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border hover:border-foreground/20 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Exportar Dados (Backup)</p>
                <p className="text-sm text-muted-foreground">Baixe seu histórico completo de transações em formato aberto</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleExport("csv")}
                disabled={isExporting}
                className="flex-1 sm:flex-none flex items-center gap-2 hover:bg-primary/5 hover:text-primary transition-all duration-200"
              >
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                CSV (Excel)
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleExport("json")}
                disabled={isExporting}
                className="flex-1 sm:flex-none flex items-center gap-2 hover:bg-primary/5 hover:text-primary transition-all duration-200"
              >
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
                JSON
              </Button>
            </div>
          </div>
        </div>

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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Sair</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-background overflow-hidden">
                <div className="px-6 pt-6 pb-2">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você deseja realmente sair?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você precisará fazer login novamente para acessar seus dados financeiros.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <div className="px-6 pb-6">
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={signOut}>Sair</AlertDialogAction>
                  </AlertDialogFooter>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-destructive uppercase tracking-wider mb-3">Zona de Perigo</h3>
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-destructive">Excluir Conta</p>
                  <p className="text-sm text-muted-foreground">Esta ação é irreversível</p>
                </div>
              </div>
              <Button variant="destructive" onClick={onDeleteAccount}>Excluir</Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

