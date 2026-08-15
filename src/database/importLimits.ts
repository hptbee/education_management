/** Maximum JSON import file size (25 MB). */
export const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024;

export function assertImportFileSize(file: File): void {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error(
      `File quá lớn (${Math.round(file.size / (1024 * 1024))} MB). Vui lòng chọn file JSON tối đa ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)} MB.`,
    );
  }
}
