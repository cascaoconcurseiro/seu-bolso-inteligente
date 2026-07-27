import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Heart, Loader2, MapPin, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Trip } from "@/hooks/useTrips";

interface TripPlacesCommunityTabProps {
  trip: Trip;
}

interface TripPlace {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

interface PlaceReview {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  visited_on: string | null;
  created_at: string;
}

interface PlacePhoto {
  id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  signedUrl?: string;
}

const db = supabase as any;

function stars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => index < Math.round(rating));
}

export function TripPlacesCommunityTab({ trip }: TripPlacesCommunityTabProps) {
  const queryClient = useQueryClient();
  const uploadInput = useRef<HTMLInputElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");

  const { data: user } = useQuery({
    queryKey: ["auth-user-community"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: places = [], isLoading: loadingPlaces } = useQuery<TripPlace[]>({
    queryKey: ["trip-community-places", trip.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("trip_places")
        .select("id,name,address,category,latitude,longitude,status")
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? places[0] ?? null;
  const activePlaceId = selectedPlace?.id ?? null;

  const { data: reviews = [] } = useQuery<PlaceReview[]>({
    queryKey: ["trip-place-reviews", trip.id, activePlaceId],
    enabled: Boolean(activePlaceId),
    queryFn: async () => {
      const { data, error } = await db
        .from("trip_place_reviews")
        .select("id,user_id,rating,comment,visited_on,created_at")
        .eq("trip_id", trip.id)
        .eq("place_id", activePlaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: favorite = false } = useQuery<boolean>({
    queryKey: ["trip-place-favorite", trip.id, activePlaceId, user?.id],
    enabled: Boolean(activePlaceId && user?.id),
    queryFn: async () => {
      const { data, error } = await db
        .from("trip_place_favorites")
        .select("place_id")
        .eq("trip_id", trip.id)
        .eq("place_id", activePlaceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  const { data: visited = false } = useQuery<boolean>({
    queryKey: ["trip-place-visited", trip.id, activePlaceId, user?.id],
    enabled: Boolean(activePlaceId && user?.id),
    queryFn: async () => {
      const { data, error } = await db
        .from("trip_place_visits")
        .select("id")
        .eq("trip_id", trip.id)
        .eq("place_id", activePlaceId)
        .eq("user_id", user.id)
        .limit(1);
      if (error) throw error;
      return Boolean(data?.length);
    },
  });

  const { data: photos = [] } = useQuery<PlacePhoto[]>({
    queryKey: ["trip-place-photos", trip.id, activePlaceId],
    enabled: Boolean(activePlaceId),
    queryFn: async () => {
      const { data, error } = await db
        .from("trip_place_photos")
        .select("id,user_id,storage_path,caption,created_at")
        .eq("trip_id", trip.id)
        .eq("place_id", activePlaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return Promise.all(
        (data ?? []).map(async (photo: PlacePhoto) => {
          const signed = await supabase.storage
            .from("trip-place-photos")
            .createSignedUrl(photo.storage_path, 60 * 30);
          return { ...photo, signedUrl: signed.data?.signedUrl };
        })
      );
    },
  });

  const averageRating = useMemo(
    () => (reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0),
    [reviews]
  );
  const myReview = reviews.find((item) => item.user_id === user?.id);

  const invalidatePlace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trip-place-reviews", trip.id, activePlaceId] }),
      queryClient.invalidateQueries({ queryKey: ["trip-place-favorite", trip.id, activePlaceId] }),
      queryClient.invalidateQueries({ queryKey: ["trip-place-visited", trip.id, activePlaceId] }),
      queryClient.invalidateQueries({ queryKey: ["trip-place-photos", trip.id, activePlaceId] }),
    ]);
  };

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!user || !activePlaceId) throw new Error("Selecione um lugar");
      const { error } = await db.from("trip_place_reviews").upsert(
        {
          trip_id: trip.id,
          place_id: activePlaceId,
          user_id: user.id,
          rating,
          comment: comment.trim() || null,
          visited_on: new Date().toISOString().slice(0, 10),
        },
        { onConflict: "trip_id,place_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(myReview ? "Avaliação atualizada" : "Avaliação publicada");
      setComment("");
      await invalidatePlace();
    },
    onError: (error: Error) => toast.error("Não foi possível avaliar", { description: error.message }),
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !activePlaceId) throw new Error("Selecione um lugar");
      if (favorite) {
        const { error } = await db
          .from("trip_place_favorites")
          .delete()
          .eq("trip_id", trip.id)
          .eq("place_id", activePlaceId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("trip_place_favorites").insert({
          trip_id: trip.id,
          place_id: activePlaceId,
          user_id: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidatePlace,
    onError: (error: Error) => toast.error("Não foi possível atualizar o favorito", { description: error.message }),
  });

  const visitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !activePlaceId) throw new Error("Selecione um lugar");
      if (visited) {
        const { error } = await db
          .from("trip_place_visits")
          .delete()
          .eq("trip_id", trip.id)
          .eq("place_id", activePlaceId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("trip_place_visits").insert({
          trip_id: trip.id,
          place_id: activePlaceId,
          user_id: user.id,
          visited_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidatePlace,
    onError: (error: Error) => toast.error("Não foi possível atualizar a visita", { description: error.message }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !activePlaceId) throw new Error("Selecione um lugar");
      if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem");
      if (file.size > 10 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 10 MB");

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `${user.id}/${trip.id}/${activePlaceId}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("trip-place-photos").upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const { error } = await db.from("trip_place_photos").insert({
        trip_id: trip.id,
        place_id: activePlaceId,
        user_id: user.id,
        storage_path: storagePath,
        caption: photoCaption.trim() || null,
      });
      if (error) {
        await supabase.storage.from("trip-place-photos").remove([storagePath]);
        throw error;
      }
    },
    onSuccess: async () => {
      setPhotoCaption("");
      toast.success("Foto adicionada");
      await invalidatePlace();
    },
    onError: (error: Error) => toast.error("Não foi possível enviar a foto", { description: error.message }),
  });

  if (loadingPlaces) {
    return <div className="grid min-h-[360px] place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!places.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-10 text-center">
        <MapPin className="mx-auto h-9 w-9 text-primary" />
        <h2 className="mt-3 font-semibold">Nenhum lugar salvo ainda</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use a aba Explorar ou o roteiro para salvar lugares antes de avaliar.</p>
      </div>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]" aria-label="Comunidade de lugares">
      <aside className="rounded-3xl border border-border bg-card p-3">
        <div className="mb-3 flex items-center gap-2 px-2 py-1">
          <Users className="h-4 w-4 text-primary" />
          <div>
            <h2 className="font-semibold">Lugares da viagem</h2>
            <p className="text-xs text-muted-foreground">{places.length} salvos</p>
          </div>
        </div>
        <div className="max-h-[620px] space-y-2 overflow-y-auto">
          {places.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => setSelectedPlaceId(place.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${activePlaceId === place.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
            >
              <p className="truncate font-medium">{place.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{place.address || place.category || "Local salvo"}</p>
            </button>
          ))}
        </div>
      </aside>

      {selectedPlace && (
        <div className="space-y-4">
          <header className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Comunidade da viagem</p>
                <h2 className="mt-1 text-xl font-semibold">{selectedPlace.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedPlace.address || "Endereço não informado"}</p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <div className="flex text-amber-500">{stars(averageRating).map((filled, index) => <Star key={index} className={`h-4 w-4 ${filled ? "fill-current" : "opacity-30"}`} />)}</div>
                  <span>{reviews.length ? `${averageRating.toFixed(1)} · ${reviews.length} avaliação(ões)` : "Ainda sem avaliações"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant={favorite ? "default" : "outline"} onClick={() => favoriteMutation.mutate()} disabled={favoriteMutation.isPending}>
                  <Heart className={`mr-2 h-4 w-4 ${favorite ? "fill-current" : ""}`} /> {favorite ? "Favorito" : "Favoritar"}
                </Button>
                <Button variant={visited ? "secondary" : "outline"} onClick={() => visitMutation.mutate()} disabled={visitMutation.isPending}>
                  <Check className="mr-2 h-4 w-4" /> {visited ? "Visitado" : "Marcar visita"}
                </Button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-3xl border border-border bg-card p-4 sm:p-5">
              <h3 className="font-semibold">Sua avaliação</h3>
              <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Nota do lugar">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" role="radio" aria-checked={rating === value} onClick={() => setRating(value)} className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Star className={`h-7 w-7 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"}`} />
                  </button>
                ))}
              </div>
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={myReview?.comment || "Conte o que achou, dê uma dica ou destaque um cuidado."} className="mt-3 min-h-24" maxLength={1000} />
              <Button className="mt-3 w-full" onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
                {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {myReview ? "Atualizar avaliação" : "Publicar avaliação"}
              </Button>
            </article>

            <article className="rounded-3xl border border-border bg-card p-4 sm:p-5">
              <h3 className="font-semibold">Adicionar foto</h3>
              <p className="mt-1 text-sm text-muted-foreground">As fotos ficam visíveis apenas para os participantes desta viagem.</p>
              <Input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="Legenda opcional" className="mt-3" maxLength={180} />
              <input ref={uploadInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadMutation.mutate(file); event.currentTarget.value = ""; }} />
              <Button variant="outline" className="mt-3 w-full" onClick={() => uploadInput.current?.click()} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />} Escolher imagem
              </Button>
            </article>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => (
                <figure key={photo.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  {photo.signedUrl && <img src={photo.signedUrl} alt={photo.caption || `Foto de ${selectedPlace.name}`} className="aspect-square w-full object-cover" loading="lazy" />}
                  {photo.caption && <figcaption className="p-2 text-xs text-muted-foreground">{photo.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}

          <article className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <h3 className="font-semibold">Avaliações dos viajantes</h3>
            <div className="mt-3 space-y-3">
              {reviews.length === 0 ? <p className="text-sm text-muted-foreground">Seja a primeira pessoa da viagem a avaliar este lugar.</p> : reviews.map((review) => (
                <div key={review.id} className="rounded-2xl bg-muted/40 p-3">
                  <div className="flex text-amber-500">{stars(review.rating).map((filled, index) => <Star key={index} className={`h-4 w-4 ${filled ? "fill-current" : "opacity-25"}`} />)}</div>
                  {review.comment && <p className="mt-2 text-sm leading-relaxed">{review.comment}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">{review.user_id === user?.id ? "Sua avaliação" : "Participante da viagem"}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
