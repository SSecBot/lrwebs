"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Sayfa içinde beklenmeyen bir hata olduğunda gösterilir; ayrıntılar ziyaretçiye gösterilmez. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl text-fg">Bir şeyler ters gitti</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir veya ana sayfaya dönebilirsiniz.
      </p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-muted/70">Hata kodu: {error.digest}</p> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-deep transition-colors hover:bg-[#22c3de]"
        >
          Tekrar dene
        </button>
        <Link
          href="/"
          className="rounded-lg border border-line px-5 py-3 text-sm font-medium text-fg transition-colors hover:border-muted/60 hover:bg-surface"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
