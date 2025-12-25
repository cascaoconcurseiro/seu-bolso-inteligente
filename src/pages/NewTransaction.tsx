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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  Users,
  Calendar,
  Repeat,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type TransactionFormType = "income" | "expense" | "transfer";

const transactionTypes = [
  { id: "income", label: "Entrada", icon: ArrowDownLeft },
  { id: "expense", label: "Saída", icon: ArrowUpRight },
  { id: "transfer", label: "Transferência", icon: ArrowLeftRight },
];

const categories = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "moradia", label: "Moradia" },
  { value: "transporte", label: "Transporte" },
  { value: "lazer", label: "Lazer" },
  { value: "saude", label: "Saúde" },
  { value: "outros", label: "Outros" },
];

const accounts = [
  { value: "nubank", label: "Nubank" },
  { value: "inter", label: "Inter" },
  { value: "carteira", label: "Carteira" },
];

const people = [
  { id: "ana", name: "Ana", initials: "AN" },
  { id: "carlos", name: "Carlos", initials: "CA" },
  { id: "eu", name: "Eu", initials: "EU" },
];

export function NewTransaction() {
  const navigate = useNavigate();
  const [type, setType] = useState<TransactionFormType>("expense");
  const [isInstallment, setIsInstallment] = useState(false);
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [installments, setInstallments] = useState("2");

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/transacoes");
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/transacoes">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Nova Transação</h1>
          <p className="text-muted-foreground text-sm">Registre entrada, saída ou transferência</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Type Selection */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Tipo</Label>
          <div className="grid grid-cols-3 gap-2">
            {transactionTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id as TransactionFormType)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  type === t.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <t.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Value */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Valor</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-lg">
              R$
            </span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="pl-12 text-3xl font-mono h-16 border-2 focus:border-foreground"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Descrição</Label>
          <Input placeholder="Ex: Supermercado, Salário, Aluguel..." required />
        </div>

        {/* Date & Category */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Data</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Categoria</Label>
            <Select defaultValue="outros">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Account */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Conta</Label>
          <Select defaultValue="nubank">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.value} value={acc.value}>{acc.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Options */}
        <div className="space-y-4 p-5 rounded-xl border border-border">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Opções</h3>

          {/* Installment */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Parcelado</p>
                <p className="text-sm text-muted-foreground">Dividir em parcelas</p>
              </div>
            </div>
            <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
          </div>

          {isInstallment && (
            <div className="pl-8 pb-3 animate-fade-in">
              <Label className="text-xs text-muted-foreground">Parcelas</Label>
              <Select value={installments} onValueChange={setInstallments}>
                <SelectTrigger className="w-24 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                    <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Credit Card */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Cartão de Crédito</p>
                <p className="text-sm text-muted-foreground">Vincular à fatura</p>
              </div>
            </div>
            <Switch checked={isCreditCard} onCheckedChange={setIsCreditCard} />
          </div>

          {isCreditCard && (
            <div className="pl-8 pb-3 animate-fade-in">
              <Label className="text-xs text-muted-foreground">Cartão</Label>
              <Select defaultValue="nubank">
                <SelectTrigger className="w-40 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nubank">Nubank</SelectItem>
                  <SelectItem value="inter">Inter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Shared */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Compartilhado</p>
                <p className="text-sm text-muted-foreground">Dividir com pessoas</p>
              </div>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} />
          </div>

          {isShared && (
            <div className="pl-8 animate-fade-in">
              <Label className="text-xs text-muted-foreground mb-2 block">Dividir com</Label>
              <div className="flex flex-wrap gap-2">
                {people.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => togglePerson(person.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full border transition-all",
                      selectedPeople.includes(person.id)
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    {selectedPeople.includes(person.id) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-muted text-[10px] flex items-center justify-center font-medium">
                        {person.initials}
                      </span>
                    )}
                    <span className="text-sm font-medium">{person.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Observações (opcional)</Label>
          <Textarea placeholder="Adicione notas..." className="min-h-20 resize-none" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Link to="/transacoes" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancelar</Button>
          </Link>
          <Button type="submit" className="flex-1">Salvar</Button>
        </div>
      </form>
    </div>
  );
}
