"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BlogCard } from "@/components/home/sections";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/types/cms";

const ALL = "Tümü";

export function BlogExplorer({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [tag, setTag] = useState<string | null>(null);

  const categories = useMemo(() => [ALL, ...Array.from(new Set(posts.map((p) => p.category)))], [posts]);
  const tags = useMemo(() => Array.from(new Set(posts.flatMap((p) => p.tags))).sort((a, b) => a.localeCompare(b, "tr")), [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return posts.filter((p) => {
      if (category !== ALL && p.category !== category) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (!q) return true;
      return [p.title, p.excerpt, p.author, p.content].some((f) => f.toLocaleLowerCase("tr-TR").includes(q));
    });
  }, [posts, query, category, tag]);

  const isDefaultView = !query && category === ALL && !tag;
  const [featured, ...rest] = filtered;

  return (
    <section className="container-wide pb-10">
      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
          role="tablist"
          aria-label="Kategori filtresi"
        >
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 rounded-lg border px-3.5 py-1.5 text-sm transition",
                category === c
                  ? "border-primary bg-primary/10 text-fg"
                  : "border-line text-muted hover:border-primary/50 hover:text-fg",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="relative w-full lg:w-80">
          <span className="sr-only">Yazılarda ara</span>
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            className="input pl-10"
            placeholder="Yazılarda ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="mb-10 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[11px] tracking-wider text-muted uppercase">Etiket:</span>
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag((cur) => (cur === t ? null : t))}
            aria-pressed={tag === t}
            className={cn(
              "rounded-md border px-2 py-0.5 font-mono text-[11px] transition",
              tag === t ? "border-warm bg-warm/10 text-warm" : "border-line text-muted hover:text-fg",
            )}
          >
            #{t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="card p-10 text-center text-sm text-muted">Aramanızla eşleşen bir yazı bulunamadı.</p>
      ) : isDefaultView && featured ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          <div className="grid sm:col-span-2 xl:row-span-2">
            <BlogCard post={featured} priority />
          </div>
          {rest.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          {filtered.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
