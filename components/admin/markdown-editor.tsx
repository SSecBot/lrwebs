"use client";

import { Bold, Code, Eye, Heading2, Heading3, Link2, List, ListOrdered, Pencil, Quote, Sparkles } from "lucide-react";
import { useId, useRef, useState } from "react";
import { SmallButton } from "@/components/admin/fields";
import { RichText } from "@/components/rich-text";
import { useToast } from "@/components/ui/toast";
import { summarize } from "@/lib/summarizer";
import { cn, readingTime } from "@/lib/utils";

type Action = { icon: typeof Bold; label: string; apply: (selected: string) => { text: string; block?: boolean } };

const ACTIONS: Action[] = [
  { icon: Heading2, label: "Başlık (H2)", apply: (s) => ({ text: `## ${s || "Başlık"}`, block: true }) },
  { icon: Heading3, label: "Alt başlık (H3)", apply: (s) => ({ text: `### ${s || "Alt başlık"}`, block: true }) },
  { icon: Bold, label: "Kalın", apply: (s) => ({ text: `**${s || "kalın metin"}**` }) },
  { icon: Code, label: "Satır içi kod", apply: (s) => ({ text: `\`${s || "kod"}\`` }) },
  { icon: Link2, label: "Bağlantı", apply: (s) => ({ text: `[${s || "bağlantı metni"}](https://)` }) },
  {
    icon: List,
    label: "Madde listesi",
    apply: (s) => ({
      text: (s || "Madde")
        .split("\n")
        .map((l) => `- ${l}`)
        .join("\n"),
      block: true,
    }),
  },
  {
    icon: ListOrdered,
    label: "Numaralı liste",
    apply: (s) => ({
      text: (s || "Madde")
        .split("\n")
        .map((l, i) => `${i + 1}. ${l}`)
        .join("\n"),
      block: true,
    }),
  },
  { icon: Quote, label: "Alıntı", apply: (s) => ({ text: `> ${s || "Alıntı"}`, block: true }) },
];

export function MarkdownEditor({
  label,
  value,
  onChange,
  rows = 14,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  const apply = (action: Action) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end);
    const { text, block } = action.apply(selected);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = block && before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const next = `${before}${prefix}${text}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = before.length + prefix.length + text.length;
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-fg">
          {label}
          <span className="ml-2 font-normal text-muted">Markdown: ## başlık, - liste, **kalın**, [bağlantı](url)</span>
        </label>
        <span className="font-mono text-[10px] text-muted">
          {words} kelime · ~{readingTime(value)} dk okuma
        </span>
      </div>
      <div className="overflow-hidden rounded-[0.625rem] border border-line bg-deep focus-within:border-primary">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => apply(action)}
              disabled={preview}
              title={action.label}
              aria-label={action.label}
              className="rounded-md p-1.5 text-muted transition hover:bg-surface hover:text-fg disabled:opacity-30"
            >
              <action.icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition",
              preview ? "bg-primary/15 text-primary" : "text-muted hover:text-fg",
            )}
          >
            {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {preview ? "Düzenle" : "Önizle"}
          </button>
        </div>
        {preview ? (
          <div className="max-h-[520px] min-h-40 overflow-y-auto p-4">
            {value.trim() ? <RichText content={value} compact /> : <p className="text-xs text-muted">Önizlenecek içerik yok.</p>}
          </div>
        ) : (
          <textarea
            id={id}
            ref={ref}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full resize-y bg-transparent p-3 font-mono text-xs leading-6 text-fg outline-none"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Özet alanı + "Otomatik Özet Çıkar" düğmesi.
 * Dahili çıkarımsal özetleyici (lib/summarizer.ts) ile kaynak içerikten özet üretir.
 */
export function SummaryField({
  label,
  value,
  onChange,
  source,
  maxLength = 300,
  maxSentences = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  source: string;
  maxLength?: number;
  maxSentences?: number;
}) {
  const id = useId();
  const toast = useToast();

  const generate = () => {
    if (source.trim().length < 80) {
      toast.error("Özet çıkarmak için içerik en az 80 karakter olmalıdır.");
      return;
    }
    const result = summarize(source, { maxLength, maxSentences });
    if (!result) {
      toast.error("İçerikten anlamlı bir özet çıkarılamadı.");
      return;
    }
    onChange(result);
    toast.success("Özet içerikten otomatik olarak oluşturuldu.");
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-fg">
          {label}
          <span className="ml-2 font-mono text-[10px] font-normal text-muted">
            {value.length}/{maxLength + 100}
          </span>
        </label>
        <SmallButton variant="warm" onClick={generate} title="İçerikteki en bilgilendirici cümleleri seçer">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Otomatik Özet Çıkar
        </SmallButton>
      </div>
      <textarea
        id={id}
        rows={3}
        value={value}
        maxLength={maxLength + 100}
        onChange={(e) => onChange(e.target.value)}
        className="input resize-y text-sm leading-6"
      />
    </div>
  );
}
