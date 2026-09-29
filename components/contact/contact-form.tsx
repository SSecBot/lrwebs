"use client";

import { Check, LoaderCircle, Send } from "lucide-react";
import { useId, useState, useSyncExternalStore, useTransition } from "react";
import { submitContact } from "@/app/actions/contact";
import { QuoteSummary } from "@/components/contact/quote-summary";
import { useToast } from "@/components/ui/toast";
import { currencyCode, trackEvent } from "@/lib/analytics";
import { computeEstimate, normalizeSelection, selectionFromSearch } from "@/lib/pricing";
import { isValidEmail } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import type { ContactSettings, PricingSettings } from "@/types/cms";

type Field = "name" | "email" | "message" | "consent";
type Values = { name: string; email: string; message: string; consent: boolean; website: string };

/* Fiyatlandırmadan gelen seçimler URL sorgusunda taşınır (?paket=…&modul=…). */
const subscribeLocation = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};
const getSearch = () => window.location.search;
const getServerSearch = () => "";

const EMPTY: Values = { name: "", email: "", message: "", consent: false, website: "" };
const MESSAGE_MAX = 4000;

function validate(values: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (values.name.trim().length < 2) errors.name = "Lütfen adınızı girin.";
  if (!isValidEmail(values.email.trim())) errors.email = "Geçerli bir e-posta adresi girin.";
  if (values.message.trim().length < 20) errors.message = "Proje detayları en az 20 karakter olmalıdır.";
  if (values.message.length > MESSAGE_MAX) errors.message = `Mesaj en fazla ${MESSAGE_MAX} karakter olabilir.`;
  if (!values.consent) errors.consent = "Devam etmek için aydınlatma metnini onaylayın.";
  return errors;
}

export function ContactForm({
  form,
  pricing,
  className,
}: {
  form: ContactSettings["form"];
  /** Verilirse fiyatlandırma seçimleri formda gösterilir ve mesaja eklenir. */
  pricing?: PricingSettings;
  className?: string;
}) {
  const toast = useToast();
  const search = useSyncExternalStore(subscribeLocation, getSearch, getServerSearch);
  const [dismissedSearch, setDismissedSearch] = useState<string | null>(null);
  const selection = pricing && search !== dismissedSearch ? normalizeSelection(pricing, selectionFromSearch(search)) : null;
  const estimate = pricing && selection ? computeEstimate(pricing, selection) : null;

  const removeQuote = () => {
    setDismissedSearch(window.location.search);
    // Seçimleri adres çubuğundan da temizle (paylaşılan bağlantıda tekrar görünmesin).
    const url = new URL(window.location.href);
    for (const key of ["paket", "modul", "sayfa", "oncelik"]) url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  };
  const uid = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const clientErrors = validate(values);
  const errorFor = (field: Field) => (touched[field] ? (clientErrors[field] ?? serverErrors[field]) : serverErrors[field]);

  const update = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setServerErrors((e) => ({ ...e, [key]: undefined }));
    setSent(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, message: true, consent: true });
    if (Object.keys(clientErrors).length > 0) {
      toast.error(form.errorMessage);
      return;
    }
    startTransition(async () => {
      try {
        const result = await submitContact({ ...values, quote: estimate ? selection : null });
        if (result.ok) {
          trackEvent("generate_lead", {
            form: "contact",
            quote_package: estimate?.packageName,
            value: estimate?.min,
            currency: estimate && pricing ? currencyCode(pricing.currency) : undefined,
          });
          if (estimate) removeQuote();
          toast.success(form.successMessage);
          setValues(EMPTY);
          setTouched({});
          setSent(true);
        } else {
          setServerErrors((result.fieldErrors ?? {}) as Partial<Record<Field, string>>);
          toast.error(result.message || form.errorMessage);
        }
      } catch {
        toast.error(form.errorMessage);
      }
    });
  };

  const fieldId = (f: string) => `${uid}-${f}`;
  const valid = (f: Field) => touched[f] && !errorFor(f);

  return (
    <form onSubmit={onSubmit} noValidate className={cn("space-y-5", className)}>
      {estimate && pricing ? <QuoteSummary estimate={estimate} currency={pricing.currency} onRemove={removeQuote} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={fieldId("name")} className="mb-1.5 block text-sm font-medium text-fg">
            {form.nameLabel}
          </label>
          <div className="relative">
            <input
              id={fieldId("name")}
              name="name"
              autoComplete="name"
              className="input pr-9"
              placeholder={form.namePlaceholder}
              value={values.name}
              maxLength={100}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={Boolean(errorFor("name"))}
              aria-describedby={errorFor("name") ? fieldId("name-err") : undefined}
            />
            {valid("name") ? (
              <Check className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
            ) : null}
          </div>
          {errorFor("name") ? (
            <p id={fieldId("name-err")} className="mt-1.5 text-xs text-red-400">
              {errorFor("name")}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={fieldId("email")} className="mb-1.5 block text-sm font-medium text-fg">
            {form.emailLabel}
          </label>
          <div className="relative">
            <input
              id={fieldId("email")}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              className="input pr-9"
              placeholder={form.emailPlaceholder}
              value={values.email}
              maxLength={200}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={Boolean(errorFor("email"))}
              aria-describedby={errorFor("email") ? fieldId("email-err") : undefined}
            />
            {valid("email") ? (
              <Check className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
            ) : null}
          </div>
          {errorFor("email") ? (
            <p id={fieldId("email-err")} className="mt-1.5 text-xs text-red-400">
              {errorFor("email")}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <label htmlFor={fieldId("message")} className="block text-sm font-medium text-fg">
            {form.messageLabel}
          </label>
          <span className={cn("text-[11px]", values.message.length > MESSAGE_MAX ? "text-red-400" : "text-muted")}>
            {values.message.length}/{MESSAGE_MAX}
          </span>
        </div>
        <textarea
          id={fieldId("message")}
          name="message"
          rows={6}
          className="input resize-y"
          placeholder={form.messagePlaceholder}
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, message: true }))}
          aria-invalid={Boolean(errorFor("message"))}
          aria-describedby={errorFor("message") ? fieldId("message-err") : undefined}
        />
        {errorFor("message") ? (
          <p id={fieldId("message-err")} className="mt-1.5 text-xs text-red-400">
            {errorFor("message")}
          </p>
        ) : null}
      </div>

      {/* Bal küpü alanı — ekran okuyuculardan ve kullanıcılardan gizlenir */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor={fieldId("website")}>Web siteniz</label>
        <input
          id={fieldId("website")}
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      {form.consentText ? (
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted">
            <input
              type="checkbox"
              checked={values.consent}
              onChange={(e) => {
                update("consent", e.target.checked);
                setTouched((t) => ({ ...t, consent: true }));
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#06b6d4]"
              aria-invalid={Boolean(errorFor("consent"))}
            />
            <span>{form.consentText}</span>
          </label>
          {errorFor("consent") ? <p className="mt-1.5 text-xs text-red-400">{errorFor("consent")}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-deep transition hover:bg-[#22c3de] active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? "Gönderiliyor…" : form.submitLabel}
        </button>
        {sent ? (
          <p className="flex items-center gap-2 text-sm text-primary" role="status">
            <Check className="h-4 w-4" aria-hidden="true" />
            {form.successMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}
