import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPipelines, fetchStatus } from "./api";
import type { PipelinesResponse, StatusResponse } from "./types";

const POLL_INTERVAL_MS = 30_000;

export interface UsePipelinesResult {
  status: StatusResponse | null;
  data: PipelinesResponse | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

export function usePipelines(): UsePipelinesResult {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [data, setData] = useState<PipelinesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const current = ++sequence.current;
    const isStale = () => !mounted.current || current !== sequence.current;
    try {
      const [nextStatus, nextData] = await Promise.all([fetchStatus(), fetchPipelines()]);
      if (isStale()) return;
      setStatus(nextStatus);
      setData(nextData);
      setError(false);
    } catch {
      if (isStale()) return;
      setError(true);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [load]);

  return { status, data, loading, error, refresh };
}
