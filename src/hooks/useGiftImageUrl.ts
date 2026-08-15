"use client";

import { useEffect, useState } from "react";
import { classroomAssetService } from "@/src/database/assets/classroom-asset.service";

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

export function useGiftImageUrl(classroomId: string | undefined, imagePath?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!classroomId || !imagePath) {
      setUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const bytes = await classroomAssetService.readGiftImage(classroomId, imagePath);
        if (!active || !bytes || bytes.length === 0) return;
        const blob = new Blob([bytes], { type: mimeFromPath(imagePath) });
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (error) {
        console.warn("[useGiftImageUrl] failed to load image", error);
        if (active) setUrl(null);
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [classroomId, imagePath]);

  return url;
}
