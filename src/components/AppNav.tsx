"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  userName: string;
  isAdmin: boolean;
};

export function AppNav({ userName, isAdmin }: Props) {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded-lg text-sm transition ${
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
        ? "bg-[var(--ink)] text-[var(--mist)]"
        : "text-[var(--ink-soft)] hover:bg-black/5"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color-mix(in_srgb,white_70%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="brand-mark text-xl tracking-tight">
          Privat
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <Link href="/" className={linkClass("/")}>
            Chat
          </Link>
          <Link href="/expirari" className={linkClass("/expirari")}>
            Expirări
          </Link>
          <Link href="/teste" className={linkClass("/teste")}>
            Teste
          </Link>
          {isAdmin ? (
            <Link href="/admin" className={linkClass("/admin")}>
              Admin
            </Link>
          ) : null}
        </nav>
        <p className="hidden text-sm text-[var(--ink-soft)] lg:block">
          {userName}
        </p>
      </div>
    </header>
  );
}
