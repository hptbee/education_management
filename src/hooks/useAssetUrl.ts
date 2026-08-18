"use client";

import { useEffect, useState } from "react";
import { classroomAssetService } from "@/src/database/assets/classroom-asset.service";
import { mimeFromAssetPath } from "@/src/database/assets/classroom-asset-paths";

export function useAssetUrl(classroomId: string | undefined, assetKey?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!classroomId || !assetKey) {
      setUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const bytes = await classroomAssetService.readAsset(classroomId, assetKey);
        if (!active || !bytes || bytes.length === 0) return;
        const blob = new Blob([bytes], { type: mimeFromAssetPath(assetKey) });
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (error) {
        console.warn("[useAssetUrl] failed to load asset", assetKey, error);
        if (active) setUrl(null);
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [classroomId, assetKey]);

  return url;
}

/** @deprecated Use useAssetUrl */
export const useGiftImageUrl = (
  classroomId: string | undefined,
  imagePath?: string,
): string | null => useAssetUrl(classroomId, imagePath);
