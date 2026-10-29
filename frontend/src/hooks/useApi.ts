import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../api/client";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useApi<T>(path: string | null, options: { enabled?: boolean } = {}): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [version, setVersion] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path || options.enabled === false) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<T>(path, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted && mounted.current) {
          setData(payload);
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        if (mounted.current) {
          setError(errorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && mounted.current) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [path, version, options.enabled]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { data, error, loading, reload };
}
