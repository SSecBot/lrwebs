import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-7xl font-bold text-line sm:text-9xl">404</p>
      <h1 className="mt-4 font-mono text-2xl font-bold text-fg">Sayfa bulunamadı</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        Aradığınız sayfa taşınmış veya kaldırılmış olabilir. Ana sayfaya dönerek devam edebilirsiniz.
      </p>
      <Link href="/" className="mt-8 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-deep transition hover:bg-[#22c3de]">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
