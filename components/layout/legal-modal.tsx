"use client";

import { ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { RichText } from "@/components/rich-text";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import type { LegalDocument, LegalKind } from "@/types/cms";

interface LegalLinksProps {
  documents: Record<LegalKind, LegalDocument>;
  labels: Record<LegalKind, string>;
  className?: string;
}

const SAFE_PDF = /^\/api\/uploads\/(privacy|kvkk)-\d{10,16}-[a-f0-9]{8}\.pdf$/;

/** Gizlilik Politikası ve KVKK metinlerini sayfadan ayrılmadan açan bağlantılar. */
export function LegalLinks({ documents, labels, className }: LegalLinksProps) {
  const [active, setActive] = useState<LegalKind | null>(null);
  const raw = active ? documents[active] : null;
  // Savunma katmanı: yalnızca sunucunun ürettiği yükleme adreslerine izin verilir.
  const doc = raw ? { ...raw, pdfUrl: SAFE_PDF.test(raw.pdfUrl) ? raw.pdfUrl : "" } : null;

  return (
    <>
      <div className={className}>
        {(Object.keys(labels) as LegalKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActive(kind)}
            className="text-sm text-muted underline-offset-4 transition hover:text-fg hover:underline"
          >
            {labels[kind]}
          </button>
        ))}
      </div>

      <Modal
        open={Boolean(doc)}
        onClose={() => setActive(null)}
        title={doc?.title ?? ""}
        subtitle={doc?.updatedAt ? `Son güncelleme: ${formatDate(doc.updatedAt)}` : undefined}
        size={doc?.pdfUrl ? "xl" : "lg"}
        footer={
          doc?.pdfUrl ? (
            <a
              href={doc.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary transition hover:text-fg"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              PDF dosyasını yeni sekmede aç
            </a>
          ) : undefined
        }
      >
        {doc?.pdfUrl ? (
          <div className="flex h-[70dvh] flex-col gap-3">
            <p className="flex items-center gap-2 text-xs text-muted">
              <FileText className="h-4 w-4 text-warm" aria-hidden="true" />
              Belge PDF olarak görüntüleniyor. Tarayıcınız PDF önizlemesini desteklemiyorsa aşağıdaki bağlantıyı kullanın.
            </p>
            <iframe
              src={`${doc.pdfUrl}#toolbar=1&view=FitH`}
              title={doc.title}
              className="h-full w-full flex-1 rounded-xl border border-line bg-white"
            />
          </div>
        ) : doc ? (
          <RichText content={doc.content} />
        ) : null}
      </Modal>
    </>
  );
}
