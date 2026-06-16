// src/hooks/useApi.js
// Data-fetching hooks — now use the Firestore SDK directly (no Express).

import { useState, useEffect, useCallback } from "react";
import { vehiclesApi, inventoryApi, tripsApi, maintenanceApi } from "../utils/api";

function useAsyncData(fetcher, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
}

export function useVehicles(filters = {}) {
  return useAsyncData(() => vehiclesApi.getAll(filters), [JSON.stringify(filters)]);
}

export function useInventory(filters = {}) {
  return useAsyncData(() => inventoryApi.getAll(filters), [JSON.stringify(filters)]);
}

export function useTripTickets(userProfile) {
  return useAsyncData(
    () => userProfile ? tripsApi.getAll(userProfile) : Promise.resolve([]),
    [userProfile?.uid, userProfile?.role]
  );
}

export function useMaintenance(filters = {}) {
  return useAsyncData(() => maintenanceApi.getAll(filters), [JSON.stringify(filters)]);
}