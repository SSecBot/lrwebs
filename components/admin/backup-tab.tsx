"use client";

import { ArchiveRestore, CircleAlert, Download, FileArchive, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Panel, SmallButton } from "@/components/admin/fields";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface Preview {
  createdAt: string;
  brandName: string;
  services: number;
  projects: number;
  blog: number;
  messages: number;
  uploads: number;
  skippedUploads: number;
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(d);
};

async function postBackup(file: File, dryRun: boolean) {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch(`/api/admin/restore${dryRun ? "?dryRun=1" : ""}`, { method: "POST", body, credentials: "same-origin" });
  const json = (await res.json().catch(() => ({ ok: false, message: "" }))) as {
    ok: boolean;
    message?: string;
    preview?: Preview;
    details?: Record<string, string>;
    summary?: { messages: number; uploads: number; skippedUploads: number; safetyBackup: string };
  };
  if (res.status === 401) throw new Error("Oturum süresi doldu. Lütfen yeniden giriş yapın.");
  return json;
}

/** Tüm site verisini .lrwebs olarak indirme ve geri yükleme. */
export function BackupTab({ isDirty }: { isDirty: boolean }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [details, setDetails] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState<"check" | "restore" | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setDetails(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const choose = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.lrwebs$/i.test(f.name)) {
      toast.error("Yalnızca .lrwebs uzantılı yedek dosyaları seçilebilir.");
      return;
    }
    setFile(f);
    setPreview(null);
    setDetails(null);
    setBusy("check");
    try {
      const res = await postBackup(f, true);
      if (res.ok && res.preview) setPreview(res.preview);
      else {
        setDetails(res.details ?? null);
        toast.error(res.message || "Yedek doğrulanamadı.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yedek doğrulanamadı.");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (!file) return;
    setBusy("restore");
    try {
      const res = await postBackup(file, false);
      if (!res.ok) {
        setDetails(res.details ?? null);
        toast.error(res.message || "Geri yükleme başarısız oldu.");
        return;
      }
      toast.success(res.message || "Yedek geri yüklendi.");
      // Paneli geri yüklenen içerikle yeniden aç.
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Geri yükleme başarısız oldu.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Yedek indir"
        description="Tüm yazılar, sayfa metinleri, hizmetler, projeler, blog, fiyatlar, yasal metinler, gelen mesajlar ve yüklenen dosyalar (PDF, sekme ikonu) tek bir .lrwebs dosyasına paketlenir."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-xs leading-5 text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Güncellemeden önce yedek almanız önerilir. Oturum anahtarı ve parola gibi gizli bilgiler güvenlik gereği yedeğe
              dahil edilmez.
            </span>
          </div>
          <a
            href="/api/admin/backup"
            download
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-deep transition hover:bg-[#22c3de]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Yedeği indir (.lrwebs)
          </a>
        </div>
        {isDirty ? (
          <p className="flex items-center gap-2 rounded-xl border border-warm/40 bg-warm/5 px-4 py-3 text-xs text-warm">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Kaydedilmemiş değişiklikleriniz var. Yedek yalnızca kaydedilmiş içeriği kapsar; önce kaydetmeniz önerilir.
          </p>
        ) : null}
      </Panel>

      <Panel
        title="Yedekten geri yükle"
        description="Seçtiğiniz yedek önce doğrulanır ve içeriği gösterilir; siz onaylamadan hiçbir şey değişmez."
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void choose(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label=".lrwebs yedek dosyası seçin veya sürükleyip bırakın"
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition",
            dragging ? "border-primary bg-primary/5" : "border-line hover:border-primary/50",
          )}
        >
          {busy === "check" ? (
            <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-6 w-6 text-primary" aria-hidden="true" />
          )}
          <p className="text-sm text-fg">
            {busy === "check" ? "Yedek doğrulanıyor…" : ".lrwebs dosyasını buraya sürükleyin veya seçin"}
          </p>
          <p className="text-[11px] text-muted">En fazla 60 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".lrwebs"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => void choose(e.target.files?.[0])}
          />
        </div>

        {details ? (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-xs text-red-200/90">
            {Object.entries(details).map(([k, v]) => (
              <li key={k}>
                <span className="font-mono text-red-300">{k}</span>: {v}
              </li>
            ))}
          </ul>
        ) : null}

        {file && preview ? (
          <div className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <FileArchive className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{file.name}</p>
                <p className="text-xs text-muted">
                  {preview.brandName} · {formatDateTime(preview.createdAt)} tarihinde oluşturuldu
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
              {[
                ["Hizmet", preview.services],
                ["Proje", preview.projects],
                ["Blog yazısı", preview.blog],
                ["Mesaj", preview.messages],
                ["Dosya", preview.uploads],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-deep/60 px-3 py-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-base font-semibold text-fg">{value}</dd>
                </div>
              ))}
            </dl>
            {preview.skippedUploads > 0 ? (
              <p className="text-xs text-warm">
                {preview.skippedUploads} dosya güvenlik doğrulamasından geçemedi ve geri yüklenmeyecek.
              </p>
            ) : null}
            <p className="flex items-start gap-2 text-xs leading-5 text-warm">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Geri yükleme mevcut tüm içeriğin ve mesajların yerine geçer. Mevcut durum, geri dönebilmeniz için önce sunucuda
              otomatik olarak yedeklenir (data/backups).
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <SmallButton onClick={reset} disabled={busy !== null}>
                Vazgeç
              </SmallButton>
              <button
                type="button"
                onClick={() => void restore()}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-warm px-4 py-2 text-xs font-semibold text-deep transition hover:bg-[#f7ad2e] disabled:opacity-60"
              >
                {busy === "restore" ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Yedeği geri yükle
              </button>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
