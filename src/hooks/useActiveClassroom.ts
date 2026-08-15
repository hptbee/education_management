"use client";

import { useAppData } from "@/src/store/AppDataContext";

export function useActiveClassroom() {
  const { data, isLoading, saveStudent, deleteStudent } = useAppData();

  return {
    database: data,
    classroom: data?.classroomSettings,
    teacher: data?.classroomSettings?.teacher,
    isLoaded: !isLoading,
    saveStudent,
    deleteStudent,
  };
}
