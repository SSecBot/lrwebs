import { Calculator, Timer, X } from "lucide-react";
import type { QuoteEstimate } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";

/** İletişim formunda, fiyatlandırmadan taşınan seçimlerin özeti. */
export function QuoteSummary({
  estimate,
  currency,
  onRemove,
}: {
  estimate: QuoteEstimate;
  currency: string;
  onRemove?: () => void;
}) {
  const extras = [
    ...estimate.addons,
    ...(estimate.extraPages > 0 ? [`${estimate.extraPages} ek sayfa`] : []),
    ...(estimate.rush ? ["Öncelikli teslim"] : []),
  ];

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-lg border border-line bg-deep p-2">
            <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-muted">Fiyatlandırmada seçtiğiniz kapsam</p>
            <p className="mt-0.5 text-sm font-semibold text-fg">{estimate.packageName} paketi</p>
          </div>
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-muted transition hover:text-fg"
            aria-label="Seçilen kapsamı mesajdan kaldır"
            title="Kaldır"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {extras.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {extras.map((e) => (
            <li key={e} className="rounded-md border border-line bg-deep/60 px-2 py-0.5 text-[11px] text-fg/90">
              {e}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs">
        <span className="text-muted">
          Tahmini bütçe:{" "}
          <span className="font-semibold text-fg">
            {formatPrice(estimate.min, currency)} – {formatPrice(estimate.max, currency)}
          </span>
        </span>
        {estimate.timeline ? (
          <span className="inline-flex items-center gap-1 text-muted">
            <Timer className="h-3.5 w-3.5 text-warm" aria-hidden="true" />
            {estimate.timeline}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted">Bu seçimler mesajınızla birlikte otomatik olarak iletilir.</p>
    </div>
  );
}
