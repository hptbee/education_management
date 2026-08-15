"use client";

import { Eye, EyeOff, Gift as GiftIcon, PencilLine, Trash2 } from "lucide-react";
import type { Gift } from "@/src/types/models";
import { useGiftImageUrl } from "@/src/hooks/useGiftImageUrl";
import { cn } from "@/lib/utils";

interface GiftCardProps {
  gift: Gift;
  classroomId: string;
  presentation?: boolean;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
}

export function GiftCard({
  gift,
  classroomId,
  presentation = false,
  onEdit,
  onToggleActive,
  onDelete,
}: GiftCardProps) {
  const imageUrl = useGiftImageUrl(classroomId, gift.imagePath);
  const hidden = !gift.isActive;

  if (presentation) {
    return (
      <article className="flex flex-col overflow-hidden rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-pastel-sky/80 to-pastel-pink/60">
          {imageUrl ? (
            <img src={imageUrl} alt={gift.name} className="size-full object-cover" />
          ) : (
            <GiftIcon className="size-20 text-brand/70" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 px-1 pt-5">
          <h3 className="text-balance font-display text-2xl font-black leading-tight text-slate-800">
            {gift.name}
          </h3>
          {gift.description ? (
            <p className="line-clamp-3 text-base font-semibold leading-relaxed text-slate-500">
              {gift.description}
            </p>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "motion-safe-hover flex flex-col rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        hidden
          ? "border-sky-50 bg-slate-50/70"
          : "border-sky-50 bg-white hover:border-accent-pink/30",
      )}
    >
      <div
        className={cn(
          "relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl",
          hidden
            ? "bg-slate-100"
            : "bg-gradient-to-br from-pastel-sky/80 to-pastel-pink/50",
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={gift.name}
            className={cn("size-full object-cover", hidden && "opacity-70")}
            loading="lazy"
          />
        ) : (
          <GiftIcon className={cn("size-12", hidden ? "text-slate-400" : "text-brand/70")} aria-hidden />
        )}
        <span
          className={cn(
            "absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm",
            hidden ? "bg-white/90 text-slate-500" : "bg-white/90 text-brand-dark",
          )}
        >
          {hidden ? "Đang ẩn" : "Đang trưng bày"}
        </span>
      </div>

      <div className="mt-3 min-w-0 flex-1 px-1">
        <h3 className="truncate font-display text-lg font-black text-slate-800">{gift.name}</h3>
        {gift.description ? (
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">
            {gift.description}
          </p>
        ) : (
          <p className="mt-0.5 text-sm font-semibold text-slate-400">Chưa có mô tả</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Sửa ${gift.name}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-sky-100 transition hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <PencilLine className="size-4" aria-hidden />
            Sửa
          </button>
        ) : null}
        {onToggleActive ? (
          <button
            type="button"
            onClick={onToggleActive}
            aria-label={gift.isActive ? `Ẩn ${gift.name}` : `Hiện ${gift.name}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-sky-100 transition hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {gift.isActive ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            {gift.isActive ? "Ẩn" : "Hiện"}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Xóa ${gift.name}`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-sky-100 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </article>
  );
}
