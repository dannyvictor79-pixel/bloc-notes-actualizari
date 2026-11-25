"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  authorName: string;
  createdAt: string;
};

type Props = {
  panelId: string;
  panelName: string;
  panelKind: "admin" | "friend";
};

export function ChatRoom({ panelId, panelName, panelKind }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sampleMode, setSampleMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [imageName, setImageName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/panels/${panelId}/messages`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Nu am putut încărca chatul.");
        if (!cancelled) setMessages(data.messages ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Eroare la încărcare.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [panelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Nu am putut citi fișierul."));
      reader.readAsDataURL(file);
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    const file = fileRef.current?.files?.[0] ?? null;
    if ((!content && !file) || pending) return;
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        let imageBase64: string | undefined;
        let mimeType: string | undefined;
        if (file) {
          if (file.size > 1_800_000) {
            throw new Error("Imaginea e prea mare (max ~1.5MB).");
          }
          const dataUrl = await readFileAsDataUrl(file);
          imageBase64 = dataUrl;
          mimeType = file.type || "image/jpeg";
        }
        const res = await fetch(`/api/panels/${panelId}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content, imageBase64, mimeType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Mesajul nu a putut fi trimis.");
        if (data.sample) setSampleMode(true);
        setMessages((prev) => [...prev, ...(data.messages ?? [])]);
        if (fileRef.current) fileRef.current.value = "";
        setImageName(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare la trimitere.");
        setDraft(content);
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--moss)]">
            {panelKind === "admin" ? "Panou admin" : "Panou prieten"}
          </p>
          <h1 className="brand-mark text-3xl sm:text-4xl">{panelName}</h1>
        </div>
        {sampleMode ? (
          <span className="rounded-full bg-[var(--amber-soft)] px-3 py-1 text-xs text-[var(--ink)]">
            Răspunsuri locale (AI chat opțional)
          </span>
        ) : null}
      </div>

      <div className="panel-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <p className="text-sm text-[var(--ink-soft)]">Se încarcă conversația…</p>
          ) : null}
          {!loading && messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 p-6">
              <p className="brand-mark text-2xl">Începe conversația</p>
              <p className="mt-2 max-w-md text-sm text-[var(--ink-soft)]">
                Înlocuiește botul Telegram pe acest panou. Încearcă{" "}
                <code className="rounded bg-black/5 px-1">.ajutor</code> sau
                un test ca pe ecranul SMARTONE:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-black/[0.04] p-3 text-xs">
                {`.efectueaza test SMARTONE 58:96:0A:B3:E2:84 Ion 24h`}
              </pre>
            </div>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[min(42rem,92%)] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user" ? "msg-user ml-auto" : "msg-bot"
              }`}
            >
              {m.role !== "user" ? (
                <p className="mb-1 text-[0.7rem] uppercase tracking-wider opacity-60">
                  {m.authorName || "Chatbot"}
                </p>
              ) : null}
              {m.content}
            </div>
          ))}
          {pending ? (
            <div className="msg-bot inline-flex items-center gap-1.5 rounded-2xl px-4 py-3">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="border-t border-[var(--line)] bg-white/50 p-3 sm:p-4"
        >
          {error ? (
            <p className="mb-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="field min-w-[12rem] flex-1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Mesaj sau .efectueaza test…"
              maxLength={4000}
              disabled={pending}
              aria-label="Mesaj"
            />
            <label className="cursor-pointer rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm">
              Poză
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={pending}
                onChange={(e) =>
                  setImageName(e.target.files?.[0]?.name ?? null)
                }
              />
            </label>
            <button
              type="submit"
              className="cta-primary rounded-xl px-4 py-2 text-sm font-medium"
              disabled={pending || (!draft.trim() && !imageName)}
            >
              Trimite
            </button>
          </div>
          {imageName ? (
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Atașat: {imageName}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
