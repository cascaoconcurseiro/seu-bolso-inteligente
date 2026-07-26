import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BedDouble, CalendarClock, Loader2, Plus, Ticket, TrainFront } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const reservationTypes = [
  ["flight", "Voo"],
  ["lodging", "Hospedagem"],
  ["train", "Trem"],
  ["bus", "Ônibus"],
  ["boat", "Barco"],
  ["rental_car", "Carro alugado"],
  ["restaurant", "Restaurante"],
  ["event", "Evento"],
  ["activity", "Atividade"],
  ["other", "Outro"],
] as const;

interface TripReservationsPanelProps {
  tripId: string;
}

export function TripReservationsPanel({ tripId }: TripReservationsPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("flight");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["trip-reservations", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_reservations")
        .select("*")
        .eq("trip_id", tripId)
        .order("starts_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const createReservation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre novamente para salvar a reserva");
      const { error } = await supabase.from("trip_reservations").insert({
        trip_id: tripId,
        created_by: user.id,
        title: title.trim(),
        type,
        status: confirmation.trim() ? "confirmed" : "planned",
        confirmation_number: confirmation.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-reservations", tripId] });
      toast.success("Reserva adicionada");
      setOpen(false);
      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setConfirmation("");
      setNotes("");
      setFormError("");
    },
    onError: (error: Error) => {
      setFormError(error.message);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!title.trim()) {
      setFormError("Informe o nome da reserva");
      return;
    }
    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      setFormError("O término não pode ser anterior ao início");
      return;
    }
    createReservation.mutate();
  };

  const iconFor = (reservationType: string) => {
    if (reservationType === "lodging") return BedDouble;
    if (["train", "bus", "boat"].includes(reservationType)) return TrainFront;
    return Ticket;
  };

  return (
    <>
      <section className="rounded-2xl border border-border/70 bg-card p-4" aria-busy={isLoading}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="font-semibold text-foreground">Reservas</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Adicionar
          </Button>
        </div>
        {reservations.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Centralize voos, hospedagens, transportes e confirmações.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reservations.slice(0, 4).map((reservation) => {
              const Icon = iconFor(reservation.type);
              return (
                <li key={reservation.id} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{reservation.title}</p>
                      {reservation.starts_at && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(parseISO(reservation.starts_at), "dd MMM, HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      )}
                      {reservation.confirmation_number && (
                        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                          Conf. {reservation.confirmation_number}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={open} onOpenChange={(next) => !createReservation.isPending && setOpen(next)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar reserva</DialogTitle>
            <DialogDescription>
              Guarde os dados operacionais sem misturá-los com os gastos.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            {formError && (
              <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="reservation-title">Nome da reserva</Label>
              <Input
                id="reservation-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Voo para Tóquio"
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservation-type">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="reservation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reservationTypes.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reservation-start">Início</Label>
                <Input
                  id="reservation-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservation-end">Término</Label>
                <Input
                  id="reservation-end"
                  type="datetime-local"
                  value={endsAt}
                  min={startsAt || undefined}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservation-confirmation">Código de confirmação</Label>
              <Input
                id="reservation-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Opcional"
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservation-notes">Observações</Label>
              <Textarea
                id="reservation-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={4000}
              />
            </div>
            <div className="flex gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1 sm:flex-none"
                disabled={createReservation.isPending}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="min-h-11 flex-1 sm:flex-none"
                disabled={createReservation.isPending}
              >
                {createReservation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Salvar reserva
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
