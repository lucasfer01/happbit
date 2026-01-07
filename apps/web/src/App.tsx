import { useEffect, useMemo, useState, type FormEvent } from "react";

type HabitId = string | number;

type Habit = {
  id: HabitId;
  name: string;
};

type ProgressItem = {
  habitId: HabitId;
  checkinsCountWeek: number;
  checkedToday: boolean;
};

type ProgressResponse = ProgressItem[]; // asumimos array; si tu API devuelve { items: [...] } ajustás 2 líneas.

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Devuelve YYYY-MM-DD en hora local (suficiente para “idempotente por día” si backend usa misma convención).
function toYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

// Lunes de la semana actual (ISO-like). Si hoy es domingo, vuelve lunes de hace 6 días.
function getWeekStartMonday(today = new Date()) {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay(); // 0=Dom, 1=Lun, ... 6=Sáb
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);

  return toYYYYMMDD(d);
}

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function apiFetch<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const url = joinUrl(baseUrl, path);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
  }

  // 204 / empty body safe-guard
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export default function App() {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

  const weekStart = useMemo(() => getWeekStartMonday(new Date()), []);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [progressByHabitId, setProgressByHabitId] = useState<Record<string, ProgressItem>>({});

  const [newHabitName, setNewHabitName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    if (!apiUrl) {
      setError("Falta VITE_API_URL en .env (ej: http://localhost:3001)");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const [habitsRes, progressRes] = await Promise.all([
        apiFetch<Habit[]>(apiUrl, "/habits"),
        apiFetch<ProgressResponse | { items: ProgressResponse }>(apiUrl, `/progress?weekStart=${encodeURIComponent(weekStart)}`),
      ]);

      const progressArray = Array.isArray(progressRes) ? progressRes : progressRes.items;

      const map: Record<string, ProgressItem> = {};
      for (const p of progressArray) {
        map[String(p.habitId)] = p;
      }

      setHabits(habitsRes);
      setProgressByHabitId(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreateHabit(e: FormEvent) {
    e.preventDefault();
    if (!apiUrl) return;

    const name = newHabitName.trim();
    if (!name) return;

    setCreating(true);
    setError(null);

    try {
      await apiFetch(apiUrl, "/habits", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      setNewHabitName("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function onCheckin(habitId: HabitId) {
    if (!apiUrl) return;

    const idStr = String(habitId);
    setCheckingInId(idStr);
    setError(null);

    try {
      await apiFetch(apiUrl, `/habits/${encodeURIComponent(idStr)}/checkins`, {
        method: "POST",
        body:  JSON.stringify({ }),
      });

      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCheckingInId(null);
    }
  }

  const hasBlockingLoading = loading;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ marginBottom: 8 }}>Happbit — Home</h1>

      <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
        <div>API: {apiUrl ?? "(no configurada)"}</div>
        <div>weekStart (lunes): {weekStart}</div>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, border: "1px solid #f5c2c7", background: "#f8d7da", color: "#842029" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Crear hábito</h2>
        <form onSubmit={onCreateHabit} style={{ display: "flex", gap: 8 }}>
          <input
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Ej: Meditar 5 min"
            style={{ flex: 1, padding: 10, borderRadius: 6, border: "1px solid #ccc" }}
            disabled={!apiUrl || creating}
          />
          <button
            type="submit"
            disabled={!apiUrl || creating || !newHabitName.trim()}
            style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #333", background: creating ? "#eee" : "#fff", cursor: "pointer" }}
          >
            {creating ? "Creando..." : "Crear"}
          </button>
        </form>
      </section>

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Hábitos</h2>
          <button
            onClick={() => void loadAll()}
            disabled={!apiUrl || hasBlockingLoading}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #333", background: "#fff", cursor: "pointer" }}
          >
            {hasBlockingLoading ? "Cargando..." : "Refrescar"}
          </button>
        </div>

        {hasBlockingLoading ? (
          <div style={{ padding: 8 }}>Loading...</div>
        ) : habits.length === 0 ? (
          <div style={{ padding: 8, opacity: 0.8 }}>No hay hábitos todavía.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {habits.map((h) => {
              const p = progressByHabitId[String(h.id)];
              const checkedToday = p?.checkedToday ?? false;
              const countWeek = p?.checkinsCountWeek ?? 0;

              const isPostingThis = checkingInId === String(h.id);
              const disableCheckin = !apiUrl || isPostingThis || checkedToday;

              return (
                <li key={String(h.id)} style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{h.name}</div>
                      <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
                        Progreso semana: <strong>{countWeek}</strong> check-ins
                        {" · "}
                        Hoy: <strong>{checkedToday ? "✅" : "—"}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => void onCheckin(h.id)}
                      disabled={disableCheckin}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid #333",
                        background: disableCheckin ? "#eee" : "#fff",
                        cursor: disableCheckin ? "not-allowed" : "pointer",
                        minWidth: 140,
                      }}
                      title={checkedToday ? "Ya hiciste check-in hoy" : "Hacer check-in hoy"}
                    >
                      {isPostingThis ? "Posteando..." : checkedToday ? "Check-in hecho" : "Check-in hoy"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        Tip: si el endpoint /progress todavía no existe, implementalo en API para devolver: habitId, checkinsCountWeek, checkedToday.
      </footer>
    </div>
  );
}
