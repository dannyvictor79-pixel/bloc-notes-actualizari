"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "./AppNav";

type Panel = {
  id: string;
  name: string;
  kind: "admin" | "friend";
};

type MeResponse = {
  user: {
    name: string;
    email: string;
    isAdmin: boolean;
    simulated: boolean;
  };
  panels: Panel[];
};

export function HomeClient() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Nu ești autentificat.");
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Eroare.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
        <h1 className="brand-mark text-4xl">Privat</h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          Trebuie să fii autentificat în Cursor ca să folosești chatbotul.
        </p>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg items-center px-6">
        <p className="text-[var(--ink-soft)]">Se încarcă…</p>
      </main>
    );
  }

  const adminPanel = data.panels.find((p) => p.kind === "admin");
  const friendPanels = data.panels.filter((p) => p.kind === "friend");

  return (
    <div className="app-shell">
      <AppNav userName={data.user.name} isAdmin={data.user.isAdmin} />
      <main className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 h-72" />
        <section className="relative max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--moss)]">
            Chatbot privat
          </p>
          <h1 className="brand-mark mt-2 text-5xl leading-[1.05] sm:text-6xl">
            Privat
          </h1>
          <p className="mt-4 max-w-lg text-base text-[var(--ink-soft)] sm:text-lg">
            Conversații pe panouri separate. Tu ai controlul; prietenii intră doar
            pe panoul lor.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {adminPanel ? (
              <Link
                href={`/chat/${adminPanel.id}`}
                className="cta-primary rounded-xl px-5 py-3 text-sm font-medium"
              >
                Intră în chatul tău
              </Link>
            ) : friendPanels[0] ? (
              <Link
                href={`/chat/${friendPanels[0].id}`}
                className="cta-primary rounded-xl px-5 py-3 text-sm font-medium"
              >
                Deschide panoul tău
              </Link>
            ) : null}
            {data.user.isAdmin ? (
              <Link
                href="/admin"
                className="rounded-xl border border-[var(--line)] bg-white/70 px-5 py-3 text-sm"
              >
                Gestionează panouri
              </Link>
            ) : null}
          </div>
          {data.user.simulated ? (
            <p className="mt-4 text-xs text-[var(--ink-soft)]">
              Vizualizare locală simulată (nu e autentificare reală Cursor).
            </p>
          ) : null}
        </section>

        <section className="relative mt-14">
          <h2 className="brand-mark text-2xl">Panourile tale</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.panels.map((panel) => (
              <li key={panel.id}>
                <Link
                  href={`/chat/${panel.id}`}
                  className="panel-surface block rounded-2xl p-5 transition hover:-translate-y-0.5"
                >
                  <p className="text-xs uppercase tracking-wider text-[var(--moss)]">
                    {panel.kind === "admin" ? "Admin" : "Prieten"}
                  </p>
                  <p className="mt-1 text-lg font-medium">{panel.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
