import { useEffect, useState, useCallback } from "react";
import { getAvailability } from "../api/client";

// v2: haalt de beschikbaarheid per dag op bij de server voor een periode.
// De server is de enige die alle bonnen kent (ook die van anderen), dus
// de schermen rekenen zelf niets meer uit.
export function useAvailability(start, end, { excludeBonId = null, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled || !start || !end) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAvailability(start, end, excludeBonId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [start, end, excludeBonId, enabled]);

  useEffect(() => { load(); }, [load]);

  // Info voor één materiaal of set ({ kind, id }). Null zolang er niets is.
  const infoFor = useCallback((item) => {
    if (!data || !item) return null;
    const bucket = item.kind === "set" ? data.sets : data.materials;
    return bucket?.[item.id] || null;
  }, [data]);

  return { data, loading, error, reload: load, infoFor, handover: data?.handover || null };
}
