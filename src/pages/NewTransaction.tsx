import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Tag,
  DollarSign,
  Repeat,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type TransactionFormType = "income" | "expense" | "transfer";

const transactionTypes = [
  { id: "income", label: "Entrada", icon: ArrowDownLeft, color: "text-positive" },
  { id: "expense", label: "Saída", icon: ArrowUpRight, color: "text-negative" },
  { id: "transfer", label: "Transferência", icon: ArrowLeftRight, color: "text-muted-foreground" },
];

const categories = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "moradia", label: "Moradia" },
  { value: "transporte", label: "Transporte" },
  { value: "lazer", label: "Lazer" },
  { value: "saude", label: "Saúde" },
  { value: "viagem", label: "Viagem" },
  { value: "cartao", label: "Cartão" },
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
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar salvamento
    navigate("/transacoes");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link to="/transacoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display font-semibold text-2xl text-foreground">
            Nova Movimentação
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre uma entrada, saída ou transferência
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tipo de Transação */}
        <section className="space-y-3">
          <Label className="text-sm font-medium">Tipo</Label>
          <div className="grid grid-cols-3 gap-3">
            {transactionTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id as TransactionFormType)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                  type === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <t.icon className={cn("h-6 w-6", type === t.id ? t.color : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", type === t.id ? "text-foreground" : "text-muted-foreground")}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Valor */}
        <section className="space-y-3">
          <Label htmlFor="value">Valor</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
              R$
            </span>
            <Input
              id="value"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="pl-12 text-2xl font-mono h-14"
              required
            />
          </div>
        </section>

        {/* Descrição */}
        <section className="space-y-3">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            placeholder="Ex: Supermercado, Salário, Aluguel..."
            required
          />
        </section>

        {/* Data e Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section className="space-y-3">
            <Label htmlFor="date">Data</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="pl-10"
                required
              />
            </div>
          </section>
          <section className="space-y-3">
            <Label>Categoria</Label>
            <Select defaultValue="outros">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        </div>

        {/* Conta */}
        <section className="space-y-3">
          <Label>Conta</Label>
          <Select defaultValue="nubank">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.value} value={acc.value}>
                  {acc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* Opções Especiais */}
        <section className="space-y-4 bg-card rounded-xl p-5">
          <h3 className="font-medium text-foreground">Opções</h3>

          {/* Parcelado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Parcelado</p>
                <p className="text-xs text-muted-foreground">Dividir em várias parcelas</p>
              </div>
            </div>
            <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
          </div>

          {isInstallment && (
            <div className="ml-8 space-y-3 animate-fade-in">
              <Label>Número de parcelas</Label>
              <Select value={installments} onValueChange={setInstallments}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cartão de Crédito */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Cartão de Crédito</p>
                <p className="text-xs text-muted-foreground">Vincular à fatura do cartão</p>
              </div>
            </div>
            <Switch checked={isCreditCard} onCheckedChange={setIsCreditCard} />
          </div>

          {isCreditCard && (
            <div className="ml-8 space-y-3 animate-fade-in">
              <Label>Cartão</Label>
              <Select defaultValue="nubank">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nubank">Nubank</SelectItem>
                  <SelectItem value="inter">Inter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Compartilhado */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Compartilhado</p>
                <p className="text-xs text-muted-foreground">Dividir com outras pessoas</p>
              </div>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} />
          </div>

          {isShared && (
            <div className="ml-8 space-y-3 animate-fade-in">
              <Label>Dividir com</Label>
              <div className="flex flex-wrap gap-2">
                {people.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => togglePerson(person.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full border transition-all",
                      selectedPeople.includes(person.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      {selectedPeople.includes(person.id) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="text-xs">{person.initials}</span>
                      )}
                    </div>
                    <span className="text-sm">{person.name}</span>
                  </button>
                ))}
              </div>
              {selectedPeople.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Valor por pessoa: R$ {(100 / (selectedPeople.length + 1)).toFixed(2)} (exemplo com R$ 100)
                </p>
              )}
            </div>
          )}
        </section>

        {/* Observações */}
        <section className="space-y-3">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Adicione notas ou detalhes..."
            className="min-h-20"
          />
        </section>

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <Link to="/transacoes" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" className="flex-1">
            Salvar Movimentação
          </Button>
        </div>
      </form>
    </div>
  );
}