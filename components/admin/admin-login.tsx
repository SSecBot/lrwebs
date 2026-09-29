"use client";

import { ArrowLeft, KeyRound, LoaderCircle, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/admin";

export function AdminLogin({ brandName }: { brandName: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setError("Lütfen parolayı girin.");
      return;
    }
    startTransition(async () => {
      const result = await loginAction(passcode);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message);
        setPasscode("");
      }
    });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition hover:text-fg">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Siteye dön
        </Link>
        <div className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur sm:p-8">
          <span className="inline-flex rounded-xl border border-line bg-deep p-3">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-xl font-normal text-fg">
            {brandName} <span className="text-primary">Yönetim</span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">İçerik yönetim paneline erişmek için yönetici parolasını girin.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="passcode" className="mb-1.5 block text-xs font-medium text-fg">
                Parola
              </label>
              <div className="relative">
                <KeyRound className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id="passcode"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError("");
                  }}
                  className="input pl-10"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "passcode-error" : undefined}
                />
              </div>
              {error ? (
                <p id="passcode-error" className="mt-2 text-xs text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-deep transition hover:bg-[#22c3de] disabled:opacity-60"
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Giriş yap
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">Oturum 8 saat sonra otomatik olarak sonlanır.</p>
      </div>
    </main>
  );
}
