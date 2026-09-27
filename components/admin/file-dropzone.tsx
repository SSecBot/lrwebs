"use client";

import { LoaderCircle, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { GeneralSettings, LegalSettings } from "@/types/cms";

export interface UploadResponse {
  ok: boolean;
  message: string;
  url?: string;
  general?: GeneralSettings;
  legal?: LegalSettings;
}

interface FileDropzoneProps {
  kind: "privacy" | "kvkk" | "favicon";
  /** input[accept] değeri */
  accept: string;
  /** İstemci tarafı ön kontrol için izin verilen uzantılar (sunucu ayrıca doğrular). */
  extensions: string[];
  maxBytes: number;
  title: string;
  hint: string;
  onUploaded: (response: UploadResponse) => void;
  compact?: boolean;
}

/**
 * Sürükle-bırak dosya yükleyici. İstemci tarafındaki kontroller yalnızca kullanıcı deneyimi
 * içindir; asıl doğrulama /api/admin/upload uç noktasında sunucu tarafında yapılır.
 */
export function FileDropzone({
  kind,
  accept,
  extensions,
  maxBytes,
  title,
  hint,
  onUploaded,
  compact = false,
}: FileDropzoneProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file || uploading) return;
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!extensions.includes(ext)) {
      toast.error(`Yalnızca ${extensions.map((e) => `.${e}`).join(", ")} dosyaları yüklenebilir.`);
      return;
    }
    if (file.size > maxBytes) {
      toast.error(
        `Dosya boyutu en fazla ${maxBytes >= 1024 * 1024 ? `${maxBytes / 1024 / 1024} MB` : `${maxBytes / 1024} KB`} olabilir.`,
      );
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/admin/upload?kind=${kind}`, { method: "POST", body, credentials: "same-origin" });
      const json = (await res.json().catch(() => ({ ok: false, message: "" }))) as UploadResponse;
      if (!res.ok || !json.ok || !json.url) {
        throw new Error(res.status === 401 ? "Oturum süresi doldu. Lütfen yeniden giriş yapın." : json.message);
      }
      onUploaded(json);
      toast.success(json.message);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Yükleme başarısız oldu.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void upload(e.dataTransfer.files[0]);
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
      aria-label={title}
      aria-busy={uploading}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center transition",
        compact ? "py-5" : "py-8",
        dragging ? "border-primary bg-primary/5" : "border-line hover:border-primary/50",
      )}
    >
      {uploading ? (
        <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      ) : (
        <UploadCloud className="h-6 w-6 text-primary" aria-hidden="true" />
      )}
      <p className="text-sm text-fg">{uploading ? "Yükleniyor…" : title}</p>
      <p className="text-[11px] text-muted">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => void upload(e.target.files?.[0])}
        tabIndex={-1}
      />
    </div>
  );
}
