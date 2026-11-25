"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Se acceptă invitația…");
  const [panelName, setPanelName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/join/${params.token}`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invitație invalidă.");
        if (cancelled) return;
        setPanelName(data.panel.name);
        setStatus("ok");
        setMessage("Ești pe panou. Te redirecționez…");
        setTimeout(() => router.replace(`/chat/${data.panel.id}`), 700);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Eroare");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token, router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--moss)]">
        Invitație
      </p>
      <h1 className="brand-mark mt-2 text-4xl">Privat</h1>
      <p className="mt-4 text-[var(--ink-soft)]">{message}</p>
      {status === "ok" && panelName ? (
        <p className="mt-2 font-medium">{panelName}</p>
      ) : null}
      {status === "error" ? (
        <Link href="/" className="cta-primary mt-6 inline-flex w-fit rounded-xl px-4 py-2 text-sm">
          Înapoi acasă
        </Link>
      ) : null}
    </main>
  );
}
