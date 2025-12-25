import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Settings as SettingsIcon,
  Wallet,
  Tag,
  Users,
  Palette,
  Bell,
  Shield,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Moon,
  Sun,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dados mock
const mockAccounts = [
  { id: "1", name: "Nubank", type: "checking", balance: 5420.50, color: "bg-purple-600" },
  { id: "2", name: "Inter", type: "checking", balance: 2180.30, color: "bg-orange-500" },
  { id: "3", name: "Carteira", type: "cash", balance: 350.00, color: "bg-green-600" },
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
  const [darkMode, setDarkMode] = useState(false);

  const sections = [
    { id: "accounts" as const, label: "Contas", icon: Wallet, count: mockAccounts.length },
    { id: "categories" as const, label: "Categorias", icon: Tag, count: mockCategories.length },
    { id: "people" as const, label: "Pessoas", icon: Users, count: mockPeople.length },
    { id: "appearance" as const, label: "Aparência", icon: Palette },
    { id: "notifications" as const, label: "Notificações", icon: Bell },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header>
        <h1 className="font-display font-semibold text-2xl md:text-3xl text-foreground">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Personalize o Pé de Meia do seu jeito
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu Lateral */}
        <nav className="lg:col-span-1 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5" />
                <span className="font-medium">{section.label}</span>
              </div>
              {section.count !== undefined && (
                <Badge 
                  variant={activeSection === section.id ? "secondary" : "muted"}
                  className={activeSection === section.id ? "bg-primary-foreground/20 text-primary-foreground" : ""}
                >
                  {section.count}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="lg:col-span-3 bg-card rounded-xl p-6 shadow-sm">
          {/* Contas */}
          {activeSection === "accounts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-medium text-lg text-foreground">Contas</h2>
                  <p className="text-sm text-muted-foreground">Gerencie suas contas bancárias e carteiras</p>
                </div>
                <Button onClick={() => setShowAddAccountDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Conta
                </Button>
              </div>

              <div className="space-y-3">
                {mockAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", account.color)}>
                        {account.type === "cash" ? (
                          <Wallet className="h-5 w-5 text-white" />
                        ) : (
                          <CreditCard className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.type === "checking" ? "Conta Corrente" : "Dinheiro"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-mono font-medium text-foreground">
                        R$ {account.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorias */}
          {activeSection === "categories" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-medium text-lg text-foreground">Categorias</h2>
                  <p className="text-sm text-muted-foreground">Organize suas transações por categoria</p>
                </div>
                <Button onClick={() => setShowAddCategoryDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Categoria
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Despesas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mockCategories.filter(c => c.type === "expense").map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{category.icon}</span>
                          <span className="font-medium text-foreground">{category.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Receitas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mockCategories.filter(c => c.type === "income").map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{category.icon}</span>
                          <span className="font-medium text-foreground">{category.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pessoas */}
          {activeSection === "people" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-medium text-lg text-foreground">Pessoas</h2>
                  <p className="text-sm text-muted-foreground">Membros da família para dividir despesas</p>
                </div>
                <Button onClick={() => setShowAddPersonDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Pessoa
                </Button>
              </div>

              <div className="space-y-3">
                {mockPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="font-medium text-primary">
                          {person.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={person.role === "admin" ? "default" : "muted"}>
                        {person.role === "admin" ? "Admin" : "Membro"}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aparência */}
          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-medium text-lg text-foreground">Aparência</h2>
                <p className="text-sm text-muted-foreground">Personalize a interface do aplicativo</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    {darkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-foreground">Modo Escuro</p>
                      <p className="text-sm text-muted-foreground">Alterne entre tema claro e escuro</p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium text-foreground mb-3">Cor Principal</p>
                  <div className="flex gap-3">
                    {[
                      "bg-[#C4683C]",
                      "bg-[#5A7A60]",
                      "bg-purple-600",
                      "bg-blue-600",
                      "bg-pink-600",
                    ].map((color, index) => (
                      <button
                        key={index}
                        className={cn(
                          "w-10 h-10 rounded-full transition-all",
                          color,
                          index === 0 && "ring-2 ring-offset-2 ring-primary"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notificações */}
          {activeSection === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-medium text-lg text-foreground">Notificações</h2>
                <p className="text-sm text-muted-foreground">Configure seus alertas e lembretes</p>
              </div>

              <div className="space-y-4">
                {[
                  { title: "Vencimento de Faturas", description: "Receba alertas antes do vencimento", enabled: true },
                  { title: "Metas de Economia", description: "Acompanhe o progresso das suas metas", enabled: true },
                  { title: "Despesas Compartilhadas", description: "Notificações sobre divisões pendentes", enabled: false },
                  { title: "Resumo Semanal", description: "Relatório semanal por email", enabled: false },
                ].map((notification, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                    </div>
                    <Switch defaultChecked={notification.enabled} />
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
            <DialogDescription>Adicione uma conta bancária ou carteira</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Conta</Label>
              <Input placeholder="Ex: Nubank, Bradesco..." />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select defaultValue="checking">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="cash">Dinheiro/Carteira</SelectItem>
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
            <DialogDescription>Crie uma categoria para organizar transações</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Academia, Streaming..." />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select defaultValue="expense">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex gap-2 flex-wrap">
                {["🍕", "🏠", "🚗", "🎮", "💊", "✈️", "📱", "🛒", "💡", "📚"].map((emoji) => (
                  <button
                    key={emoji}
                    className="w-10 h-10 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowAddCategoryDialog(false)}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddPersonDialog} onOpenChange={setShowAddPersonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Pessoa</DialogTitle>
            <DialogDescription>Adicione um membro da família</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Nome da pessoa" />
            </div>
            <div className="space-y-2">
              <Label>Email (opcional)</Label>
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