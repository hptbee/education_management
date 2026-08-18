"use client";

import { useState } from "react";
import type { Student } from "@/src/types/models";
import { useAssetUrl } from "@/src/hooks/useAssetUrl";
import { getStudentAvatar } from "@/src/utils/student";
import { cn } from "@/lib/utils";

export function StudentAvatar({
  student,
  classroomId,
  className,
  alt,
}: {
  student: Partial<Student>;
  classroomId?: string;
  className?: string;
  alt?: string;
}) {
  const [broken, setBroken] = useState(false);
  const assetUrl = useAssetUrl(classroomId, student.avatarAssetKey);
  const src = assetUrl ?? getStudentAvatar(student);

  return (
    <img
      src={broken ? getStudentAvatar(student) : src}
      alt={alt ?? student.name ?? "Học sinh"}
      onError={() => setBroken(true)}
      className={cn("object-cover", className)}
    />
  );
}
