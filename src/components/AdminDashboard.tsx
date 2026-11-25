"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type AdminPanel = {
  id: string;
  slug: string;
  name: string;
  kind: "admin" | "friend";
  inviteToken?: string;
  createdAt: string;
};

type Props = {
  initialPanels: AdminPanel[];
};

export function AdminDashboard({ initialPanels }: Props) {
  const router = useRouter();
  const [panels, setPanels] = useState(initialPanels);
  const [name, setName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [friendName, setFriendName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function inviteUrl(token: string) {
    if (typeof window === "undefined") return `/join/${token}`;
    return `${window.location.origin}/join/${token}`;
  }

  async function copyInvite(token: string) {
    const url = inviteUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 1800);
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/panels", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            friendEmail: friendEmail || undefined,
            friendName: friendName || undefined,
            systemPrompt: systemPrompt || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Crearea a eșuat.");
        setPanels((prev) => [...prev, data.panel]);
        setName("");
        setFriendEmail("");
        setFriendName("");
        setSystemPrompt("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare.");
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("Ștergi panoul și toate mesajele?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/panels/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ștergerea a eșuat.");
        return;
      }
      setPanels((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    });
  }

  async function onRotate(id: string) {
    const res = await fetch(`/api/panels/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rotateInvite: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Nu am putut regenera invitația.");
      return;
    }
    setPanels((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, inviteToken: data.panel.inviteToken } : p,
      ),
    );
  }

  const friends = panels.filter((p) => p.kind === "friend");

  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--moss)]">
          Control
        </p>
        <h1 className="brand-mark text-4xl sm:text-5xl">Panou admin</h1>
        <p className="mt-3 max-w-xl text-[var(--ink-soft)]">
          Creează panouri separate pentru prieteni. Fiecare panou are chat propriu
          și un link de invitație.
        </p>
      </section>

      <section className="panel-surface rounded-2xl p-5 sm:p-6">
        <h2 className="brand-mark text-2xl">Panou nou pentru prieten</h2>
        <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span>Nume panou</span>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Chat cu Alex"
              required
              maxLength={80}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Email prieten (opțional)</span>
            <input
              className="field"
              type="email"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              placeholder="prieten@email.com"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Nume prieten (opțional)</span>
            <input
              className="field"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              placeholder="Alex"
              maxLength={80}
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span>Instrucțiuni bot (opțional)</span>
            <textarea
              className="field min-h-24 resize-y"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Cum să se comporte botul pe acest panou…"
              maxLength={4000}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-700 sm:col-span-2" role="alert">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="cta-primary rounded-xl px-5 py-2.5 text-sm font-medium"
              disabled={pending || !name.trim()}
            >
              Creează panou
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="brand-mark text-2xl">
          Panouri prieteni ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">
            Încă nu ai panouri pentru prieteni.
          </p>
        ) : (
          <ul className="space-y-3">
            {friends.map((panel) => (
              <li
                key={panel.id}
                className="panel-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{panel.name}</p>
                  <p className="mt-1 break-all text-xs text-[var(--ink-soft)]">
                    {panel.inviteToken
                      ? inviteUrl(panel.inviteToken)
                      : "Fără invitație"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/chat/${panel.id}`}
                    className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-1.5 text-sm"
                  >
                    Deschide
                  </Link>
                  {panel.inviteToken ? (
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-1.5 text-sm"
                      onClick={() => copyInvite(panel.inviteToken!)}
                    >
                      {copied === panel.inviteToken ? "Copiat" : "Copiază link"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-1.5 text-sm"
                    onClick={() => onRotate(panel.id)}
                  >
                    Regenerează invitație
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800"
                    onClick={() => onDelete(panel.id)}
                  >
                    Șterge
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
