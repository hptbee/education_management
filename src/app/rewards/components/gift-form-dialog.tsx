"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { Gift } from "@/src/types/models";
import { ClassroomButton, useModalFocusTrap } from "@/src/components/classroom";
import { classroomAssetService, GIFT_IMAGE } from "@/src/database/assets/classroom-asset.service";
import { useGiftImageUrl } from "@/src/hooks/useGiftImageUrl";
import { createId } from "@/src/utils/id";

interface GiftFormDialogProps {
  isOpen: boolean;
  classroomId: string;
  initialData?: Gift | null;
  onClose: () => void;
  onSave: (gift: Gift, options?: { previousImagePath?: string }) => Promise<void>;
}

export function GiftFormDialog({
  isOpen,
  classroomId,
  initialData,
  onClose,
  onSave,
}: GiftFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [imagePath, setImagePath] = useState<string | undefined>();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const existingImageUrl = useGiftImageUrl(classroomId, !pendingFile ? imagePath : undefined);
  const dialogRef = useModalFocusTrap(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name ?? "");
    setDescription(initialData?.description ?? "");
    setRequiredPoints(String(initialData?.requiredPoints ?? 1));
    setIsActive(initialData?.isActive ?? true);
    setImagePath(initialData?.imagePath);
    setPendingFile(null);
    setPreviewUrl(null);
    setError(null);
    setSaving(false);
    const timer = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, saving, onClose]);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  if (!isOpen) return null;

  const displayImage = previewUrl ?? existingImageUrl;
  const maxMb = GIFT_IMAGE.maxFileBytes / (1024 * 1024);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-form-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl"
      >
        <header className="border-b border-sky-50 p-5">
          <h2 id="gift-form-title" className="font-display text-xl font-extrabold text-slate-800">
            {initialData ? "Chỉnh sửa quà" : "Thêm quà mới"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Ảnh và mô tả sẽ hiện trên tủ quà cho cả lớp xem.
          </p>
        </header>
        <form
          className="grid gap-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const parsedPoints = Number.parseInt(requiredPoints, 10);
            if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
              setError("Điểm cần để đổi quà phải là số nguyên lớn hơn 0.");
              return;
            }
            setSaving(true);
            setError(null);
            try {
              const now = new Date().toISOString();
              const giftId = initialData?.id ?? createId("gift");
              let nextImagePath = imagePath;
              const previousImagePath = initialData?.imagePath;

              if (pendingFile) {
                nextImagePath = await classroomAssetService.saveGiftImage(classroomId, giftId, pendingFile);
              }

              try {
                await onSave(
                  {
                    id: giftId,
                    name: name.trim(),
                    description: description.trim() || undefined,
                    requiredPoints: parsedPoints,
                    imagePath: nextImagePath,
                    isActive,
                    createdAt: initialData?.createdAt ?? now,
                    updatedAt: now,
                  },
                  { previousImagePath: pendingFile ? previousImagePath : undefined },
                );
                onClose();
              } catch (saveErr) {
                if (pendingFile && nextImagePath) {
                  try {
                    await classroomAssetService.deleteGiftImage(classroomId, nextImagePath);
                  } catch (cleanupErr) {
                    console.warn("[gift-form-dialog] failed to remove orphan image", cleanupErr);
                  }
                }
                throw saveErr;
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Không thể lưu quà.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-sky-200 bg-brand-soft/40 p-5 transition hover:border-brand/40 hover:bg-brand-soft/70">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPendingFile(file);
                  setError(null);
                }
              }}
            />
            {displayImage ? (
              <img
                src={displayImage}
                alt="Xem trước ảnh quà"
                className="h-40 w-full max-w-xs rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-2xl bg-white shadow-sm">
                <ImagePlus className="size-10 text-brand" aria-hidden />
              </div>
            )}
            <span className="text-sm font-bold text-brand">
              {displayImage ? "Đổi ảnh quà" : "Chọn ảnh quà (tuỳ chọn)"}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              PNG, JPG, WEBP hoặc GIF · tối đa {maxMb} MB
            </span>
          </label>

          <div>
            <label htmlFor="gift-name" className="mb-1.5 block text-sm font-bold text-slate-700">
              Tên quà *
            </label>
            <input
              id="gift-name"
              ref={nameRef}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Gấu bông"
              className="classroom-field px-4"
            />
          </div>

          <div>
            <label htmlFor="gift-description" className="mb-1.5 block text-sm font-bold text-slate-700">
              Mô tả (tuỳ chọn)
            </label>
            <textarea
              id="gift-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Mô tả ngắn cho học sinh xem"
              className="classroom-field px-4"
            />
          </div>

          <div>
            <label htmlFor="gift-required-points" className="mb-1.5 block text-sm font-bold text-slate-700">
              Điểm cần để đổi *
            </label>
            <input
              id="gift-required-points"
              type="number"
              min={1}
              step={1}
              required
              value={requiredPoints}
              onChange={(e) => setRequiredPoints(e.target.value)}
              className="classroom-field px-4"
            />
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-sky-50 bg-brand-soft/50 px-4 py-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <span className="text-sm font-bold text-slate-700">Hiển thị trên tủ quà khi trình chiếu</span>
          </label>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-rose-500">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <ClassroomButton type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Hủy
            </ClassroomButton>
            <ClassroomButton type="submit" disabled={saving || !name.trim()}>
              {saving ? "Đang lưu..." : "Lưu"}
            </ClassroomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
