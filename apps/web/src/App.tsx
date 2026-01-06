import { useEffect, useMemo, useState } from "react";
import "./App.css";

type HealthState =
  | { status: "idle" | "loading" }
  | { status: "ok"; data: unknown; httpStatus: number }
  | { status: "error"; message: string };

function safeJoin(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export default function App() {
  const apiUrl = useMemo(() => (import.meta.env.VITE_API_URL as string | undefined) ?? "", []);
  const [state, setState] = useState<HealthState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!apiUrl) {
        setState({ status: "error", message: "Falta VITE_API_URL. Revisá apps/web/.env" });
        return;
      }

      setState({ status: "loading" });

      try {
        const url = safeJoin(apiUrl, "/health");
        const res = await fetch(url, { method: "GET" });

        // Intentar JSON, si no, caer a texto
        const text = await res.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          // se queda como text
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} — ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
        }

        if (!cancelled) {
          setState({ status: "ok", data: parsed, httpStatus: res.status });
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : String(e);
          setState({ status: "error", message });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Happbit Web</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        API: <code>{apiUrl || "(no configurado)"}</code>
      </p>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Health check</h2>

        {state.status === "loading" && <p>Loading…</p>}

        {state.status === "ok" && (
          <>
            <p>
              Status: <b style={{ color: "green" }}>OK</b> (HTTP {state.httpStatus})
            </p>
            <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, overflow: "auto" }}>
              {typeof state.data === "string" ? state.data : JSON.stringify(state.data, null, 2)}
            </pre>
          </>
        )}

        {state.status === "error" && (
          <>
            <p>
              Status: <b style={{ color: "crimson" }}>ERROR</b>
            </p>
            <pre style={{ background: "#fff5f5", padding: 12, borderRadius: 8, overflow: "auto" }}>
              {state.message}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
