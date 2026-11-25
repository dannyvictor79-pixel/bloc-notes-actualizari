"use client";

import { useEffect, useState } from "react";
import { AdminDashboard, type AdminPanel } from "../../components/AdminDashboard";
import { AppNav } from "../../components/AppNav";

export default function AdminPage() {
  const [userName, setUserName] = useState("");
  const [panels, setPanels] = useState<AdminPanel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Neautorizat");
        if (!data.user.isAdmin) {
          throw new Error("Doar adminul poate deschide acest panou.");
        }
        if (!cancelled) {
          setUserName(data.user.name);
          setPanels(data.panels);
        }
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

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <h1 className="brand-mark text-3xl">Acces restricționat</h1>
        <p className="mt-3 text-[var(--ink-soft)]">{error}</p>
      </main>
    );
  }

  if (!panels) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <p className="text-[var(--ink-soft)]">Se încarcă panoul admin…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <AppNav userName={userName} isAdmin />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <AdminDashboard initialPanels={panels} />
      </main>
    </div>
  );
}
