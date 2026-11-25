"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { AppNav } from "../../components/AppNav";

type ExpirationRow = {
  id: string;
  panelId: string;
  clientName: string;
  appName: string;
  macAddress: string;
  expiresAt: string;
  statusLabel: string;
  tone: "ok" | "today" | "soon" | "expired";
  source: string;
};

type PanelOpt = { id: string; name: string };

function toneClass(tone: ExpirationRow["tone"]) {
  if (tone === "expired") return "bg-zinc-700 text-white";
  if (tone === "today") return "bg-rose-500 text-white";
  if (tone === "soon") return "bg-amber-400 text-[var(--ink)]";
  return "bg-emerald-700/15 text-emerald-900";
}

export default function ExpirariPage() {
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [panels, setPanels] = useState<PanelOpt[]>([]);
  const [rows, setRows] = useState<ExpirationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [panelId, setPanelId] = useState("");
  const [clientName, setClientName] = useState("");
  const [appName, setAppName] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  async function load() {
    const meRes = await fetch("/api/me", { cache: "no-store" });
    const me = await meRes.json();
    if (!meRes.ok) throw new Error(me.error || "Neautorizat");
    setUserName(me.user.name);
    setIsAdmin(me.user.isAdmin);
    setPanels(me.panels.map((p: PanelOpt) => ({ id: p.id, name: p.name })));
    if (!panelId && me.panels[0]) setPanelId(me.panels[0].id);

    const expRes = await fetch("/api/expirations", { cache: "no-store" });
    const exp = await expRes.json();
    if (!expRes.ok) throw new Error(exp.error || "Nu am putut încărca.");
    setRows(exp.expirations ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Eroare");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/expirations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            panelId,
            clientName,
            appName,
            macAddress,
            expiresAt: new Date(expiresAt).toISOString(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Crearea a eșuat.");
        setClientName("");
        setAppName("");
        setMacAddress("");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare");
      }
    });
  }

  if (error && rows.length === 0 && !userName) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <h1 className="brand-mark text-3xl">Expirări</h1>
        <p className="mt-3 text-red-700">{error}</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <AppNav userName={userName || "…"} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <section>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--moss)]">
            Dashboard termene
          </p>
          <h1 className="brand-mark text-4xl">Expirări</h1>
          <p className="mt-2 max-w-xl text-[var(--ink-soft)]">
            Echivalentul Panel Dashboard din Bloc notes — pe panoul Privat.
            Memento 3/6 zile vine pe chat (v1: listă + status).
          </p>
        </section>

        <section className="panel-surface rounded-2xl p-5">
          <h2 className="brand-mark text-xl">Adaugă termen</h2>
          <form onSubmit={onCreate} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span>Panou</span>
              <select
                className="field"
                value={panelId}
                onChange={(e) => setPanelId(e.target.value)}
                required
              >
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>Nume</span>
              <input
                className="field"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                placeholder="ex. Alina"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Aplicație</span>
              <input
                className="field"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="SMARTONE"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>MAC</span>
              <input
                className="field"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                placeholder="58:96:0A:B3:E2:84"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Expiră la</span>
              <input
                className="field"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="cta-primary rounded-xl px-4 py-2 text-sm"
                disabled={pending}
              >
                Salvează termen
              </button>
            </div>
          </form>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className="space-y-3">
          <h2 className="brand-mark text-2xl">Termene ({rows.length})</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">
              Niciun termen. Rulează un `.efectueaza test` din chat sau adaugă
              manual.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="panel-surface rounded-2xl p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.clientName}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {row.appName || "fără app"}
                        {row.macAddress ? ` · ${row.macAddress}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${toneClass(row.tone)}`}
                    >
                      {row.statusLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--ink-soft)]">
                    {new Date(row.expiresAt).toLocaleString("ro-RO")} ·{" "}
                    {row.source === "test" ? "din test" : "din panou"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
