import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { differenceInCalendarDays, parseISO } from "date-fns";
import { CalendarDays, Image, Loader2, MapPin, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  parseTripForm,
  TRIP_CURRENCIES,
  TripFormPayload,
  TripFormValidationError,
  TripFormValues,
} from "./tripFormSchema";

interface SelectableMember {
  id: string;
  linked_user_id?: string | null;
  name: string;
  email?: string | null;
}

interface TripFormDialogProps {
  open: boolean;
  formKey: string;
  mode: "create" | "edit";
  initialValues: TripFormValues;
  familyMembers: SelectableMember[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: TripFormPayload) => Promise<void>;
}

type FieldErrors = Partial<Record<keyof TripFormValues, string>>;

export function TripFormDialog({
  open,
  formKey,
  mode,
  initialValues,
  familyMembers,
  onOpenChange,
  onSubmit,
}: TripFormDialogProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const fieldRefs = useRef<Partial<Record<keyof TripFormValues, HTMLElement | null>>>({});
  const previousOpen = useRef(false);
  const previousFormKey = useRef(formKey);

  useEffect(() => {
    const shouldReset = open && (!previousOpen.current || previousFormKey.current !== formKey);
    if (shouldReset) {
      setValues(initialValues);
      setErrors({});
      setServerError("");
      setCoverError(false);
    }
    previousOpen.current = open;
    previousFormKey.current = formKey;
  }, [formKey, initialValues, open]);

  const duration = useMemo(() => {
    if (!values.startDate || !values.endDate) return null;
    const days = differenceInCalendarDays(parseISO(values.endDate), parseISO(values.startDate)) + 1;
    return days > 0 ? days : null;
  }, [values.endDate, values.startDate]);

  const update = <K extends keyof TripFormValues>(field: K, value: TripFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError("");
    if (field === "coverImage") setCoverError(false);
  };

  const focusFirstError = (fieldErrors: FieldErrors) => {
    const order: (keyof TripFormValues)[] = [
      "name",
      "destination",
      "startDate",
      "endDate",
      "currency",
      "budget",
      "coverImage",
      "notes",
    ];
    const first = order.find((field) => fieldErrors[field]);
    if (first) requestAnimationFrame(() => fieldRefs.current[first]?.focus());
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (coverError && values.coverImage !== initialValues.coverImage) {
      setErrors((current) => ({
        ...current,
        coverImage: "Não foi possível carregar essa imagem",
      }));
      focusFirstError({ coverImage: "Não foi possível carregar essa imagem" });
      return;
    }

    let payload: TripFormPayload;
    try {
      payload = parseTripForm(values);
    } catch (error) {
      if (error instanceof TripFormValidationError) {
        setErrors(error.fieldErrors);
        focusFirstError(error.fieldErrors);
        return;
      }
      throw error;
    }

    setIsSubmitting(true);
    setServerError("");
    try {
      await onSubmit(payload);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível salvar a viagem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldProps = (field: keyof TripFormValues) => ({
    "aria-invalid": errors[field] ? ("true" as const) : undefined,
    "aria-describedby": errors[field] ? `trip-${field}-error` : undefined,
  });

  const errorFor = (field: keyof TripFormValues) =>
    errors[field] ? (
      <p id={`trip-${field}-error`} className="text-sm font-medium text-destructive">
        {errors[field]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-1rem)] flex-col overflow-hidden rounded-3xl p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/60 px-5 pb-4 pt-6 text-left sm:px-7">
          <DialogTitle className="font-display text-2xl font-black tracking-tight">
            {mode === "create" ? "Planeje uma nova viagem" : "Editar viagem"}
          </DialogTitle>
          <DialogDescription>
            Dê identidade à viagem agora. Roteiro, reservas e gastos entram depois sem perder o
            contexto. Campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-7">
            {serverError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {serverError}
              </div>
            )}

            <section aria-labelledby="trip-identity-heading" className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 id="trip-identity-heading" className="font-semibold">
                  Identidade da viagem
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trip-name">
                    Nome da viagem <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="trip-name"
                    ref={(node) => {
                      fieldRefs.current.name = node;
                    }}
                    value={values.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Ex.: Férias no Japão"
                    autoComplete="off"
                    maxLength={100}
                    required
                    {...fieldProps("name")}
                  />
                  {errorFor("name")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-destination">
                    Destino <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="trip-destination"
                    ref={(node) => {
                      fieldRefs.current.destination = node;
                    }}
                    value={values.destination}
                    onChange={(event) => update("destination", event.target.value)}
                    placeholder="Ex.: Tóquio, Japão"
                    autoComplete="off"
                    maxLength={120}
                    required
                    {...fieldProps("destination")}
                  />
                  {errorFor("destination")}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trip-notes">O que você quer viver nessa viagem?</Label>
                <Textarea
                  id="trip-notes"
                  ref={(node) => {
                    fieldRefs.current.notes = node;
                  }}
                  value={values.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="Anote o ritmo, interesses e prioridades do grupo."
                  rows={3}
                  maxLength={1000}
                  {...fieldProps("notes")}
                />
                <div className="flex justify-between gap-3">
                  {errorFor("notes") ?? <span />}
                  <span className="text-xs text-muted-foreground">{values.notes.length}/1.000</span>
                </div>
              </div>
            </section>

            <section aria-labelledby="trip-cover-heading" className="space-y-3">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 id="trip-cover-heading" className="font-semibold">
                  Capa
                </h3>
              </div>
              {values.coverImage && (
                <div className="relative h-36 overflow-hidden rounded-2xl border bg-muted">
                  <img
                    key={values.coverImage}
                    src={values.coverImage}
                    alt=""
                    className={`h-full w-full object-cover ${coverError ? "invisible" : ""}`}
                    onLoad={() => setCoverError(false)}
                    onError={() => setCoverError(true)}
                  />
                  {coverError && (
                    <p
                      role="alert"
                      className="absolute inset-0 grid place-items-center bg-muted p-4 text-center text-sm text-destructive"
                    >
                      Não foi possível carregar essa imagem. Confira o endereço.
                    </p>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-3 right-3"
                    onClick={() => update("coverImage", "")}
                  >
                    Remover capa
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="trip-cover">Endereço da imagem</Label>
                <Input
                  id="trip-cover"
                  ref={(node) => {
                    fieldRefs.current.coverImage = node;
                  }}
                  type="url"
                  value={values.coverImage}
                  onChange={(event) => update("coverImage", event.target.value)}
                  placeholder="https://…"
                  {...fieldProps("coverImage")}
                />
                <p className="text-xs text-muted-foreground">
                  Use uma imagem que você tem direito de compartilhar. Upload privado será
                  disponibilizado na etapa de documentos.
                </p>
                {errorFor("coverImage")}
              </div>
            </section>

            <section aria-labelledby="trip-dates-heading" className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 id="trip-dates-heading" className="font-semibold">
                  Quando
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trip-start-date">
                    Data de início <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="trip-start-date"
                    ref={(node) => {
                      fieldRefs.current.startDate = node;
                    }}
                    type="date"
                    required
                    value={values.startDate}
                    onChange={(event) => update("startDate", event.target.value)}
                    {...fieldProps("startDate")}
                  />
                  {errorFor("startDate")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-end-date">
                    Data de término <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="trip-end-date"
                    ref={(node) => {
                      fieldRefs.current.endDate = node;
                    }}
                    type="date"
                    required
                    min={values.startDate || undefined}
                    value={values.endDate}
                    onChange={(event) => update("endDate", event.target.value)}
                    {...fieldProps("endDate")}
                  />
                  {errorFor("endDate")}
                </div>
              </div>
              {duration && (
                <p role="status" className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                  {duration} {duration === 1 ? "dia" : "dias"} para viver essa viagem.
                </p>
              )}
            </section>

            <section aria-labelledby="trip-budget-heading" className="space-y-4">
              <h3 id="trip-budget-heading" className="font-semibold">
                Moeda e orçamento
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trip-currency">
                    Moeda principal <span aria-hidden="true">*</span>
                  </Label>
                  <Select
                    value={values.currency}
                    onValueChange={(value) => update("currency", value)}
                  >
                    <SelectTrigger
                      id="trip-currency"
                      ref={(node) => {
                        fieldRefs.current.currency = node;
                      }}
                      aria-required="true"
                      {...fieldProps("currency")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errorFor("currency")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-budget">Orçamento total (opcional)</Label>
                  <CurrencyInput
                    id="trip-budget"
                    ref={(node) => {
                      fieldRefs.current.budget = node;
                    }}
                    value={values.budget}
                    onChange={(value) => update("budget", value)}
                    currency={values.currency}
                    placeholder="0,00"
                    {...fieldProps("budget")}
                  />
                  {errorFor("budget")}
                </div>
              </div>
            </section>

            {mode === "create" && familyMembers.some((member) => member.linked_user_id) && (
              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 font-semibold">
                  <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                  Quem vai com você?
                </legend>
                <p className="text-sm text-muted-foreground">
                  Os participantes receberão um convite e só entram depois de aceitar.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {familyMembers
                    .filter((member) => member.linked_user_id)
                    .map((member) => {
                      const userId = member.linked_user_id!;
                      const checked = values.memberIds.includes(userId);
                      return (
                        <label
                          key={member.id}
                          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-primary"
                            checked={checked}
                            onChange={() =>
                              update(
                                "memberIds",
                                checked
                                  ? values.memberIds.filter((id) => id !== userId)
                                  : [...values.memberIds, userId]
                              )
                            }
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {member.name}
                            </span>
                            {member.email && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {member.email}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </fieldset>
            )}
          </div>

          <div className="flex shrink-0 gap-3 border-t bg-background px-5 py-4 sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1 sm:flex-none"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11 flex-1 sm:flex-none" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting
                ? "Salvando…"
                : mode === "create"
                  ? "Criar viagem"
                  : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
