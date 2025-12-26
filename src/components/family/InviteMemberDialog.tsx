import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { FamilyRole } from "@/hooks/useFamily";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (data: { name: string; email: string; role: FamilyRole }) => Promise<void>;
  isPending: boolean;
}

export function InviteMemberDialog({ 
  open, 
  onOpenChange, 
  onInvite, 
  isPending 
}: InviteMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FamilyRole>("editor");
  
  // Email verification state
  const [isChecking, setIsChecking] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [foundUser, setFoundUser] = useState<{ id: string; full_name: string | null } | null>(null);

  // Debounced email check
  useEffect(() => {
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email.trim())) {
      setUserExists(null);
      setFoundUser(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      console.log('🔍 DEBUG InviteMemberDialog - Buscando email:', email.trim().toLowerCase());
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();

        console.log('🔍 DEBUG InviteMemberDialog - Resultado da busca:', { data, error });

        if (data) {
          console.log('✅ Usuário encontrado:', data);
          setUserExists(true);
          setFoundUser({ 
            id: data.id, 
            full_name: data.full_name || data.email.split('@')[0] // Fallback para parte do email
          });
          // Auto-fill name if found and not already filled
          if (!name) {
            setName(data.full_name || data.email.split('@')[0]);
          }
        } else {
          console.log('❌ Usuário NÃO encontrado para email:', email.trim().toLowerCase());
          setUserExists(false);
          setFoundUser(null);
        }
      } catch (error) {
        console.error("❌ Erro ao buscar email:", error);
        setUserExists(null);
        setFoundUser(null);
      } finally {
        setIsChecking(false);
      }
    }, 1500); // Aumentado para 1.5 segundos

    return () => clearTimeout(timer);
  }, [email]);

  const handleSubmit = async () => {
    await onInvite({ name, email, role });
    // Reset form
    setName("");
    setEmail("");
    setRole("editor");
    setUserExists(null);
    setFoundUser(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setName("");
      setEmail("");
      setRole("editor");
      setUserExists(null);
      setFoundUser(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            {userExists 
              ? "Usuário encontrado! Será adicionado automaticamente." 
              : "Adicione alguém para compartilhar finanças"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "pr-10",
                  userExists === true && "border-positive focus-visible:ring-positive",
                  userExists === false && "border-warning focus-visible:ring-warning"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isChecking && userExists === true && (
                  <div className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-positive" />
                  </div>
                )}
                {!isChecking && userExists === false && (
                  <X className="h-4 w-4 text-warning" />
                )}
              </div>
            </div>
            {userExists === true && foundUser?.full_name && (
              <p className="text-sm text-positive flex items-center gap-1">
                <Check className="h-3 w-3" />
                Usuário cadastrado: {foundUser.full_name}
              </p>
            )}
            {userExists === false && (
              <p className="text-sm text-warning">
                Usuário não cadastrado. Será convidado por email.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              placeholder="Nome do membro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Permissão</Label>
            <Select value={role} onValueChange={(v) => setRole(v as FamilyRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span>Administrador</span>
                    <span className="text-xs text-muted-foreground">Acesso total</span>
                  </div>
                </SelectItem>
                <SelectItem value="editor">
                  <div className="flex flex-col items-start">
                    <span>Editor</span>
                    <span className="text-xs text-muted-foreground">Pode criar e editar</span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col items-start">
                    <span>Visualizador</span>
                    <span className="text-xs text-muted-foreground">Apenas visualização</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info about auto-accept */}
          {userExists === true && (
            <div className="p-3 rounded-lg bg-positive/10 border border-positive/20">
              <p className="text-sm text-positive">
                ✓ Este usuário já está no sistema e será adicionado automaticamente sem precisar aceitar convite.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !email || isPending}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isPending ? "Adicionando..." : userExists ? "Adicionar" : "Enviar convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
