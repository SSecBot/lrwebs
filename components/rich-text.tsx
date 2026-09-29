import { Fragment } from "react";
import { parseBlocks, parseInline, type Inline } from "@/lib/markdown";
import { cn, isExternalHref, safeHref } from "@/lib/utils";

function InlineText({ text }: { text: string }) {
  const nodes: Inline[] = parseInline(text);
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case "strong":
            return (
              <strong key={i} className="font-semibold text-fg">
                {node.value}
              </strong>
            );
          case "em":
            return <em key={i}>{node.value}</em>;
          case "code":
            return (
              <code key={i} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-primary">
                {node.value}
              </code>
            );
          case "link": {
            const href = safeHref(node.href);
            const external = isExternalHref(href);
            return (
              <a
                key={i}
                href={href}
                className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
              >
                {node.value}
              </a>
            );
          }
          default:
            return <Fragment key={i}>{node.value}</Fragment>;
        }
      })}
    </>
  );
}

/** Markdown alt kümesini güvenli biçimde (HTML enjekte etmeden) render eder. */
export function RichText({ content, className, compact = false }: { content: string; className?: string; compact?: boolean }) {
  const blocks = parseBlocks(content);
  return (
    <div className={cn("space-y-4 text-[0.95rem] leading-7 text-muted", compact && "space-y-3 text-sm leading-6", className)}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={i} id={block.id} className="scroll-mt-28 pt-4 font-display text-lg text-fg first:pt-0 sm:text-xl">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} id={block.id} className="scroll-mt-28 pt-2 font-display text-base text-fg">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className="space-y-2 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-2 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="text-sm text-primary">{String(j + 1).padStart(2, "0")}</span>
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-warm pl-4 text-fg/90 italic">
                <InlineText text={block.text} />
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-xl border border-line bg-deep p-4 font-mono text-xs leading-6 text-fg/90"
              >
                <code>{block.text}</code>
              </pre>
            );
          default:
            return (
              <p key={i}>
                <InlineText text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
