import { slugify } from "@/lib/utils";

/**
 * Sade, güvenli bir Markdown alt kümesi ayrıştırıcısı.
 * HTML üretmez; yalnızca yapısal bloklar döndürür. Render işlemi React ile
 * metin düğümleri olarak yapıldığından XSS'e karşı güvenlidir.
 *
 * Desteklenenler: ## / ### başlıklar, paragraflar, - listeler, 1. listeler,
 * > alıntılar, ``` kod blokları, **kalın**, *italik*, `kod` ve [bağlantı](url).
 */

export type Block =
  | { type: "h2" | "h3"; text: string; id: string }
  | { type: "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "code"; text: string; lang: string };

export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; href: string };

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const usedIds = new Map<string, number>();
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const uniqueId = (text: string) => {
    const base = slugify(text) || "bolum";
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    return count ? `${base}-${count}` : base;
  };

  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    if (list) blocks.push(list);
    if (quote.length) blocks.push({ type: "quote", text: quote.join(" ") });
    paragraph = [];
    list = null;
    quote = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flush();
      const lang = trimmed.slice(3).trim().slice(0, 20);
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", text: code.join("\n"), lang });
      continue;
    }

    if (!trimmed) {
      flush();
      continue;
    }

    // "#" ve "##" ikinci seviye, "###" ve sonrası üçüncü seviye başlık olarak ele alınır.
    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flush();
      const level = heading[1].length <= 2 ? "h2" : "h3";
      const text = heading[2].trim();
      blocks.push({ type: level, text, id: uniqueId(text) });
      continue;
    }

    const ul = /^[-*+]\s+(.+)$/.exec(trimmed);
    const ol = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (ul || ol) {
      const type = ul ? "ul" : "ol";
      if (paragraph.length || quote.length || (list && list.type !== type)) flush();
      if (!list) list = { type, items: [] };
      list.items.push((ul ?? ol)![1]);
      continue;
    }

    if (trimmed.startsWith(">")) {
      if (paragraph.length || list) flush();
      quote.push(trimmed.replace(/^>\s?/, ""));
      continue;
    }

    if (list || quote.length) flush();
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*([^*\s][^*]*)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push({ type: "text", value: text.slice(last, match.index) });
    if (match[2]) out.push({ type: "strong", value: match[2] });
    else if (match[4]) out.push({ type: "code", value: match[4] });
    else if (match[6]) out.push({ type: "link", value: match[6], href: match[7] });
    else if (match[9]) out.push({ type: "em", value: match[9] });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

export function extractHeadings(source: string): { id: string; text: string; level: 2 | 3 }[] {
  return parseBlocks(source)
    .filter((b): b is Extract<Block, { type: "h2" | "h3" }> => b.type === "h2" || b.type === "h3")
    .map((b) => ({ id: b.id, text: b.text, level: b.type === "h2" ? 2 : 3 }));
}
