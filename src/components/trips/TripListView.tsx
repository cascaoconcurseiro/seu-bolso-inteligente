import { Plane, Archive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripCard } from "@/components/trips/TripCard";
import { TripArchivedCard } from "@/components/trips/TripArchivedCard";
import { EmptyState } from "@/components/ui/empty-state";

interface TripListViewProps {
  trips: any[];
  tripFilter: "active" | "archived";
  setTripFilter: (filter: "active" | "archived") => void;
  onTripClick: (id: string) => void;
  onUnarchive: (id: string) => void;
}

export function TripListView({
  trips,
  tripFilter,
  setTripFilter,
  onTripClick,
  onUnarchive,
}: TripListViewProps) {
  const filteredTrips = trips.filter((t) =>
    tripFilter === "active" ? !t.is_archived : t.is_archived
  );

  return (
    <Tabs value={tripFilter} onValueChange={(v) => setTripFilter(v as any)}>
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="active" className="flex-1 sm:flex-none gap-2">
          <Plane className="h-4 w-4" /> Ativas ({trips.filter((t) => !t.is_archived).length})
        </TabsTrigger>
        <TabsTrigger value="archived" className="flex-1 sm:flex-none gap-2">
          <Archive className="h-4 w-4" /> Arquivadas ({trips.filter((t) => t.is_archived).length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-6">
        <div className="space-y-3">
          {filteredTrips.length > 0 ? (
            filteredTrips.map((t) => (
              <TripCard key={t.id} trip={t} onClick={() => onTripClick(t.id)} />
            ))
          ) : (
            <EmptyState
              icon={Plane}
              title="Nenhuma viagem ativa"
              description="Suas viagens ativas aparecerão aqui. Crie uma nova viagem usando o botão acima."
            />
          )}
        </div>
      </TabsContent>

      <TabsContent value="archived" className="mt-6">
        <div className="space-y-3">
          {filteredTrips.length > 0 ? (
            filteredTrips.map((t) => (
              <TripArchivedCard
                key={t.id}
                trip={t}
                onUnarchive={() => onUnarchive(t.id)}
                onClick={() => onTripClick(t.id)}
              />
            ))
          ) : (
            <EmptyState
              icon={Archive}
              title="Nenhuma viagem arquivada"
              description="Viagens concluídas ou arquivadas aparecerão aqui para consulta futura."
            />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
