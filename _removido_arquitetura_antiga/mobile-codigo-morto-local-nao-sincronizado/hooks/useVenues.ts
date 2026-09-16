import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVenueById, fetchVenues, submitCheckin } from "../lib/api";

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: fetchVenues,
  });
}

export function useVenue(id: string) {
  return useQuery({
    queryKey: ["venue", id],
    queryFn: () => fetchVenueById(id),
    enabled: !!id,
  });
}

export function useCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (businessId: string) => submitCheckin(businessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["venue"] });
    },
  });
}