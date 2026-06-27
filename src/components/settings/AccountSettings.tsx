import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, LogOut, AlertTriangle, Check } from "lucide-react";
import { AvatarCustomizer } from "./AvatarCustomizer";
import { avatarIcons } from "@/lib/avatars";
import { toast } from "sonner";

interface AccountSettingsProps {
  profile: any;
  user: any;
  profileLoading: boolean;
  updateProfile: any;
  signOut: () => void;
  onDeleteAccount: () => void;
}

export function AccountSettings({
  profile,
  user,
  profileLoading,
  updateProfile,
  signOut,
  onDeleteAccount
}: AccountSettingsProps) {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
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

