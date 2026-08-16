"use client";

import { useState } from "react";
import type { Gift, Student } from "@/src/types/models";
import { StudentSearchPicker } from "@/src/app/badges/components/student-search-picker";
import { ClassroomButton } from "@/src/components/classroom";
import { useGiftImageUrl } from "@/src/hooks/useGiftImageUrl";

interface GiftRedeemDialogProps {
  isOpen: boolean;
  gift: Gift | null;
  students: Student[];
  classroomId: string;
  onClose: () => void;
  onConfirm: (studentId: string) => void;
}

export function GiftRedeemDialog({
  isOpen,
  gift,
  students,
  classroomId,
  onClose,
  onConfirm,
}: GiftRedeemDialogProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const imageUrl = useGiftImageUrl(classroomId, gift?.imagePath);

  if (!isOpen || !gift) return null;

  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const canAfford = selectedStudent ? selectedStudent.points >= gift.requiredPoints : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-redeem-title"
        className="flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-sky-100 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-pastel-sky/80 to-pastel-pink/60">
            {imageUrl ? (
              <img src={imageUrl} alt={gift.name} className="size-full object-cover" />
            ) : (
              <span className="text-2xl">🎁</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 id="gift-redeem-title" className="font-display text-xl font-black text-slate-800">
              Đổi quà: {gift.name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cần <strong className="text-brand">{gift.requiredPoints}</strong> điểm
            </p>
          </div>
        </div>

        <StudentSearchPicker
          students={students}
          selectedStudentId={selectedStudentId}
          onSelect={setSelectedStudentId}
        />

        {selectedStudent && !canAfford ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600">
            {selectedStudent.name} chỉ có {selectedStudent.points} điểm — không đủ điểm.
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <ClassroomButton variant="outline" onClick={onClose}>Hủy</ClassroomButton>
          <ClassroomButton
            disabled={!selectedStudentId || !canAfford}
            onClick={() => onConfirm(selectedStudentId)}
          >
            Xác nhận đổi quà
          </ClassroomButton>
        </div>
      </div>
    </div>
  );
}
