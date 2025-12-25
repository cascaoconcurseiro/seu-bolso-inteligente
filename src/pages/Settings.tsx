import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  Tag,
  Users,
  Palette,
  Bell,
  Plus,
  Pencil,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { banks, getBankById } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";
import { useAccounts, useCreateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";

type SettingsSection = "accounts" | "categories" | "people" | "appearance" | "notifications";

export function Settings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>("accounts");
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  // Form state
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<string>("CHECKING");
  const [newAccountBankId, setNewAccountBankId] = useState("");
  const [newAccountBalance, setNewAccountBalance] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"expense" | "income">("expense");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦");

  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();

  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
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

  const handleCreateAccount = async () => {
    await createAccount.mutateAsync({
      name: newAccountName,
      type: newAccountType as any,
      bank_id: newAccountBankId || null,
      balance: parseFloat(newAccountBalance) || 0,
    });
    setShowAddAccountDialog(false);
    setNewAccountName("");
    setNewAccountType("CHECKING");
    setNewAccountBankId("");
    setNewAccountBalance("");
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

  const sections = [
    { id: "accounts" as const, label: "Contas", icon: Wallet, count: accounts.length },
    { id: "categories" as const, label: "Categorias", icon: Tag, count: categories.length },
    { id: "people" as const, label: "Pessoas", icon: Users, count: members.length },
    { id: "appearance" as const, label: "Aparência", icon: Palette },
    { id: "notifications" as const, label: "Notificações", icon: Bell },
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
          {/* Accounts */}
          {activeSection === "accounts" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg">Contas</h2>
                  <p className="text-sm text-muted-foreground">Suas contas bancárias e carteiras</p>
                </div>
                <Button 
                  onClick={() => setShowAddAccountDialog(true)}
                  className="group transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
                  Nova
                </Button>
              </div>
              {accountsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-border rounded-xl">
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Nenhuma conta cadastrada</p>
                  <p className="text-sm text-muted-foreground">Adicione sua primeira conta</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="group flex items-center justify-between p-4 rounded-xl border border-border 
                                 hover:border-foreground/20 transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <BankIcon 
                          bankId={account.bank_id} 
                          size="md"
                          className="transition-transform duration-200 group-hover:scale-110" 
                        />
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.type === "CHECKING" ? "Conta Corrente" : 
                             account.type === "SAVINGS" ? "Poupança" :
                             account.type === "CREDIT_CARD" ? "Cartão de Crédito" :
                             account.type === "INVESTMENT" ? "Investimento" : "Dinheiro"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-medium">{formatCurrency(account.balance)}</span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => deleteAccount.mutate(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
                <p className="text-sm text-muted-foreground">Alertas e lembretes</p>
              </div>
              <div className="space-y-3">
                {[
                  { title: "Vencimento de Faturas", description: "Alertas antes do vencimento", enabled: true },
                  { title: "Metas de Economia", description: "Progresso das metas", enabled: true },
                  { title: "Despesas Compartilhadas", description: "Divisões pendentes", enabled: false },
                  { title: "Resumo Semanal", description: "Relatório por email", enabled: false },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl border border-border
                               hover:border-foreground/20 transition-all duration-200"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
            <DialogDescription>Adicione uma conta bancária</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                placeholder="Ex: Conta Principal"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newAccountType} onValueChange={setNewAccountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                  <SelectItem value="SAVINGS">Poupança</SelectItem>
                  <SelectItem value="INVESTMENT">Investimento</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Banco (opcional)</Label>
              <Select value={newAccountBankId} onValueChange={setNewAccountBankId}>
                <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                <SelectContent>
                  {Object.values(banks).filter(b => b.id !== 'default').map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: bank.color, color: bank.textColor }}
                        >
                          {bank.icon}
                        </div>
                        {bank.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Saldo inicial</Label>
              <Input 
                placeholder="0"
                value={newAccountBalance}
                onChange={(e) => setNewAccountBalance(e.target.value.replace(/[^\d.-]/g, ""))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccountDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateAccount}
              disabled={createAccount.isPending || !newAccountName}
            >
              {createAccount.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label>Ícone (emoji)</Label>
              <Input 
                placeholder="📦"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                maxLength={2}
              />
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
    </div>
  );
}
