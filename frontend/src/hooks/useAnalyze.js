import { useState, useRef } from "react";

const API_BASE    = import.meta.env.VITE_API_URL ?? "";
const TIMEOUT_MS  = 60_000;   // 60 s — covers Render free-tier cold start

export function useAnalyze() {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [slowLoad,     setSlowLoad]     = useState(false);  // true after 8 s
  const [error,        setError]        = useState(null);
  const slowTimer = useRef(null);

  async function analizar(oracion, nivel) {
    setLoading(true);
    setError(null);
    setData(null);
    setSlowLoad(false);

    // Show "warming up…" hint after 8 s
    slowTimer.current = setTimeout(() => setSlowLoad(true), 8_000);

    const controller = new AbortController();
    const hardTimeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE}/analizar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ oracion, nivel }),
        signal:  controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Error ${res.status}`);
      }

      setData(await res.json());
    } catch (e) {
      if (e.name === "AbortError") {
        setError("El servidor tardó demasiado en responder. Prueba con una oración más corta.");
      } else {
        setError(e.message);
      }
    } finally {
      clearTimeout(slowTimer.current);
      clearTimeout(hardTimeout);
      setLoading(false);
      setSlowLoad(false);
    }
  }

  return { data, loading, slowLoad, error, analizar };
}
