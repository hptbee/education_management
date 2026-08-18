"use client";

import { useCallback, useEffect, useState } from "react";
import type { DatabaseSummary } from "@/src/database/types";
import { useAppData } from "@/src/store/AppDataContext";

export function useClassroomList(refreshKey?: string | number) {
  const { listClassrooms } = useAppData();
  const [classrooms, setClassrooms] = useState<DatabaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listClassrooms();
      setClassrooms(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách lớp học.");
    } finally {
      setLoading(false);
    }
  }, [listClassrooms]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return { classrooms, loading, error, refresh };
}
