"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ChartPoint {
  key: string;
  /** Eksende ve ipucunda gösterilecek etiket */
  label: string;
  pageviews: number;
  visitors: number;
}

/*
 * Trafik grafiği: aynı birimdeki (adet) iki seri, tek eksen.
 * Renkler koyu yüzeye (#0f172a) göre doğrulanmış kategorik çift: açıklık bandı, renk körlüğü
 * ayrımı ve kontrast kontrollerinden geçer. Kimlik yalnızca renkle verilmez: gösterge + ipucu etiketi.
 */
const SERIES = [
  { key: "pageviews", label: "Sayfa görüntüleme", color: "#0891b2" },
  { key: "visitors", label: "Ziyaretçi", color: "#d97706" },
] as const;

const HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 40 };

/** Eksen için "yuvarlak" üst sınır ve adım (1-2-5 dizisi). */
function niceScale(max: number, ticks = 4): { top: number; step: number } {
  if (max <= 0) return { top: 4, step: 1 };
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  return { top: Math.ceil(max / step) * step, step: Math.max(1, step) };
}

export function TrafficChart({ points }: { points: ChartPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    const max = Math.max(0, ...points.map((p) => Math.max(p.pageviews, p.visitors)));
    const { top, step } = niceScale(max);
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
    const ticks: number[] = [];
    for (let v = 0; v <= top; v += step) ticks.push(v);
    const line = (key: "pageviews" | "visitors") => points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[key])}`).join(" ");
    const area = `${line("pageviews")} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
    // Eksen etiketleri: taşmayı önlemek için en fazla ~8 etiket
    const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 80))));
    return { x, y, ticks, line, area, every, innerW };
  }, [points, width]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(rel * (points.length - 1)))));
  };

  const active = hover !== null ? points[hover] : null;
  const tooltipLeft = hover !== null ? geometry.x(hover) : 0;

  return (
    <div>
      {/* Gösterge */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>

      <div ref={wrap} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Seçilen dönemde sayfa görüntüleme ve ziyaretçi sayıları"
          className="block overflow-visible"
        >
          {/* Izgara ve y ekseni */}
          {geometry.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={geometry.y(t)} y2={geometry.y(t)} stroke="#1e293b" strokeWidth={1} />
              <text x={PAD.left - 8} y={geometry.y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px]">
                {t.toLocaleString("tr-TR")}
              </text>
            </g>
          ))}

          {/* x ekseni etiketleri */}
          {points.map((p, i) =>
            i % geometry.every === 0 || i === points.length - 1 ? (
              <text
                key={p.key}
                x={geometry.x(i)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                className="fill-muted text-[10px]"
              >
                {p.label}
              </text>
            ) : null,
          )}

          {/* Seriler */}
          <path d={geometry.area} fill={SERIES[0].color} opacity={0.12} />
          {SERIES.map((s) => (
            <path
              key={s.key}
              d={geometry.line(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Artı imleç */}
          {active ? (
            <g pointerEvents="none">
              <line
                x1={tooltipLeft}
                x2={tooltipLeft}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="#94a3b8"
                strokeOpacity={0.4}
                strokeWidth={1}
              />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={tooltipLeft}
                  cy={geometry.y(active[s.key])}
                  r={4}
                  fill={s.color}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
              ))}
            </g>
          ) : null}

          {/* Geniş vurgulama alanı */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={geometry.innerW}
            height={HEIGHT - PAD.top - PAD.bottom}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {active ? (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-line bg-deep/95 px-3 py-2 text-xs shadow-xl"
            style={{
              left: Math.min(Math.max(tooltipLeft, 90), width - 90),
              transform: "translateX(-50%)",
            }}
          >
            <p className="mb-1.5 font-medium text-fg">{active.label}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-4 text-muted">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                  {s.label}
                </span>
                <span className="font-medium text-fg tabular-nums">{active[s.key].toLocaleString("tr-TR")}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {/* Erişilebilir tablo görünümü */}
      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer select-none hover:text-fg">Tablo olarak göster</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface text-fg">
              <tr>
                <th className="px-3 py-2 font-medium">Dönem</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <td className="px-3 py-1.5">{p.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.pageviews.toLocaleString("tr-TR")}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.visitors.toLocaleString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
