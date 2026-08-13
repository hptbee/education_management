"use client";

import { useAppData } from "@/src/store/AppDataContext";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function useActiveClassroom() {
  const { data, isLoading, saveStudent, deleteStudent } = useAppData();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and no database is selected, we should redirect to the selector
    // unless we are already on a route that handles this (like settings which renders ClassroomSelectorScreen)
    // Actually, it's safer to let the layout or page handle the redirect, but the hook can enforce it if needed.
    // For now, we just return the data. The caller can handle null states.
  }, [data, isLoading, pathname, router]);

  return {
    database: data,
    classroom: data?.classroomSettings,
    teacher: data?.classroomSettings?.teacher,
    isLoaded: !isLoading,
    saveStudent,
    deleteStudent,
  };
}
