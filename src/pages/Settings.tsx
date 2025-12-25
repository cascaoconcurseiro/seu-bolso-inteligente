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
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data
const mockAccounts = [
  { id: "1", name: "Nubank", type: "checking", balance: 5420.50 },
  { id: "2", name: "Inter", type: "checking", balance: 2180.30 },
  { id: "3", name: "Carteira", type: "cash", balance: 350.00 },
];

const mockCategories = [
  { id: "1", name: "Alimentação", icon: "🍕", type: "expense" },
  { id: "2", name: "Moradia", icon: "🏠", type: "expense" },
  { id: "3", name: "Transporte", icon: "🚗", type: "expense" },
  { id: "4", name: "Lazer", icon: "🎮", type: "expense" },
  { id: "5", name: "Saúde", icon: "💊", type: "expense" },
  { id: "6", name: "Salário", icon: "💰", type: "income" },
  { id: "7", name: "Freelance", icon: "💻", type: "income" },
];

const mockPeople = [
  { id: "1", name: "Eu", email: "eu@email.com", role: "admin" },
  { id: "2", name: "Ana", email: "ana@email.com", role: "member" },
  { id: "3", name: "Carlos", email: "carlos@email.com", role: "member" },
];

type SettingsSection = "accounts" | "categories" | "people" | "appearance" | "notifications";

export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("accounts");
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
  };

  const sections = [
    { id: "accounts" as const, label: "Contas", icon: Wallet, count: mockAccounts.length },
    { id: "categories" as const, label: "Categorias", icon: Tag, count: mockCategories.length },
    { id: "people" as const, label: "Pessoas", icon: Users, count: mockPeople.length },
    { id: "appearance" as const, label: "Aparência", icon: Palette },
    { id: "notifications" as const, label: "Notificações", icon: Bell },
  ];

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
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left",
                activeSection === section.id
                  ? "bg-foreground text-background"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5" />
                <span className="font-medium">{section.label}</span>
              </div>
              {section.count !== undefined && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg">Contas</h2>
                  <p className="text-sm text-muted-foreground">Suas contas bancárias e carteiras</p>
                </div>
                <Button onClick={() => setShowAddAccountDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova
                </Button>
              </div>
              <div className="space-y-2">
                {mockAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center">
                        {account.type === "cash" ? (
                          <Wallet className="h-5 w-5" />
                        ) : (
                          <CreditCard className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.type === "checking" ? "Conta Corrente" : "Dinheiro"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-medium">{formatCurrency(account.balance)}</span>
                      <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {activeSection === "categories" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg">Categorias</h2>
                  <p className="text-sm text-muted-foreground">Organize suas transações</p>
                </div>
                <Button onClick={() => setShowAddCategoryDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">Despesas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mockCategories.filter(c => c.type === "expense").map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.icon}</span>
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">Receitas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mockCategories.filter(c => c.type === "income").map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.icon}</span>
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* People */}
          {activeSection === "people" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-lg">Pessoas</h2>
                  <p className="text-sm text-muted-foreground">Membros para dividir despesas</p>
                </div>
                <Button onClick={() => setShowAddPersonDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {mockPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                        {person.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        person.role === "admin" ? "bg-foreground text-background" : "bg-muted"
                      )}>
                        {person.role === "admin" ? "Admin" : "Membro"}
                      </span>
                      <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-semibold text-lg">Aparência</h2>
                <p className="text-sm text-muted-foreground">Personalize a interface</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-4">
                    {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
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
            <div className="space-y-6">
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
                    className="flex items-center justify-between p-4 rounded-xl border border-border"
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

      {/* Dialogs */}
      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
            <DialogDescription>Adicione uma conta bancária</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Nubank" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select defaultValue="checking">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Saldo Inicial</Label>
              <Input placeholder="R$ 0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccountDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowAddAccountDialog(false)}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma categoria</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Academia" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select defaultValue="expense">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowAddCategoryDialog(false)}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddPersonDialog} onOpenChange={setShowAddPersonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Pessoa</DialogTitle>
            <DialogDescription>Adicione um membro</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Maria" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@exemplo.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPersonDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowAddPersonDialog(false)}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
