// src/hooks/useApi.js
// Data-fetching hooks — now use the Firestore SDK directly (no Express).

import { useState, useEffect, useCallback } from "react";
import { vehiclesApi, inventoryApi, tripsApi, maintenanceApi, usersApi } from "../utils/api";

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
      // Firestore permission-denied errors are the #1 cause of "my data
      // just isn't showing up" bug reports — surface them loudly in the
      // console with a direct pointer to the fix, instead of just logging
      // a generic error that gets missed.
      if (err.code === "permission-denied" || err.message?.includes("permission")) {
        console.error(
          `❌  Firestore PERMISSION DENIED while fetching data.\n` +
          `    This means the security rules deployed to your Firebase project\n` +
          `    do not match firestore.rules in this codebase — most likely\n` +
          `    the rules were never deployed (or an older version is still live).\n` +
          `    Fix: Firebase Console → Firestore Database → Rules tab → paste the\n` +
          `    contents of firestore.rules → Publish.\n` +
          `    Raw error: ${err.message}`
        );
      } else {
        console.error(err);
      }
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

export function useDrivers() {
  return useAsyncData(() => usersApi.getDrivers(), []);
}