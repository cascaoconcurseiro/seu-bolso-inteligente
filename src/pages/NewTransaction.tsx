import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft,
  CalendarIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories, useCreateDefaultCategories } from "@/hooks/useCategories";
import { useCreateTransaction, TransactionType } from "@/hooks/useTransactions";
import { useTrips } from "@/hooks/useTrips";
import { toast } from "sonner";

type TabType = "EXPENSE" | "INCOME" | "TRANSFER";

export function NewTransaction() {
  const navigate = useNavigate();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: trips } = useTrips();
  const createTransaction = useCreateTransaction();
  const createDefaultCategories = useCreateDefaultCategories();

  const [activeTab, setActiveTab] = useState<TabType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tripId, setTripId] = useState("");
  const [notes, setNotes] = useState("");
  
  // Parcelamento
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(2);

  // Criar categorias padrão se não existirem
  useEffect(() => {
    if (!categoriesLoading && categories?.length === 0) {
      createDefaultCategories.mutate();
    }
  }, [categoriesLoading, categories]);

  const filteredCategories = categories?.filter(
    (c) => (activeTab === "INCOME" ? c.type === "income" : c.type === "expense")
  ) || [];

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const cents = parseInt(numbers) / 100;
    return cents.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setAmount(formatted);
  };

  const getNumericAmount = () => {
    return parseFloat(amount.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = getNumericAmount();
    if (numericAmount <= 0) {
      toast.error("Insira um valor válido");
      return;
    }

    if (!description.trim()) {
      toast.error("Insira uma descrição");
      return;
    }

    if (activeTab !== "TRANSFER" && !accountId) {
      toast.error("Selecione uma conta");
      return;
    }

    if (activeTab === "TRANSFER" && (!accountId || !destinationAccountId)) {
      toast.error("Selecione as contas de origem e destino");
      return;
    }

    await createTransaction.mutateAsync({
      amount: numericAmount,
      description: description.trim(),
      date: format(date, "yyyy-MM-dd"),
      type: activeTab as TransactionType,
      account_id: accountId || undefined,
      destination_account_id: activeTab === "TRANSFER" ? destinationAccountId : undefined,
      category_id: categoryId || undefined,
      trip_id: tripId || undefined,
      domain: tripId ? "TRAVEL" : "PERSONAL",
      is_installment: isInstallment,
      total_installments: isInstallment ? totalInstallments : undefined,
      notes: notes || undefined,
    });

    navigate("/transacoes");
  };

  const isLoading = accountsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const creditCards = accounts?.filter((a) => a.type === "CREDIT_CARD") || [];
  const regularAccounts = accounts?.filter((a) => a.type !== "CREDIT_CARD") || [];
  const allAccounts = accounts || [];

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display font-bold text-2xl tracking-tight">Nova Transação</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        {(["EXPENSE", "INCOME", "TRANSFER"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "EXPENSE" ? "Despesa" : tab === "INCOME" ? "Receita" : "Transferência"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount */}
        <div className="space-y-2">
          <Label>Valor</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={amount}
              onChange={handleAmountChange}
              className="pl-12 h-14 text-2xl font-mono font-bold"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input
            placeholder="Ex: Almoço, Salário, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-12"
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label>Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Account */}
        {activeTab !== "TRANSFER" ? (
          <div className="space-y-2">
            <Label>Conta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {allAccounts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma conta cadastrada
                  </div>
                ) : (
                  allAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: acc.bank_color || "hsl(var(--muted))" }}
                        />
                        {acc.name}
                        {acc.type === "CREDIT_CARD" && (
                          <span className="text-xs text-muted-foreground">(Cartão)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Conta de Origem</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="De onde sai" />
                </SelectTrigger>
                <SelectContent>
                  {regularAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta de Destino</Label>
              <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Para onde vai" />
                </SelectTrigger>
                <SelectContent>
                  {regularAccounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Category (not for transfers) */}
        {activeTab !== "TRANSFER" && (
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Trip (optional) */}
        {trips && trips.length > 0 && activeTab === "EXPENSE" && (
          <div className="space-y-2">
            <Label>Viagem (opcional)</Label>
            <Select value={tripId || "none"} onValueChange={(v) => setTripId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Vincular a uma viagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Installments (credit card only) */}
        {activeTab === "EXPENSE" && accountId && creditCards.some((c) => c.id === accountId) && (
          <div className="p-4 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Parcelado</p>
                  <p className="text-sm text-muted-foreground">Dividir em parcelas</p>
                </div>
              </div>
              <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
            </div>

            {isInstallment && (
              <div className="space-y-2">
                <Label>Número de parcelas</Label>
                <Select 
                  value={totalInstallments.toString()} 
                  onValueChange={(v) => setTotalInstallments(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}x de R$ {(getNumericAmount() / n).toFixed(2).replace(".", ",")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Observações (opcional)</Label>
          <Textarea
            placeholder="Alguma anotação..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          disabled={createTransaction.isPending}
        >
          {createTransaction.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Salvar"
          )}
        </Button>
      </form>
    </div>
  );
}
