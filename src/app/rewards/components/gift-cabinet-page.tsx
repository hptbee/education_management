"use client";

import { useMemo, useState } from "react";
import { Gift as GiftIcon, MonitorPlay, Plus } from "lucide-react";
import { useAppData } from "@/src/store/AppDataContext";
import { useActiveClassroom } from "@/src/hooks/useActiveClassroom";
import { usePresentationMode } from "@/src/store/PresentationModeContext";
import {
  useClassroomDialog,
  PageHeader,
  EmptyState,
  ClassroomButton,
  ClassroomCard,
} from "@/src/components/classroom";
import type { Gift } from "@/src/types/models";
import { GiftCard } from "./gift-card";
import { GiftFormDialog } from "./gift-form-dialog";
import { GiftRedeemDialog } from "./gift-redeem-dialog";
import { GiftPresentationView } from "./gift-presentation-view";
import { toastSuccess } from '@/src/utils/toast'
import { buildRedeemGiftUpdate } from "@/src/utils/gifts";

export function GiftCabinetPage() {
  const { data, saveGift, deleteGift, redeemGift } = useAppData();
  const { isLoaded } = useActiveClassroom();
  const { showConfirm, showAlert } = useClassroomDialog();
  const { isPresentationMode, enterPresentationMode } = usePresentationMode();

  const [formOpen, setFormOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [redeemGiftTarget, setRedeemGiftTarget] = useState<Gift | null>(null);

  const classroomId = data?.metadata.id ?? "";
  const gifts = data?.rewards ?? [];
  const students = data?.students ?? [];

  const { visibleGifts, hiddenGifts } = useMemo(() => {
    const visible: Gift[] = [];
    const hidden: Gift[] = [];
    for (const gift of gifts) {
      if (gift.isActive) visible.push(gift);
      else hidden.push(gift);
    }
    return { visibleGifts: visible, hiddenGifts: hidden };
  }, [gifts]);

  const openCreate = () => {
    setEditingGift(null);
    setFormOpen(true);
  };

  const handleToggleActive = async (gift: Gift) => {
    try {
      await saveGift({ ...gift, isActive: !gift.isActive, updatedAt: new Date().toISOString() });
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : "Không thể lưu quà.", { variant: "error" });
    }
  };

  const handleRedeemConfirm = async (studentId: string) => {
    if (!redeemGiftTarget || !data) return;
    const preview = buildRedeemGiftUpdate(data, studentId, redeemGiftTarget.id);
    if ("error" in preview) {
      const message =
        preview.error === "insufficient-points"
          ? "Không đủ điểm."
          : preview.error === "inactive"
            ? "Quà này không còn được trưng bày."
            : "Không thể đổi quà.";
      await showAlert(message, { variant: "error" });
      return;
    }
    const ok = redeemGift(studentId, redeemGiftTarget.id);
    if (!ok) {
      await showAlert("Không thể đổi quà.", { variant: "error" });
      return;
    }
    setRedeemGiftTarget(null);
    toastSuccess('Đã đổi quà thành công!');
  };

  const handleDelete = async (gift: Gift) => {
    const confirmed = await showConfirm(`Xóa quà "${gift.name}"? Hành động này không thể hoàn tác.`, {
      title: "Xóa quà",
      confirmLabel: "Xóa",
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      await deleteGift(gift.id);
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : "Không thể xóa quà.", { variant: "error" });
    }
  };

  const renderGrid = (items: Gift[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((gift) => (
        <GiftCard
          key={gift.id}
          gift={gift}
          classroomId={classroomId}
          onEdit={() => {
            setEditingGift(gift);
            setFormOpen(true);
          }}
          onToggleActive={() => void handleToggleActive(gift)}
          onRedeem={() => setRedeemGiftTarget(gift)}
          redeemDisabled={students.length === 0}
          onDelete={() => void handleDelete(gift)}
        />
      ))}
    </div>
  );

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (isPresentationMode) {
    return <GiftPresentationView gifts={visibleGifts} classroomId={classroomId} />;
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-5 pb-10">
        <PageHeader
          icon={GiftIcon}
          title="Tủ quà"
          subtitle="Trưng bày và đổi quà bằng điểm tích lũy của học sinh"
          iconClassName="from-rose-400 to-pink-500"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ClassroomButton variant="secondary" onClick={enterPresentationMode}>
                <MonitorPlay className="size-4" aria-hidden /> Trình chiếu
              </ClassroomButton>
              <ClassroomButton onClick={openCreate}>
                <Plus className="size-4" aria-hidden /> Thêm quà
              </ClassroomButton>
            </div>
          }
        />

        {gifts.length === 0 ? (
          <EmptyState
            icon={GiftIcon}
            title="Tủ quà đang chờ cô giáo bổ sung!"
            description="Thêm ảnh và mô tả quà tặng để học sinh cùng ngắm nhìn."
            action={
              <ClassroomButton onClick={openCreate}>
                <Plus className="size-4" aria-hidden /> Thêm quà
              </ClassroomButton>
            }
          />
        ) : (
          <>
            <ClassroomCard>
              <h3 className="mb-4 font-display text-lg font-extrabold text-slate-800">
                Đang trưng bày
                <span className="ml-2 rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-bold text-brand-dark">
                  {visibleGifts.length}
                </span>
              </h3>
              {visibleGifts.length === 0 ? (
                <p className="rounded-2xl bg-brand-soft/60 px-4 py-8 text-center text-sm font-semibold text-slate-600">
                  Chưa có quà nào đang trưng bày. Bấm Hiện trên quà đang ẩn, hoặc thêm quà mới.
                </p>
              ) : (
                renderGrid(visibleGifts)
              )}
            </ClassroomCard>

            {hiddenGifts.length > 0 ? (
              <ClassroomCard className="bg-slate-50/40">
                <h3 className="mb-4 font-display text-lg font-extrabold text-slate-800">
                  Đang ẩn
                  <span className="ml-2 rounded-full bg-white px-2.5 py-0.5 text-sm font-bold text-slate-500">
                    {hiddenGifts.length}
                  </span>
                </h3>
                {renderGrid(hiddenGifts)}
              </ClassroomCard>
            ) : null}
          </>
        )}
      </div>

      <GiftFormDialog
        isOpen={formOpen}
        classroomId={classroomId}
        initialData={editingGift}
        onClose={() => setFormOpen(false)}
        onSave={async (gift, options) => {
          await saveGift(gift, options);
        }}
      />

      <GiftRedeemDialog
        isOpen={Boolean(redeemGiftTarget)}
        gift={redeemGiftTarget}
        students={students}
        classroomId={classroomId}
        onClose={() => setRedeemGiftTarget(null)}
        onConfirm={(studentId) => void handleRedeemConfirm(studentId)}
      />
    </div>
  );
}
