import { supabase } from "@/integrations/supabase/client";

export interface DiscoveredItineraryPlaceInput {
  tripId: string;
  date: string;
  name: string;
  address: string | null;
  mapsUrl: string;
  latitude: number;
  longitude: number;
  category: string | null;
}

interface RpcResponse {
  data: unknown;
  error: { message: string; code?: string } | null;
}

type UntypedRpc = (
  functionName: string,
  args: Record<string, unknown>
) => PromiseLike<RpcResponse>;

/**
 * Calls an RPC introduced in the same feature branch. The generated Supabase
 * types will include it after the migration is applied and types are regenerated;
 * this narrow adapter keeps the temporary branch type-safe without using `any`.
 */
export async function appendDiscoveredPlaceToItinerary(
  input: DiscoveredItineraryPlaceInput
): Promise<void> {
  const rpc = supabase.rpc as unknown as UntypedRpc;
  const { error } = await rpc("add_discovered_place_to_itinerary_v1", {
    p_trip_id: input.tripId,
    p_date: input.date,
    p_name: input.name,
    p_address: input.address,
    p_maps_url: input.mapsUrl,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_category: input.category,
  });

  if (error) {
    const failure = new Error(error.message) as Error & { code?: string };
    failure.code = error.code;
    throw failure;
  }
}
