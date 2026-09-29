"use client";

import { ArrowDownRight, ArrowUpRight, CircleAlert, LoaderCircle, Minus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { TrafficChart, type ChartPoint } from "@/components/admin/analytics-chart";
import { Grid, Panel, SelectField, SmallButton, TagsField, Toggle } from "@/components/admin/fields";
import type { TabProps } from "@/components/admin/tabs-settings";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { AnalyticsRange, AnalyticsReport, Row, Totals } from "@/lib/analytics-store";
import type { AnalyticsSettings } from "@/types/cms";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Bugün" },
  { value: "7d", label: "Son 7 gün" },
  { value: "30d", label: "Son 30 gün" },
  { value: "90d", label: "Son 90 gün" },
];

const RETENTION = [
  { value: "30", label: "30 gün" },
  { value: "90", label: "90 gün" },
  { value: "180", label: "6 ay" },
  { value: "365", label: "1 yıl" },
  { value: "730", label: "2 yıl" },
];

interface ReportResponse {
  ok: boolean;
  message?: string;
  report?: AnalyticsReport;
  storage?: { days: number; bytes: number; oldest: string | null };
  trustProxy?: boolean;
}

const nf = (n: number) => n.toLocaleString("tr-TR");

function duration(seconds: number): string {
  if (seconds <= 0) return "0 sn";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} dk ${s} sn` : `${s} sn`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dayLabel(key: string, long = false): string {
  const d = new Date(`${key}T12:00:00Z`);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: long ? "long" : "short",
    ...(long ? { weekday: "short" } : {}),
    timeZone: "UTC",
  });
}

/* ---------- KPI kutucukları ---------- */

type MetricKey = keyof Totals;

const METRICS: { key: MetricKey; label: string; format: (n: number) => string; lowerIsBetter?: boolean }[] = [
  { key: "visitors", label: "Ziyaretçi", format: nf },
  { key: "visits", label: "Ziyaret", format: nf },
  { key: "pageviews", label: "Sayfa görüntüleme", format: nf },
  { key: "avgVisitSeconds", label: "Ort. ziyaret süresi", format: duration },
  { key: "bounceRate", label: "Hemen çıkma oranı", format: (n) => `%${n.toLocaleString("tr-TR")}`, lowerIsBetter: true },
  { key: "events", label: "Olay", format: nf },
];

function Delta({ current, previous, lowerIsBetter }: { current: number; previous: number; lowerIsBetter?: boolean }) {
  if (previous === 0 && current === 0) return <span className="text-muted">—</span>;
  if (previous === 0) return <span className="text-muted">yeni</span>;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) {
    return (
      <span className="flex items-center gap-1 text-muted">
        <Minus className="h-3 w-3" aria-hidden="true" />
        değişmedi
      </span>
    );
  }
  const up = change > 0;
  const good = lowerIsBetter ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("flex items-center gap-1", good ? "text-emerald-400" : "text-red-400")}>
      <Icon className="h-3 w-3" aria-hidden="true" />%{Math.abs(change)}
      <span className="sr-only">{up ? "artış" : "azalış"}</span>
    </span>
  );
}

/* ---------- Kırılım listesi ---------- */

function Breakdown({
  title,
  rows,
  unit = "ziyaret",
  mono = false,
}: {
  title: string;
  rows: Row[];
  unit?: string;
  mono?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-xl border border-line bg-deep/40 p-4">
      <div className="mb-3 flex items-baseline justify-between text-xs">
        <p className="font-semibold text-fg">{title}</p>
        <p className="text-muted">{unit}</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">Veri yok</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.name} className="relative flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs">
              <span
                className="absolute inset-y-0 left-0 rounded-md bg-primary/15"
                style={{ width: `${(r.value / max) * 100}%` }}
                aria-hidden="true"
              />
              <span className={cn("relative truncate text-fg", mono && "font-mono")} title={r.name}>
                {r.name}
              </span>
              <span className="relative font-medium text-fg tabular-nums">{nf(r.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- İstatistik ekranı ---------- */

function AnalyticsDashboard({ enabled }: { enabled: boolean }) {
  const toast = useToast();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(
    async (quiet = false) => {
      try {
        const res = await fetch(`/api/admin/analytics?range=${range}`, { credentials: "same-origin", cache: "no-store" });
        const json = (await res.json()) as ReportResponse;
        if (!json.ok) throw new Error(json.message || "Rapor alınamadı.");
        setData(json);
      } catch (error) {
        if (!quiet) toast.error(error instanceof Error ? error.message : "Rapor alınamadı.");
      } finally {
        setLoading(false);
      }
    },
    [range, toast],
  );

  useEffect(() => {
    // İlk yükleme bir sonraki görev döngüsünde başlar (efekt içinde senkron setState yapılmaz).
    const first = window.setTimeout(() => void load(), 0);
    // Canlı sayaç için sekme açıkken dakikada bir sessizce yenile.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);

  const clear = async () => {
    setConfirmClear(false);
    const res = await fetch("/api/admin/analytics", { method: "DELETE", credentials: "same-origin" });
    const json = (await res.json().catch(() => ({ ok: false, message: "İşlem başarısız." }))) as ReportResponse;
    if (json.ok) {
      toast.success(json.message || "Silindi.");
      void load();
    } else toast.error(json.message || "İşlem başarısız.");
  };

  const report = data?.report;
  const points: ChartPoint[] =
    report?.series.map((s) => ({
      ...s,
      label: report.granularity === "hour" ? `${s.key}:00` : dayLabel(s.key),
    })) ?? [];
  const empty = report && report.totals.pageviews === 0 && report.totals.events === 0;

  return (
    <Panel
      title="İstatistikler"
      description={
        report
          ? `${dayLabel(report.from, true)} – ${dayLabel(report.to, true)} · önceki dönemle karşılaştırmalı`
          : "Sitenizin ziyaretçi istatistikleri"
      }
      actions={
        <>
          <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Tarih aralığı">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  if (r.value === range) return;
                  setLoading(true);
                  setRange(r.value);
                }}
                aria-pressed={range === r.value}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition",
                  range === r.value ? "bg-primary/15 text-fg" : "text-muted hover:text-fg",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <SmallButton
            onClick={() => {
              setLoading(true);
              void load();
            }}
            disabled={loading}
            title="Yenile"
          >
            {loading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Yenile
          </SmallButton>
        </>
      }
    >
      {!enabled ? (
        <p className="flex items-start gap-2 rounded-xl border border-warm/30 bg-warm/5 px-4 py-3 text-xs leading-5 text-warm">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Analitik şu an kapalı; yeni ziyaretler kaydedilmiyor. Aşağıda daha önce toplanan veriler gösterilir.
        </p>
      ) : null}

      {!report ? (
        <div className="flex h-40 items-center justify-center text-muted">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              {report.realtime.visitors > 0 ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              ) : null}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  report.realtime.visitors > 0 ? "bg-emerald-400" : "bg-muted/50",
                )}
              />
            </span>
            <span>
              <span className="font-medium text-fg">{nf(report.realtime.visitors)}</span> ziyaretçi şu anda sitede
              <span className="text-muted/70"> (son 5 dakika)</span>
              {report.realtime.pages.length ? (
                <span className="text-muted/70"> · {report.realtime.pages.map((p) => p.name).join(", ")}</span>
              ) : null}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {METRICS.map((m) => (
              <div key={m.key} className="rounded-xl border border-line bg-deep/40 px-4 py-3">
                <p className="text-[11px] text-muted">{m.label}</p>
                <p className="mt-1 text-xl font-semibold text-fg tabular-nums">{m.format(report.totals[m.key])}</p>
                <p className="mt-1 text-[11px]">
                  <Delta current={report.totals[m.key]} previous={report.previous[m.key]} lowerIsBetter={m.lowerIsBetter} />
                </p>
              </div>
            ))}
          </div>

          {empty ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
              Bu dönem için henüz veri yok.
              {enabled ? " Siteyi ziyaret ettiğinizde (yönetici oturumu dışında) kayıtlar burada görünür." : null}
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-line bg-deep/40 p-4">
                <TrafficChart points={points} />
              </div>

              <div className="rounded-xl border border-line bg-deep/40 p-4">
                <p className="mb-3 text-xs font-semibold text-fg">En çok görüntülenen sayfalar</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-xs">
                    <thead className="text-muted">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Sayfa</th>
                        <th className="px-3 py-2 text-right font-medium">Görüntüleme</th>
                        <th className="px-3 py-2 text-right font-medium">Ziyaretçi</th>
                        <th className="py-2 pl-3 text-right font-medium">Ort. süre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.pages.map((p) => (
                        <tr key={p.path} className="border-t border-line">
                          <td className="max-w-[280px] truncate py-2 pr-3 font-mono text-fg" title={p.path}>
                            {p.path}
                          </td>
                          <td className="px-3 py-2 text-right text-fg tabular-nums">{nf(p.views)}</td>
                          <td className="px-3 py-2 text-right text-fg tabular-nums">{nf(p.visitors)}</td>
                          <td className="py-2 pl-3 text-right text-muted tabular-nums">{duration(p.avgSeconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Breakdown title="Trafik kaynakları" rows={report.sources} />
                <Breakdown title="Giriş sayfaları" rows={report.entryPages} mono />
                <Breakdown title="Cihazlar" rows={report.devices} />
                <Breakdown title="Tarayıcılar" rows={report.browsers} />
                <Breakdown title="İşletim sistemleri" rows={report.os} />
                <Breakdown title="Tarayıcı dili" rows={report.languages} />
              </div>

              <div className="rounded-xl border border-line bg-deep/40 p-4">
                <p className="mb-3 text-xs font-semibold text-fg">Olaylar</p>
                {report.events.length === 0 ? (
                  <p className="py-2 text-xs text-muted">
                    Bu dönemde olay kaydı yok. Form gönderimi ve fiyat teklifi gibi işlemler otomatik olarak kaydedilir.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {report.events.map((e) => (
                      <li key={e.name} className="py-2.5 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-fg">
                            {e.label}
                            {e.label !== e.name ? <span className="ml-2 font-mono text-muted/70">{e.name}</span> : null}
                          </span>
                          <span className="font-medium text-fg tabular-nums">{nf(e.count)}</span>
                        </div>
                        {e.details.length ? (
                          <p className="mt-1 text-muted">{e.details.map((d) => `${d.name} (${nf(d.value)})`).join(" · ")}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-line pt-4 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              Depolama: {data?.storage?.days ?? 0} günlük kayıt · {formatBytes(data?.storage?.bytes ?? 0)}
              {data?.storage?.oldest ? ` · en eski ${dayLabel(data.storage.oldest, true)}` : ""}
            </p>
            {confirmClear ? (
              <span className="flex items-center gap-2">
                <span className="text-red-300">Tüm veriler kalıcı olarak silinecek.</span>
                <SmallButton variant="danger" onClick={() => void clear()}>
                  Evet, sil
                </SmallButton>
                <SmallButton onClick={() => setConfirmClear(false)}>Vazgeç</SmallButton>
              </span>
            ) : (
              <SmallButton variant="danger" onClick={() => setConfirmClear(true)} disabled={!data?.storage?.days}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Tüm analitik verilerini sil
              </SmallButton>
            )}
          </div>

          {data && data.trustProxy === false ? (
            <p className="flex items-start gap-2 text-[11px] leading-5 text-muted">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm" aria-hidden="true" />
              TRUST_PROXY=1 ayarlı değil: sunucu ziyaretçi IP&apos;sini göremediği için aynı tarayıcıyı kullanan farklı
              ziyaretçiler tek kişi sayılabilir. Docker/Caddy kurulumunda bu ayar zaten açıktır.
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}

/* ---------- Sekme ---------- */

export function AnalyticsTab({
  value: analytics,
  onChange,
  savedEnabled,
}: TabProps<AnalyticsSettings> & { savedEnabled: boolean }) {
  const set = <K extends keyof AnalyticsSettings>(key: K, v: AnalyticsSettings[K]) => onChange({ ...analytics, [key]: v });

  return (
    <div className="space-y-6">
      <Panel
        title="Site analitiği"
        description="Kendi sunucunuzda çalışan, çerezsiz ziyaretçi istatistikleri. Veriler üçüncü taraflara gönderilmez."
      >
        <Toggle
          label="Analitiği etkinleştir"
          description="Açıkken sayfa görüntülemeleri, ziyaretçiler, trafik kaynakları ve form/teklif olayları kaydedilir. Kaydettiğinizde yürürlüğe girer."
          checked={analytics.enabled}
          onChange={(v) => set("enabled", v)}
        />
        <Grid>
          <Toggle
            label="“İzleme” tercihine uy"
            description="Tarayıcısında Do Not Track / Global Privacy Control açık olan ziyaretçiler ölçülmez."
            checked={analytics.respectDoNotTrack}
            onChange={(v) => set("respectDoNotTrack", v)}
          />
          <Toggle
            label="Kendi ziyaretlerimi sayma"
            description="Yönetim paneline giriş yapmış tarayıcılardan gelen ziyaretler kaydedilmez."
            checked={analytics.excludeAdmins}
            onChange={(v) => set("excludeAdmins", v)}
          />
        </Grid>
        <Grid>
          <SelectField
            label="Verilerin saklanma süresi"
            hint="süresi dolan günler otomatik silinir"
            value={String(analytics.retentionDays)}
            onChange={(v) => set("retentionDays", Number(v))}
            options={
              RETENTION.some((r) => r.value === String(analytics.retentionDays))
                ? RETENTION
                : [...RETENTION, { value: String(analytics.retentionDays), label: `${analytics.retentionDays} gün` }]
            }
          />
          <TagsField
            label="Ölçülmeyecek sayfalar"
            hint="ör. /tesekkurler (alt sayfalar dahil)"
            placeholder="/yol…"
            value={analytics.excludedPaths}
            onChange={(v) => set("excludedPaths", v)}
          />
        </Grid>
        <ul className="space-y-1.5 rounded-xl border border-line bg-deep/60 px-4 py-3 text-xs leading-5 text-muted">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Çerez veya cihazda saklanan kimlik kullanılmaz, IP adresleri kaydedilmez; ziyaretçiler her gün yenilenen gizli bir
              anahtarla anonim olarak sayılır. Bu nedenle çerez onayı banner&apos;ı gerekmez.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>Botlar, yönetim paneli ve cihaz vitrinindeki önizlemeler sayılmaz.</span>
          </li>
        </ul>
        {analytics.enabled !== savedEnabled ? (
          <p className="text-xs text-warm">
            {analytics.enabled ? "Analitiği başlatmak" : "Analitiği durdurmak"} için değişiklikleri kaydedin.
          </p>
        ) : null}
      </Panel>

      <AnalyticsDashboard enabled={savedEnabled} />
    </div>
  );
}
