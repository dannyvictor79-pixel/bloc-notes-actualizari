"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "../../components/AppNav";

type Job = {
  id: string;
  panelId: string;
  status: "primit" | "in_lucru" | "efectuat" | "esuat";
  appName: string;
  macAddress: string;
  clientName: string;
  durationHours: number;
  resultNote: string;
  createdAt: string;
};

function statusClass(status: Job["status"]) {
  if (status === "efectuat") return "bg-emerald-700/15 text-emerald-900";
  if (status === "in_lucru") return "bg-amber-400/80 text-[var(--ink)]";
  if (status === "esuat") return "bg-rose-500/15 text-rose-900";
  return "bg-zinc-200 text-zinc-800";
}

export default function TestePage() {
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [panels, setPanels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [chatPanelId, setChatPanelId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/me", { cache: "no-store" });
        const me = await meRes.json();
        if (!meRes.ok) throw new Error(me.error || "Neautorizat");
        if (cancelled) return;
        setUserName(me.user.name);
        setIsAdmin(me.user.isAdmin);
        const map: Record<string, string> = {};
        for (const p of me.panels) map[p.id] = p.name;
        setPanels(map);
        setChatPanelId(me.panels[0]?.id ?? null);

        const res = await fetch("/api/tests", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Eroare");
        if (!cancelled) setJobs(data.jobs ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Eroare");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error && !userName) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <h1 className="brand-mark text-3xl">Teste</h1>
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
            Panel testare
          </p>
          <h1 className="brand-mark text-4xl">Teste</h1>
          <p className="mt-2 max-w-xl text-[var(--ink-soft)]">
            Coadă pentru conturi de probă 24h/48h (ca formularul „+ Test” din
            Bloc notes). În v1 execuția e simulată; pe chat folosești{" "}
            <code className="rounded bg-black/5 px-1">.efectueaza test</code>.
          </p>
          {chatPanelId ? (
            <Link
              href={`/chat/${chatPanelId}`}
              className="cta-primary mt-4 inline-flex rounded-xl px-4 py-2 text-sm"
            >
              Deschide chat și rulează un test
            </Link>
          ) : null}
        </section>

        <section className="panel-surface rounded-2xl p-5 text-sm text-[var(--ink-soft)]">
          <p className="font-medium text-[var(--ink)]">Exemplu (SMARTONE)</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/[0.03] p-3 text-xs text-[var(--ink)]">
            {`.efectueaza test SMARTONE 58:96:0A:B3:E2:84 Ion 24h`}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="brand-mark text-2xl">Coadă ({jobs.length})</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">
              Niciun job încă.
            </p>
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li key={job.id} className="panel-surface rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {job.appName || "App"} · {job.clientName}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-[var(--ink-soft)]">
                    {job.macAddress || "fără MAC"} · {job.durationHours}h ·{" "}
                    {panels[job.panelId] || job.panelId}
                  </p>
                  {job.resultNote ? (
                    <p className="mt-2 text-sm text-[var(--ink-soft)]">
                      {job.resultNote}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-[var(--ink-soft)]">
                    {new Date(job.createdAt).toLocaleString("ro-RO")}
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
