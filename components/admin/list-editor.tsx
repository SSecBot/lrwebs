"use client";

import { ArrowDown, ArrowUp, ChevronDown, Copy, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { SmallButton } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

interface ListEditorProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  getKey: (item: T) => string;
  getTitle: (item: T, index: number) => string;
  getSubtitle?: (item: T) => string | undefined;
  isHidden?: (item: T) => boolean;
  createItem: () => T;
  duplicateItem?: (item: T) => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  addLabel?: string;
  emptyLabel?: string;
  maxItems?: number;
  minItems?: number;
  defaultOpen?: boolean;
}

/** Eklenebilir, sıralanabilir (sürükle-bırak veya oklar), silinebilir kart listesi. */
export function ListEditor<T>({
  items,
  onChange,
  getKey,
  getTitle,
  getSubtitle,
  isHidden,
  createItem,
  duplicateItem,
  renderItem,
  addLabel = "Yeni öğe ekle",
  emptyLabel = "Henüz öğe eklenmedi.",
  maxItems,
  minItems = 0,
  defaultOpen = false,
}: ListEditorProps<T>) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen ? items.map(getKey) : []));
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const toggle = (key: string) =>
    setOpen((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const add = () => {
    const item = createItem();
    onChange([...items, item]);
    setOpen((set) => new Set(set).add(getKey(item)));
  };

  const duplicate = (index: number) => {
    if (!duplicateItem) return;
    const copy = duplicateItem(items[index]);
    const next = [...items];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setOpen((set) => new Set(set).add(getKey(copy)));
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setConfirmDelete(null);
  };

  const canAdd = maxItems === undefined || items.length < maxItems;

  return (
    <div className="space-y-2.5">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">{emptyLabel}</p>
      ) : null}

      {items.map((item, index) => {
        const key = getKey(item);
        const expanded = open.has(key);
        const hidden = isHidden?.(item) ?? false;
        const subtitle = getSubtitle?.(item);
        const update = (patch: Partial<T>) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

        return (
          <div
            key={key}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={cn(
              "rounded-xl border bg-deep/60 transition",
              overIndex === index && dragIndex !== index ? "border-primary" : "border-line",
              dragIndex === index && "opacity-50",
            )}
          >
            <div className="flex items-center gap-2 px-2 py-2 sm:px-3">
              <span
                draggable
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className="hidden cursor-grab rounded p-1 text-muted hover:text-fg active:cursor-grabbing sm:block"
                title="Sürükleyerek sırala"
              >
                <GripVertical className="h-4 w-4" aria-hidden="true" />
              </span>
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left"
              >
                <span className="font-mono text-[10px] text-muted">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-medium", hidden ? "text-muted" : "text-fg")}>
                    {getTitle(item, index) || "Adsız öğe"}
                  </span>
                  {subtitle ? <span className="block truncate text-[11px] text-muted">{subtitle}</span> : null}
                </span>
                {hidden ? (
                  <span className="hidden items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted sm:inline-flex">
                    <EyeOff className="h-3 w-3" aria-hidden="true" />
                    Gizli
                  </span>
                ) : null}
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted transition", expanded && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  className="rounded p-1 text-muted transition hover:text-fg disabled:opacity-30"
                  aria-label="Yukarı taşı"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === items.length - 1}
                  className="rounded p-1 text-muted transition hover:text-fg disabled:opacity-30"
                  aria-label="Aşağı taşı"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {expanded ? (
              <div className="space-y-4 border-t border-line p-4">
                {renderItem(item, update, index)}
                <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                  {duplicateItem && canAdd ? (
                    <SmallButton onClick={() => duplicate(index)}>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Çoğalt
                    </SmallButton>
                  ) : null}
                  {items.length > minItems ? (
                    confirmDelete === key ? (
                      <>
                        <SmallButton onClick={() => setConfirmDelete(null)}>Vazgeç</SmallButton>
                        <SmallButton variant="danger" onClick={() => remove(index)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Silmeyi onayla
                        </SmallButton>
                      </>
                    ) : (
                      <SmallButton variant="danger" onClick={() => setConfirmDelete(key)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Sil
                      </SmallButton>
                    )
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {canAdd ? (
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-xs font-medium text-muted transition hover:border-primary/60 hover:text-fg"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
