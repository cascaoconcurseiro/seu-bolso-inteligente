/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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
import { Switch } from "@/components/ui/switch";
import {
  useAutoShareRules,
  useCreateAutoShareRule,
  useDeleteAutoShareRule,
  useUpdateAutoShareRule,
} from "@/hooks/useAutoShareRules";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { NumericFormat } from "react-number-format";
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

export function AutoShareRulesSettings() {
  const { data: rules = [], isLoading } = useAutoShareRules();
  const { data: members = [] } = useFamilyMembers();
  const { data: categories = [] } = useCategories();
  const createRule = useCreateAutoShareRule();
  const deleteRule = useDeleteAutoShareRule();
  const updateRule = useUpdateAutoShareRule();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<"category" | "keyword">("keyword");
  const [triggerValue, setTriggerValue] = useState("");
  const [memberId, setMemberId] = useState("");
  const [splitRatio, setSplitRatio] = useState(50);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeMembers = members.filter((m) => m.linked_user_id !== undefined || m.name);

  const handleCreate = async () => {
    if (!name || !triggerValue || !memberId) return;
    await createRule.mutateAsync({
      name,
      trigger_type: triggerType,
      trigger_value: triggerValue,
      member_id: memberId,
      split_ratio: splitRatio / 100,
    });
    setShowForm(false);
    setName("");
    setTriggerValue("");
    setMemberId("");
    setSplitRatio(50);
  };

  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.parent_category_id);

  if (isLoading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Automações de Compartilhamento
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Crie regras para que despesas sejam automaticamente divididas com membros da família
          quando lançadas. Ex: toda compra no "Supermercado" já vai 50% para a esposa.
        </p>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {rules.length === 0 && !showForm && (
          <EmptyState
            icon={Zap}
            title="Nenhuma regra configurada"
            description="Adicione regras para automatizar o compartilhamento de despesas."
          />
        )}

        {rules.map((rule) => {
          const member = members.find((m) => m.id === rule.member_id);
          const category = categories.find((c) => c.id === rule.trigger_value);
          return (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                rule.is_active
                  ? "border-border/50 bg-card"
                  : "border-border/30 bg-muted/30 opacity-60"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{rule.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rule.trigger_type === "category"
                    ? `Categoria: ${category?.icon ?? ""} ${category?.name ?? rule.trigger_value}`
                    : `Palavra-chave: "${rule.trigger_value}"`}
                  {" · "}
                  <span className="font-medium text-foreground">
                    {(rule.split_ratio * 100).toFixed(0)}%
                  </span>
                  {" com "}
                  <span className="font-medium text-foreground">{member?.name ?? "membro"}</span>
                </p>
              </div>
              <Switch
                checked={rule.is_active}
                onCheckedChange={(v) => updateRule.mutate({ id: rule.id, is_active: v })}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setConfirmDeleteId(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Add form */}
      {showForm ? (
        <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
          <h3 className="font-bold text-sm">Nova Regra</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome da regra</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Ex: "Mercado com esposa"'
              />
            </div>

            <div className="space-y-1.5">
              <Label>Disparar por</Label>
              <Select
                value={triggerType}
                onValueChange={(v) => {
                  setTriggerType(v as any);
                  setTriggerValue("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave na descrição</SelectItem>
                  <SelectItem value="category">Categoria da transação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{triggerType === "keyword" ? "Palavra-chave" : "Categoria"}</Label>
              {triggerType === "keyword" ? (
                <Input
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder='Ex: "mercado", "escola", "farmácia"'
                />
              ) : (
                <Select value={triggerValue} onValueChange={setTriggerValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Dividir com</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar membro" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Percentual que o membro paga</Label>
              <div className="flex items-center gap-3">
                <NumericFormat
                  value={splitRatio}
                  onValueChange={(v) => setSplitRatio(v.floatValue ?? 50)}
                  decimalScale={0}
                  suffix="%"
                  className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Você paga <strong>{100 - splitRatio}%</strong> · membro paga{" "}
                  <strong>{splitRatio}%</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name || !triggerValue || !memberId || createRule.isPending}
            >
              Salvar Regra
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="gap-2 w-full sm:w-auto"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" />
          Nova Regra de Auto-Compartilhamento
        </Button>
      )}

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A regra de compartilhamento automático será removida
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteId) deleteRule.mutate(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
