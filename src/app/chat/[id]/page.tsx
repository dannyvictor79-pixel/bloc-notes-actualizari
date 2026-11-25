"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppNav } from "../../../components/AppNav";
import { ChatRoom } from "../../../components/ChatRoom";

type PanelInfo = {
  id: string;
  name: string;
  kind: "admin" | "friend";
};

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [panel, setPanel] = useState<PanelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/me", { cache: "no-store" });
        const me = await meRes.json();
        if (!meRes.ok) throw new Error(me.error || "Neautorizat");

        const panelRes = await fetch(`/api/panels/${params.id}`, {
          cache: "no-store",
        });
        const panelData = await panelRes.json();
        if (!panelRes.ok) {
          throw new Error(panelData.error || "Panoul nu este disponibil.");
        }
        if (!cancelled) {
          setUserName(me.user.name);
          setIsAdmin(me.user.isAdmin);
          setPanel(panelData.panel);
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
  }, [params.id]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <h1 className="brand-mark text-3xl">Chat indisponibil</h1>
        <p className="mt-3 text-[var(--ink-soft)]">{error}</p>
      </main>
    );
  }

  if (!panel) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <p className="text-[var(--ink-soft)]">Se deschide panoul…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <AppNav userName={userName} isAdmin={isAdmin} />
      <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8" style={{ minHeight: "calc(100dvh - 4rem)" }}>
        <ChatRoom
          panelId={panel.id}
          panelName={panel.name}
          panelKind={panel.kind}
        />
      </main>
    </div>
  );
}
